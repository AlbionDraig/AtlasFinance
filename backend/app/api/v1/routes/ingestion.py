from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.base import get_db
from app.models.user import User
from app.schemas.etl import IngestionResult
from app.services.ingestion_service import ingest_transactions

router = APIRouter()


@router.post("/upload", responses={400: {"description": "Bad Request"}})
def upload_transactions(
    source: Annotated[str, Form(...)],
    account_id: Annotated[int, Form(...)],
    file: Annotated[UploadFile, File(...)],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> IngestionResult:
    try:
        content = file.file.read()
        return ingest_transactions(
            db=db,
            user_id=current_user.id,
            account_id=account_id,
            source=source,
            filename=file.filename or "upload",
            content=content,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
