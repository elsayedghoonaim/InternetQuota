"""
Telegram Notification Service — sends alerts via a Make.com Webhook

Requires HF Secret: MAKE_WEBHOOK_URL
"""

import os
import logging
import requests

from backend.database import get_account_collection

logger = logging.getLogger(__name__)

# Default Cloudflare proxy URL
TELEGRAM_API_URL = os.getenv("TELEGRAM_API_URL", "https://wandering-term-3347.elsayedghonaim21.workers.dev")

LOW_QUOTA_THRESHOLD = 0.10  # 10%


def send_telegram_message(chat_id, text, parse_mode="Markdown"):
    """
    Sends a message to the configured Telegram chat via Cloudflare proxy.
    Returns True on success, "BLOCKED" if user blocked the bot, False on failure.
    """
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")

    if not bot_token or not chat_id:
        logger.warning("TELEGRAM_BOT_TOKEN or chat_id not configured — skipping message.")
        return False

    try:
        url = f"{TELEGRAM_API_URL}/bot{bot_token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode
        }
        resp = requests.post(url, json=payload, timeout=10)
        
        if resp.ok:
            return True
        elif resp.status_code == 403:
            logger.warning(f"🚫 Bot was blocked by user {chat_id}.")
            return "BLOCKED"
        else:
            logger.error(f"Telegram webhook error {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        logger.error(f"Failed to send Telegram alert: {e}")
        return False


def send_low_quota_alerts():
    """
    Checks all accounts and sends a single consolidated Telegram message
    listing every account below 10% quota. Called every 6 hours by the scheduler.
    """
    accounts_col = get_account_collection()
    accounts = list(accounts_col.find())

    low_accounts = []
    for acc in accounts:
        total = acc.get("total_gb") or 0
        remain = acc.get("remain_gb") or 0
        if total > 0 and (remain / total) <= LOW_QUOTA_THRESHOLD:
            pct = (remain / total) * 100
            name = acc.get("name") or acc["identifier"]
            low_accounts.append(f"• *{name}*: {remain:.1f} / {total:.0f} GB ({pct:.1f}%)")

    if not low_accounts:
        logger.info("📊 No accounts below 10% — skipping Telegram alert.")
        return

    message = (
        "⚠️ *Low Quota Alert*\n\n"
        f"{len(low_accounts)} account(s) below 10%:\n\n"
        + "\n".join(low_accounts)
    )

    _broadcast_message(message)


def _broadcast_message(message):
    """Internal helper to broadcast a message to all subscribers and remove blocked ones."""
    from backend.database import get_subscribers_collection
    subs_col = get_subscribers_collection()
    subscribers = list(subs_col.find())

    # Include legacy env chat_id if not present in db
    legacy_chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if legacy_chat_id and not any(s.get("chat_id") == legacy_chat_id for s in subscribers):
        subscribers.append({"chat_id": legacy_chat_id})

    if not subscribers:
        logger.warning("No Telegram subscribers found to broadcast to.")
        return

    for sub in subscribers:
        chat_id = sub.get("chat_id")
        if not chat_id:
            continue
        
        res = send_telegram_message(str(chat_id), message)
        if res == "BLOCKED":
            logger.info(f"Removing blocked subscriber {chat_id} from database.")
            subs_col.delete_one({"chat_id": chat_id})


def send_start_message(chat_id):
    """
    Sends a message containing only accounts with low quota.
    Called when the bot receives /start.
    """
    accounts_col = get_account_collection()
    accounts = list(accounts_col.find())

    low_accounts = []
    for acc in accounts:
        total = acc.get("total_gb") or 0
        remain = acc.get("remain_gb") or 0
        if total > 0 and (remain / total) <= LOW_QUOTA_THRESHOLD:
            pct = (remain / total) * 100
            name = acc.get("name") or acc["identifier"]
            low_accounts.append(f"🔴 *{name}*: {remain:.1f} / {total:.0f} GB ({pct:.1f}%)")

    if not low_accounts:
        send_telegram_message(chat_id, "✅ *All accounts are looking good!*\nNo accounts are low on quota.")
        return

    message = (
        "⚠️ *Low Quota Accounts*\n\n"
        + "\n".join(low_accounts)
    )

    send_telegram_message(chat_id, message)

def send_status_message(chat_id=None):
    """
    Sends a full status report of all accounts to Telegram.
    Called when the bot receives /status (replies to sender) OR on startup (broadcasts to all).
    """
    accounts_col = get_account_collection()
    accounts = list(accounts_col.find())

    if not accounts:
        send_telegram_message("📭 No accounts configured.")
        return

    lines = []
    for acc in accounts:
        name = acc.get("name") or acc["identifier"]
        total = acc.get("total_gb") or 0
        remain = acc.get("remain_gb") or 0
        pct = ((remain / total) * 100) if total > 0 else 0
        offer = acc.get("offer_name") or "—"
        expires = acc.get("expires_on") or "—"

        # Status emoji
        if pct > 50:
            emoji = "🟢"
        elif pct > 10:
            emoji = "🟡"
        else:
            emoji = "🔴"

        lines.append(
            f"{emoji} *{name}*\n"
            f"   {remain:.1f} / {total:.0f} GB ({pct:.0f}%)\n"
            f"   Plan: {offer}\n"
            f"   Expires: {expires}"
        )

    message = (
        "📊 *Internet Quota Status*\n\n"
        + "\n\n".join(lines)
    )

    if chat_id:
        send_telegram_message(chat_id, message)
    else:
        _broadcast_message(message)