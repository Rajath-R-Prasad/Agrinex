import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import DynamicBackground from '../components/DynamicBackground';

interface SoilBenchmark {
  n: number;
  p: number;
  k: number;
  ph: number;
  desc: string;
}

const SOIL_TYPE_PRESETS: Record<string, SoilBenchmark> = {
  'Red Soil': { n: 45, p: 20, k: 35, ph: 6.0, desc: 'Porous, iron-rich, slightly acidic. Needs organic matter and balanced N.' },
  'Black Soil': { n: 60, p: 18, k: 85, ph: 8.0, desc: 'High clay, moisture-retentive, rich in potassium. Alkaline pH.' },
  'Alluvial Soil': { n: 75, p: 40, k: 65, ph: 7.2, desc: 'Highly fertile river plains soil with optimal balanced nutrients.' },
  'Loamy Soil': { n: 70, p: 35, k: 60, ph: 6.8, desc: 'Ideal agricultural balance of sand, silt, and clay. Excellent drainage.' },
  'Sandy Soil': { n: 30, p: 15, k: 25, ph: 6.4, desc: 'Gritty, fast-draining, prone to nutrient leaching. Needs compost.' },
  'Clay Soil': { n: 65, p: 30, k: 70, ph: 7.5, desc: 'Dense and heavy water retention. Slower root penetration.' },
  'Laterite Soil': { n: 35, p: 15, k: 25, ph: 5.2, desc: 'Acidic, leached soil rich in iron and aluminium oxides.' },
};

const SOIL_FEELS = [
  { id: 'dry and crumbly', label: '🪨 Dry & Crumbly', desc: 'Moisture <25%' },
  { id: 'slightly damp', label: '🌿 Slightly Damp', desc: 'Moisture 40-55%' },
  { id: 'wet and muddy', label: '💧 Wet & Muddy', desc: 'Moisture >70%' },
  { id: 'compacted', label: '⛓️ Compacted', desc: 'Aeration-stressed' },
];

const Soil: React.FC = () => {
  const { user, getSelectedFarm, getUserCoordinates } = useAuth();
  const selectedFarm = getSelectedFarm() || (user?.farms?.[0] ?? null);

  // Form State for Crop Prediction & Soil Health
  const [selectedSoilType, setSelectedSoilType] = useState<string>('Red Soil');
  const [selectedSoilFeel, setSelectedSoilFeel] = useState<string>('slightly damp');
  const [nitrogen, setNitrogen] = useState<number>(45);
  const [phosphorus, setPhosphorus] = useState<number>(20);
  const [potassium, setPotassium] = useState<number>(35);
  const [stateName, setStateName] = useState<string>(user?.state || 'Karnataka');
  const [districtName, setDistrictName] = useState<string>(user?.district || 'Bengaluru');

  const [loading, setLoading] = useState<boolean>(false);
  const [cropResult, setCropResult] = useState<any | null>(null);
  const [irrigationResult, setIrrigationResult] = useState<any | null>(null);

  const handleSoilTypeChange = (newType: string) => {
    setSelectedSoilType(newType);
    const preset = SOIL_TYPE_PRESETS[newType];
    if (preset) {
      setNitrogen(preset.n);
      setPhosphorus(preset.p);
      setPotassium(preset.k);
    }
  };

  const runPrediction = async () => {
    setLoading(true);
    try {
      const coords = getUserCoordinates();

      const cropRes = await api.post('/api/v1/crop/predict-advanced', {
        soil_type: selectedSoilType,
        soil_feel: selectedSoilFeel,
        n: Number(nitrogen),
        p: Number(phosphorus),
        k: Number(potassium),
        state_name: stateName,
        district_name: districtName,
        lat: coords.lat,
        lon: coords.lon,
      });

      const irriRes = await api.post('/api/v1/irrigation/recommend', {
        soil_feel: selectedSoilFeel,
        application_rate: 5.0,
        state_name: stateName,
        district_name: districtName,
        lat: coords.lat,
        lon: coords.lon,
      });

      if (cropRes) setCropResult(cropRes);
      if (irriRes) setIrrigationResult(irriRes);
    } catch (err) {
      console.error('Soil prediction failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedFarm?.soilType && SOIL_TYPE_PRESETS[selectedFarm.soilType]) {
      setSelectedSoilType(selectedFarm.soilType);
      const preset = SOIL_TYPE_PRESETS[selectedFarm.soilType];
      setNitrogen(preset.n);
      setPhosphorus(preset.p);
      setPotassium(preset.k);
    }
    if (user?.state) setStateName(user.state);
    if (user?.district) setDistrictName(user.district);

    runPrediction();
  }, [selectedFarm?.id]);

  const soilLayerColor = useMemo(() => {
    if (selectedSoilType.includes('Red')) return '#991b1b';
    if (selectedSoilType.includes('Black')) return '#1e293b';
    if (selectedSoilType.includes('Alluvial')) return '#78350f';
    if (selectedSoilType.includes('Sandy')) return '#d97706';
    if (selectedSoilType.includes('Laterite')) return '#b45309';
    return '#573a27';
  }, [selectedSoilType]);

  const soilEval = cropResult?.soil_evaluation;
  const recommendedCrops = cropResult?.recommended_crops || [];

  return (
    <>
      <DynamicBackground />
      <section className="section" style={{ position: 'relative', zIndex: 10 }}>
        <div className="container">
          {/* Header */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <div
              className="pill"
              style={{
                marginBottom: 'var(--space-xs)',
                background: 'rgba(16, 185, 129, 0.15)',
                borderColor: 'var(--green-primary)',
                color: 'var(--green-light)',
              }}
            >
              🌱 Soil Diagnostic Studio & Crop Predictor
            </div>
            <h1 style={{ fontSize: 'var(--h1)', marginBottom: 'var(--space-xs)', color: 'var(--text-primary)' }}>
              Soil Health & Machine Learning Crop Prediction
            </h1>
            <p style={{ fontSize: 'var(--body-lg)', color: 'var(--text-secondary)', maxWidth: 'var(--narrow-width)' }}>
              Input your N-P-K nutrient values, soil texture, and tactile feel. Agrinex evaluates agronomic rules to predict high-yield crops with precision irrigation guidance.
            </p>
          </div>

          {/* Farm Profile Banner */}
          {selectedFarm && (
            <div
              className="card-apple"
              style={{
                marginBottom: 'var(--space-lg)',
                background: 'rgba(2, 44, 34, 0.6)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: 'clamp(16px, 3vw, 24px)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Active Farm</div>
                  <div style={{ fontSize: 'var(--h2)', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {selectedFarm.name}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    📍 {selectedFarm.location} · 📐 {selectedFarm.area || 5} acres
                  </div>
                </div>
                <div
                  style={{
                    padding: '10px 18px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid var(--green-primary)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Soil Health Score
                  </div>
                  <div style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 800, color: 'var(--green-light)' }}>
                    {soilEval?.health_score || 82} / 100
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MAIN GRID: Input Form & Soil Diagnostics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
              gap: 'clamp(16px, 3vw, 28px)',
              marginBottom: 'var(--space-xl)',
            }}
          >
            {/* INPUT PANEL */}
            <div className="card-apple" style={{ background: 'var(--bg-card)' }}>
              <h3 style={{ fontSize: 'var(--h3)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🧪</span> Soil & Nutrient Parameters
              </h3>

              <div style={{ display: 'grid', gap: '14px' }}>
                {/* Soil Type Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    1. Soil Type Classification
                  </label>
                  <select
                    value={selectedSoilType}
                    onChange={(e) => handleSoilTypeChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    {Object.keys(SOIL_TYPE_PRESETS).map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', fontStyle: 'italic' }}>
                    {SOIL_TYPE_PRESETS[selectedSoilType]?.desc}
                  </div>
                </div>

                {/* Soil Feel Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    2. Soil Moisture & Feel
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: '8px' }}>
                    {SOIL_FEELS.map((feel) => (
                      <button
                        key={feel.id}
                        type="button"
                        onClick={() => setSelectedSoilFeel(feel.id)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: selectedSoilFeel === feel.id ? '2px solid var(--green-primary)' : '1px solid var(--border-color)',
                          background: selectedSoilFeel === feel.id ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-tertiary)',
                          color: selectedSoilFeel === feel.id ? 'var(--green-light)' : 'var(--text-secondary)',
                          fontSize: '12px',
                          fontWeight: 600,
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div>{feel.label}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{feel.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* N-P-K Sliders */}
                <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      3. N-P-K Values (kg/ha)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSoilTypeChange(selectedSoilType)}
                      style={{
                        padding: '4px 8px',
                        background: 'transparent',
                        border: '1px solid var(--green-primary)',
                        color: 'var(--green-light)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      Reset Benchmark
                    </button>
                  </div>

                  {/* Nitrogen */}
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Nitrogen (N):</span>
                      <span style={{ fontWeight: 700, color: '#38bdf8' }}>{nitrogen} kg/ha</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="150"
                      value={nitrogen}
                      onChange={(e) => setNitrogen(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#38bdf8' }}
                    />
                  </div>

                  {/* Phosphorus */}
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Phosphorus (P):</span>
                      <span style={{ fontWeight: 700, color: '#fb923c' }}>{phosphorus} kg/ha</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="80"
                      value={phosphorus}
                      onChange={(e) => setPhosphorus(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#fb923c' }}
                    />
                  </div>

                  {/* Potassium */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Potassium (K):</span>
                      <span style={{ fontWeight: 700, color: '#a78bfa' }}>{potassium} kg/ha</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="150"
                      value={potassium}
                      onChange={(e) => setPotassium(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#a78bfa' }}
                    />
                  </div>
                </div>

                {/* Region & Location Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>State</label>
                    <input
                      type="text"
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>District</label>
                    <input
                      type="text"
                      value={districtName}
                      onChange={(e) => setDistrictName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                </div>

                {/* Submit Action Button */}
                <button
                  type="button"
                  onClick={runPrediction}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                >
                  {loading ? 'Analyzing Soil & Weather...' : '⚡ Predict Suitable Crops'}
                </button>
              </div>
            </div>

            {/* RULE-BASED SOIL EVALUATION RESULTS */}
            <div style={{ display: 'grid', gap: '14px' }}>
              {/* NPK Status Badges */}
              <div className="card-apple">
                <h3 style={{ fontSize: 'var(--h3)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📋</span> Nutrient Health Analysis
                </h3>

                <div style={{ display: 'grid', gap: '8px' }}>
                  {/* Nitrogen */}
                  <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>Nitrogen (N)</span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: soilEval?.nitrogen.rating === 'optimal' ? 'rgba(16, 185, 129, 0.2)' : soilEval?.nitrogen.rating === 'low' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: soilEval?.nitrogen.rating === 'optimal' ? 'var(--green-light)' : soilEval?.nitrogen.rating === 'low' ? '#f87171' : '#fbbf24',
                        }}
                      >
                        {soilEval?.nitrogen.status || 'Optimal'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {soilEval?.nitrogen.advice || 'Nitrogen level in standard range for vegetative growth.'}
                    </div>
                  </div>

                  {/* Phosphorus */}
                  <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>Phosphorus (P)</span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: soilEval?.phosphorus.rating === 'optimal' ? 'rgba(16, 185, 129, 0.2)' : soilEval?.phosphorus.rating === 'low' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: soilEval?.phosphorus.rating === 'optimal' ? 'var(--green-light)' : soilEval?.phosphorus.rating === 'low' ? '#f87171' : '#fbbf24',
                        }}
                      >
                        {soilEval?.phosphorus.status || 'Optimal'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {soilEval?.phosphorus.advice || 'Phosphorus is sufficient for root anchoring.'}
                    </div>
                  </div>

                  {/* Potassium */}
                  <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>Potassium (K)</span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: soilEval?.potassium.rating === 'optimal' ? 'rgba(16, 185, 129, 0.2)' : soilEval?.potassium.rating === 'low' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: soilEval?.potassium.rating === 'optimal' ? 'var(--green-light)' : soilEval?.potassium.rating === 'low' ? '#f87171' : '#fbbf24',
                        }}
                      >
                        {soilEval?.potassium.status || 'Optimal'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {soilEval?.potassium.advice || 'Potassium ensures disease and drought tolerance.'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Amendments & Cross-section */}
              <div className="card-apple">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    🌾 Soil Amendments & Structure
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    pH: {soilEval?.typical_ph || 6.8} · OM: {soilEval?.organic_matter || '1.5%'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                  {soilEval?.soil_amendments || 'Apply compost to maintain organic carbon and water-holding capacity.'}
                </div>

                {/* Cross-section bar */}
                <div
                  style={{
                    height: '38px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    display: 'flex',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ flex: 1, background: soilLayerColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '0 4px', textAlign: 'center' }}>
                    Topsoil (0-15cm) · {selectedSoilType}
                  </div>
                  <div style={{ flex: 1, background: '#3b2f2f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '0 4px', textAlign: 'center' }}>
                    Subsoil (15-45cm)
                  </div>
                </div>
              </div>

              {/* Irrigation Advisory Card */}
              {irrigationResult && (
                <div
                  className="card-apple"
                  style={{
                    background: irrigationResult.irrigate ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    borderColor: irrigationResult.irrigate ? 'var(--green-primary)' : '#f59e0b',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      💧 Soil-Based Irrigation Advisory
                    </span>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 800,
                        background: irrigationResult.irrigate ? 'var(--green-primary)' : '#f59e0b',
                        color: '#ffffff',
                      }}
                    >
                      {irrigationResult.irrigate ? 'IRRIGATE NOW' : 'HOLD IRRIGATION'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {irrigationResult.reason_weather}
                  </div>
                  {irrigationResult.irrigate && (
                    <div style={{ display: 'flex', gap: '14px', marginTop: '8px', fontSize: '12px', color: 'var(--green-light)', fontWeight: 600, flexWrap: 'wrap' }}>
                      <span>Water: {irrigationResult.water_mm} mm</span>
                      <span>Duration: {irrigationResult.duration_hours} hrs</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* PREDICTED SUITABLE CROPS SECTION */}
          <div className="card-apple" style={{ marginBottom: 'var(--space-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: 'var(--h2)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  🌾 Recommended Crops for {selectedSoilType}
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  Ranked by combined agronomic suitability, N-P-K nutrient balance, and local weather patterns.
                </p>
              </div>
              <div className="pill" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'var(--green-primary)', color: 'var(--green-light)' }}>
                {recommendedCrops.length} Crops Evaluated
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
                gap: '12px',
              }}
            >
              {recommendedCrops.map((cropItem: any, idx: number) => (
                <div
                  key={cropItem.crop}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    background: 'var(--bg-tertiary)',
                    border: idx === 0 ? '2px solid var(--green-primary)' : '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {idx === 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        background: 'var(--green-primary)',
                        color: '#fff',
                        fontSize: '9px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderBottomLeftRadius: '6px',
                      }}
                    >
                      TOP MATCH
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {cropItem.crop}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          {cropItem.category}
                        </div>
                      </div>
                      <div
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: cropItem.suitability >= 80 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                          color: cropItem.suitability >= 80 ? 'var(--green-light)' : '#60a5fa',
                          fontSize: '12px',
                          fontWeight: 800,
                        }}
                      >
                        {cropItem.suitability}% Fit
                      </div>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '10px' }}>
                      {cropItem.reason}
                    </div>
                  </div>

                  <div
                    style={{
                      paddingTop: '8px',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 90px), 1fr))',
                      gap: '4px',
                      fontSize: '11px',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    <div>💧 Water: <strong style={{ color: 'var(--text-primary)' }}>{cropItem.water_requirement?.split(' ')[0] || 'Moderate'}</strong></div>
                    <div>⏳ Duration: <strong style={{ color: 'var(--text-primary)' }}>{cropItem.growth_duration || '110d'}</strong></div>
                    <div style={{ gridColumn: 'span 2' }}>📊 Yield: <strong style={{ color: 'var(--green-light)' }}>{cropItem.expected_yield || '3.5 t/ha'}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Soil;
