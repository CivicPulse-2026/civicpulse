"""Application settings loaded from environment / .env file."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    mongodb_url: str = "mongodb://127.0.0.1:27017"
    database_name: str = "civicpulse"

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 720

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    upload_dir: str = "uploads"

    # Cloudinary — when all three are set, complaint photos are uploaded there
    # instead of the local disk. Left blank -> falls back to local /uploads.
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    cloudinary_folder: str = "civicpulse/complaints"

    # Photo upload limits (validated before storage).
    max_photo_mb: float = 5.0
    max_photos_per_complaint: int = 5
    allowed_image_types: str = "image/jpeg,image/png,image/webp,image/gif"

    @property
    def allowed_image_type_set(self) -> set[str]:
        return {t.strip().lower() for t in self.allowed_image_types.split(",") if t.strip()}

    @property
    def max_photo_bytes(self) -> int:
        return int(self.max_photo_mb * 1024 * 1024)

    @property
    def cloudinary_enabled(self) -> bool:
        return bool(
            self.cloudinary_cloud_name
            and self.cloudinary_api_key
            and self.cloudinary_api_secret
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
