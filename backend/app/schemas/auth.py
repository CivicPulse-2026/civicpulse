from pydantic import BaseModel, EmailStr, Field


from typing import Literal


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    city: str = Field(min_length=2, max_length=80)
    # Which kind of account to create. Defaults to citizen.
    role: Literal["citizen", "officer", "admin"] = "citizen"
    phone: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    city: str | None = None
    phone: str | None = None


class AuthResponse(BaseModel):
    token: str
    user: UserOut
