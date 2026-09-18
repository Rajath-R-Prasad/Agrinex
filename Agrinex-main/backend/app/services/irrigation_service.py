import joblib
import numpy as np
import os
from typing import Dict, Optional, Any
import pandas as pd


from .weather_service import get_openmeteo_weather, map_location_to_coords

# Load pre-trained irrigation model
# This file is at: backend/app/services/irrigation_service.py
# We need to go up 3 levels to backend/, then into models/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IRRIGATION_MODEL_PATH = os.path.join(BASE_DIR, "models", "irrigation_model_pipeline.pkl")
try:
    irrigation_model = joblib.load(IRRIGATION_MODEL_PATH)
except Exception as e:
    print(f"[IrrigationService] Warning: Could not load model from {IRRIGATION_MODEL_PATH}: {e}")
    irrigation_model = None


SOIL_FEEL_MAP = {
    "dry and crumbly": 0.2,
    "slightly damp": 0.5,
    "wet and muddy": 0.8,
}


def moisture_to_water_mm(moisture_mean: float) -> float:
    """
    Convert moisture level to irrigation water depth (mm).
    """
    if moisture_mean < 0.3:
        return 20.0  # very dry
    elif moisture_mean < 0.5:
        return 12.0  # moderately dry
    elif moisture_mean < 0.7:
        return 5.0   # slightly dry
    else:
        return 0.0   # already wet


def recommend_irrigation(
    soil_feel: str,
    application_rate_mm_per_h: float,
    forecast_rain_mm_24h: float = 0.0,
) -> Dict:
    """
    Core irrigation logic: predict water need based on moisture + weather.
    """
    try:
        # 1. Map soil feel to moisture (case insensitive)
        m = SOIL_FEEL_MAP.get(soil_feel.lower(), 0.45)

        # 2. Build DataFrame with EXACT column names from training
        import pandas as pd
        features_df = pd.DataFrame(
            [[m, m, m, m, m]], 
            columns=['moisture1', 'moisture2', 'moisture3', 'moisture4', 'moisture0']
        )

        # 3. Get model prediction
        pred_proba = irrigation_model.predict_proba(features_df)
        proba = pred_proba[0] if pred_proba.ndim > 1 else pred_proba
        pred = irrigation_model.predict(features_df)[0]
        p_irrigate = float(proba[1]) if len(proba) > 1 else 0.5

        # rest of function stays same...

        # 4. Base water depth from moisture
        base_mm = moisture_to_water_mm(m)

        # 5. Adjust for forecasted rain
        reason_weather = "No significant rain expected."
        if forecast_rain_mm_24h > 10:
            base_mm = 0.0
            reason_weather = "Heavy rain expected (>10mm), skipping irrigation."
        elif forecast_rain_mm_24h > 5:
            base_mm *= 0.5
            reason_weather = f"Moderate rain expected ({forecast_rain_mm_24h:.1f}mm), reducing irrigation by 50%."

        # 6. Calculate duration
        duration_h = base_mm / application_rate_mm_per_h if application_rate_mm_per_h > 0 else 0.0

        return {
            "success": True,
            "irrigate": bool(pred) and base_mm > 0,
            "model_probability": p_irrigate,
            "moisture_level": m,
            "water_mm": round(base_mm, 2),
            "duration_hours": round(duration_h, 2),
            "reason_weather": reason_weather,
            "application_rate_mm_per_h": application_rate_mm_per_h,
            "soil_feel": soil_feel,
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Irrigation recommendation failed: {str(e)}",
        }


def recommend_irrigation_with_weather(
    soil_feel: str,
    application_rate_mm_per_h: float = 5.0,
    state_name: str = "Karnataka",
    district_name: str = "Bengaluru",
    lat: Optional[float] = None,
    lon: Optional[float] = None,
) -> Dict:
    """
    High-level function: fetch weather and recommend irrigation taking
    hyperlocal weather into account.
    """
    try:
        if lat is None or lon is None:
            lat, lon = map_location_to_coords(state_name, district_name)
        
        weather = get_openmeteo_weather(lat, lon)
        rain_24h = weather.get("rain_24h", 0.0)

        # Get core recommendation
        result = recommend_irrigation(
            soil_feel=soil_feel,
            application_rate_mm_per_h=application_rate_mm_per_h,
            forecast_rain_mm_24h=rain_24h,
        )

        result["weather"] = weather
        result["state"] = state_name
        result["district"] = district_name
        result["coordinates"] = {"lat": lat, "lon": lon}

        # Multi-radius insights summary
        result["hyperlocal_summary"] = {
            "immediate_2km_rain": rain_24h,
            "next_48h_rain": weather.get("rain_48h", rain_24h),
            "humidity": weather.get("humidity", 60),
            "temperature": weather.get("temperature", 25.0),
        }

        return result
    except Exception as e:
        return {
            "success": False,
            "error": f"Weather-based irrigation recommendation failed: {str(e)}",
        }

