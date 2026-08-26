import uuid
import logging
from datetime import datetime
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Response
from fastapi.responses import JSONResponse, PlainTextResponse
from app.schemas import ProcessVideoRequest, MeetingResponse, ToggleActionItemRequest
from app.database import get_db_manager
from app.services.audio_service import download_youtube_audio
from app.services.transcriber_service import transcribe_audio
from app.services.analysis_service import analyze_transcript
from app.services.rag_service import index_transcript_segments

router = APIRouter(prefix="/meetings", tags=["meetings"])
logger = logging.getLogger("uvicorn")

async def run_pipeline_task(meeting_id: str, source_url: str, source_type: str, language: str):
    mgr = get_db_manager()
    
    async def update_status(status: str, progress: int, step: str, err: str = None):
        fields = {
            "status": status,
            "progress_percentage": progress,
            "step_message": step,
            "error_message": err
        }
        try:
            if mgr.is_mongo_connected and mgr.db is not None:
                await mgr.db.meetings.update_one({"meeting_id": meeting_id}, {"$set": fields})
            else:
                await mgr.json_fallback.update_meeting(meeting_id, fields)
        except Exception as e:
            logger.error(f"Status update error: {e}")

    try:
        # Step 1: Downloading Audio
        await update_status("downloading", 20, "Downloading video and extracting audio track...")
        audio_info = download_youtube_audio(source_url, meeting_id)
        
        title = audio_info.get("title", "Untitled Meeting")
        youtube_id = audio_info.get("youtube_id")
        audio_path = audio_info.get("audio_path")
        duration = audio_info.get("duration", 0.0)

        # Step 2: Transcribing Audio with Whisper
        await update_status("transcribing", 50, "Running Whisper AI speech-to-text with timestamping...")
        transcription_res = transcribe_audio(audio_path, language=language)
        
        full_text = transcription_res.get("full_text", "")
        segments = transcription_res.get("segments", [])

        # Step 3: Extracting AI Intelligence (Summary, Action Items, Decisions)
        await update_status("analyzing", 75, "Analyzing meeting content with Mistral AI...")
        analysis_res = analyze_transcript(full_text)
        
        extracted_title = analysis_res.get("title", title)
        if extracted_title and extracted_title != "Meeting Analysis":
            title = extracted_title

        # Step 4: Indexing in Vector Database
        await update_status("indexing", 90, "Building ChromaDB vector embeddings for Q&A chat...")
        index_transcript_segments(meeting_id, segments)

        # Step 5: Save Complete Meeting Document
        complete_fields = {
            "title": title,
            "youtube_id": youtube_id,
            "duration": duration,
            "full_text": full_text,
            "segments": segments,
            "summary": analysis_res.get("executive_summary", ""),
            "action_items": analysis_res.get("action_items", []),
            "key_decisions": analysis_res.get("key_decisions", []),
            "open_questions": analysis_res.get("open_questions", []),
            "status": "completed",
            "progress_percentage": 100,
            "step_message": "Processing complete!",
            "updated_at": datetime.utcnow().isoformat()
        }

        if mgr.is_mongo_connected and mgr.db is not None:
            await mgr.db.meetings.update_one({"meeting_id": meeting_id}, {"$set": complete_fields})
        else:
            await mgr.json_fallback.update_meeting(meeting_id, complete_fields)
            
        logger.info(f"Pipeline finished successfully for meeting {meeting_id}")

    except Exception as e:
        logger.error(f"Pipeline error for meeting {meeting_id}: {e}")
        await update_status("failed", 0, "Processing failed", str(e))


@router.post("/process")
async def process_video(req: ProcessVideoRequest, background_tasks: BackgroundTasks):
    mgr = get_db_manager()
    meeting_id = str(uuid.uuid4())
    
    doc = {
        "meeting_id": meeting_id,
        "title": "Processing Video...",
        "source_url": req.source_url,
        "source_type": req.source_type,
        "language": req.language,
        "youtube_id": None,
        "duration": 0.0,
        "status": "pending",
        "progress_percentage": 5,
        "step_message": "Initializing task...",
        "created_at": datetime.utcnow().isoformat(),
        "segments": [],
        "summary": "",
        "action_items": [],
        "key_decisions": [],
        "open_questions": []
    }

    try:
        if mgr.is_mongo_connected and mgr.db is not None:
            await mgr.db.meetings.insert_one(doc)
        else:
            await mgr.json_fallback.insert_meeting(doc)
    except Exception as e:
        logger.warning(f"Storage insert error: {e}. Using JSON fallback.")
        await mgr.json_fallback.insert_meeting(doc)

    background_tasks.add_task(
        run_pipeline_task,
        meeting_id=meeting_id,
        source_url=req.source_url,
        source_type=req.source_type,
        language=req.language
    )

    return {"meeting_id": meeting_id, "status": "pending", "message": "Video processing started."}


@router.get("/status/{meeting_id}")
async def get_processing_status(meeting_id: str):
    mgr = get_db_manager()
    doc = None
    
    try:
        if mgr.is_mongo_connected and mgr.db is not None:
            doc = await mgr.db.meetings.find_one({"meeting_id": meeting_id}, {"_id": 0})
        else:
            doc = await mgr.json_fallback.find_meeting(meeting_id)
    except Exception:
        doc = await mgr.json_fallback.find_meeting(meeting_id)

    if not doc:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    return {
        "meeting_id": meeting_id,
        "status": doc.get("status", "pending"),
        "progress_percentage": doc.get("progress_percentage", 0),
        "step_message": doc.get("step_message", ""),
        "error_message": doc.get("error_message")
    }


@router.get("/")
async def list_meetings():
    mgr = get_db_manager()
    try:
        if mgr.is_mongo_connected and mgr.db is not None:
            cursor = mgr.db.meetings.find({}, {"_id": 0, "full_text": 0, "segments": 0}).sort("created_at", -1)
            return await cursor.to_list(length=100)
        else:
            return await mgr.json_fallback.list_meetings()
    except Exception as e:
        logger.warning(f"MongoDB list error: {e}. Falling back to local JSON store.")
        return await mgr.json_fallback.list_meetings()


@router.get("/{meeting_id}")
async def get_meeting(meeting_id: str):
    mgr = get_db_manager()
    doc = None
    try:
        if mgr.is_mongo_connected and mgr.db is not None:
            doc = await mgr.db.meetings.find_one({"meeting_id": meeting_id}, {"_id": 0})
        else:
            doc = await mgr.json_fallback.find_meeting(meeting_id)
    except Exception:
        doc = await mgr.json_fallback.find_meeting(meeting_id)

    if not doc:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return doc


@router.patch("/{meeting_id}/action-items/{item_id}")
async def toggle_action_item(meeting_id: str, item_id: str, req: ToggleActionItemRequest):
    mgr = get_db_manager()
    success = False
    
    try:
        if mgr.is_mongo_connected and mgr.db is not None:
            res = await mgr.db.meetings.update_one(
                {"meeting_id": meeting_id, "action_items.id": item_id},
                {"$set": {"action_items.$.completed": req.completed}}
            )
            success = res.matched_count > 0
        else:
            success = await mgr.json_fallback.toggle_action_item(meeting_id, item_id, req.completed)
    except Exception:
        success = await mgr.json_fallback.toggle_action_item(meeting_id, item_id, req.completed)

    if not success:
        raise HTTPException(status_code=404, detail="Meeting or action item not found")
    return {"success": True, "completed": req.completed}


@router.delete("/{meeting_id}")
async def delete_meeting(meeting_id: str):
    mgr = get_db_manager()
    deleted = False
    
    try:
        if mgr.is_mongo_connected and mgr.db is not None:
            res = await mgr.db.meetings.delete_one({"meeting_id": meeting_id})
            deleted = res.deleted_count > 0
        else:
            deleted = await mgr.json_fallback.delete_meeting(meeting_id)
    except Exception:
        deleted = await mgr.json_fallback.delete_meeting(meeting_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"success": True, "message": "Meeting deleted"}


@router.get("/{meeting_id}/export")
async def export_meeting(meeting_id: str, format: str = Query("txt", pattern="^(txt|json)$")):
    mgr = get_db_manager()
    doc = None
    try:
        if mgr.is_mongo_connected and mgr.db is not None:
            doc = await mgr.db.meetings.find_one({"meeting_id": meeting_id}, {"_id": 0})
        else:
            doc = await mgr.json_fallback.find_meeting(meeting_id)
    except Exception:
        doc = await mgr.json_fallback.find_meeting(meeting_id)

    if not doc:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if format == "json":
        return JSONResponse(content=doc)

    # TXT Export format
    lines = [
        f"📌 TITLE: {doc.get('title', '')}",
        f"📅 DATE: {doc.get('created_at', '')}",
        f"🔗 SOURCE: {doc.get('source_url', '')}",
        "\n" + "=" * 60,
        "📋 EXECUTIVE SUMMARY",
        "=" * 60,
        doc.get("summary", ""),
        "\n" + "=" * 60,
        "✅ ACTION ITEMS",
        "=" * 60,
    ]
    for item in doc.get("action_items", []):
        status = "[X]" if item.get("completed") else "[ ]"
        lines.append(f"{status} {item.get('task', '')} (Assignee: {item.get('assignee', 'Unassigned')})")
        
    lines.extend([
        "\n" + "=" * 60,
        "🔑 KEY DECISIONS",
        "=" * 60,
    ])
    for d in doc.get("key_decisions", []):
        lines.append(f"• {d}")

    lines.extend([
        "\n" + "=" * 60,
        "📝 FULL TRANSCRIPT WITH TIMESTAMPS",
        "=" * 60,
    ])
    for seg in doc.get("segments", []):
        st = seg.get("start", 0)
        ts = f"[{int(st // 60):02d}:{int(st % 60):02d}]"
        lines.append(f"{ts} {seg.get('text', '')}")

    content = "\n".join(lines)
    return PlainTextResponse(content=content, headers={"Content-Disposition": f"attachment; filename=meeting_{meeting_id[:8]}.txt"})
