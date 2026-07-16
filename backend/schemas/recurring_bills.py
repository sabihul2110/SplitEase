# SplitEase/backend/schemas/recurring_bills.py


from pydantic import BaseModel, field_validator, model_validator
from schemas.quick_templates import SplitConfigItem


class RecurringBillBase(BaseModel):
    name:           str
    icon_name:      str
    group_id:       int | None = None
    category_id:    int
    subcategory_id: int | None = None
    cron_day:       int
    split_type:     str = "equal"
    split_config:   list[SplitConfigItem] | None = None

    @field_validator("cron_day")
    @classmethod
    def validate_cron_day(cls, v: int) -> int:
        if not (1 <= v <= 31):
            raise ValueError("cron_day must be between 1 and 31.")
        return v

    @field_validator("split_type")
    @classmethod
    def validate_split_type(cls, v: str) -> str:
        if v not in ("equal", "custom"):
            raise ValueError("split_type must be 'equal' or 'custom'.")
        return v

    @model_validator(mode="after")
    def validate_custom_split(self) -> "RecurringBillBase":
        if self.split_type == "custom":
            if self.group_id is None:
                raise ValueError("Custom splits require a group_id.")
            if not self.split_config:
                raise ValueError("split_config is required when split_type is 'custom'.")
            total_pct = sum(item.share_pct for item in self.split_config)
            if abs(total_pct - 100.0) > 0.5:
                raise ValueError(f"split_config percentages must sum to 100 (got {total_pct}).")
        return self


class RecurringBillCreate(RecurringBillBase):
    pass


class RecurringBillUpdate(RecurringBillBase):
    pass


class RecurringBillOut(RecurringBillBase):
    bill_id:    int
    user_id:    int
    created_at: str