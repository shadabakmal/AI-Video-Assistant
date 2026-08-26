from fastapi import APIRouter, HTTPException, status, Depends
from app.models import MediaProcessRequest
from app.security import get_current_user_id
from app.services.media_service import process_media_content
from app.database import get_db_manager

router = APIRouter(prefix="/api/media", tags=["Media Processing"])

@router.post("/process", status_code=status.HTTP_201_CREATED)
async def process_media(req: MediaProcessRequest, user_id: str = Depends(get_current_user_id)):
    if not req.mediaUrl:
        raise HTTPException(status_code=400, detail="Media URL is required.")

    try:
        result = await process_media_content(
            user_id=user_id,
            media_url=req.mediaUrl,
            media_type=req.mediaType,
            language=req.language or "english"
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Media processing failed: {str(e)}")


@router.get("/user/list")
async def get_user_media_list(user_id: str = Depends(get_current_user_id)):
    mgr = get_db_manager()
    try:
        if mgr.is_mongo_connected and mgr.db is not None:
            cursor = mgr.db.media_contents.find({"user_id": user_id}).sort("created_at", -1)
            items = await cursor.to_list(length=100)
            for item in items:
                item["id"] = str(item.pop("_id"))
            return items
        else:
            return await mgr.json_fallback.list_media_contents_by_user(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch media list: {str(e)}")


@router.get("/{media_id}")
async def get_media_detail(media_id: str, user_id: str = Depends(get_current_user_id)):
    mgr = get_db_manager()
    try:
        if mgr.is_mongo_connected and mgr.db is not None:
            doc = await mgr.db.media_contents.find_one({"_id": media_id})
            if doc:
                doc["id"] = str(doc.pop("_id"))
        else:
            doc = await mgr.json_fallback.find_media_content(media_id)

        if not doc:
            raise HTTPException(status_code=404, detail="Media content not found")

        return doc
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch media details: {str(e)}")
