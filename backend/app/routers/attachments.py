"""Simple file upload endpoint for attachments.

Saves uploaded files to a static uploads folder and returns their public URLs and metadata.
"""

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
import logging
import base64

from app.dependencies import CurrentUser

router = APIRouter(prefix="", tags=["attachments"])

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "static" / "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/attachments")
async def upload_attachments(current_user: CurrentUser, request: Request):
    """Accept multipart form-data and store uploaded files.

    This implementation avoids FastAPI's automatic multipart validation so the
    test environment doesn't require python-multipart at import-time. It uses
    the Starlette request.form() runtime parser if available.
    """
    results = []
    logger = logging.getLogger("app.routers.attachments")
    logger.debug("upload_attachments called; content-type=%s", request.headers.get("content-type"))

    # First attempt: parse multipart/form-data (requires python-multipart at runtime)
    try:
        form = await request.form()
        logger.debug("parsed form with %d fields", len(list(form.keys())))
        # form may contain UploadFile instances as values
        for field in form.values():
            # Starlette UploadFile has filename and content_type and .read()
            if hasattr(field, "filename") and getattr(field, "filename"):
                f = field
                ext = Path(f.filename).suffix
                fname = f"{uuid.uuid4().hex}{ext}"
                dest = UPLOAD_DIR / fname
                try:
                    content = await f.read()
                    with open(dest, "wb") as out:
                        out.write(content)
                except Exception as e:
                    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
                url = f"/static/uploads/{fname}"
                results.append({
                    "filename": f.filename,
                    "url": url,
                    "content_type": getattr(f, "content_type", "application/octet-stream"),
                    "size": len(content),
                })
        logger.debug("multipart upload results=%s", results)
        return JSONResponse(results)
    except Exception:
        # If multipart parsing failed (e.g., python-multipart missing), fall back to JSON body
        pass

    # Fallback: accept JSON payload. Expected formats:
    # - An array of file objects: [{"filename":..., "content": "<base64>", "content_type": ...}, ...]
    # - An object with key "files": [ ... ]
    try:
        body = await request.json()
        logger.debug("fallback json body parsed")
    except Exception:
        logger.exception("failed to parse json fallback")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid form data")

    files = []
    if isinstance(body, list):
        files = body
    elif isinstance(body, dict) and "files" in body:
        files = body["files"]
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid form data")

    for f in files:
        try:
            filename = f.get("filename")
            b64 = f.get("content")
            ctype = f.get("content_type") or "application/octet-stream"
            if not filename or not b64:
                continue
            content = base64.b64decode(b64)
            ext = Path(filename).suffix
            fname = f"{uuid.uuid4().hex}{ext}"
            dest = UPLOAD_DIR / fname
            with open(dest, "wb") as out:
                out.write(content)
            url = f"/static/uploads/{fname}"
            results.append({
                "filename": filename,
                "url": url,
                "content_type": ctype,
                "size": len(content),
            })
        except Exception as e:
            logger.exception("error saving fallback file %s", filename)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    logger.debug("fallback upload results=%s", results)
    return JSONResponse(results)
