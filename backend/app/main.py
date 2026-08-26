import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import STORAGE_DIR
from app.database import connect_to_mongo, close_mongo_connection
from app.routers import auth, media, chat

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn")

app = FastAPI(
    title="AI Video Assistant API",
    description="Full-stack AI Video Intelligence Platform powered by Grok, Whisper, MongoDB & Supabase",
    version="2.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static media storage directory
app.mount("/static", StaticFiles(directory=str(STORAGE_DIR)), name="static")

# Database lifecycle events
@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

# Router mounts
app.include_router(auth.router)
app.include_router(media.router)
app.include_router(chat.router)

@app.get("/")
def read_root():
    return {
        "app": "AI Video Assistant API",
        "version": "2.0.0",
        "docs": "/docs",
        "status": "online"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
