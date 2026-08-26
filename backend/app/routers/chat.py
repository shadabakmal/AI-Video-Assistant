import uuid
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from app.models import ChatRequest
from app.security import get_current_user_id
from app.database import get_db_manager
from app.services.grok_service import ask_grok_rag

router = APIRouter(prefix="/api/chat", tags=["Q&A Chat System"])
logger = logging.getLogger("uvicorn")

@router.post("/ask")
async def ask_question(req: ChatRequest, user_id: str = Depends(get_current_user_id)):
    mgr = get_db_manager()
    media_id = req.media_content_id
    question = req.question.strip()

    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # 1. Fetch target media content (transcript) from MongoDB / Fallback store
    if mgr.is_mongo_connected and mgr.db is not None:
        media_doc = await mgr.db.media_contents.find_one({"_id": media_id})
    else:
        media_doc = await mgr.json_fallback.find_media_content(media_id)

    if not media_doc:
        raise HTTPException(status_code=404, detail="Media content not found for this ID")

    transcript_context = media_doc.get("transcript", "")

    # 2. Fetch existing chat history for this media_content_id
    if mgr.is_mongo_connected and mgr.db is not None:
        history_cursor = mgr.db.messages.find({"media_content_id": media_id}).sort("created_at", 1)
        history = await history_cursor.to_list(length=100)
    else:
        history = await mgr.json_fallback.get_chat_history(media_id)

    # 3. Query Grok RAG Engine with transcript context + history + user question
    grok_answer = ask_grok_rag(
        transcript_context=transcript_context,
        chat_history=history,
        user_question=question
    )

    now = datetime.utcnow().isoformat()
    
    # 4. Save both user and assistant messages to MongoDB
    user_msg_doc = {
        "_id": str(uuid.uuid4()),
        "media_content_id": media_id,
        "user_id": user_id,
        "role": "user",
        "content": question,
        "created_at": now
    }

    assistant_msg_doc = {
        "_id": str(uuid.uuid4()),
        "media_content_id": media_id,
        "user_id": user_id,
        "role": "assistant",
        "content": grok_answer,
        "created_at": now
    }

    try:
        if mgr.is_mongo_connected and mgr.db is not None:
            await mgr.db.messages.insert_many([user_msg_doc, assistant_msg_doc])
        else:
            await mgr.json_fallback.insert_message(user_msg_doc)
            await mgr.json_fallback.insert_message(assistant_msg_doc)
    except Exception as e:
        logger.error(f"Error saving chat messages to DB: {e}")
        await mgr.json_fallback.insert_message(user_msg_doc)
        await mgr.json_fallback.insert_message(assistant_msg_doc)

    user_msg_doc["id"] = user_msg_doc.pop("_id")
    assistant_msg_doc["id"] = assistant_msg_doc.pop("_id")

    return {
        "user_message": user_msg_doc,
        "assistant_message": assistant_msg_doc
    }


@router.get("/history/{media_content_id}")
async def get_chat_history(media_content_id: str, user_id: str = Depends(get_current_user_id)):
    mgr = get_db_manager()
    try:
        if mgr.is_mongo_connected and mgr.db is not None:
            cursor = mgr.db.messages.find({"media_content_id": media_content_id}).sort("created_at", 1)
            messages = await cursor.to_list(length=200)
            for m in messages:
                m["id"] = str(m.pop("_id"))
            return messages
        else:
            return await mgr.json_fallback.get_chat_history(media_content_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch chat history: {str(e)}")
