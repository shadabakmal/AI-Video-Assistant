import uuid
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException
from app.schemas import AskQuestionRequest
from app.database import get_db_manager
from app.services.rag_service import query_meeting_rag

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger("uvicorn")

@router.post("/ask")
async def ask_question(req: AskQuestionRequest):
    mgr = get_db_manager()
    meeting_id = req.meeting_id
    question = req.question.strip()
    
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # Retrieve RAG answer
    answer = query_meeting_rag(meeting_id, question)

    user_msg_id = str(uuid.uuid4())
    ai_msg_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    user_doc = {
        "id": user_msg_id,
        "meeting_id": meeting_id,
        "sender": "user",
        "text": question,
        "created_at": now
    }

    ai_doc = {
        "id": ai_msg_id,
        "meeting_id": meeting_id,
        "sender": "assistant",
        "text": answer,
        "created_at": now
    }

    try:
        if mgr.is_mongo_connected and mgr.db is not None:
            await mgr.db.chat_history.insert_many([user_doc, ai_doc])
        else:
            await mgr.json_fallback.insert_chat_messages([user_doc, ai_doc])
    except Exception:
        await mgr.json_fallback.insert_chat_messages([user_doc, ai_doc])

    return {"user_message": user_doc, "assistant_message": ai_doc}


@router.get("/history/{meeting_id}")
async def get_chat_history(meeting_id: str):
    mgr = get_db_manager()
    try:
        if mgr.is_mongo_connected and mgr.db is not None:
            cursor = mgr.db.chat_history.find({"meeting_id": meeting_id}, {"_id": 0}).sort("created_at", 1)
            return await cursor.to_list(length=200)
        else:
            return await mgr.json_fallback.get_chat_history(meeting_id)
    except Exception:
        return await mgr.json_fallback.get_chat_history(meeting_id)
