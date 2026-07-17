#SplitEase/backend/schemas/routines.py


from pydantic import BaseModel


class RoutineItemIn(BaseModel):
    template_id: int
    sort_order: int = 0
    default_included: bool = True


class RoutineCreate(BaseModel):
    name: str
    icon_name: str
    active_days: str = "1,2,3,4,5"
    items: list[RoutineItemIn]


class RoutineUpdate(RoutineCreate):
    pass


class RoutineRunItem(BaseModel):
    template_id: int
    include: bool
    amount: float | None = None
    note: str | None = None


class RoutineExecuteRequest(BaseModel):
    expense_date: str
    items: list[RoutineRunItem]