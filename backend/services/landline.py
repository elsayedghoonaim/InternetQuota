import requests
from datetime import datetime, timedelta, timezone

def ts_conv(unix_timestamp, return_until=False):
    if not unix_timestamp:
        return [None, None] if return_until else [None]
        
    dt_utc = datetime.fromtimestamp(unix_timestamp / 1000.0, tz=timezone.utc)
    # Simple conversion to local time (assuming server is in Egypt or desired timezone)
    # For strict localization, pytz or zoneinfo should be used
    dt_local = dt_utc # Keep as UTC or offset aware for simplicity in backend
    formatted_date = dt_local.strftime("%Y-%m-%d %H:%M:%S")

    dates = [formatted_date]

    if return_until:
        now_utc = datetime.now(timezone.utc)
        time_difference = dt_utc - now_utc
        days_left = time_difference.days
        dates.append(f"{days_left} days")

    return dates

def fetch_landline_quota(number: str, password: str) -> dict:
    """
    Refactored from provided script. Returns a standardized dict or raises Exception.
    """
    # Account ID pattern for Landline
    acct_id = "FBB" + number[1:]
    
    with requests.Session() as session:
        # Step 1: Initial cookies
        initial_url = "https://api-my.te.eg/echannel/service/besapp/base/rest/busiservice/v1/common/querySysParams"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0",
            "channelId": "702",
            "isCoporate": "false",
            "isMobile": "false",
            "isSelfcare": "true",
            "languageCode": "en-US",
        }
        
        try:
            session.post(initial_url, headers=headers, json={}, timeout=10)
        except Exception as e:
            raise ConnectionError(f"Failed to connect to TE API: {str(e)}")

        # Step 2: Authenticate
        auth_url = "https://api-my.te.eg/echannel/service/besapp/base/rest/busiservice/v1/auth/userAuthenticate"
        auth_payload = {
            "acctId": acct_id,
            "appLocale": "en-US",
            "password": password,
        }
        
        resp = session.post(auth_url, headers=headers, json=auth_payload, timeout=10)
        data = resp.json()
        
        if data.get("header", {}).get("retCode") != "0":
            raise ValueError(f"Auth Failed: {data.get('header', {}).get('retMsg', 'Unknown error')}")

        body = data["body"]
        name = body["customer"]["custName"]
        sub_id = body["subscriber"]["subscriberId"]
        token = body["token"]

        # Step 3: Get Offers
        headers["csrftoken"] = token
        offers_url = "https://api-my.te.eg/echannel/service/besapp/base/rest/busiservice/cz/v1/auth/getSubscribedOfferings"
        offers_payload = {"msisdn": acct_id, "numberServiceType": "FBB", "groupId": ""}
        
        resp = session.post(offers_url, headers=headers, json=offers_payload, timeout=10)
        data = resp.json()
        
        offer_list = data.get("body", {}).get("offeringList", [])
        if not offer_list:
            raise ValueError("No offerings found for this account")
            
        main_offer_id = offer_list[0]["mainOfferingId"]

        # Step 4: Quota Details
        quota_url = "https://api-my.te.eg/echannel/service/besapp/base/rest/busiservice/cz/cbs/bb/queryFreeUnit"
        quota_payload = {"subscriberId": sub_id, "mainOfferId": main_offer_id}
        
        resp = session.post(quota_url, headers=headers, json=quota_payload, timeout=10)
        data = resp.json()
        
        if not data.get("body"):
            raise ValueError("Empty quota body received")

        q = data["body"][0]
        
        total = q.get("total", 0.0)
        used = q.get("used", 0.0)
        remain = q.get("remain", 0.0)
        
        # Calculate expiry
        expiry_info = ts_conv(q.get("expireTime"), return_until=True)
        
        return {
            "name": name,
            "offer_name": q.get("offerName"),
            "total_gb": total,
            "used_gb": used,
            "remain_gb": remain,
            "usage_percent": (used / total * 100) if total else 0.0,
            "expires_on": expiry_info[0]
        }