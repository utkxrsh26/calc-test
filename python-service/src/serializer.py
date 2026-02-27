import json
from typing import Dict

from pydantic import BaseModel


class ReviewPayload(BaseModel):
    file_path: str
    language: str
    metadata: Dict[str, str]


def serialize_metadata(payload: ReviewPayload) -> str:
    return json.dumps(payload.metadata)


def serialize_payload(payload: ReviewPayload) -> str:
    return json.dumps(
        {
            "file_path": payload.file_path,
            "language": payload.language,
            "metadata": payload.metadata,
        }
    )
