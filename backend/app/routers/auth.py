from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from app.database import get_db_manager
from app.models import UserCreate, UserResponse, TokenResponse
from app.security import hash_password, verify_password, create_access_token, get_current_user_id
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate):
    mgr = get_db_manager()
    
    # Check if user already exists
    if mgr.is_mongo_connected and mgr.db is not None:
        existing_user = await mgr.db.users.find_one({"email": user_in.email})
    else:
        existing_user = await mgr.json_fallback.find_user_by_email(user_in.email)

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered"
        )
    
    user_id = str(uuid.uuid4())
    hashed_pwd = hash_password(user_in.password)
    user_doc = {
        "_id": user_id,
        "email": user_in.email,
        "hashed_password": hashed_pwd,
        "created_at": datetime.utcnow().isoformat()
    }

    if mgr.is_mongo_connected and mgr.db is not None:
        await mgr.db.users.insert_one(user_doc)
    else:
        await mgr.json_fallback.insert_user(user_doc)

    return UserResponse(
        id=user_id,
        email=user_in.email,
        created_at=datetime.utcnow()
    )


@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    mgr = get_db_manager()
    
    if mgr.is_mongo_connected and mgr.db is not None:
        user = await mgr.db.users.find_one({"email": form_data.username})
    else:
        user = await mgr.json_fallback.find_user_by_email(form_data.username)

    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = str(user.get("_id", user.get("id")))
    access_token = create_access_token(data={"sub": user_id})
    return TokenResponse(access_token=access_token, token_type="bearer", user_id=user_id)


@router.get("/me", response_model=UserResponse)
async def get_me(user_id: str = Depends(get_current_user_id)):
    mgr = get_db_manager()
    
    if mgr.is_mongo_connected and mgr.db is not None:
        user = await mgr.db.users.find_one({"_id": user_id})
    else:
        user = await mgr.json_fallback.find_user_by_id(user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)

    return UserResponse(
        id=str(user.get("_id", user.get("id"))),
        email=user["email"],
        created_at=created_at or datetime.utcnow()
    )
