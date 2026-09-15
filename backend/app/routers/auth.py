from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import get_database
from app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.models.enums import Role
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserOut
from app.services.complaint_service import now

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_out(doc: dict) -> UserOut:
    return UserOut(
        id=str(doc["_id"]),
        name=doc["name"],
        email=doc["email"],
        role=doc["role"],
        city=doc.get("city"),
        phone=doc.get("phone"),
    )


@router.post("/register", response_model=AuthResponse)
async def register(payload: RegisterRequest, db=Depends(get_database)):
    if await db.users.find_one({"email": payload.email}):
        raise HTTPException(status_code=400, detail="Email already registered.")
    doc = {
        "name": payload.name,
        "email": payload.email,
        "password": hash_password(payload.password),
        "role": payload.role or Role.CITIZEN.value,
        "city": payload.city,
        "phone": payload.phone,
        "created_at": now(),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    token = create_access_token(str(doc["_id"]), doc["role"], doc["name"])
    return AuthResponse(token=token, user=_user_out(doc))


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, db=Depends(get_database)):
    user = await db.users.find_one({"email": payload.email})
    if not user or not verify_password(payload.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    token = create_access_token(str(user["_id"]), user["role"], user["name"])
    return AuthResponse(token=token, user=_user_out(user))


@router.get("/me", response_model=dict)
async def me(user=Depends(get_current_user)):
    return {"user": _user_out(user)}


@router.post("/logout")
async def logout(user=Depends(get_current_user)):
    return {"message": "Logged out."}
