# SplitEase/backend/routers/quick_templates.py


from fastapi import APIRouter, Depends, HTTPException, status
from schemas.quick_templates import QuickTemplateCreate, QuickTemplateUpdate, QuickTemplateExecuteRequest
from repositories import quick_template_repository, group_repository
from services import quick_entry_service
from core.dependencies import get_current_user

router = APIRouter()


@router.get("/")
def list_templates(current_user: dict = Depends(get_current_user)):
    return quick_template_repository.fetch_templates(current_user["user_id"])


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_template(body: QuickTemplateCreate, current_user: dict = Depends(get_current_user)):
    if body.group_id and not group_repository.is_group_member(body.group_id, current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Not a member of this group.")
    template_id = quick_template_repository.insert_template(
        user_id        = current_user["user_id"],
        name           = body.name,
        icon_name      = body.icon_name,
        default_amount = body.default_amount,
        default_time   = body.default_time,
        group_id       = body.group_id,
        category_id    = body.category_id,
        subcategory_id = body.subcategory_id,
        split_type     = body.split_type,
        split_config   = [i.model_dump() for i in body.split_config] if body.split_config else None,
    )
    return {"template_id": template_id, "message": "Template created."}


@router.put("/{template_id}")
def update_template(template_id: int, body: QuickTemplateUpdate, current_user: dict = Depends(get_current_user)):
    existing = quick_template_repository.fetch_template(template_id, current_user["user_id"])
    if existing is None:
        raise HTTPException(status_code=404, detail="Template not found.")
    if body.group_id and not group_repository.is_group_member(body.group_id, current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Not a member of this group.")
    quick_template_repository.update_template(
        template_id    = template_id,
        user_id        = current_user["user_id"],
        name           = body.name,
        icon_name      = body.icon_name,
        default_amount = body.default_amount,
        default_time   = body.default_time,
        group_id       = body.group_id,
        category_id    = body.category_id,
        subcategory_id = body.subcategory_id,
        split_type     = body.split_type,
        split_config   = [i.model_dump() for i in body.split_config] if body.split_config else None,
    )
    return {"message": "Template updated."}


@router.delete("/{template_id}")
def delete_template(template_id: int, current_user: dict = Depends(get_current_user)):
    existing = quick_template_repository.fetch_template(template_id, current_user["user_id"])
    if existing is None:
        raise HTTPException(status_code=404, detail="Template not found.")
    quick_template_repository.delete_template(template_id, current_user["user_id"])
    return {"message": "Template deleted."}


@router.post("/{template_id}/execute", status_code=status.HTTP_201_CREATED)
def execute_template(template_id: int, body: QuickTemplateExecuteRequest, current_user: dict = Depends(get_current_user)):
    try:
        return quick_entry_service.execute_template(template_id, current_user["user_id"], body)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not a member of this group.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))