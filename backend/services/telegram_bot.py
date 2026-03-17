"""
Telegram Bot Polling — listens for /status commands in a background thread.

Uses the same Cloudflare Worker proxy as the notification service.
"""

import os
import logging
import requests
import threading
import time

logger = logging.getLogger(__name__)

TELEGRAM_API_URL = os.getenv("TELEGRAM_API_URL", "https://wandering-term-3347.elsayedghonaim21.workers.dev")
POLL_INTERVAL = 3  # seconds between polling
MAX_BACKOFF = 60   # max seconds between retries on error


class TelegramBotPoller:
    """
    Lightweight Telegram bot that polls for updates in a daemon thread.
    Responds to /status by sending a full account status report.
    """

    def __init__(self):
        self._thread = None
        self._running = False
        self._backoff = POLL_INTERVAL
        self._offset = 0  # Telegram update offset
        self.bot_token = os.getenv("TELEGRAM_BOT_TOKEN")

    @property
    def configured(self):
        return bool(self.bot_token)

    def start(self):
        if not self.configured:
            logger.warning("Telegram bot not configured — polling disabled.")
            return

        self._running = True
        self._thread = threading.Thread(target=self._poll_loop, daemon=True)
        self._thread.start()
        logger.info("🤖 Telegram bot polling started.")

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)
        logger.info("🤖 Telegram bot polling stopped.")

    def _poll_loop(self):
        """Main polling loop — runs in a daemon thread with exponential backoff."""
        while self._running:
            try:
                self._process_updates()
                self._backoff = POLL_INTERVAL  # reset on success
            except Exception as e:
                logger.error(f"Telegram polling error (retry in {self._backoff}s): {e}")
                self._backoff = min(self._backoff * 2, MAX_BACKOFF)
            time.sleep(self._backoff)

    def _process_updates(self):
        """Fetch and process new Telegram updates."""
        url = f"{TELEGRAM_API_URL}/bot{self.bot_token}/getUpdates"
        params = {"offset": self._offset, "timeout": 10}

        try:
            resp = requests.post(url, json=params, timeout=15)
            if not resp.ok:
                return

            data = resp.json()
            if not data.get("ok"):
                return

            for update in data.get("result", []):
                self._offset = update["update_id"] + 1
                self._handle_update(update)

        except requests.exceptions.Timeout:
            pass  # Normal for long polling

    def _handle_update(self, update):
        """Handle a single Telegram update."""
        message = update.get("message", {})
        text = message.get("text", "").strip()
        msg_chat_id = str(message.get("chat", {}).get("id", ""))

        if not msg_chat_id:
            return

        # Always save or update subscriber when they interact with the bot
        from backend.database import get_subscribers_collection
        subs_col = get_subscribers_collection()
        subs_col.update_one(
            {"chat_id": msg_chat_id},
            {"$set": {"chat_id": msg_chat_id}},
            upsert=True
        )

        if text.lower() == "/status":
            self._handle_status_command(msg_chat_id)
        elif text.lower() == "/start":
            self._handle_start_command(msg_chat_id)
        elif text.lower() == "/help":
            self._handle_help_command(msg_chat_id)

    def _handle_start_command(self, chat_id):
        """Respond to /start with low quota accounts."""
        from backend.services.notifications import send_start_message
        send_start_message(chat_id)

    def _handle_status_command(self, chat_id):
        """Respond to /status with all account info for the requester."""
        # Import here to avoid circular imports
        from backend.services.notifications import send_status_message
        send_status_message(chat_id)

    def _handle_help_command(self, chat_id):
        """Respond to /help with available commands."""
        from backend.services.notifications import send_telegram_message
        send_telegram_message(
            chat_id,
            "🤖 *Internet Quota Bot*\n\n"
            "Available commands:\n"
            "• /start — Show accounts with low quota\n"
            "• /status — Show all accounts\n"
            "• /help — Show this message\n\n"
            "_Automatic alerts are sent every 6 hours for accounts below 10%._"
        )


# Singleton instance
telegram_bot = TelegramBotPoller()
