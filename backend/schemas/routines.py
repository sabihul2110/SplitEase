#SplitEase/backend/schemas/routines.py


from pydantic import BaseModel


class RoutineItemIn(BaseModel):
    template_id: int
    sort_order: int = 0
    default_included: bool = True
    modifier_schema: list[dict] | None = None


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
    modifier_answers: dict | None = None


class RoutineExecuteRequest(BaseModel):
    expense_date: str
    items: list[RoutineRunItem]


class RoutineSkipRequest(BaseModel):
    date: str  # YYYY-MM-DD — the active day being marked "not required"


class RoutineStatusOut(BaseModel):
    routine_id: int
    name: str
    icon_name: str
    active_days: str
    today_status: str               # 'done' | 'pending' | 'skipped' | 'inactive_today'
    pending_catchup_dates: list[str]