# SplitEase/backend/services/quick_entry_service.py


"""
services/quick_entry_service.py

Shared commit engine. Both Quick_Templates.execute and Pending_Bills.pay
funnel through here — the group_id check decides whether the entry lands
in Expenses+Expense_Splits (bypassing personal loans entirely, per spec)
or Personal_Expenses.
"""

from datetime import date as date_cls

from repositories import (
    quick_template_repository,
    recurring_bill_repository,
    pending_bill_repository,
    routine_repository,
    group_repository,
    expense_repository,
    personal_expense_repository,
    categories_repository,
)
from schemas.quick_templates import QuickTemplateExecuteRequest
from schemas.pending_bills import PendingBillPayRequest
from schemas.routines import RoutineExecuteRequest
from services import routine_modifier_engine


def _compute_equal_splits(total_amount: float, member_ids: list[int]) -> list[dict]:
    sorted_ids = sorted(member_ids)
    n = len(sorted_ids)
    if n == 0:
        raise ValueError("No group members to split between.")
    base = round(total_amount / n, 2)
    running = 0.0
    splits = []
    for i, uid in enumerate(sorted_ids):
        if i == n - 1:
            amt = round(total_amount - running, 2)
        else:
            amt = base
            running += amt
        splits.append({"user_id": uid, "amount_owed": amt, "share_pct": round(100 / n, 2)})
    return splits


def _compute_custom_splits(total_amount: float, split_config: list[dict], member_ids: list[int]) -> list[dict]:
    config_ids = {c["user_id"] for c in split_config}
    if config_ids != set(member_ids):
        raise ValueError(
            "This template's saved split no longer matches the group's current members. "
            "Update the template's split configuration before using it."
        )
    sorted_cfg = sorted(split_config, key=lambda c: c["user_id"])
    running = 0.0
    splits = []
    for i, c in enumerate(sorted_cfg):
        if i == len(sorted_cfg) - 1:
            amt = round(total_amount - running, 2)
        else:
            amt = round(total_amount * c["share_pct"] / 100, 2)
            running += amt
        splits.append({"user_id": c["user_id"], "amount_owed": amt, "share_pct": c["share_pct"]})
    return splits


def _execute_group_entry(
    group_id: int, user_id: int, payer_id: int, category_id: int,
    subcategory_id: int | None, amount: float, description: str,
    expense_date: str, expense_time: str | None, split_type: str,
    split_config: list[dict] | None, note: str | None,
) -> dict:
    if not group_repository.is_group_member(group_id, user_id):
        raise PermissionError("NOT_GROUP_MEMBER")

    members = group_repository.fetch_group_members(group_id)
    member_ids = [m["user_id"] for m in members]
    if payer_id not in member_ids:
        raise ValueError("Payer is not a member of this group.")

    if split_type == "custom" and split_config:
        splits = _compute_custom_splits(amount, split_config, member_ids)
    else:
        splits = _compute_equal_splits(amount, member_ids)

    full_description = f"{description} — {note}" if note else description

    expense_id = expense_repository.insert_expense(
        group_id       = group_id,
        payer_id       = payer_id,
        category_id    = category_id,
        subcategory_id = subcategory_id,
        total_amount   = amount,
        description    = full_description,
        split_type     = "custom" if split_type == "custom" else "equal",
        expense_date   = expense_date,
        expense_time   = expense_time,
        splits         = splits,
    )
    return {"type": "group_expense", "expense_id": expense_id}


def _execute_personal_entry(
    user_id: int, category_id: int, subcategory_id: int | None,
    amount: float, expense_date: str, expense_time: str | None, note: str | None,
) -> dict:
    category = categories_repository.fetch_category_by_id(category_id)
    if category is None:
        raise ValueError("Invalid category_id.")

    expense_id = personal_expense_repository.insert_personal_expense(
        user_id        = user_id,
        amount         = amount,
        category       = category["category_name"],
        note           = note,
        expense_date   = expense_date,
        subcategory_id = subcategory_id,
        expense_time   = expense_time,
    )
    return {"type": "personal_expense", "expense_id": expense_id}


def execute_template(template_id: int, user_id: int, body: QuickTemplateExecuteRequest) -> dict:
    template = quick_template_repository.fetch_template(template_id, user_id)
    if template is None:
        raise ValueError("Template not found.")

    amount = body.amount if body.amount is not None else template.get("default_amount")
    if amount is None:
        raise ValueError("This template has no default amount — amount is required.")
    if amount <= 0:
        raise ValueError("Amount must be positive.")

    expense_time = body.expense_time or template["default_time"]

    if template["group_id"]:
        return _execute_group_entry(
            group_id       = template["group_id"],
            user_id        = user_id,
            payer_id       = body.payer_id or user_id,
            category_id    = template["category_id"],
            subcategory_id = template["subcategory_id"],
            amount         = amount,
            description    = template["name"],
            expense_date   = body.expense_date,
            expense_time   = expense_time,
            split_type     = template["split_type"],
            split_config   = template["split_config"],
            note           = body.note,
        )
    return _execute_personal_entry(
        user_id        = user_id,
        category_id    = template["category_id"],
        subcategory_id = template["subcategory_id"],
        amount         = amount,
        expense_date   = body.expense_date,
        expense_time   = expense_time,
        note           = body.note or template["name"],
    )


def execute_routine(routine_id: int, user_id: int, body: RoutineExecuteRequest) -> dict:
    routine = routine_repository.fetch_routine_detail(routine_id, user_id)
    if routine is None:
        raise ValueError("Routine not found.")

    template_map = {t["template_id"]: t for t in routine["items"]}
    results = []
    errors = []

    for run_item in body.items:
        if not run_item.include:
            continue
        tpl = template_map.get(run_item.template_id)
        if tpl is None:
            errors.append(f"Template {run_item.template_id} is not part of this routine.")
            continue

        modifier_schema = tpl.get("modifier_schema")
        if modifier_schema:
            day_of_week = date_cls.fromisoformat(body.expense_date).isoweekday()
            amount = routine_modifier_engine.apply_modifiers(
                base_amount     = tpl.get("default_amount") or 0,
                modifier_schema = modifier_schema,
                answers         = run_item.modifier_answers,
                day_of_week     = day_of_week,
            )
            if run_item.amount is not None:
                amount = run_item.amount
        else:
            amount = run_item.amount if run_item.amount is not None else tpl.get("default_amount")

        if amount is None or amount <= 0:
            errors.append(f"'{tpl['name']}' needs an amount.")
            continue

        try:
            if tpl["group_id"]:
                r = _execute_group_entry(
                    group_id       = tpl["group_id"],
                    user_id        = user_id,
                    payer_id       = user_id,
                    category_id    = tpl["category_id"],
                    subcategory_id = tpl["subcategory_id"],
                    amount         = amount,
                    description    = tpl["name"],
                    expense_date   = body.expense_date,
                    expense_time   = tpl["default_time"],
                    split_type     = tpl["split_type"],
                    split_config   = tpl["split_config"],
                    note           = run_item.note,
                )
            else:
                r = _execute_personal_entry(
                    user_id        = user_id,
                    category_id    = tpl["category_id"],
                    subcategory_id = tpl["subcategory_id"],
                    amount         = amount,
                    expense_date   = body.expense_date,
                    expense_time   = tpl["default_time"],
                    note           = run_item.note or tpl["name"],
                )
            results.append({"template_id": tpl["template_id"], "name": tpl["name"], **r})
        except (PermissionError, ValueError) as exc:
            errors.append(f"'{tpl['name']}': {exc}")

    if results:
        routine_repository.log_routine_run(routine_id, user_id, body.expense_date)

    return {"created": results, "errors": errors}


def pay_pending_bill(pending_id: int, user_id: int, body: PendingBillPayRequest) -> dict:
    pending = pending_bill_repository.fetch_pending_bill(pending_id, user_id)
    if pending is None:
        raise ValueError("Pending bill not found.")
    if pending["status"] != "pending":
        raise ValueError("This pending bill has already been resolved.")

    bill = recurring_bill_repository.fetch_bill(pending["bill_id"], user_id)
    if bill is None:
        raise ValueError("Recurring bill not found.")

    expense_time = body.expense_time or "09:00:00"

    if bill["group_id"]:
        result = _execute_group_entry(
            group_id       = bill["group_id"],
            user_id        = user_id,
            payer_id       = body.payer_id or user_id,
            category_id    = bill["category_id"],
            subcategory_id = bill["subcategory_id"],
            amount         = body.amount,
            description    = bill["name"],
            expense_date   = body.expense_date,
            expense_time   = expense_time,
            split_type     = bill["split_type"],
            split_config   = bill["split_config"],
            note           = body.note,
        )
        pending_bill_repository.mark_paid(pending_id, result["expense_id"], None)
    else:
        result = _execute_personal_entry(
            user_id        = user_id,
            category_id    = bill["category_id"],
            subcategory_id = bill["subcategory_id"],
            amount         = body.amount,
            expense_date   = body.expense_date,
            expense_time   = expense_time,
            note           = body.note or bill["name"],
        )
        pending_bill_repository.mark_paid(pending_id, None, result["expense_id"])

    return result