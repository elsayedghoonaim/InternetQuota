from apscheduler.schedulers.background import BackgroundScheduler
from backend.services.landline import fetch_landline_quota
from backend.services.mobile import fetch_mobile_quota
from backend.services.notifications import send_low_quota_alerts
from backend.services.statistics import run_statistics_pipeline
from backend.database import get_account_collection, get_log_collection
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_all_accounts():
    logger.info("Scheduler: Starting hourly quota check...")
    accounts_col = get_account_collection()
    logs_col = get_log_collection()
    
    # Get all accounts as a list of dicts
    accounts = list(accounts_col.find())
    
    for acc in accounts:
        try:
            raw_pass = acc.get("password") 
            identifier = acc["identifier"]
            acc_type = acc["type"]
            data = None
            
            if not raw_pass:
                logger.error(f"Skipping {identifier}: No password field found.")
                continue

            if acc_type == "LANDLINE":
                data = fetch_landline_quota(identifier, raw_pass)
            elif acc_type in ["MOBILE", "WE_AIR"]:
                data = fetch_mobile_quota(identifier, raw_pass)
            
            if data:
                # 1. Update account in DB
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
                    {"_id": acc["_id"]},
                    {"$set": update_fields}
                )
                
                # 2. Add log entry for stats
                logs_col.insert_one({
                    "account_identifier": identifier,
                    "remain_gb": data.get("remain_gb"),
                    "used_gb": data.get("used_gb"),
                    "total_gb": data.get("total_gb"),
                    "checked_at": datetime.utcnow()
                })
                
                remain = data.get("remain_gb", 0)
                logger.info(f"Updated {identifier}: {remain}GB left")

        except Exception as e:
            logger.error(f"Failed to update {acc.get('identifier', 'unknown')}: {e}")
    
    logger.info("Scheduler: Check complete.")

scheduler = BackgroundScheduler()

# Every 6 hours: fetch fresh quota data from WE
scheduler.add_job(update_all_accounts, 'interval', hours=6)

# Every 6 hours: send Telegram alert for accounts below 10%
scheduler.add_job(
    send_low_quota_alerts,
    'interval',
    hours=6,
    id='telegram_low_quota_alerts'
)

# Daily at 3 AM: generate monthly stats + clean old logs
scheduler.add_job(
    run_statistics_pipeline,
    'cron',
    hour=3,
    minute=0,
    id='daily_statistics_pipeline'
)