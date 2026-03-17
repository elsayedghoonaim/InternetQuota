import requests
from datetime import datetime, timezone

def ts_conv(unix_timestamp):
    if not unix_timestamp:
        return None
    dt_utc = datetime.fromtimestamp(unix_timestamp / 1000.0, tz=timezone.utc)
    return dt_utc.strftime("%Y-%m-%d %H:%M:%S")

def fetch_mobile_quota(number: str, password: str) -> dict:
    """
    Refactored from provided WE Air script.
    """
    # --- FIX: Remove leading '0' before sending to API ---
    # The API expects '15xxxx' instead of '015xxxx'
    if number and number.startswith("0"):
        number = number[1:]

    with requests.Session() as session:
        # Step 1: Login
        auth_url = "https://my.te.eg/echannel/service/besapp/base/rest/busiservice/v1/auth/userAuthenticate"
        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "channelid": "702",
            "ismobile": "false",
            "isselfcare": "true",
            "languagecode": "en-US",
            "origin": "https://my.te.eg",
            "referer": "https://my.te.eg/echannel/",
            "user-agent": "Mozilla/5.0"
        }

        auth_payload = {
            "acctId": number,
            "password": password,
            "appLocale": "en-US",
            "isSelfcare": "Y",
            "isMobile": "N"
        }

        resp = session.post(auth_url, headers=headers, json=auth_payload, timeout=15)
        data = resp.json()

        if data.get('header', {}).get('retCode') != "0":
            # Log the error msg to help debugging
            error_msg = data.get('header', {}).get('retMsg', 'Unknown error')
            raise ValueError(f"Mobile Auth Failed for {number}: {error_msg}")

        body = data['body']
        name = body['customer']['custName']
        sub_id = body['subscriber']['subscriberId']
        token = body['token']
        headers["csrftoken"] = token

        # Step 2: Get Offerings
        offers_url = "https://my.te.eg/echannel/service/besapp/base/rest/busiservice/cz/v1/auth/getSubscribedOfferings"
        offers_payload = {
            "msisdn": number,
            "numberServiceType": "mobile",
            "groupId": ""
        }

        resp = session.post(offers_url, headers=headers, json=offers_payload, timeout=15)
        data = resp.json()

        main_offer = None
        for offering in data.get("body", {}).get("offeringList", []):
            if offering.get("main") is True:
                main_offer = offering
                break
        
        if not main_offer:
            raise ValueError("No main mobile offering found")

        offer_id = main_offer["mainOfferingId"]

        # Step 3: Quota
        quota_url = "https://my.te.eg/echannel/service/besapp/base/rest/busiservice/cz/cbs/bb/queryFreeUnit"
        quota_payload = {
            "subscriberId": sub_id,
            "mainOfferId": offer_id,
            "needQueryPoint": True
        }

        resp = session.post(quota_url, headers=headers, json=quota_payload, timeout=15)
        data = resp.json()
        
        if not data.get("body"):
            raise ValueError("No quota body returned")

        quota_body = data['body'][0]
        
        # Unit conversion logic from script (1108 = MB -> GB, else raw)
        unit_code = str(quota_body.get("measureUnit", ""))
        div = 1024.0 if unit_code == "1108" else 1.0

        total = quota_body.get("total", 0.0) / div
        used = quota_body.get("used", 0.0) / div
        remain = quota_body.get("remain", 0.0) / div
        
        expires_on = ts_conv(quota_body.get("expireTime"))

        return {
            "name": name,
            "offer_name": quota_body.get("offerName"),
            "total_gb": total,
            "used_gb": used,
            "remain_gb": remain,
            "usage_percent": (used / total * 100) if total else 0.0,
            "expires_on": expires_on
        }