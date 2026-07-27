# SplitEase/backend/routers/routines.py


from datetime import date as date_cls

from fastapi import APIRouter, Depends, HTTPException, status
from schemas.routines import RoutineCreate, RoutineUpdate, RoutineExecuteRequest, RoutineSkipRequest
from repositories import routine_repository, group_repository
from services import quick_entry_service, routine_status_service
from core.dependencies import get_current_user

router = APIRouter()


@router.get("/")
def list_routines(current_user: dict = Depends(get_current_user)):
    return routine_repository.fetch_routines(current_user["user_id"])


# NOTE: must be registered before GET /{routine_id} — FastAPI matches routes
# in registration order, and /{routine_id} would otherwise swallow "/status"
# as its int path param and 422 before this route is ever reached.
@router.get("/status")
def routines_status(current_user: dict = Depends(get_current_user)):
    return routine_status_service.compute_routine_status(current_user["user_id"])


@router.post("/{routine_id}/skip", status_code=status.HTTP_201_CREATED)
def skip_routine_day(routine_id: int, body: RoutineSkipRequest, current_user: dict = Depends(get_current_user)):
    existing = routine_repository.fetch_routine_detail(routine_id, current_user["user_id"])
    if existing is None:
        raise HTTPException(status_code=404, detail="Routine not found.")
    try:
        skip_date = date_cls.fromisoformat(body.date)
    except ValueError:
        raise HTTPException(status_code=422, detail="date must be YYYY-MM-DD.")
    routine_repository.insert_skip(routine_id, skip_date)
    return {"message": "Day marked as not required."}


@router.delete("/{routine_id}/skip/{skip_date}")
def unskip_routine_day(routine_id: int, skip_date: str, current_user: dict = Depends(get_current_user)):
    existing = routine_repository.fetch_routine_detail(routine_id, current_user["user_id"])
    if existing is None:
        raise HTTPException(status_code=404, detail="Routine not found.")
    try:
        parsed = date_cls.fromisoformat(skip_date)
    except ValueError:
        raise HTTPException(status_code=422, detail="skip_date must be YYYY-MM-DD.")
    routine_repository.delete_skip(routine_id, parsed)
    return {"message": "Skip removed."}


@router.get("/{routine_id}")
def get_routine(routine_id: int, current_user: dict = Depends(get_current_user)):
    routine = routine_repository.fetch_routine_detail(routine_id, current_user["user_id"])
    if routine is None:
        raise HTTPException(status_code=404, detail="Routine not found.")
    return routine


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_routine(body: RoutineCreate, current_user: dict = Depends(get_current_user)):
    routine_id = routine_repository.insert_routine(
        user_id     = current_user["user_id"],
        name        = body.name,
        icon_name   = body.icon_name,
        active_days = body.active_days,
        items       = [i.model_dump() for i in body.items],
    )
    return {"routine_id": routine_id, "message": "Routine created."}


@router.put("/{routine_id}")
def update_routine(routine_id: int, body: RoutineUpdate, current_user: dict = Depends(get_current_user)):
    existing = routine_repository.fetch_routine_detail(routine_id, current_user["user_id"])
    if existing is None:
        raise HTTPException(status_code=404, detail="Routine not found.")
    routine_repository.update_routine(
        routine_id  = routine_id,
        user_id     = current_user["user_id"],
        name        = body.name,
        icon_name   = body.icon_name,
        active_days = body.active_days,
        items       = [i.model_dump() for i in body.items],
    )
    return {"message": "Routine updated."}


@router.delete("/{routine_id}")
def delete_routine(routine_id: int, current_user: dict = Depends(get_current_user)):
    existing = routine_repository.fetch_routine_detail(routine_id, current_user["user_id"])
    if existing is None:
        raise HTTPException(status_code=404, detail="Routine not found.")
    routine_repository.delete_routine(routine_id, current_user["user_id"])
    return {"message": "Routine deleted."}


@router.post("/{routine_id}/execute", status_code=status.HTTP_201_CREATED)
def execute_routine(routine_id: int, body: RoutineExecuteRequest, current_user: dict = Depends(get_current_user)):
    try:
        return quick_entry_service.execute_routine(routine_id, current_user["user_id"], body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))