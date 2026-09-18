import joblib
import os
import pandas as pd
from typing import Dict, List, Optional

from .weather_service import get_openmeteo_weather, map_location_to_coords

# Load pre-trained crop model
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CROP_MODEL_PATH = os.path.join(BASE_DIR, "models", "crop_recommender_pipeline.pkl")
try:
    crop_model = joblib.load(CROP_MODEL_PATH)
except Exception as e:
    print(f"[CropService] Warning: Could not load model from {CROP_MODEL_PATH}: {e}")
    crop_model = None


class CropService:
    # Typical Soil Baselines for Indian Soil Types
    SOIL_BENCHMARKS = {
        "red soil": {
            "name": "Red Soil",
            "typical_ph": 6.0,
            "n_range": (30, 70),
            "p_range": (15, 30),
            "k_range": (20, 50),
            "texture": "Porous, friable, light to medium loam with iron oxides",
            "organic_matter": "Low to Moderate (0.8 - 1.5%)",
            "primary_crops": ["Groundnut", "Pulses", "Millets (Ragi)", "Cotton", "Tobacco", "Maize"],
            "amendments": "Apply agricultural lime or dolomite (300-500 kg/ha) if pH < 5.8 to neutralize acidity. Enrich with farmyard manure (FYM) to improve moisture retention.",
        },
        "black soil": {
            "name": "Black Soil (Regur)",
            "typical_ph": 8.0,
            "n_range": (40, 80),
            "p_range": (10, 25),
            "k_range": (60, 110),
            "texture": "Heavy clay, highly moisture-retentive, cracks when dry",
            "organic_matter": "Moderate (1.2 - 2.0%)",
            "primary_crops": ["Cotton", "Soybean", "Wheat", "Sugarcane", "Jowar", "Sunflower", "Chickpea"],
            "amendments": "Apply gypsum (400 kg/ha) and zinc sulfate if soil is overly alkaline (pH > 8.0). Maintain surface drainage to avoid waterlogging during heavy rains.",
        },
        "alluvial soil": {
            "name": "Alluvial Soil",
            "typical_ph": 7.2,
            "n_range": (50, 100),
            "p_range": (25, 55),
            "k_range": (45, 90),
            "texture": "Loamy to silty clay, highly fertile, well-drained",
            "organic_matter": "Rich (1.5 - 2.8%)",
            "primary_crops": ["Rice", "Wheat", "Sugarcane", "Maize", "Mustard", "Jute", "Vegetables"],
            "amendments": "Maintain balanced NPK fertilization (4:2:1 ratio). Supplement with biofertilizers (Azotobacter, PSB) to sustain high microbial activity.",
        },
        "loamy soil": {
            "name": "Loamy Soil",
            "typical_ph": 6.8,
            "n_range": (50, 95),
            "p_range": (25, 50),
            "k_range": (40, 80),
            "texture": "Ideal balanced mix of sand, silt, and clay",
            "organic_matter": "High (2.0 - 3.2%)",
            "primary_crops": ["Vegetables (Tomato, Chilli, Onion)", "Wheat", "Maize", "Pulses", "Fruits", "Cotton"],
            "amendments": "Ideal soil structure. Add 2-3 tons/acre compost before sowing to maintain organic carbon above 2.0%.",
        },
        "sandy soil": {
            "name": "Sandy Soil",
            "typical_ph": 6.4,
            "n_range": (15, 45),
            "p_range": (10, 25),
            "k_range": (15, 40),
            "texture": "Gritty, coarse, fast-draining with low nutrient holding capacity",
            "organic_matter": "Very Low (0.4 - 0.9%)",
            "primary_crops": ["Groundnut", "Watermelon", "Potato", "Bajra (Pearl Millet)", "Carrot", "Sesame"],
            "amendments": "Incorporate green manure (dhaincha or sunn hemp) and vermicompost (5 tons/ha) to boost cation exchange capacity and water holding.",
        },
        "clay soil": {
            "name": "Clay Soil",
            "typical_ph": 7.5,
            "n_range": (45, 85),
            "p_range": (20, 45),
            "k_range": (50, 95),
            "texture": "Fine, dense, sticky when wet, hard when dry",
            "organic_matter": "Moderate (1.0 - 1.8%)",
            "primary_crops": ["Paddy (Rice)", "Wheat", "Chickpea", "Barley", "Linseed"],
            "amendments": "Aerate soil regularly and add coarse organic compost or sand to prevent compaction and root suffocation.",
        },
        "laterite soil": {
            "name": "Laterite Soil",
            "typical_ph": 5.2,
            "n_range": (20, 50),
            "p_range": (10, 20),
            "k_range": (15, 35),
            "texture": "Porous, rich in iron & aluminium oxides, leached of silica and bases",
            "organic_matter": "Low (0.6 - 1.2%)",
            "primary_crops": ["Tea", "Coffee", "Cashew", "Rubber", "Coconut", "Arecanut"],
            "amendments": "Apply rock phosphate and dolomitic limestone to counter extreme acidity and fix phosphorus availability.",
        },
    }

    SOIL_FEEL_MODIFIERS = {
        "dry and crumbly": {"moisture_pct": 20, "n_mult": 0.85, "water_stress": "High"},
        "slightly damp": {"moisture_pct": 45, "n_mult": 1.0, "water_stress": "Optimal"},
        "wet and muddy": {"moisture_pct": 75, "n_mult": 1.1, "water_stress": "Low / Excess"},
        "compacted": {"moisture_pct": 35, "n_mult": 0.9, "water_stress": "Aeration Stressed"},
    }

    @staticmethod
    def evaluate_npk_rules(soil_type_str: str, n: float, p: float, k: float, soil_feel_str: str) -> Dict:
        """
        Rule-based agronomic evaluation of N, P, K relative to soil type and feel.
        """
        key = soil_type_str.strip().lower()
        # Find matching benchmark or fallback to Loam
        bench = CropService.SOIL_BENCHMARKS.get(key)
        if not bench:
            for k_bench, v_bench in CropService.SOIL_BENCHMARKS.items():
                if k_bench in key or key in k_bench:
                    bench = v_bench
                    break
        if not bench:
            bench = CropService.SOIL_BENCHMARKS["loamy soil"]

        feel_data = CropService.SOIL_FEEL_MODIFIERS.get(
            soil_feel_str.strip().lower(), CropService.SOIL_FEEL_MODIFIERS["slightly damp"]
        )

        n_low, n_high = bench["n_range"]
        p_low, p_high = bench["p_range"]
        k_low, k_high = bench["k_range"]

        # Nitrogen Rating
        if n < n_low:
            n_status = "Deficient (Low)"
            n_rating = "low"
            n_advice = f"Nitrogen is below threshold for {bench['name']}. Apply 25-35 kg/ha Urea or 3 tons/acre Vermicompost."
        elif n > n_high * 1.3:
            n_status = "Excessive (High)"
            n_rating = "high"
            n_advice = "Excess Nitrogen can promote vegetative overgrowth and pest attraction. Reduce synthetic N fertilizers."
        else:
            n_status = "Optimal (Balanced)"
            n_rating = "optimal"
            n_advice = "Nitrogen level is in the ideal range for active crop growth and chlorophyll synthesis."

        # Phosphorus Rating
        if p < p_low:
            p_status = "Deficient (Low)"
            p_rating = "low"
            p_advice = f"Phosphorus is deficient. Apply Single Super Phosphate (SSP) or DAP (20 kg/ha) at basal stage for root establishment."
        elif p > p_high * 1.3:
            p_status = "High"
            p_rating = "high"
            p_advice = "Sufficient Phosphorus reserve. No immediate phosphate fertilization needed."
        else:
            p_status = "Optimal (Balanced)"
            p_rating = "optimal"
            p_advice = "Phosphorus is optimal, promoting healthy root architecture and early flowering."

        # Potassium Rating
        if k < k_low:
            k_status = "Deficient (Low)"
            k_rating = "low"
            k_advice = "Potassium is low. Apply Muriate of Potash (MOP, 20-30 kg/ha) to enhance drought tolerance and disease resistance."
        elif k > k_high * 1.3:
            k_status = "High"
            k_rating = "high"
            k_advice = "Rich in natural Potassium (typical for black/clay soils). Save on potash fertilizers."
        else:
            k_status = "Optimal (Balanced)"
            k_rating = "optimal"
            k_advice = "Potassium is in balanced proportion for cellular water retention and stalk strength."

        # Overall Soil Health Score calculation (0-100)
        n_score = 100 - min(60, abs(n - ((n_low + n_high) / 2)) / ((n_low + n_high) / 2) * 60)
        p_score = 100 - min(60, abs(p - ((p_low + p_high) / 2)) / ((p_low + p_high) / 2) * 60)
        k_score = 100 - min(60, abs(k - ((k_low + k_high) / 2)) / ((k_low + k_high) / 2) * 60)
        overall_health = int(round((n_score * 0.35 + p_score * 0.35 + k_score * 0.30)))

        return {
            "soil_name": bench["name"],
            "typical_ph": bench["typical_ph"],
            "soil_texture": bench["texture"],
            "organic_matter": bench["organic_matter"],
            "soil_feel": soil_feel_str,
            "estimated_moisture_pct": feel_data["moisture_pct"],
            "water_stress_status": feel_data["water_stress"],
            "health_score": max(45, min(96, overall_health)),
            "nitrogen": {
                "value": n,
                "status": n_status,
                "rating": n_rating,
                "benchmark_range": f"{n_low}-{n_high} kg/ha",
                "advice": n_advice,
            },
            "phosphorus": {
                "value": p,
                "status": p_status,
                "rating": p_rating,
                "benchmark_range": f"{p_low}-{p_high} kg/ha",
                "advice": p_advice,
            },
            "potassium": {
                "value": k,
                "status": k_status,
                "rating": k_rating,
                "benchmark_range": f"{k_low}-{k_high} kg/ha",
                "advice": k_advice,
            },
            "soil_amendments": bench["amendments"],
            "primary_crops": bench["primary_crops"],
        }

    @staticmethod
    def recommend_crops(
        soil_type: str,
        soil_quality: str = "Medium",
        state_name: str = "Karnataka",
        district_name: str = "Bengaluru",
        n: Optional[float] = None,
        p: Optional[float] = None,
        k: Optional[float] = None,
        soil_feel: Optional[str] = None,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
    ) -> Dict:
        """
        Advanced crop recommendation combining ML classification pipeline with
        rule-based soil agronomic evaluation for Red, Black, Alluvial, Loamy, and other soils.
        """
        try:
            # 1. Resolve soil feel and baseline NPK if not provided
            if soil_feel is None:
                soil_feel = "slightly damp" if soil_quality == "Medium" else "dry and crumbly" if soil_quality == "Poor" else "wet and muddy"

            # Soil Type lookup
            key = soil_type.strip().lower()
            bench = CropService.SOIL_BENCHMARKS.get(key)
            if not bench:
                for k_bench, v_bench in CropService.SOIL_BENCHMARKS.items():
                    if k_bench in key or key in k_bench:
                        bench = v_bench
                        break
            if not bench:
                bench = CropService.SOIL_BENCHMARKS["loamy soil"]

            ph_val = bench["typical_ph"]

            if n is None:
                n = float(bench["n_range"][0] + (bench["n_range"][1] - bench["n_range"][0]) * (0.3 if soil_quality == "Poor" else 0.8 if soil_quality == "Rich" else 0.55))
            if p is None:
                p = float(bench["p_range"][0] + (bench["p_range"][1] - bench["p_range"][0]) * (0.3 if soil_quality == "Poor" else 0.8 if soil_quality == "Rich" else 0.55))
            if k is None:
                k = float(bench["k_range"][0] + (bench["k_range"][1] - bench["k_range"][0]) * (0.3 if soil_quality == "Poor" else 0.8 if soil_quality == "Rich" else 0.55))

            # 2. Rule-based evaluation of NPK
            npk_evaluation = CropService.evaluate_npk_rules(soil_type, n, p, k, soil_feel)

            # 3. Location & Weather fetching
            if lat is None or lon is None:
                lat, lon = map_location_to_coords(state_name, district_name)
            weather = get_openmeteo_weather(lat, lon)
            temp = weather.get("temperature", 25.0)
            humidity = weather.get("humidity", 60.0)
            rainfall_mm = max(weather.get("rain_24h", 0.0), 0.0)

            # 4. ML Model Prediction
            sample = {
                "N_req_kg_per_ha": n,
                "P_req_kg_per_ha": p,
                "K_req_kg_per_ha": k,
                "Temperature_C": temp,
                "Humidity_%": humidity,
                "pH": ph_val,
                "Rainfall_mm": rainfall_mm,
                "State Name": state_name,
            }

            df_sample = pd.DataFrame([sample])
            proba = crop_model.predict_proba(df_sample)[0]
            classes = crop_model.classes_

            ml_crop_probs = {cls.title(): float(p_val) for cls, p_val in zip(classes, proba)}

            # 5. Agronomic Rule-Based Crop Scoring Engine
            # Comprehensive suitability factors for crops across Indian soil types
            crop_catalog = [
                {
                    "crop": "Rice (Paddy)",
                    "category": "Cereal / Grain",
                    "ideal_soils": ["Alluvial Soil", "Clay Soil", "Loamy Soil"],
                    "ideal_ph": (6.0, 7.8),
                    "water_need": "High (1200-1500 mm)",
                    "duration_days": "110-140",
                    "expected_yield": "3.5 - 5.5 t/ha",
                    "min_temp": 20, "max_temp": 38,
                    "reason_template": "Suits fertile {soil} with high moisture retention and temperatures around {temp}°C."
                },
                {
                    "crop": "Wheat",
                    "category": "Cereal / Grain",
                    "ideal_soils": ["Alluvial Soil", "Loamy Soil", "Black Soil"],
                    "ideal_ph": (6.0, 7.5),
                    "water_need": "Moderate (450-650 mm)",
                    "duration_days": "100-130",
                    "expected_yield": "3.0 - 4.8 t/ha",
                    "min_temp": 12, "max_temp": 30,
                    "reason_template": "Well-suited for {soil} in cool-to-moderate climates with balanced NPK levels."
                },
                {
                    "crop": "Cotton",
                    "category": "Fiber / Cash Crop",
                    "ideal_soils": ["Black Soil", "Alluvial Soil", "Red Soil"],
                    "ideal_ph": (6.5, 8.5),
                    "water_need": "Moderate (600-800 mm)",
                    "duration_days": "150-180",
                    "expected_yield": "1.8 - 2.8 t/ha",
                    "min_temp": 22, "max_temp": 40,
                    "reason_template": "Thrives in deep {soil} with high potassium and warm daytime temperatures."
                },
                {
                    "crop": "Maize (Corn)",
                    "category": "Cereal / Fodder",
                    "ideal_soils": ["Loamy Soil", "Red Soil", "Alluvial Soil"],
                    "ideal_ph": (5.8, 7.5),
                    "water_need": "Moderate (500-750 mm)",
                    "duration_days": "90-110",
                    "expected_yield": "4.0 - 6.0 t/ha",
                    "min_temp": 18, "max_temp": 35,
                    "reason_template": "Highly responsive to nitrogen in well-aerated {soil} under moderate moisture."
                },
                {
                    "crop": "Chickpea (Gram)",
                    "category": "Pulse / Legume",
                    "ideal_soils": ["Black Soil", "Loamy Soil", "Red Soil"],
                    "ideal_ph": (6.0, 8.0),
                    "water_need": "Low (300-450 mm)",
                    "duration_days": "90-120",
                    "expected_yield": "1.2 - 2.0 t/ha",
                    "min_temp": 15, "max_temp": 30,
                    "reason_template": "Nitrogen-fixing legume that performs well in {soil} with minimal irrigation."
                },
                {
                    "crop": "Groundnut (Peanut)",
                    "category": "Oilseed / Legume",
                    "ideal_soils": ["Red Soil", "Sandy Soil", "Loamy Soil"],
                    "ideal_ph": (5.8, 6.8),
                    "water_need": "Moderate (450-600 mm)",
                    "duration_days": "105-125",
                    "expected_yield": "1.8 - 3.0 t/ha",
                    "min_temp": 22, "max_temp": 34,
                    "reason_template": "Light, friable {soil} allows easy peg penetration and pod development."
                },
                {
                    "crop": "Soybean",
                    "category": "Oilseed / Pulse",
                    "ideal_soils": ["Black Soil", "Loamy Soil", "Alluvial Soil"],
                    "ideal_ph": (6.0, 7.5),
                    "water_need": "Moderate (500-700 mm)",
                    "duration_days": "90-110",
                    "expected_yield": "2.0 - 3.2 t/ha",
                    "min_temp": 20, "max_temp": 35,
                    "reason_template": "Excellent nutrient uptake in moisture-retentive {soil} with balanced phosphorus."
                },
                {
                    "crop": "Sugarcane",
                    "category": "Commercial / Sugar",
                    "ideal_soils": ["Alluvial Soil", "Black Soil", "Loamy Soil"],
                    "ideal_ph": (6.5, 8.0),
                    "water_need": "Very High (1500-2200 mm)",
                    "duration_days": "300-360",
                    "expected_yield": "70 - 110 t/ha",
                    "min_temp": 20, "max_temp": 42,
                    "reason_template": "Heavy nutrient feeder suited for fertile, deep {soil} with assured irrigation."
                },
                {
                    "crop": "Millets (Ragi / Bajra)",
                    "category": "Nutri-Cereal",
                    "ideal_soils": ["Red Soil", "Sandy Soil", "Loamy Soil"],
                    "ideal_ph": (5.5, 7.5),
                    "water_need": "Low (350-500 mm)",
                    "duration_days": "80-100",
                    "expected_yield": "2.0 - 3.5 t/ha",
                    "min_temp": 20, "max_temp": 38,
                    "reason_template": "Drought-hardy crop ideally suited for {soil} with low-to-medium nutrient demand."
                },
                {
                    "crop": "Vegetables (Tomato / Chilli)",
                    "category": "Horticulture",
                    "ideal_soils": ["Loamy Soil", "Red Soil", "Alluvial Soil"],
                    "ideal_ph": (6.0, 7.2),
                    "water_need": "Moderate-High (600-900 mm)",
                    "duration_days": "75-120",
                    "expected_yield": "15 - 35 t/ha",
                    "min_temp": 18, "max_temp": 34,
                    "reason_template": "High-value horticulture crop thriving in enriched {soil} with good drainage."
                },
            ]

            evaluated_crops = []
            soil_canonical = bench["name"]

            for entry in crop_catalog:
                # Soil Match Score (0 - 40 pts)
                soil_score = 40 if soil_canonical in entry["ideal_soils"] else 22

                # pH Score (0 - 20 pts)
                ph_min, ph_max = entry["ideal_ph"]
                if ph_min <= ph_val <= ph_max:
                    ph_score = 20
                else:
                    diff = min(abs(ph_val - ph_min), abs(ph_val - ph_max))
                    ph_score = max(5, int(20 - diff * 12))

                # Temperature Score (0 - 20 pts)
                if entry["min_temp"] <= temp <= entry["max_temp"]:
                    temp_score = 20
                else:
                    temp_score = max(5, int(20 - min(abs(temp - entry["min_temp"]), abs(temp - entry["max_temp"])) * 2))

                # ML Model Boost (0 - 20 pts)
                ml_key = entry["crop"].split()[0].title()
                ml_prob = ml_crop_probs.get(ml_key, 0.1)
                ml_score = int(ml_prob * 20)

                total_suitability = min(96, max(45, soil_score + ph_score + temp_score + ml_score))

                reason = entry["reason_template"].format(
                    soil=soil_canonical,
                    temp=round(temp, 1)
                )

                evaluated_crops.append({
                    "crop": entry["crop"],
                    "category": entry["category"],
                    "suitability": total_suitability,
                    "confidence_score": round(total_suitability / 100.0, 2),
                    "reason": reason,
                    "water_requirement": entry["water_need"],
                    "growth_duration": entry["duration_days"],
                    "expected_yield": entry["expected_yield"],
                    "ideal_soils": entry["ideal_soils"],
                    "is_primary_for_soil": entry["crop"].split()[0] in [c.split()[0] for c in bench["primary_crops"]],
                })

            # Sort by suitability descending
            evaluated_crops.sort(key=lambda x: x["suitability"], reverse=True)

            return {
                "success": True,
                "recommended_crops": evaluated_crops[:6],
                "soil_evaluation": npk_evaluation,
                "soil_params": {
                    "soil_type": soil_type,
                    "soil_feel": soil_feel,
                    "N_kg_per_ha": round(n, 1),
                    "P_kg_per_ha": round(p, 1),
                    "K_kg_per_ha": round(k, 1),
                    "pH": ph_val,
                },
                "weather_summary": {
                    "temperature": temp,
                    "humidity": humidity,
                    "rain_24h": rainfall_mm,
                    "condition": weather.get("condition", "Partly Cloudy"),
                },
                "state": state_name,
                "district": district_name,
                "coordinates": {"lat": lat, "lon": lon},
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Crop recommendation failed: {str(e)}",
            }

