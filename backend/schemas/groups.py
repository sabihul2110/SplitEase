# backend/schemas/groups.py
from pydantic import BaseModel


class CreateGroupRequest(BaseModel):
    group_name: str
    user_ids:   list[int]


class UpdateGroupRequest(BaseModel):
    group_name: str


class UpdateMembersRequest(BaseModel):
    user_ids: list[int]


class BulkGroupIdsRequest(BaseModel):
    group_ids: list[int]