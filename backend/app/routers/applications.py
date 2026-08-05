"""FastAPI router for /applications endpoints (status updates & tracking)."""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.dependencies import get_current_user_id
from app.models.drives import ApplicationResponse, ApplicationStatusUpdate
from app.services.drive_service import update_application_status

router = APIRouter(prefix="/applications", tags=["Applications"])


@router.patch(
    "/{id}",
    response_model=ApplicationResponse,
    status_code=status.HTTP_200_OK,
    summary="Update application status inline",
    description=(
        "Updates status for an application record. "
        "Automatically sets applied_at timestamp when status moves to 'applied' for the "
        "first time, leaving applied_at untouched on subsequent status changes."
    ),
)
async def update_status(
    id: str,
    payload: ApplicationStatusUpdate,
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> ApplicationResponse:
    return update_application_status(
        application_id=id,
        new_status=payload.status,
        notes=payload.notes,
        user_id=user_id,
    )
