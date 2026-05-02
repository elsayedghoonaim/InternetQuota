import sys
import os
import socket
from contextlib import asynccontextmanager
import concurrent.futures

# --- DNS PATCH FOR HUGGING FACE ---
# Hugging Face blocks DNS resolution for *.workers.dev
# We manually resolve the Telegram proxy to Cloudflare's Anycast IP to bypass this
_orig_getaddrinfo = socket.getaddrinfo
def _patched_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    if host == '':
        return _orig_getaddrinfo('104.21.18.196', port, family, type, proto, flags)
    return _orig_getaddrinfo(host, port, family, type, proto, flags)
socket.getaddrinfo = _patched_getaddrinfo

# --- PATH FIX ---
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import secrets
from typing import List, Optional
from datetime import datetime, timedelta
import traceback

FETCH_ERRORS = []

from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from dotenv import load_dotenv

# App Imports
from backend.models import AccountCreate, AccountResponse, MonthlyStatistics, PipelineResult
from backend.services.scheduler import scheduler
from backend.services.landline import fetch_landline_quota
from backend.services.mobile import fetch_mobile_quota
from backend.services.statistics import run_statistics_pipeline
from backend.database import get_account_collection, get_log_collection, get_statistics_collection

load_dotenv()

# --- Helpers ---
def mongo_helper(account_doc) -> dict:
    """Converts Mongo document to a dict compatible with AccountResponse"""
    return {
        "id": str(account_doc["_id"]),
        "type": account_doc["type"],
        "identifier": account_doc["identifier"],
        "name": account_doc.get("name"),
        "isp_name": account_doc.get("isp_name"),
        "offer_name": account_doc.get("offer_name"),
        "total_gb": account_doc.get("total_gb"),
        "used_gb": account_doc.get("used_gb"),
        "remain_gb": account_doc.get("remain_gb"),
        "expires_on": account_doc.get("expires_on"),
        "last_check": account_doc.get("last_check"),
    }

def fetch_account_data_only(identifier: str, password: str, type: str) -> tuple[str, Optional[dict]]:
    """Pure network function: Fetches data and returns it."""
    try:
        data = None
        
        if type == "LANDLINE":
            data = fetch_landline_quota(identifier, password)
        elif type in ["MOBILE", "WE_AIR"]:
            data = fetch_mobile_quota(identifier, password)
            
        return identifier, data
    except Exception as e:
        err_msg = traceback.format_exc()
        print(f"Error fetching {identifier}: {e}\n{err_msg}")
        FETCH_ERRORS.append({"identifier": identifier, "error": err_msg, "time": str(datetime.utcnow())})
        if len(FETCH_ERRORS) > 20:
            FETCH_ERRORS.pop(0)
        return identifier, None

def apply_update_to_mongo(identifier: str, data: dict):
    """Updates the Mongo document and inserts a log."""
    if not data:
        return

    accounts_col = get_account_collection()
    logs_col = get_log_collection()

    update_fields = {
        "isp_name": data.get("name"),
        "offer_name": data.get("offer_name"),
        "total_gb": data.get("total_gb"),
        "used_gb": data.get("used_gb"),
        "remain_gb": data.get("remain_gb"),
        "usage_percent": data.get("usage_percent"),
        "expires_on": data.get("expires_on"),
        "last_check": datetime.utcnow()
    }

    accounts_col.update_one(
        {"identifier": identifier},
        {"$set": update_fields}
    )

    logs_col.insert_one({
        "account_identifier": identifier,
        "remain_gb": data.get("remain_gb"),
        "used_gb": data.get("used_gb"),
        "total_gb": data.get("total_gb"),
        "checked_at": datetime.utcnow()
    })

# --- Lifespan ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Create Index for Uniqueness
    try:
        get_account_collection().create_index("identifier", unique=True)
        print("✅ MongoDB Index ensured: identifier (unique)")
    except Exception as e:
        print(f"⚠️ Index creation warning: {e}")

    # Statistics indexes
    try:
        get_statistics_collection().create_index(
            [("account_identifier", 1), ("year", 1), ("month", 1)],
            unique=True
        )
        print("✅ MongoDB Index ensured: statistics (account+period, unique)")
    except Exception as e:
        print(f"⚠️ Statistics index warning: {e}")

    # 2. Start Scheduler
    scheduler.start()
    print("System startup: Scheduler started.")

    # 3. Telegram Bot (using Cloudflare proxy to bypass HF limits)
    from backend.services.telegram_bot import telegram_bot
    telegram_bot.start()

    # 4. Send startup status notification (in background so it doesn't block HF healthcheck)
    def startup_notify():
        try:
            from backend.services.notifications import send_status_message
            send_status_message()
        except Exception as e:
            print(f"⚠️ Failed to send startup Telegram status: {e}")
            
    import threading
    threading.Thread(target=startup_notify, daemon=True).start()

    yield

    # Shutdown
    telegram_bot.stop()
    scheduler.shutdown()
    print("System shutdown: Scheduler and Telegram bot stopped.")


# --- App Definition ---
app = FastAPI(title="WE Quota Checker API (MongoDB)", lifespan=lifespan)
security = HTTPBasic()

def get_current_username(credentials: HTTPBasicCredentials = Depends(security)):
    expected_user = os.getenv("ADMIN_USERNAME")
    expected_pass = os.getenv("ADMIN_PASSWORD")
    
    if not expected_user or not expected_pass:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Server credentials not configured"
        )
    
    correct_username = secrets.compare_digest(credentials.username, expected_user)
    correct_password = secrets.compare_digest(credentials.password, expected_pass)
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

# --- Routes ---

@app.post("/accounts", response_model=AccountResponse, dependencies=[Depends(get_current_username)])
def add_account(account: AccountCreate):
    accounts_col = get_account_collection()
    
    # Check if exists
    if accounts_col.find_one({"identifier": account.identifier}):
        raise HTTPException(status_code=400, detail="Account already exists")
    
    new_acc_doc = {
        "type": account.type.upper(),
        "identifier": account.identifier,
        "password": account.password,  # <--- CHANGED: Storing plain text now
        "name": account.name,
        "isp_name": None, "offer_name": None, "total_gb": None, 
        "used_gb": None, "remain_gb": None, "last_check": None
    }
    
    result = accounts_col.insert_one(new_acc_doc)
    new_acc_doc["_id"] = result.inserted_id
    
    # Initial Background-ish Fetch
    try:
        # Pass plain password
        _, data = fetch_account_data_only(account.identifier, account.password, account.type.upper())
        if data:
            apply_update_to_mongo(account.identifier, data)
            new_acc_doc = accounts_col.find_one({"_id": result.inserted_id})
    except Exception:
        pass
        
    return mongo_helper(new_acc_doc)

@app.get("/quotas", response_model=List[AccountResponse], dependencies=[Depends(get_current_username)])
def get_quotas(force_refresh: bool = False):
    accounts_col = get_account_collection()
    all_docs = list(accounts_col.find())
    
    accounts_to_update = []
    
    for doc in all_docs:
        is_stale = False
        last_check = doc.get("last_check")
        if not last_check or (datetime.utcnow() - last_check > timedelta(minutes=5)):
            is_stale = True
            
        if force_refresh or is_stale:
            accounts_to_update.append(doc)
    
    if accounts_to_update:
        print(f"Refreshing {len(accounts_to_update)} accounts in parallel...")
        fetched_data_map = {}
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            future_to_identifier = {
                executor.submit(
                    fetch_account_data_only, 
                    doc["identifier"], 
                    doc.get("password"), # <--- CHANGED: Access 'password', safely
                    doc["type"]
                ): doc["identifier"] for doc in accounts_to_update
            }
            
            for future in concurrent.futures.as_completed(future_to_identifier):
                identifier, data = future.result()
                if data:
                    fetched_data_map[identifier] = data

        for identifier, data in fetched_data_map.items():
            apply_update_to_mongo(identifier, data)
        
        if fetched_data_map:
            all_docs = list(accounts_col.find())

    return [mongo_helper(doc) for doc in all_docs]

@app.delete("/accounts/{identifier}", dependencies=[Depends(get_current_username)])
def delete_account(identifier: str):
    accounts_col = get_account_collection()
    result = accounts_col.delete_one({"identifier": identifier})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"message": "Deleted"}

@app.get("/debug_errors")
def debug_errors():
    return {"errors": FETCH_ERRORS}

# --- Statistics Routes ---

def _stats_helper(doc) -> dict:
    """Converts MongoDB stats document to response dict."""
    return {
        "account_identifier": doc["account_identifier"],
        "account_name": doc.get("account_name"),
        "account_type": doc.get("account_type"),
        "year": doc["year"],
        "month": doc["month"],
        "period": doc.get("period", f"{doc['year']}-{doc['month']:02d}"),
        "avg_daily_usage_gb": doc.get("avg_daily_usage_gb", 0),
        "total_consumed_gb": doc.get("total_consumed_gb", 0),
        "peak_usage_gb": doc.get("peak_usage_gb", 0),
        "peak_usage_date": doc.get("peak_usage_date"),
        "min_remaining_gb": doc.get("min_remaining_gb", 0),
        "avg_remaining_gb": doc.get("avg_remaining_gb", 0),
        "current_plan_gb": doc.get("current_plan_gb", 0),
        "recommended_quota_gb": doc.get("recommended_quota_gb", 0),
        "recommendation": doc.get("recommendation", "GOOD"),
        "data_points": doc.get("data_points", 0),
        "computed_at": doc.get("computed_at"),
    }

@app.get("/statistics", response_model=List[MonthlyStatistics], dependencies=[Depends(get_current_username)])
def get_all_statistics():
    """Returns all monthly statistics, sorted by period descending."""
    stats_col = get_statistics_collection()
    docs = list(stats_col.find().sort([("year", -1), ("month", -1)]))
    return [_stats_helper(d) for d in docs]

@app.get("/statistics/{identifier}", response_model=List[MonthlyStatistics], dependencies=[Depends(get_current_username)])
def get_account_statistics(identifier: str):
    """Returns statistics for a single account, sorted by period descending."""
    stats_col = get_statistics_collection()
    docs = list(stats_col.find({"account_identifier": identifier}).sort([("year", -1), ("month", -1)]))
    return [_stats_helper(d) for d in docs]

@app.post("/statistics/generate", response_model=PipelineResult, dependencies=[Depends(get_current_username)])
def trigger_statistics_generation(force: bool = False):
    """Manually trigger the statistics pipeline. Use ?force=true to wipe and recompute all stats."""
    try:
        result = run_statistics_pipeline(force=force)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Statistics generation failed: {str(e)}")


