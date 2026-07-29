# SplitEase/backend/services/routine_modifier_engine.py


"""
services/routine_modifier_engine.py

Pure calculation engine for Routine_Items.modifier_schema. Takes a base
amount, a user's per-modifier answers, and the day-of-week being logged
for (NOT necessarily today — a routine can be logged for yesterday), and
returns the final amount. No DB access, no side effects — every routine
built by every user runs through the same interpreter over their own
data; nothing about a specific user's modifiers is hardcoded here.

modifier_schema shape (list, order = evaluation order):
  {
    "id": "before_830",
    "type": "toggle" | "counter",
    "default": <bool|number>,
    "effect": {
      "if_true":  {"set_amount": 35, "add_amount": 20},   # toggle only
      "if_false": {"set_amount": 40},                     # toggle only
      "multiply_base_by": "value",                        # counter only
      "add_per_unit": 5                                   # counter only
    },
    "condition": {"day_of_week": [5]} | None   # 1=Mon..7=Sun, or always-on
  }
"""

import json
from typing import Any


def _coerce_schema(modifier_schema) -> list[dict]:
    if not modifier_schema:
        return []
    if isinstance(modifier_schema, str):
        try:
            return json.loads(modifier_schema) or []
        except (TypeError, ValueError):
            return []
    return modifier_schema


def apply_modifiers(
    base_amount: float,
    modifier_schema,
    answers: dict[str, Any] | None,
    day_of_week: int,
) -> float:
    schema = _coerce_schema(modifier_schema)
    answers = answers or {}
    amount = float(base_amount or 0)

    for mod in schema:
        condition = mod.get("condition")
        if condition and day_of_week not in condition.get("day_of_week", []):
            continue

        mod_id = mod.get("id")
        mod_type = mod.get("type")
        effect = mod.get("effect") or {}
        answer = answers.get(mod_id, mod.get("default"))

        if mod_type == "toggle":
            branch = effect.get("if_true") if answer else effect.get("if_false")
            if not branch:
                continue
            if "set_amount" in branch:
                amount = float(branch["set_amount"])
            if "add_amount" in branch:
                amount += float(branch["add_amount"])

        elif mod_type == "counter":
            if answer is None:
                continue
            if "multiply_base_by" in effect:
                amount = float(base_amount or 0) * float(answer)
            elif "add_per_unit" in effect:
                amount += float(answer) * float(effect["add_per_unit"])

    return round(amount, 2)