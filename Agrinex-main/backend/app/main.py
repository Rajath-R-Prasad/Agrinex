import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timedelta

from services.crop_service import CropService
from services.irrigation_service import recommend_irrigation_with_weather
app = FastAPI(title="Agrinex Weather API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WEATHER_API_KEY = "4797b38d80ea463a9b9123633251212"
WEATHER_BASE = "https://api.weatherapi.com/v1"


# ---------------------------------------------------------
# -------------------- SCHEMAS ---------------------------
# ---------------------------------------------------------

class CurrentWeatherOut(BaseModel):
    location: str
    coordinates: Dict[str, float]
    temperature: float
    feelsLike: float
    condition: str
    humidity: int
    windSpeed: float
    windDirection: int
    pressure: float
    visibility: float
    uvIndex: float
    sunrise: str
    sunset: str
    lastUpdated: str


class ForecastDay(BaseModel):
    date: str
    high: float
    low: float
    condition: str
    rainChance: int
    rainAmount: float
    humidity: int
    windSpeed: float
    isToday: bool


class ForecastOut(BaseModel):
    days: List[ForecastDay]


class AnalyticsOut(BaseModel):
    avgTemp: float
    maxTemp: float
    minTemp: float
    totalRainfall: float
    avgHumidity: float
    avgWindSpeed: float
    extremeDays: int


class CropRecommendation(BaseModel):
    crop: str
    suitability: int
    reason: str


class CropOut(BaseModel):
    recommendations: List[CropRecommendation]


class GeminiInsight(BaseModel):
    summary: Dict[str, str]
    cultivationPlan: Optional[List[Dict[str, str]]] = None
    riskAlerts: Optional[List[Dict[str, str]]] = None
    bestPractices: Optional[List[Dict[str, str]]] = None


# ---------------------------------------------------------
# -------------------- UTIL FUNCTIONS ---------------------
# ---------------------------------------------------------

def map_condition(text: str) -> str:
    """Cleanup condition text for frontend."""
    return text


# ---------------------------------------------------------
# ---------------- WEATHER ENDPOINTS ----------------------
# ---------------------------------------------------------

@app.get("/api/geocode")
async def geocode(q: str):
    """
    Convert place name to lat/lon using WeatherAPI search.
    """
    url = f"{WEATHER_BASE}/search.json?key={WEATHER_API_KEY}&q={q}"

    async with httpx.AsyncClient() as client:
        res = await client.get(url)
    
    data = res.json()

    if not data:
        raise HTTPException(status_code=404, detail="Location not found")

    # Return unique results (WeatherAPI sometimes repeats cities)
    unique = {}
    for item in data:
        key = (item["name"], item["region"], item["country"])
        if key not in unique:
            unique[key] = item

    final = [
        {
            "name": v["name"],
            "region": v["region"],
            "country": v["country"],
            "lat": v["lat"],
            "lon": v["lon"]
        }
        for v in unique.values()
    ]

    return {"results": final}


@app.get("/api/weather/current", response_model=CurrentWeatherOut)
async def get_current_weather(lat: float, lon: float):
    """
    Current weather from WeatherAPI.
    """
    url = f"{WEATHER_BASE}/current.json?key={WEATHER_API_KEY}&q={lat},{lon}&aqi=no"

    async with httpx.AsyncClient() as client:
        res = await client.get(url)

    if res.status_code != 200:
        raise HTTPException(500, "Weather API error")

    data = res.json()

    loc = data["location"]
    cur = data["current"]

    # Astronomy API for sunrise/sunset
    astro_url = f"{WEATHER_BASE}/astronomy.json?key={WEATHER_API_KEY}&q={lat},{lon}"
    async with httpx.AsyncClient() as client:
        astro_res = await client.get(astro_url)

    astro = astro_res.json()["astronomy"]["astro"]

    return CurrentWeatherOut(
        location=loc["name"],
        coordinates={"lat": lat, "lon": lon},
        temperature=cur["temp_c"],
        feelsLike=cur["feelslike_c"],
        condition=cur["condition"]["text"],
        humidity=cur["humidity"],
        windSpeed=cur["wind_kph"],
        windDirection=cur["wind_degree"],
        pressure=cur["pressure_mb"],
        visibility=cur["vis_km"],
        uvIndex=cur.get("uv", 0),
        sunrise=astro["sunrise"],
        sunset=astro["sunset"],
        lastUpdated=cur["last_updated"]
    )


@app.get("/api/weather/forecast", response_model=ForecastOut)
async def get_forecast(lat: float, lon: float, days: int = Query(7, ge=1, le=14)):
    """
    Weather forecast from WeatherAPI (max 14 days).
    """
    url = f"{WEATHER_BASE}/forecast.json?key={WEATHER_API_KEY}&q={lat},{lon}&days={days}&aqi=no&alerts=no"

    async with httpx.AsyncClient() as client:
        res = await client.get(url)

    if res.status_code != 200:
        raise HTTPException(500, "Forecast API error")

    data = res.json()
    forecast_days = data["forecast"]["forecastday"]

    output = []

    today_str = datetime.now().strftime("%Y-%m-%d")

    for d in forecast_days:
        day = d["day"]
        output.append(
            ForecastDay(
                date=d["date"],
                high=day["maxtemp_c"],
                low=day["mintemp_c"],
                condition=day["condition"]["text"],
                rainChance=day.get("daily_chance_of_rain", 0),
                rainAmount=day.get("totalprecip_mm", 0),
                humidity=day.get("avghumidity", 0),
                windSpeed=day.get("maxwind_kph", 0),
                isToday=(d["date"] == today_str)
            )
        )

    return ForecastOut(days=output)


# ---------------------------------------------------------
# ----------------- ANALYTICS ENDPOINT --------------------
# ---------------------------------------------------------

@app.get("/api/weather/analytics", response_model=AnalyticsOut)
async def get_analytics(lat: float, lon: float, days: int = Query(7, ge=1, le=14)):
    url = f"{WEATHER_BASE}/forecast.json?key={WEATHER_API_KEY}&q={lat},{lon}&days={days}"

    async with httpx.AsyncClient() as client:
        res = await client.get(url)

    data = res.json()["forecast"]["forecastday"]

    temps, rains, hums, winds = [], [], [], []

    extreme_days = 0

    for d in data:
        day = d["day"]
        temps.append(day["avgtemp_c"])
        rains.append(day["totalprecip_mm"])
        hums.append(day["avghumidity"])
        winds.append(day["maxwind_kph"])

        # extreme rule example
        if day["maxtemp_c"] > 40 or day["mintemp_c"] < 5:
            extreme_days += 1

    return AnalyticsOut(
        avgTemp=sum(temps) / len(temps),
        maxTemp=max(temps),
        minTemp=min(temps),
        totalRainfall=sum(rains),
        avgHumidity=sum(hums) / len(hums),
        avgWindSpeed=sum(winds) / len(winds),
        extremeDays=extreme_days
    )


# ---------------------------------------------------------
# ---------------- CROP RECOMMENDATIONS -------------------
# ---------------------------------------------------------

"""@app.get("/api/weather/crops", response_model=CropOut)
async def crop_recommendations(lat: float, lon: float):
    
    #Simple crop recommendation system based on weather.
    

    url = f"{WEATHER_BASE}/forecast.json?key={WEATHER_API_KEY}&q={lat},{lon}&days=3"

    async with httpx.AsyncClient() as client:
        res = await client.get(url)

    data = res.json()["forecast"]["forecastday"]

    avg_temp = sum(d["day"]["avgtemp_c"] for d in data) / 3
    avg_humid = sum(d["day"]["avghumidity"] for d in data) / 3

    recs = []

    # Example rule-based crop suitability
    if 20 <= avg_temp <= 30:
        recs.append(CropRecommendation(
            crop="Rice",
            suitability=85,
            reason="Ideal warm and humid conditions."
        ))
    if 15 <= avg_temp <= 25:
        recs.append(CropRecommendation(
            crop="Wheat",
            suitability=70,
            reason="Good moderate temperature range."
        ))
    if avg_temp >= 28:
        recs.append(CropRecommendation(
            crop="Sugarcane",
            suitability=90,
            reason="Hot climate supports high growth rate."
        ))

    return CropOut(recommendations=recs)

    """
# ---------------------------------------------------------
# ---------------- ROOT / HEALTHCHECK ---------------------
# ---------------------------------------------------------
# ========== Request Models ==========

class CropRequest(BaseModel):
    soil_type: str        # "Sandy", "Loam", "Clay"
    soil_quality: str     # "Poor", "Medium", "Rich"
    state_name: str       # "Chhattisgarh"
    district_name: str    # "Durg"


class IrrigationRequest(BaseModel):
    soil_feel: str        # "Dry and Crumbly", "Slightly Damp", "Wet and Muddy"
    application_rate: float  # mm/hour
    state_name: str
    district_name: str


# ========== Health Check ==========

@app.get("/")
def health():
    """Check API health"""
    return {
        "status": "ok",
        "service": "Smart Irrigation API",
        "version": "1.0.0",
    }


# ========== Crop Routes ==========

@app.post("/api/v1/crop/recommend")
def crop_recommend(req: CropRequest):
    """
    Recommend suitable crops based on soil type, fertility, and location weather.
    
    Example:
    {
        "soil_type": "Loam",
        "soil_quality": "Medium",
        "state_name": "Chhattisgarh",
        "district_name": "Durg"
    }
    """
    return CropService.recommend_crops(
        soil_type=req.soil_type,
        soil_quality=req.soil_quality,
        state_name=req.state_name,
        district_name=req.district_name,
    )


# ========== Irrigation Routes ==========

@app.post("/api/v1/irrigation/recommend")
def irrigation_recommend(req: IrrigationRequest):
    """
    Recommend irrigation schedule: whether to irrigate and how much water.
    Uses soil feel + forecast rain to decide.
    
    Example:
    {
        "soil_feel": "Slightly Damp",
        "application_rate": 5.0,
        "state_name": "Chhattisgarh",
        "district_name": "Durg"
    }
    """
    return recommend_irrigation_with_weather(
        soil_feel=req.soil_feel,
        application_rate_mm_per_h=req.application_rate,
        state_name=req.state_name,
        district_name=req.district_name,
    )


# ========== Combined Routes ==========

@app.post("/api/v1/combined")
def combined_recommend(crop_req: CropRequest, irri_req: IrrigationRequest):
    """
    Get both crop AND irrigation recommendation in one call.
    """
    crop_result = CropService.recommend_crops(
        soil_type=crop_req.soil_type,
        soil_quality=crop_req.soil_quality,
        state_name=crop_req.state_name,
        district_name=crop_req.district_name,
    )

    irri_result = recommend_irrigation_with_weather(
        soil_feel=irri_req.soil_feel,
        application_rate_mm_per_h=irri_req.application_rate,
        state_name=irri_req.state_name,
        district_name=irri_req.district_name,
    )

    return {
        "crop_recommendation": crop_result,
        "irrigation_recommendation": irri_result,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

