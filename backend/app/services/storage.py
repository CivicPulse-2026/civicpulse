"""Photo storage abstraction.

Uploads complaint photos to Cloudinary when it's configured, otherwise falls
back to writing them to the local ``uploads/`` directory. Either way the caller
gets back a URL/path it can persist on the complaint document.
"""

from __future__ import annotations

import os
import uuid

from app.core.config import settings

_cloudinary_ready = False

if settings.cloudinary_enabled:
    import cloudinary
    import cloudinary.uploader

    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )
    _cloudinary_ready = True


def storage_backend() -> str:
    return "cloudinary" if _cloudinary_ready else "local"


def _save_local(data: bytes, filename: str) -> str:
    os.makedirs(settings.upload_dir, exist_ok=True)
    ext = os.path.splitext(filename or "")[1][:10]
    fname = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(settings.upload_dir, fname)
    with open(path, "wb") as f:
        f.write(data)
    return f"/uploads/{fname}"


def save_photo(data: bytes, filename: str) -> str:
    """Persist one photo and return a URL (Cloudinary) or path (local).

    Cloudinary failures fall back to local disk so a report is never lost
    because of an upload hiccup.
    """
    if _cloudinary_ready:
        try:
            result = cloudinary.uploader.upload(
                data,
                folder=settings.cloudinary_folder,
                public_id=uuid.uuid4().hex,
                resource_type="image",
            )
            url = result.get("secure_url")
            if url:
                return url
        except Exception:
            # Network / auth error — degrade gracefully to local storage.
            pass
    return _save_local(data, filename)
