import sys
import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

# Ensure module path resolution works both standalone and package mode
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from app.services.crop_service import CropService
    from app.services.irrigation_service import recommend_irrigation_with_weather, recommend_irrigation
    from app.services.weather_service import get_hyperlocal_weather, get_openmeteo_weather, map_location_to_coords, reverse_lookup_place
except ImportError:
    from services.crop_service import CropService
    from services.irrigation_service import recommend_irrigation_with_weather, recommend_irrigation
    from services.weather_service import get_hyperlocal_weather, get_openmeteo_weather, map_location_to_coords, reverse_lookup_place

app = FastAPI(title="Agrinex Agriculture Intelligence API", version="2.0.0")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def fix_duplicate_api_prefix_middleware(request, call_next):
    if request.scope.get("path", "").startswith("/api/api/"):
        request.scope["path"] = request.scope["path"].replace("/api/api/", "/api/", 1)
    return await call_next(request)

WEATHER_API_KEY = "d9b7930f865ff4b8e81345c3f89e0295"
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


class HyperlocalWeatherRequest(BaseModel):
    lat: Optional[float] = None
    lon: Optional[float] = None
    state_name: Optional[str] = "Karnataka"
    district_name: Optional[str] = "Bengaluru"
    radii: Optional[List[int]] = [2, 5, 10]


class CropRequest(BaseModel):
    soil_type: str = "Loamy Soil"
    soil_quality: Optional[str] = "Medium"
    soil_feel: Optional[str] = "slightly damp"
    state_name: Optional[str] = "Karnataka"
    district_name: Optional[str] = "Bengaluru"
    n: Optional[float] = None
    p: Optional[float] = None
    k: Optional[float] = None
    lat: Optional[float] = None
    lon: Optional[float] = None


class IrrigationRequest(BaseModel):
    soil_feel: str = "slightly damp"
    application_rate: Optional[float] = 5.0
    state_name: Optional[str] = "Karnataka"
    district_name: Optional[str] = "Bengaluru"
    lat: Optional[float] = None
    lon: Optional[float] = None


class UserProfile(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = ""
    village: Optional[str] = ""
    district: Optional[str] = ""
    state: Optional[str] = ""
    coordinates: Optional[str] = ""


# ---------------------------------------------------------
# ---------------- HEALTH & PROFILE -----------------------
# ---------------------------------------------------------

@app.get("/")
def health():
    return {
        "status": "ok",
        "service": "Agrinex Intelligence API",
        "version": "2.0.0",
        "endpoints": [
            "/api/weather/current",
            "/api/weather/forecast",
            "/api/weather/hyperlocal",
            "/api/v1/crop/recommend",
            "/api/v1/crop/predict-advanced",
            "/api/v1/irrigation/recommend",
        ]
    }


@app.post("/api/v1/auth/profile")
async def save_profile(profile: UserProfile):
    return {
        "success": True,
        "message": "Profile saved successfully!",
        "profile": profile.dict()
    }


@app.get("/api/v1/auth/profile/{user_id}")
async def get_profile(user_id: str):
    return {"success": True, "profile": None}


# ---------------------------------------------------------
# ---------------- WEATHER ENDPOINTS ----------------------
# ---------------------------------------------------------

# Canonical Indian District & Major Cities Directory
INDIAN_CANONICAL_PLACES = {
    "mysore": ("Karnataka", "Mysuru (Mysore)", 12.2958, 76.6394),
    "mysuru": ("Karnataka", "Mysuru", 12.2958, 76.6394),
    "bangalore": ("Karnataka", "Bengaluru (Bangalore)", 12.9716, 77.5946),
    "bengaluru": ("Karnataka", "Bengaluru", 12.9716, 77.5946),
    "bombay": ("Maharashtra", "Mumbai", 19.0760, 72.8777),
    "mumbai": ("Maharashtra", "Mumbai", 19.0760, 72.8777),
    "pune": ("Maharashtra", "Pune", 18.5204, 73.8567),
    "poona": ("Maharashtra", "Pune", 18.5204, 73.8567),
    "delhi": ("Delhi", "Delhi NCR", 28.7041, 77.1025),
    "new delhi": ("Delhi", "New Delhi", 28.6139, 77.2090),
    "jaipur": ("Rajasthan", "Jaipur", 26.9124, 75.7873),
    "mandya": ("Karnataka", "Mandya", 12.5223, 76.8975),
    "chennai": ("Tamil Nadu", "Chennai (Madras)", 13.0827, 80.2707),
    "madras": ("Tamil Nadu", "Chennai", 13.0827, 80.2707),
    "hyderabad": ("Telangana", "Hyderabad", 17.3850, 78.4867),
    "kolkata": ("West Bengal", "Kolkata (Calcutta)", 22.5726, 88.3639),
    "calcutta": ("West Bengal", "Kolkata", 22.5726, 88.3639),
    "ahmedabad": ("Gujarat", "Ahmedabad", 23.0225, 72.5714),
    "surat": ("Gujarat", "Surat", 21.1702, 72.8311),
    "ludhiana": ("Punjab", "Ludhiana", 30.9009, 75.8573),
    "amritsar": ("Punjab", "Amritsar", 31.6340, 74.8723),
    "chandigarh": ("Punjab", "Chandigarh", 30.7333, 76.7794),
    "lucknow": ("Uttar Pradesh", "Lucknow", 26.8467, 80.9462),
    "kanpur": ("Uttar Pradesh", "Kanpur", 26.4499, 80.3319),
    "varanasi": ("Uttar Pradesh", "Varanasi", 25.3176, 82.9739),
    "agra": ("Uttar Pradesh", "Agra", 27.1767, 78.0081),
    "patna": ("Bihar", "Patna", 25.5941, 85.1376),
    "bhopal": ("Madhya Pradesh", "Bhopal", 23.2599, 77.4126),
    "indore": ("Madhya Pradesh", "Indore", 22.7196, 75.8577),
    "nagpur": ("Maharashtra", "Nagpur", 21.1458, 79.0882),
    "nashik": ("Maharashtra", "Nashik", 19.9975, 73.7898),
    "aurangabad": ("Maharashtra", "Chhatrapati Sambhajinagar", 19.8762, 75.3433),
    "kolhapur": ("Maharashtra", "Kolhapur", 16.7050, 74.2433),
    "dharwad": ("Karnataka", "Dharwad", 15.4589, 75.1342),
    "hubli": ("Karnataka", "Hubballi (Hubli)", 15.3647, 75.1240),
    "hubballi": ("Karnataka", "Hubballi", 15.3647, 75.1240),
    "belgaum": ("Karnataka", "Belagavi (Belgaum)", 15.8497, 74.4977),
    "belagavi": ("Karnataka", "Belagavi", 15.8497, 74.4977),
    "kalaburagi": ("Karnataka", "Kalaburagi (Gulbarga)", 17.3265, 76.4304),
    "gulbarga": ("Karnataka", "Kalaburagi", 17.3265, 76.4304),
    "shivamogga": ("Karnataka", "Shivamogga (Shimoga)", 13.9299, 75.5681),
    "shimoga": ("Karnataka", "Shivamogga", 13.9299, 75.5681),
    "tumakuru": ("Karnataka", "Tumakuru (Tumkur)", 13.2173, 77.1145),
    "tumkur": ("Karnataka", "Tumakuru", 13.2173, 77.1145),
    "hassan": ("Karnataka", "Hassan", 13.3352, 75.9103),
    "chikmagalur": ("Karnataka", "Chikkamagaluru", 13.3181, 75.7708),
    "udupi": ("Karnataka", "Udupi", 13.3408, 74.7421),
    "mangalore": ("Karnataka", "Mangaluru (Mangalore)", 12.8658, 74.8440),
    "mangaluru": ("Karnataka", "Mangaluru", 12.8658, 74.8440),
}

@app.get("/api/geocode")
async def geocode(q: str):
    """
    Convert place name / district / city to lat/lon using canonical Indian dictionary,
    Open-Meteo Geocoding, and WeatherAPI fallbacks.
    """
    query_str = (q or "").strip()
    if not query_str:
        return {"results": []}

    results = []
    seen = set()
    q_lower = query_str.lower().strip()

    # 1. Immediate Canonical Match for Indian Districts / Cities
    if q_lower in INDIAN_CANONICAL_PLACES:
        state_name, place_title, c_lat, c_lon = INDIAN_CANONICAL_PLACES[q_lower]
        key = (place_title.lower(), state_name.lower())
        seen.add(key)
        results.append({
            "name": place_title,
            "region": state_name,
            "country": "India",
            "lat": round(c_lat, 4),
            "lon": round(c_lon, 4)
        })

    # 2. Open-Meteo Geocoding API (Fast, comprehensive global search)
    try:
        import urllib.parse
        encoded_q = urllib.parse.quote(query_str)
        om_geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={encoded_q}&count=8&language=en&format=json"
        async with httpx.AsyncClient() as client:
            res = await client.get(om_geo_url, timeout=5)
        if res.status_code == 200:
            om_data = res.json()
            items = om_data.get("results", [])
            for item in items:
                name = item.get("name", query_str)
                region = item.get("admin1") or item.get("country", "India")
                country = item.get("country", "India")
                lat = float(item.get("latitude", 0.0))
                lon = float(item.get("longitude", 0.0))
                key = (name.lower(), region.lower())
                
                # Filter out noisy tollgates or airport sub-names if exact city is already present
                if key not in seen and lat != 0.0:
                    seen.add(key)
                    results.append({
                        "name": name,
                        "region": region,
                        "country": country,
                        "lat": round(lat, 4),
                        "lon": round(lon, 4)
                    })
    except Exception:
        pass

    # 3. WeatherAPI fallback if results are still empty
    if not results:
        try:
            url = f"{WEATHER_BASE}/search.json?key={WEATHER_API_KEY}&q={urllib.parse.quote(query_str)}"
            async with httpx.AsyncClient() as client:
                res = await client.get(url, timeout=5)
            if res.status_code == 200:
                data = res.json()
                if isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict) and "lat" in item and "lon" in item:
                            name = item.get("name", query_str)
                            region = item.get("region", "")
                            country = item.get("country", "India")
                            key = (name.lower(), region.lower())
                            if key not in seen:
                                seen.add(key)
                                results.append({
                                    "name": name,
                                    "region": region,
                                    "country": country,
                                    "lat": round(float(item["lat"]), 4),
                                    "lon": round(float(item["lon"]), 4)
                                })
        except Exception:
            pass

    # 4. Local Coordinate Mapper fallback
    if not results:
        parts = [p.strip() for p in query_str.split(",")]
        district = parts[0]
        state = parts[1] if len(parts) > 1 else parts[0]
        lat, lon = map_location_to_coords(state, district)
        results.append({
            "name": district.title(),
            "region": state.title() if len(parts) > 1 else "India",
            "country": "India",
            "lat": round(lat, 4),
            "lon": round(lon, 4),
        })

    # Sort India results to the top
    results.sort(key=lambda r: (0 if r.get("country", "").lower() == "india" else 1))

    return {"results": results[:6]}


@app.get("/api/weather/current")
async def get_current_weather(lat: float, lon: float):
    """
    Get current weather for given coordinates.
    """
    try:
        url = f"{WEATHER_BASE}/current.json?key={WEATHER_API_KEY}&q={lat},{lon}&aqi=no"
        async with httpx.AsyncClient() as client:
            res = await client.get(url, timeout=5)

        if res.status_code == 200:
            data = res.json()
            loc = data["location"]
            cur = data["current"]

            astro_url = f"{WEATHER_BASE}/astronomy.json?key={WEATHER_API_KEY}&q={lat},{lon}"
            sunrise, sunset = "6:30 AM", "6:30 PM"
            try:
                async with httpx.AsyncClient() as client:
                    astro_res = await client.get(astro_url, timeout=3)
                if astro_res.status_code == 200:
                    astro = astro_res.json()["astronomy"]["astro"]
                    sunrise = astro["sunrise"]
                    sunset = astro["sunset"]
            except Exception:
                pass

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
                sunrise=sunrise,
                sunset=sunset,
                lastUpdated=cur["last_updated"]
            )
    except Exception:
        pass

    # Fallback to Open-Meteo
    om = get_openmeteo_weather(lat, lon)
    location_name = reverse_lookup_place(lat, lon)
    return CurrentWeatherOut(
        location=location_name,
        coordinates={"lat": lat, "lon": lon},
        temperature=om["temperature"],
        feelsLike=om["feelsLike"],
        condition=om["condition"],
        humidity=om["humidity"],
        windSpeed=om["windSpeed"],
        windDirection=180,
        pressure=om["pressure"],
        visibility=10.0,
        uvIndex=6.0,
        sunrise="6:30 AM",
        sunset="6:30 PM",
        lastUpdated=om["timestamp"]
    )


@app.get("/api/weather/forecast")
async def get_forecast(lat: float, lon: float, days: int = Query(7, ge=1, le=16)):
    """
    Weather forecast: returns exact requested days (7 or 14 days) from Open-Meteo & WeatherAPI.
    """
    # Open-Meteo natively provides live multi-day forecasts for up to 16 days
    om = get_openmeteo_weather(lat, lon, days=days)
    fc_days = om.get("forecast_days", [])
    if fc_days and len(fc_days) >= days:
        return ForecastOut(days=fc_days[:days])

    # Fallback to WeatherAPI if needed
    try:
        url = f"{WEATHER_BASE}/forecast.json?key={WEATHER_API_KEY}&q={lat},{lon}&days={days}&aqi=no&alerts=no"
        async with httpx.AsyncClient() as client:
            res = await client.get(url, timeout=5)

        if res.status_code == 200:
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
    except Exception:
        pass

    return ForecastOut(days=fc_days)


@app.get("/api/weather/analytics", response_model=AnalyticsOut)
async def get_analytics(lat: float, lon: float, days: int = Query(7, ge=1, le=16)):
    om = get_openmeteo_weather(lat, lon, days=days)
    fc_days = om.get("forecast_days", [])
    if fc_days:
        highs = [d["high"] for d in fc_days]
        lows = [d["low"] for d in fc_days]
        rains = [d["rainAmount"] for d in fc_days]
        hums = [d["humidity"] for d in fc_days]
        winds = [d["windSpeed"] for d in fc_days]
        return AnalyticsOut(
            avgTemp=round(sum(highs + lows) / (len(highs) + len(lows)), 1),
            maxTemp=max(highs),
            minTemp=min(lows),
            totalRainfall=round(sum(rains), 1),
            avgHumidity=round(sum(hums) / len(hums), 1),
            avgWindSpeed=round(sum(winds) / len(winds), 1),
            extremeDays=sum(1 for h in highs if h > 38 or h < 10)
        )
    return AnalyticsOut(
        avgTemp=om.get("temperature", 25.0),
        maxTemp=32.0,
        minTemp=19.0,
        totalRainfall=om.get("rain_7d", 5.0),
        avgHumidity=float(om.get("humidity", 60)),
        avgWindSpeed=float(om.get("windSpeed", 10)),
        extremeDays=1
    )


# ---------------------------------------------------------
# ------------ HYPERLOCAL MULTI-RADIUS ENDPOINTS ----------
# ---------------------------------------------------------

@app.post("/api/weather/hyperlocal")
async def hyperlocal_weather_analysis(req: HyperlocalWeatherRequest):
    """
    Hyperlocal Weather Analysis across 2km, 5km, and 10km radii with
    intelligent Smart Irrigation Decision Engine.
    """
    lat = req.lat
    lon = req.lon
    if lat is None or lon is None:
        lat, lon = map_location_to_coords(req.state_name or "Karnataka", req.district_name or "Bengaluru")

    radii = req.radii or [2, 5, 10]
    return get_hyperlocal_weather(lat, lon, radii=radii)


@app.get("/api/weather/micro-forecast")
async def get_micro_forecast(
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    state: Optional[str] = "Karnataka",
    district: Optional[str] = "Bengaluru",
):
    """
    GET endpoint for micro-forecast across 2km, 5km, and 10km zones.
    """
    if lat is None or lon is None:
        lat, lon = map_location_to_coords(state or "Karnataka", district or "Bengaluru")
    return get_hyperlocal_weather(lat, lon, radii=[2, 5, 10])


# ---------------------------------------------------------
# ---------------- CROP RECOMMENDATION --------------------
# ---------------------------------------------------------

@app.post("/api/v1/crop/recommend")
@app.post("/api/v1/crop/predict-advanced")
def crop_recommend(req: CropRequest):
    """
    Comprehensive rule-based NPK evaluation and ML crop prediction.
    Accepts N, P, K, Soil Type (Red, Black, Alluvial, Loamy, etc.), Soil Feel, and Location.
    """
    lat = req.lat
    lon = req.lon
    if lat is None or lon is None:
        lat, lon = map_location_to_coords(req.state_name or "Karnataka", req.district_name or "Bengaluru")

    return CropService.recommend_crops(
        soil_type=req.soil_type,
        soil_quality=req.soil_quality or "Medium",
        state_name=req.state_name or "Karnataka",
        district_name=req.district_name or "Bengaluru",
        n=req.n,
        p=req.p,
        k=req.k,
        soil_feel=req.soil_feel,
        lat=lat,
        lon=lon,
    )


# ---------------------------------------------------------
# --------------- IRRIGATION RECOMMENDATION ---------------
# ---------------------------------------------------------

@app.post("/api/v1/irrigation/recommend")
def irrigation_recommend(req: IrrigationRequest):
    """
    Smart irrigation schedule and volume recommendation.
    Uses soil feel, application rate, and location weather across radii.
    """
    lat = req.lat
    lon = req.lon
    if lat is None or lon is None:
        lat, lon = map_location_to_coords(req.state_name or "Karnataka", req.district_name or "Bengaluru")

    return recommend_irrigation_with_weather(
        soil_feel=req.soil_feel,
        application_rate_mm_per_h=req.application_rate or 5.0,
        state_name=req.state_name or "Karnataka",
        district_name=req.district_name or "Bengaluru",
        lat=lat,
        lon=lon,
    )


# ---------------------------------------------------------
# ----------------- COMBINED RECOMMENDATION ---------------
# ---------------------------------------------------------

@app.post("/api/v1/combined")
def combined_recommend(crop_req: CropRequest, irri_req: IrrigationRequest):
    """
    Get both crop recommendation (with rule-based NPK analysis)
    and irrigation decision in a single call.
    """
    crop_res = crop_recommend(crop_req)
    irri_res = irrigation_recommend(irri_req)
    return {
        "crop_recommendation": crop_res,
        "irrigation_recommendation": irri_res,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


