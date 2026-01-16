from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/farms")

class FarmCreate(BaseModel):
    farm_name: str
    district: str
    state: str
    latitude: float
    longitude: float
    area_acres: float
    current_crop: str = ""
    soil_type: str = "loamy"

@router.post("/")
async def create_farm(farm: FarmCreate, user_id: str = "temp_user_123"):
    farm_id = "farm_001"
    return {"success": True, "farm_id": farm_id}

@router.get("/{user_id}")
async def list_farms(user_id: str):
    farms = []
    return {"success": True, "farms": []}
