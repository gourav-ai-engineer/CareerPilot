from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.application import Application, ApplicationStatus
from app.models.user import User

router = APIRouter(tags=["stats"])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    counts = dict(db.execute(
        select(Application.status, func.count(Application.id))
        .where(Application.user_id == user.id)
        .group_by(Application.status)
    ).all())
    total = sum(counts.values())
    responded = counts.get(ApplicationStatus.OA, 0) + counts.get(ApplicationStatus.INTERVIEW, 0) + counts.get(ApplicationStatus.OFFER, 0) + counts.get(ApplicationStatus.REJECTED, 0)
    return {
        "total_applications": total,
        "response_rate": round((responded / total) * 100, 1) if total else 0.0,
        "status_funnel": {item.value: counts.get(item, 0) for item in ApplicationStatus},
    }
