import json
import logging
import asyncio
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import MONGODB_URI, DB_NAME, STORAGE_DIR

logger = logging.getLogger("uvicorn")

FALLBACK_FILE = STORAGE_DIR / "db_fallback.json"

class JSONFallbackStore:
    def __init__(self):
        self.file_path = FALLBACK_FILE
        self._data = {"users": {}, "media_contents": {}, "messages": []}
        self._load()

    def _load(self):
        if self.file_path.exists():
            try:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        self._data.update(data)
            except Exception as e:
                logger.warning(f"Error loading JSON fallback store: {e}")

        # Ensure all required keys exist regardless of previous file format
        if "users" not in self._data or not isinstance(self._data.get("users"), dict):
            self._data["users"] = {}
        if "media_contents" not in self._data or not isinstance(self._data.get("media_contents"), dict):
            self._data["media_contents"] = {}
        if "messages" not in self._data or not isinstance(self._data.get("messages"), list):
            self._data["messages"] = []

    def _save(self):
        try:
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump(self._data, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Error saving JSON fallback store: {e}")

    async def insert_user(self, doc: dict):
        user_id = str(doc.get("_id", doc.get("id")))
        self._data["users"][user_id] = doc
        self._save()
        return user_id

    async def find_user_by_email(self, email: str):
        users_dict = self._data.get("users", {})
        for user in users_dict.values():
            if isinstance(user, dict) and user.get("email") == email:
                return user
        return None

    async def find_user_by_id(self, user_id: str):
        return self._data.get("users", {}).get(user_id)

    async def insert_media_content(self, doc: dict):
        media_id = str(doc.get("_id", doc.get("id")))
        self._data["media_contents"][media_id] = doc
        self._save()
        return media_id

    async def find_media_content(self, media_id: str):
        return self._data.get("media_contents", {}).get(media_id)

    async def list_media_contents_by_user(self, user_id: str):
        media_dict = self._data.get("media_contents", {})
        items = [m for m in media_dict.values() if isinstance(m, dict) and m.get("user_id") == user_id]
        items.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
        return items

    async def insert_message(self, doc: dict):
        if "messages" not in self._data or not isinstance(self._data.get("messages"), list):
            self._data["messages"] = []
        self._data["messages"].append(doc)
        self._save()

    async def get_chat_history(self, media_content_id: str):
        messages_list = self._data.get("messages", [])
        return [m for m in messages_list if isinstance(m, dict) and m.get("media_content_id") == media_content_id]


class DatabaseManager:
    client: AsyncIOMotorClient = None
    db = None
    is_mongo_connected: bool = False
    json_fallback: JSONFallbackStore = JSONFallbackStore()

db_manager = DatabaseManager()

async def connect_to_mongo():
    try:
        db_manager.client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=2000)
        # Test connection
        await db_manager.client.admin.command('ping')
        db_manager.db = db_manager.client[DB_NAME]
        db_manager.is_mongo_connected = True
        logger.info(f"Successfully connected to MongoDB at {MONGODB_URI} (DB: {DB_NAME})")
    except Exception as e:
        db_manager.client = None
        db_manager.db = None
        db_manager.is_mongo_connected = False
        logger.warning(f"MongoDB offline/unreachable at {MONGODB_URI}. Active storage: Local JSON Fallback ({FALLBACK_FILE}).")

async def close_mongo_connection():
    if db_manager.client:
        db_manager.client.close()
        logger.info("MongoDB connection closed.")

def get_db_manager() -> DatabaseManager:
    return db_manager

def get_database():
    return db_manager.db
