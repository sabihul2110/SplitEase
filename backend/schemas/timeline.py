# backend/schemas/timeline.py


from pydantic import BaseModel


class TimelineEvent(BaseModel):
    """
    One row of the unified timeline feed (GET /timeline/). The feed
    unions 9 event kinds (personal_expense, group_expense, income,
    loan_given, loan_taken, settlement_sent/received, loan_repayment_*)
    into one list, so most fields are optional — populated only for the
    kinds that use them. See timeline_repository.fetch_unified_timeline
    for exactly which kind sets which fields.
    """
    type: str
    date: str
    amount: float
    my_share: float | None = None
    receivable: float | None = None
    label: str
    sub: str | None = None
    ref_id: int | None = None
    group_id: int | None = None
    group_name: str | None = None
    category_name: str | None = None
    subcategory_name: str | None = None


class FinancialSummary(BaseModel):
    """
    All-time financial position — powers the mobile Account Balance /
    Net Worth card. See timeline_repository.fetch_financial_summary for
    exactly what each figure includes and excludes.
    """
    account_balance:  float
    total_income:     float
    total_expense:    float
    loans_receivable: float
    borrows_payable:  float