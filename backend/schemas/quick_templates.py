# SplitEase/backend/schemas/quick_templates.py


from pydantic import BaseModel, field_validator, model_validator


class SplitConfigItem(BaseModel):
    user_id:   int
    share_pct: float


class QuickTemplateBase(BaseModel):
    name:           str
    icon_name:      str
    default_amount: float | None = None
    default_time:   str = "09:00:00"      # HH:MM or HH:MM:SS
    group_id:       int | None = None
    category_id:    int
    subcategory_id: int | None = None
    split_type:     str = "equal"
    split_config:   list[SplitConfigItem] | None = None

    @field_validator("split_type")
    @classmethod
    def validate_split_type(cls, v: str) -> str:
        if v not in ("equal", "custom"):
            raise ValueError("split_type must be 'equal' or 'custom'.")
        return v

    @field_validator("default_amount")
    @classmethod
    def validate_default_amount(cls, v: float | None) -> float | None:
        if v is not None and v <= 0:
            raise ValueError("default_amount must be positive.")
        return v

    @model_validator(mode="after")
    def validate_custom_split(self) -> "QuickTemplateBase":
        if self.split_type == "custom":
            if self.group_id is None:
                raise ValueError("Custom splits require a group_id — personal templates can't split.")
            if not self.split_config:
                raise ValueError("split_config is required when split_type is 'custom'.")
            total_pct = sum(item.share_pct for item in self.split_config)
            if abs(total_pct - 100.0) > 0.5:
                raise ValueError(f"split_config percentages must sum to 100 (got {total_pct}).")
        return self


class QuickTemplateCreate(QuickTemplateBase):
    pass


class QuickTemplateUpdate(QuickTemplateBase):
    pass


class QuickTemplateOut(QuickTemplateBase):
    template_id: int
    user_id:     int
    created_at:  str


class QuickTemplateExecuteRequest(BaseModel):
    amount:       float | None = None   # falls back to template.default_amount
    expense_date: str                   # YYYY-MM-DD
    expense_time: str | None = None     # falls back to template.default_time
    payer_id:     int | None = None     # group templates only; defaults to current user
    note:         str | None = None

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: float | None) -> float | None:
        if v is not None and v <= 0:
            raise ValueError("amount must be positive.")
        return v