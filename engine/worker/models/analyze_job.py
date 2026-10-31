from uuid import UUID
from pydantic import BaseModel

class AnalyzeJob(BaseModel):
    analysisId: UUID