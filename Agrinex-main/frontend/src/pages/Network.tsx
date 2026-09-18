import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

/**
 * Network / Plot Analysis Page
 * 
 * Features:
 * - Zone-based farm division based on soil analytics
 * - Animated plot slicing visualization
 * - Hover for quick details
 * - Click for full analytics
 * - Crop recommendations from soil/market analytics
 * - Zone-based crop matching
 * - Market research integration
 * 
 * Backend Integration:
 * - GET /api/network/zones?farmId={id} - Get zone divisions
 * - GET /api/network/zone-analytics?farmId={id}&zoneId={id} - Get zone analytics
 * - POST /api/network/gemini-recommendations - Get crop recommendations
 * - GET /api/market-research?crop={crop}&region={region} - Market data
 */

interface Zone {
  id: string;
  name: string;
  area: number; // acres
  coordinates: { x: number; y: number; width: number; height: number }; // percentage-based
  soilAnalytics: {
    pH: number;
    EC: number; // dS/m
    nitrogen: number; // kg/ha
    phosphorus: number; // kg/ha
    potassium: number; // kg/ha
    organicMatter: number; // %
    moisture: number; // %
    soilType: string;
    healthScore: number; // 0-100
  };
  cropRecommendations: {
    primary: CropRecommendation;
    alternatives: CropRecommendation[];
  };
  cultivationPlan: {
    steps: string[];
    timeline: string;
    estimatedCost: number;
    expectedYield: number;
    expectedRevenue: number;
  };
}

interface CropRecommendation {
  crop: string;
  suitability: number; // 0-100
  reason: string;
  marketPrice: number; // ₹/kg or ₹/quintal
  marketTrend: 'UP' | 'DOWN' | 'STABLE';
  demand: 'HIGH' | 'MEDIUM' | 'LOW';
  expectedYield: number; // tons/acre or quintals/acre
  expectedRevenue: number; // ₹/acre
  season: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

const Network: React.FC = () => {
  const { user, getSelectedFarm } = useAuth();
  const selectedFarm = getSelectedFarm() || (user?.farms && user.farms.length > 0 ? user.farms[0] : null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [isAnimating, setIsAnimating] = useState(true);
  const [loading, setLoading] = useState(false);
  const [moisture, setMoisture] = useState<number>(50);
  const { addSelectedFarmZoneLock, removeSelectedFarmZoneLock, getSelectedFarmZoneLocks } = useAuth();
  const [useAI, setUseAI] = useState<boolean>(false);
  const [gemini, setGemini] = useState<any | null>(null);
  const [mlFarmCropRecs, setMlFarmCropRecs] = useState<Array<{ crop: string; suitability: number; reason: string }>>([]);
  const [mlFarmIrrigation, setMlFarmIrrigation] = useState<any | null>(null);

  useEffect(() => {
    setIsAnimating(true);
    const fetchZones = async () => {
      setLoading(true);
      try {
        let lat: number | null = null;
        let lon: number | null = null;
        if (selectedFarm?.coordinates) {
          const cleaned = selectedFarm.coordinates.replace(/[^\d\.,\- ]/g, '');
          const parts = cleaned.split(',').map(s => s.trim());
          if (parts.length >= 2) {
            const plat = Number(parts[0]);
            const plon = Number(parts[1]);
            if (!Number.isNaN(plat) && !Number.isNaN(plon)) {
              lat = plat;
              lon = plon;
            }
          }
        }
        const body = {
          lat: lat ?? 30.7333,
          lon: lon ?? 76.7794,
          area_acres: selectedFarm?.area ?? 5,
          soil_type: selectedFarm?.soilType ?? 'loamy',
          avg_moisture: (moisture / 100),
        };
        const endpoint = useAI ? '/api/network/zones/ai' : '/api/network/zones';
        const res = await api.post(endpoint, body);
        const data = res.data?.zones || [];
        const out: Zone[] = data.map((z: any, idx: number) => ({
          id: z.id,
          name: `Zone ${idx + 1}`,
          area: z.area_acres,
          coordinates: { x: (idx * (100 / data.length)), y: 0, width: (100 / data.length), height: 100 },
          soilAnalytics: {
            pH: 7,
            EC: 2,
            nitrogen: 200,
            phosphorus: 30,
            potassium: 180,
            organicMatter: 2,
            moisture: Math.round((z.moisture || 0.5) * 100),
            soilType: z.soil_type,
            healthScore: z.suitability,
          },
          cropRecommendations: {
            primary: {
              crop: z.crop_suggestion,
              suitability: z.suitability,
              reason: 'Based on soil type and moisture',
              marketPrice: 0,
              marketTrend: 'STABLE',
              demand: 'MEDIUM',
              expectedYield: 0,
              expectedRevenue: 0,
              season: '',
              riskLevel: 'LOW',
            },
            alternatives: [],
          },
          cultivationPlan: {
            steps: [],
            timeline: '',
            estimatedCost: 0,
            expectedYield: 0,
            expectedRevenue: 0,
          },
        }));
        setZones(out);
      } catch {
        const area = selectedFarm?.area ?? 5;
        const n = area <= 5 ? 2 : area <= 10 ? 3 : 5;
        const soil = selectedFarm?.soilType ?? 'loamy';
        const moist = (moisture / 100);
        const fallback: Zone[] = Array.from({ length: n }).map((_, idx) => {
          const suitability = Math.max(0, Math.min(100, 70 + Math.round((moist - 0.5) * 40)));
          const crop = soil.toLowerCase().includes('loam') ? 'Wheat' : (moist > 0.6 ? 'Rice' : 'Cotton');
          const zArea = Number((area / n).toFixed(2));
          return {
            id: `zone_${idx + 1}`,
            name: `Zone ${idx + 1}`,
            area: zArea,
            coordinates: { x: (idx * (100 / n)), y: 0, width: (100 / n), height: 100 },
            soilAnalytics: {
              pH: 7,
              EC: 2,
              nitrogen: 200,
              phosphorus: 30,
              potassium: 180,
              organicMatter: 2,
              moisture: Math.round(moist * 100),
              soilType: soil,
              healthScore: suitability,
            },
            cropRecommendations: {
              primary: {
                crop,
                suitability,
                reason: 'Based on soil type and moisture',
                marketPrice: 0,
                marketTrend: 'STABLE',
                demand: 'MEDIUM',
                expectedYield: 0,
                expectedRevenue: 0,
                season: '',
                riskLevel: 'LOW',
              },
              alternatives: [],
            },
            cultivationPlan: {
              steps: [],
              timeline: '',
              estimatedCost: 0,
              expectedYield: 0,
              expectedRevenue: 0,
            },
          };
        });
        setZones(fallback);
      } finally {
        setIsAnimating(false);
        setLoading(false);
      }
    };
    fetchZones();
  }, [selectedFarm?.id, moisture, useAI]);

  useEffect(() => {
    const fetchGemini = async () => {
      try {
        let lat: number | null = null;
        let lon: number | null = null;
        if (selectedFarm?.coordinates) {
          const cleaned = selectedFarm.coordinates.replace(/[^\d\.,\- ]/g, '');
          const parts = cleaned.split(',').map(s => s.trim());
          if (parts.length >= 2) {
            const plat = Number(parts[0]);
            const plon = Number(parts[1]);
            if (!Number.isNaN(plat) && !Number.isNaN(plon)) {
              lat = plat;
              lon = plon;
            }
          }
        }
        const res = await api.post('/api/weather/gemini-insights', {
          lat: lat ?? 30.7333,
          lon: lon ?? 76.7794,
          days: 7,
        });
        setGemini(res.data || null);
      } catch {
        setGemini(null);
      }
    };
    fetchGemini();
  }, [selectedFarm?.id]);

  useEffect(() => {
    const fetchML = async () => {
      try {
        let q = selectedFarm?.location || 'Bengaluru, Karnataka';
        const geoRes = await api.get('/api/geocode', { params: { q } });
        const loc = (geoRes.data?.results && geoRes.data.results[0]) || null;
        const stateName = loc?.region || (q.split(',')[1]?.trim() ?? 'Karnataka');
        const districtName = loc?.name || (q.split(',')[0]?.trim() ?? 'Bengaluru');
        const soilType = selectedFarm?.soilType || 'Loam';
        const soilQuality = moisture < 35 ? 'Poor' : moisture > 65 ? 'Rich' : 'Medium';
        const soilFeel = moisture < 35 ? 'dry and crumbly' : moisture > 65 ? 'wet and muddy' : 'slightly damp';
        const applicationRate = 5.0;
        const cropRes = await api.post('/api/v1/crop/recommend', {
          soil_type: soilType,
          soil_quality: soilQuality,
          state_name: stateName,
          district_name: districtName,
        });
        const irrigRes = await api.post('/api/v1/irrigation/recommend', {
          soil_feel: soilFeel,
          application_rate: applicationRate,
          state_name: stateName,
          district_name: districtName,
        });
        setMlFarmCropRecs(cropRes.data?.recommendations || []);
        setMlFarmIrrigation(irrigRes.data || null);
      } catch {}
    };
    if (selectedFarm) fetchML();
  }, [selectedFarm?.id, moisture]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'var(--green-light)';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getSuitabilityColor = (score: number) => {
    if (score >= 85) return 'var(--green-light)';
    if (score >= 70) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <section className="section" style={{ paddingTop: 'var(--space-xl)' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="pill" style={{ marginBottom: 'var(--space-sm)' }}>🌐 Zone-Based Farm Analysis</div>
          <h1 style={{ fontSize: 'var(--h1)', marginBottom: 'var(--space-md)', color: 'var(--text-primary)' }}>
            Intelligent Plot Division & Crop Matching
          </h1>
          <p style={{ fontSize: 'var(--body-lg)', color: 'var(--text-secondary)', maxWidth: 'var(--narrow-width)' }}>
            Your farm is automatically divided into optimal zones based on soil analytics. Each zone gets personalized crop recommendations considering soil health, market trends, and cultivation feasibility.
          </p>
          <div className="card-apple" style={{ marginTop: 'var(--space-md)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 'var(--space-md)' }}>
              <div>
                <div className="pill" style={{ marginBottom: 'var(--space-sm)' }}>ML Crop Recommendations</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                  {(mlFarmCropRecs || []).slice(0, 3).map((rec, i) => (
                    <div key={i} style={{ padding: 'var(--space-sm)', border: '1px solid var(--border-color)', borderRadius: 'var(--space-xs)', background: 'var(--bg-tertiary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{rec.crop}</div>
                        <div style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.12)', color: 'var(--green-light)', fontSize: 11, fontWeight: 700 }}>
                          {rec.suitability}% fit
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>{rec.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="pill" style={{ marginBottom: 'var(--space-sm)' }}>Irrigation Decision</div>
                {mlFarmIrrigation ? (
                  <div style={{ padding: 'var(--space-sm)', border: '1px solid var(--border-color)', borderRadius: 'var(--space-xs)', background: 'var(--bg-tertiary)' }}>
                    <div style={{ fontSize: 'var(--body)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                      {mlFarmIrrigation.irrigate ? 'Irrigate Now' : 'Wait'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{mlFarmIrrigation.reason_weather}</div>
                    <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: '8px' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Water</div>
                      <div style={{ fontSize: 'var(--body)', color: 'var(--text-primary)', fontWeight: 600 }}>{mlFarmIrrigation.water_mm} mm</div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Duration</div>
                      <div style={{ fontSize: 'var(--body)', color: 'var(--text-primary)', fontWeight: 600 }}>{mlFarmIrrigation.duration_hours} h</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Loading ML decision…</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Farm Info */}
        {selectedFarm && (
          <div className="card-apple" style={{ marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
              <div>
                <div style={{ fontSize: 'var(--body)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-xs)' }}>
                  Analyzing Farm
                </div>
                <div style={{ fontSize: 'var(--h2)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedFarm.name}
                </div>
                <div style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {selectedFarm.location} · {selectedFarm.area || 0} acres
                </div>
              </div>
              <div style={{
                padding: 'var(--space-sm) var(--space-md)',
                borderRadius: 'var(--space-xs)',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid var(--green-primary)',
                color: 'var(--green-light)',
                fontSize: 'var(--body)',
                fontWeight: 600,
              }}>
                {zones.length} Zones Detected
              </div>
            </div>
            <div style={{ marginTop: 'var(--space-md)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-md)' }}>
              <div>
                <label style={{ fontSize: 'var(--body)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-xs)', display: 'block' }}>
                  Avg Soil Moisture (%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={moisture}
                  onChange={(e) => setMoisture(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {moisture}%
                </div>
              </div>
              <div>
                <label style={{ fontSize: 'var(--body)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-xs)', display: 'block' }}>
                  Use AI Zones
                </label>
                <button
                  className={useAI ? 'btn btn-secondary' : 'btn btn-primary'}
                  onClick={() => setUseAI(!useAI)}
                >
                  {useAI ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          </div>
        )}
        {gemini && (
          <div className="card-apple" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div style={{ fontSize: 'var(--h3)', fontWeight: 700, color: 'var(--text-primary)' }}>
                AI Insights
              </div>
              <div className="pill" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'var(--green-primary)', color: 'var(--green-light)', fontSize: '11px' }}>
                Gemini
              </div>
            </div>
            <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--body)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {gemini?.summary?.text || ''}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
              <div style={{ padding: 'var(--space-md)', border: '1px solid var(--border-color)', borderRadius: 'var(--space-xs)', background: 'var(--bg-tertiary)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Irrigation</div>
                <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)' }}>{gemini?.irrigation?.action}</div>
              </div>
              <div style={{ padding: 'var(--space-md)', border: '1px solid var(--border-color)', borderRadius: 'var(--space-xs)', background: 'var(--bg-tertiary)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Next 7 Days Rain</div>
                <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)' }}>{gemini?.rainfall?.next7days}%</div>
              </div>
              <div style={{ padding: 'var(--space-md)', border: '1px solid var(--border-color)', borderRadius: 'var(--space-xs)', background: 'var(--bg-tertiary)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Soil Risk</div>
                <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)' }}>{gemini?.soilRisk?.risk}</div>
              </div>
            </div>
          </div>
        )}

        {/* Plot Visualization */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="card-apple" style={{ padding: 'var(--space-md)', minHeight: '360px', position: 'relative', background: 'linear-gradient(180deg, var(--bg-tertiary), rgba(16,185,129,0.06))' }}>
            <div style={{ fontSize: 'var(--body)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-md)' }}>
              Farm Plot Visualization
            </div>
            
            
            {isAnimating ? (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                minHeight: '400px',
                flexDirection: 'column',
                gap: 'var(--space-md)',
              }}>
                <div style={{ fontSize: 'var(--h1)' }}>🌾</div>
                <div style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)' }}>
                  Analyzing soil data and dividing your farm into optimal zones...
                </div>
                <div style={{
                  width: '200px',
                  height: '4px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'var(--green-primary)',
                    borderRadius: '2px',
                    animation: 'loading 1.5s ease-in-out',
                  }} />
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative', width: '100%', maxWidth: '720px', margin: '0 auto', aspectRatio: '3 / 2', background: 'linear-gradient(90deg, var(--bg-tertiary) 0%, var(--bg-tertiary) 80%, rgba(16,185,129,0.06) 100%), repeating-linear-gradient(0deg, transparent 0px, transparent 20px, rgba(16,185,129,0.05) 20px, rgba(16,185,129,0.05) 22px)', borderRadius: 'var(--space-xs)', overflow: 'hidden', border: '2px solid var(--border-color)', animation: 'fieldSway 12s linear infinite' }}>
                {zones.map((zone, index) => (
                  <ZoneBlock
                    key={zone.id}
                    zone={zone}
                    index={index}
                    isAnimating={isAnimating}
                    onClick={() => setSelectedZone(zone)}
                    getHealthColor={getHealthColor}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Zone Details Grid */}
        {!isAnimating && zones.length > 0 && (
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <h2 style={{ fontSize: 'var(--h2)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
              Zone Details & Recommendations
            </h2>
            <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
              {zones.map((zone) => (
                <ZoneDetailCard
                  key={zone.id}
                  zone={zone}
                  isSelected={selectedZone?.id === zone.id}
                  onClick={() => setSelectedZone(selectedZone?.id === zone.id ? null : zone)}
                  getHealthColor={getHealthColor}
                  getSuitabilityColor={getSuitabilityColor}
                  onLockToggle={(locked) => {
                    if (locked) {
                      removeSelectedFarmZoneLock(zone.id);
                    } else {
                      addSelectedFarmZoneLock({
                        id: zone.id,
                        crop: zone.cropRecommendations.primary.crop,
                        area: zone.area,
                        estimatedCostPerAcre: 28000,
                        expectedRevenuePerAcre: 67200,
                      });
                    }
                  }}
                  isLocked={!!getSelectedFarmZoneLocks().find(l => l.id === zone.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Selected Zone Full Analytics */}
        {selectedZone && (
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <ZoneFullAnalytics
              zone={selectedZone}
              onClose={() => setSelectedZone(null)}
              getHealthColor={getHealthColor}
              getSuitabilityColor={getSuitabilityColor}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(0%); }
        }
        @keyframes zoneAppear {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes fieldSway {
          0% { background-position: 0 0, 0 0; }
          100% { background-position: 0 0, 0 40px; }
        }
      `}</style>
    </section>
  );
};

interface ZoneBlockProps {
  zone: Zone;
  index: number;
  isAnimating: boolean;
  onClick: () => void;
  getHealthColor: (score: number) => string;
}

const ZoneBlock: React.FC<ZoneBlockProps> = ({ zone, index, isAnimating, onClick, getHealthColor }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'absolute',
        left: `${zone.coordinates.x}%`,
        top: `${zone.coordinates.y}%`,
        width: `${zone.coordinates.width}%`,
        height: `${zone.coordinates.height}%`,
        background: isHovered 
          ? `repeating-linear-gradient(45deg, rgba(16,185,129,0.06) 0px, rgba(16,185,129,0.06) 6px, transparent 6px, transparent 12px), linear-gradient(135deg, ${getHealthColor(zone.soilAnalytics.healthScore)}40, ${getHealthColor(zone.soilAnalytics.healthScore)}20)`
          : `repeating-linear-gradient(45deg, rgba(16,185,129,0.04) 0px, rgba(16,185,129,0.04) 6px, transparent 6px, transparent 12px), ${getHealthColor(zone.soilAnalytics.healthScore)}30`,
        border: `2px solid ${getHealthColor(zone.soilAnalytics.healthScore)}`,
        borderRadius: 'var(--space-xs)',
        cursor: 'pointer',
        transition: 'all var(--transition-fast) var(--easing)',
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        zIndex: isHovered ? 10 : 1,
        boxShadow: isHovered ? `0 8px 24px ${getHealthColor(zone.soilAnalytics.healthScore)}40` : 'none',
        animation: isAnimating ? `zoneAppear 0.5s ease-out ${index * 0.2}s both` : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-sm)',
        gap: 'var(--space-xs)',
      }}
    >
      <div style={{ fontSize: 'var(--h3)', fontWeight: 700, color: 'var(--text-primary)' }}>
        {zone.name}
      </div>
      {isHovered && (
        <div style={{
          fontSize: '11px',
          color: 'var(--text-primary)',
          textAlign: 'center',
          background: 'var(--bg-card)',
          padding: 'var(--space-xs)',
          borderRadius: '4px',
          border: '1px solid var(--border-color)',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '2px' }}>{zone.area} acres</div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            Health: {zone.soilAnalytics.healthScore}/100
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            Best Crop: 🌾 {zone.cropRecommendations.primary.crop}
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            Click for details →
          </div>
        </div>
      )}
    </div>
  );
};

interface ZoneDetailCardProps {
  zone: Zone;
  isSelected: boolean;
  onClick: () => void;
  getHealthColor: (score: number) => string;
  getSuitabilityColor: (score: number) => string;
  onLockToggle?: (locked: boolean) => void;
  isLocked?: boolean;
}

const ZoneDetailCard: React.FC<ZoneDetailCardProps> = ({ zone, isSelected, onClick, getHealthColor, getSuitabilityColor, onLockToggle, isLocked }) => {
  return (
    <div 
      className="card-apple" 
      onClick={onClick}
      style={{ 
        cursor: 'pointer',
        border: isSelected ? `2px solid ${getHealthColor(zone.soilAnalytics.healthScore)}` : '1px solid var(--border-color)',
        transition: 'all var(--transition-fast) var(--easing)',
        transform: isSelected ? 'scale(1.01)' : 'scale(1)',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-lg)' }}>
        {/* Zone Info */}
        <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
          <h3 style={{ fontSize: 'var(--h2)', fontWeight: 600, color: 'var(--text-primary)' }}>
            {zone.name}
          </h3>
          <div style={{
            padding: '4px 12px',
            borderRadius: '6px',
            background: `${getHealthColor(zone.soilAnalytics.healthScore)}20`,
            color: getHealthColor(zone.soilAnalytics.healthScore),
            fontSize: '12px',
            fontWeight: 600,
          }}>
            {zone.soilAnalytics.healthScore}/100
          </div>
          {onLockToggle && (
            <button
              className={isLocked ? 'btn btn-secondary' : 'btn btn-primary'}
              style={{ marginLeft: 'auto' }}
              onClick={(e) => { e.stopPropagation(); onLockToggle(!!isLocked); }}
              title={isLocked ? 'Unlock zone' : 'Lock zone for planning'}
            >
              {isLocked ? 'Unlock' : 'Lock'}
            </button>
          )}
        </div>
          <div style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
            {zone.area} acres · {zone.soilAnalytics.soilType}
          </div>
          
          {/* Quick Soil Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-sm)' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>pH</div>
              <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)' }}>{zone.soilAnalytics.pH}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>EC</div>
              <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)' }}>{zone.soilAnalytics.EC} dS/m</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Moisture</div>
              <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)' }}>{zone.soilAnalytics.moisture}%</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Organic Matter</div>
              <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)' }}>{zone.soilAnalytics.organicMatter}%</div>
            </div>
          </div>
        </div>

        {/* Crop Recommendation */}
        <div className="card-apple" style={{ padding: 'var(--space-md)', background: 'var(--bg-tertiary)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)', fontWeight: 500 }}>
            Recommended Crop
          </div>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)', flexWrap: 'wrap' }}>
              <h4 style={{ fontSize: 'var(--h3)', fontWeight: 600, color: 'var(--text-primary)' }}>
                {zone.cropRecommendations.primary.crop}
              </h4>
              <div style={{
                padding: '4px 12px',
                borderRadius: '6px',
                background: `${getSuitabilityColor(zone.cropRecommendations.primary.suitability)}20`,
                color: getSuitabilityColor(zone.cropRecommendations.primary.suitability),
                fontSize: '11px',
                fontWeight: 600,
              }}>
                {zone.cropRecommendations.primary.suitability}% Match
              </div>
            </div>
            <div style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {zone.cropRecommendations.primary.reason}
            </div>
          </div>
          
          {/* Market Info */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-md)' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Market Price</div>
              <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)' }}>₹{zone.cropRecommendations.primary.marketPrice}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Expected Revenue</div>
              <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--green-light)' }}>₹{zone.cropRecommendations.primary.expectedRevenue.toLocaleString()}/acre</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Demand</div>
              <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: zone.cropRecommendations.primary.demand === 'HIGH' ? 'var(--green-light)' : 'var(--text-primary)' }}>
                {zone.cropRecommendations.primary.demand}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Risk Level</div>
              <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: zone.cropRecommendations.primary.riskLevel === 'LOW' ? 'var(--green-light)' : '#ef4444' }}>
                {zone.cropRecommendations.primary.riskLevel}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {isSelected && (
        <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)' }}>
            Click again to view full analytics →
          </div>
        </div>
      )}
    </div>
  );
};

interface ZoneFullAnalyticsProps {
  zone: Zone;
  onClose: () => void;
  getHealthColor: (score: number) => string;
  getSuitabilityColor: (score: number) => string;
}

const ZoneFullAnalytics: React.FC<ZoneFullAnalyticsProps> = ({ zone, onClose, getHealthColor, getSuitabilityColor }) => {
  return (
    <div className="card-apple" style={{ border: `2px solid ${getHealthColor(zone.soilAnalytics.healthScore)}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <h2 style={{ fontSize: 'var(--h1)', fontWeight: 600, color: 'var(--text-primary)' }}>
          {zone.name} - Complete Analytics
        </h2>
        <button
          onClick={onClose}
          className="btn btn-secondary"
          style={{ padding: 'var(--space-xs) var(--space-md)' }}
        >
          Close
        </button>
      </div>

      <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
        {/* Soil Analytics */}
        <div>
          <h3 style={{ fontSize: 'var(--h2)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
            🌱 Soil Analytics
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-md)' }}>
            <div className="card-apple" style={{ padding: 'var(--space-md)', background: 'var(--bg-tertiary)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>pH Level</div>
              <div style={{ fontSize: 'var(--h3)', fontWeight: 700, color: 'var(--text-primary)' }}>{zone.soilAnalytics.pH}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Optimal: 6.0-7.5</div>
            </div>
            <div className="card-apple" style={{ padding: 'var(--space-md)', background: 'var(--bg-tertiary)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>EC (Salinity)</div>
              <div style={{ fontSize: 'var(--h3)', fontWeight: 700, color: 'var(--text-primary)' }}>{zone.soilAnalytics.EC} dS/m</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Target: &lt;2.0</div>
            </div>
            <div className="card-apple" style={{ padding: 'var(--space-md)', background: 'var(--bg-tertiary)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Nitrogen</div>
              <div style={{ fontSize: 'var(--h3)', fontWeight: 700, color: 'var(--text-primary)' }}>{zone.soilAnalytics.nitrogen} kg/ha</div>
            </div>
            <div className="card-apple" style={{ padding: 'var(--space-md)', background: 'var(--bg-tertiary)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Phosphorus</div>
              <div style={{ fontSize: 'var(--h3)', fontWeight: 700, color: 'var(--text-primary)' }}>{zone.soilAnalytics.phosphorus} kg/ha</div>
            </div>
            <div className="card-apple" style={{ padding: 'var(--space-md)', background: 'var(--bg-tertiary)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Potassium</div>
              <div style={{ fontSize: 'var(--h3)', fontWeight: 700, color: 'var(--text-primary)' }}>{zone.soilAnalytics.potassium} kg/ha</div>
            </div>
            <div className="card-apple" style={{ padding: 'var(--space-md)', background: 'var(--bg-tertiary)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Moisture</div>
              <div style={{ fontSize: 'var(--h3)', fontWeight: 700, color: 'var(--text-primary)' }}>{zone.soilAnalytics.moisture}%</div>
            </div>
          </div>
        </div>

        {/* Crop Recommendations */}
        <CropRecommendationSection
          zone={zone}
          getSuitabilityColor={getSuitabilityColor}
        />

        {/* Cultivation Plan */}
        <CultivationPlanSection zone={zone} />
      </div>
    </div>
  );
};

interface CropRecommendationSectionProps {
  zone: Zone;
  getSuitabilityColor: (score: number) => string;
}

const CropRecommendationSection: React.FC<CropRecommendationSectionProps> = ({ zone, getSuitabilityColor }) => {
  return (
    <div>
      {/* Primary Recommendation */}
      <div
        className="card-apple"
        style={{
          border: `2px solid ${getSuitabilityColor(zone.cropRecommendations.primary.suitability)}`,
          marginBottom: 'var(--space-md)',
          padding: 'var(--space-lg)',
        }}
      >
         <h3 style={{ fontSize: 'var(--h2)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-lg)' }}>
           🤝 Crop Recommendations
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
          <div
            className="pill"
            style={{
              background: `${getSuitabilityColor(zone.cropRecommendations.primary.suitability)}20`,
              borderColor: getSuitabilityColor(zone.cropRecommendations.primary.suitability),
              color: getSuitabilityColor(zone.cropRecommendations.primary.suitability),
              fontSize: '11px',
            }}
          >
            PRIMARY RECOMMENDATION
          </div>
          <div style={{ fontSize: 'var(--h2)', fontWeight: 700, color: 'var(--text-primary)' }}>
            {zone.cropRecommendations.primary.crop}
          </div>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              background: `${getSuitabilityColor(zone.cropRecommendations.primary.suitability)}20`,
              color: getSuitabilityColor(zone.cropRecommendations.primary.suitability),
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {zone.cropRecommendations.primary.suitability}% Suitability
          </div>
        </div>

        <div style={{ fontSize: 'var(--body-lg)', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)', lineHeight: 1.6 }}>
          {zone.cropRecommendations.primary.reason}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
          <div
            style={{
              padding: 'var(--space-md)',
              borderRadius: 'var(--space-xs)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-tertiary)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: 'var(--space-xs)' }}>Market Price</div>
            <div style={{ fontSize: 'var(--h3)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>₹{zone.cropRecommendations.primary.marketPrice}</div>
            <div style={{ fontSize: '11px', color: zone.cropRecommendations.primary.marketTrend === 'UP' ? 'var(--green-light)' : zone.cropRecommendations.primary.marketTrend === 'DOWN' ? '#ef4444' : 'var(--text-tertiary)' }}>
              Trend: {zone.cropRecommendations.primary.marketTrend}
            </div>
          </div>
          <div
            style={{
              padding: 'var(--space-md)',
              borderRadius: 'var(--space-xs)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-tertiary)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: 'var(--space-xs)' }}>Expected Yield</div>
            <div style={{ fontSize: 'var(--h3)', fontWeight: 700, color: 'var(--text-primary)' }}>{zone.cropRecommendations.primary.expectedYield} tons/acre</div>
          </div>
          <div
            style={{
              padding: 'var(--space-md)',
              borderRadius: 'var(--space-xs)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-tertiary)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: 'var(--space-xs)' }}>Expected Revenue</div>
            <div style={{ fontSize: 'var(--h3)', fontWeight: 700, color: 'var(--green-light)' }}>₹{zone.cropRecommendations.primary.expectedRevenue.toLocaleString()}/acre</div>
          </div>
          <div
            style={{
              padding: 'var(--space-md)',
              borderRadius: 'var(--space-xs)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-tertiary)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: 'var(--space-xs)' }}>Risk Level</div>
            <div style={{ fontSize: 'var(--h3)', fontWeight: 700, color: zone.cropRecommendations.primary.riskLevel === 'LOW' ? 'var(--green-light)' : zone.cropRecommendations.primary.riskLevel === 'MEDIUM' ? '#f59e0b' : '#ef4444' }}>
              {zone.cropRecommendations.primary.riskLevel}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: 'var(--space-md)',
            background: 'rgba(16, 185, 129, 0.08)',
            borderRadius: 'var(--space-xs)',
            border: '1px solid var(--green-primary)',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Demand</div>
          <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: zone.cropRecommendations.primary.demand === 'HIGH' ? 'var(--green-light)' : zone.cropRecommendations.primary.demand === 'MEDIUM' ? '#f59e0b' : 'var(--text-primary)' }}>
            {zone.cropRecommendations.primary.demand} Market Demand
          </div>
        </div>

        {/* Alternative Recommendations */}
        {zone.cropRecommendations.alternatives.length > 0 && (
          <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
              {zone.cropRecommendations.alternatives.map((alt, i) => (
                <div
                  key={i}
                  className="card-apple"
                  style={{
                    padding: 'var(--space-md)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 'var(--space-md)',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
                      {alt.crop}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{alt.reason}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--space-sm)' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Suitability</div>
                      <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: getSuitabilityColor(alt.suitability) }}>
                        {alt.suitability}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Revenue</div>
                      <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--green-light)' }}>
                        ₹{alt.expectedRevenue.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Risk</div>
                      <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: alt.riskLevel === 'LOW' ? 'var(--green-light)' : alt.riskLevel === 'MEDIUM' ? '#f59e0b' : '#ef4444' }}>
                        {alt.riskLevel}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface CultivationPlanSectionProps {
  zone: Zone;
}

const CultivationPlanSection: React.FC<CultivationPlanSectionProps> = ({ zone }) => {
  return (
    <div className="card-apple" style={{ padding: 'var(--space-lg)' }}>
      <h3 style={{ fontSize: 'var(--h2)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-lg)' }}>
        📋 Cultivation Plan
      </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          <div
            style={{
              padding: 'var(--space-md)',
              borderRadius: 'var(--space-xs)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-tertiary)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: 'var(--space-xs)' }}>Timeline</div>
            <div style={{ fontSize: 'var(--h3)', fontWeight: 700, color: 'var(--text-primary)' }}>{zone.cultivationPlan.timeline}</div>
          </div>
          <div
            style={{
              padding: 'var(--space-md)',
              borderRadius: 'var(--space-xs)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-tertiary)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: 'var(--space-xs)' }}>Estimated Cost</div>
            <div style={{ fontSize: 'var(--h3)', fontWeight: 700, color: 'var(--text-primary)' }}>₹{zone.cultivationPlan.estimatedCost.toLocaleString()}/acre</div>
          </div>
          <div
            style={{
              padding: 'var(--space-md)',
              borderRadius: 'var(--space-xs)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-tertiary)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: 'var(--space-xs)' }}>Expected Yield</div>
            <div style={{ fontSize: 'var(--h3)', fontWeight: 700, color: 'var(--text-primary)' }}>{zone.cultivationPlan.expectedYield} tons/acre</div>
          </div>
          <div
            style={{
              padding: 'var(--space-md)',
              borderRadius: 'var(--space-xs)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-tertiary)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: 'var(--space-xs)' }}>Expected Revenue</div>
            <div style={{ fontSize: 'var(--h3)', fontWeight: 700, color: 'var(--green-light)' }}>₹{zone.cultivationPlan.expectedRevenue.toLocaleString()}/acre</div>
          </div>
        </div>

        <div style={{ paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: 'var(--h3)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
            Step-by-Step Guide
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 'var(--space-sm)',
            }}
          >
            {zone.cultivationPlan.steps.map((step, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-sm)',
                  padding: 'var(--space-sm)',
                  borderRadius: 'var(--space-xs)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-tertiary)',
                  minHeight: '52px',
                }}
              >
                <div
                  style={{
                    minWidth: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--green-primary)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  {i + 1}
                </div>
                <div
                  style={{
                    fontSize: 'var(--body)',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.45,
                    flex: 1,
                  }}
                >
                  {step}
                </div>
              </div>
            ))}
          </div>
        </div>
    </div>
  );
};

export default Network;

