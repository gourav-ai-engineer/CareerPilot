from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.application import Application
from app.models.user import User
from app.schemas.application import ApplicationCreate, ApplicationResponse, ApplicationUpdate

router = APIRouter(prefix="/applications", tags=["applications"])


@router.get("", response_model=list[ApplicationResponse])
def list_applications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    company: str | None = None,
    applied_from: date | None = None,
    applied_to: date | None = None,
    q: str | None = Query(default=None, max_length=160),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[Application]:
    query = select(Application).where(Application.user_id == user.id)
    if status_filter:
        query = query.where(Application.status == status_filter)
    if company:
        query = query.where(Application.company.ilike(f"%{company.strip()}%"))
    if applied_from:
        query = query.where(Application.applied_on >= applied_from)
    if applied_to:
        query = query.where(Application.applied_on <= applied_to)
    if q:
        term = f"%{q.strip()}%"
        query = query.where(Application.company.ilike(term) | Application.role.ilike(term))
    return list(db.scalars(query.order_by(Application.updated_at.desc()).limit(limit).offset(offset)).all())


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Application:
    application = Application(user_id=user.id, **payload.model_dump(mode="json"))
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


def owned_application(application_id: int, user: User, db: Session) -> Application:
    application = db.scalar(select(Application).where(
        Application.id == application_id, Application.user_id == user.id
    ))
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return application


@router.get("/{application_id}", response_model=ApplicationResponse)
def get_application(
    application_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Application:
    return owned_application(application_id, user, db)


@router.patch("/{application_id}", response_model=ApplicationResponse)
def update_application(
    application_id: int,
    payload: ApplicationUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Application:
    application = owned_application(application_id, user, db)
    for key, value in payload.model_dump(exclude_unset=True, mode="json").items():
        setattr(application, key, value)
    db.commit()
    db.refresh(application)
    return application


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    application_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    application = owned_application(application_id, user, db)
    db.delete(application)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
