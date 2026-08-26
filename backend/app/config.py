import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

# MongoDB
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "ai_video_assistant")

# JWT Security
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-key-change-in-production-12345")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Grok / xAI / OpenRouter configuration
GROK_API_KEY = os.getenv("GROK_API_KEY", os.getenv("XAI_API_KEY", ""))
GROK_BASE_URL = os.getenv("GROK_BASE_URL", "https://api.x.ai/v1")  # Default to xAI official API endpoint
GROK_MODEL = os.getenv("GROK_MODEL", "grok-beta")  # e.g., grok-beta, grok-2-latest, or openrouter equivalent

# Legacy / Alternative API Keys
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")

# OpenAI Whisper API (optional, falls back to local Whisper if absent)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "small")

# Storage & Vector DB directories
STORAGE_DIR = BASE_DIR / "storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

VECTOR_DB_DIR = BASE_DIR / "vector_db"
VECTOR_DB_DIR.mkdir(parents=True, exist_ok=True)
