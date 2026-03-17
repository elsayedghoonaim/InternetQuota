import os
from pymongo import MongoClient
from pymongo.collection import Collection
from dotenv import load_dotenv

load_dotenv()

# Read from .env
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("MONGO_DB_NAME", "internet_quota_db")

# Connect
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

def get_db():
    """Returns the database instance"""
    return db

def get_account_collection() -> Collection:
    """Returns the 'accounts' collection"""
    return db["accounts"]

def get_log_collection() -> Collection:
    """Returns the 'quota_logs' collection"""
    return db["quota_logs"]

def get_statistics_collection() -> Collection:
    """Returns the 'statistics' collection for monthly aggregated data"""
    return db["statistics"]

def get_subscribers_collection() -> Collection:
    """Returns the 'telegram_subscribers' collection for dynamic bot broadcasting"""
    return db["telegram_subscribers"]