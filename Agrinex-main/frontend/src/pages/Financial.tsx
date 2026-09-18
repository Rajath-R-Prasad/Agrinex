import React, { useMemo, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import DynamicBackground from '../components/DynamicBackground';

const Financial: React.FC = () => {
  const { user, getSelectedFarm, getSelectedFarmZoneLocks } = useAuth();
  const selectedFarm = getSelectedFarm() || (user?.farms?.[0] ?? null);
  const zoneLocks = getSelectedFarmZoneLocks();
  const [gemini, setGemini] = useState<any | null>(null);

  const lockedSummary = useMemo(() => {
    const totalArea = zoneLocks.reduce((sum, z) => sum + (z.area || 0), 0);
    const totalCost = zoneLocks.reduce((sum, z) => sum + z.area * z.estimatedCostPerAcre, 0);
    const totalRevenue = zoneLocks.reduce((sum, z) => sum + z.area * z.expectedRevenuePerAcre, 0);
    const netProfit = totalRevenue - totalCost;
    const roi = totalCost > 0 ? Math.round((netProfit / totalCost) * 1000) / 10 : 0;
    const byCrop = zoneLocks.reduce<Record<string, { area: number; cost: number; revenue: number }>>((acc, z) => {
      const key = z.crop;
      const current = acc[key] || { area: 0, cost: 0, revenue: 0 };
      current.area += z.area;
      current.cost += z.area * z.estimatedCostPerAcre;
      current.revenue += z.area * z.expectedRevenuePerAcre;
      acc[key] = current;
      return acc;
    }, {});
    return { totalArea, totalCost, totalRevenue, netProfit, roi, byCrop };
  }, [zoneLocks]);

  const displayRoi = zoneLocks.length > 0 ? `${lockedSummary.roi}%` : '—';

  useEffect(() => {
    const fetchGemini = async () => {
      try {
        let lat: number | null = null;
        let lon: number | null = null;
        if (selectedFarm?.coordinates) {
          const cleaned = selectedFarm.coordinates.replace(/[^\d\.,\- ]/g, '');
          const parts = cleaned.split(',').map((s) => s.trim());
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
          lat: lat ?? 12.9716,
          lon: lon ?? 77.5946,
          days: 7,
        });
        setGemini(res.data || null);
      } catch {
        setGemini(null);
      }
    };
    fetchGemini();
  }, [selectedFarm?.id]);

  return (
    <>
      <DynamicBackground />
      <section className="section" style={{ position: 'relative', zIndex: 10 }}>
        <div className="container">
          {/* Header */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <div className="pill" style={{ marginBottom: 'var(--space-xs)' }}>💰 Financial Intelligence</div>
            <h1 style={{ fontSize: 'var(--h1)', marginBottom: 'var(--space-xs)', color: 'var(--text-primary)' }}>
              Farmer Financial Command Center
            </h1>
            <p style={{ fontSize: 'var(--body-lg)', color: 'var(--text-secondary)', maxWidth: 'var(--narrow-width)' }}>
              Crop ROI projections, cashflow metrics, and lender-grade risk summaries tailored to your active farm.
            </p>
          </div>

          {/* Gemini AI Insights */}
          {gemini && (
            <div className="card-apple" style={{ marginBottom: 'var(--space-lg)', padding: 'clamp(16px, 3vw, 24px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: 'var(--h3)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  🤖 AI Agronomic & Financial Forecast
                </div>
                <div className="pill" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'var(--green-primary)', color: 'var(--green-light)', fontSize: '11px' }}>
                  Gemini Insights
                </div>
              </div>
              <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {gemini?.summary?.text || 'Weather and financial forecast optimized for current farm location.'}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
                  gap: '10px',
                  marginTop: '14px',
                }}
              >
                <div style={{ padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '10px', background: 'var(--bg-tertiary)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Irrigation</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{gemini?.irrigation?.action || 'Hold'}</div>
                </div>
                <div style={{ padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '10px', background: 'var(--bg-tertiary)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Next 7 Days Rain</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--green-light)' }}>{gemini?.rainfall?.next7days || 0}%</div>
                </div>
                <div style={{ padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '10px', background: 'var(--bg-tertiary)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Soil Risk Level</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{gemini?.soilRisk?.risk || 'Low'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Active Farm Context */}
          {selectedFarm && (
            <div className="card-apple" style={{ marginBottom: 'var(--space-lg)', padding: 'clamp(16px, 3vw, 24px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Active Farm</div>
                  <div style={{ fontSize: 'var(--h2)', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {selectedFarm.name}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {selectedFarm.location} · {selectedFarm.area || 0} acres
                  </div>
                </div>
                <div
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid var(--green-primary)',
                    color: 'var(--green-light)',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                >
                  ROI: {displayRoi}
                </div>
              </div>
            </div>
          )}

          {/* Locked Zones Financial Metrics */}
          {zoneLocks.length > 0 ? (
            <div className="card-apple" style={{ marginBottom: 'var(--space-xl)', padding: 'clamp(16px, 3vw, 24px)' }}>
              <h3 style={{ fontSize: 'var(--h3)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
                Locked Zones Financial Analysis
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
                  gap: '10px',
                }}
              >
                <div style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Region</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedFarm?.location?.split(',')[0] || '—'}
                  </div>
                </div>
                <div style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Total Area</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {lockedSummary.totalArea} acres
                  </div>
                </div>
                <div style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Total Cost</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#f59e0b' }}>
                    ₹{lockedSummary.totalCost.toLocaleString()}
                  </div>
                </div>
                <div style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Expected Revenue</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--green-light)' }}>
                    ₹{lockedSummary.totalRevenue.toLocaleString()}
                  </div>
                </div>
                <div style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Net Profit</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    ₹{lockedSummary.netProfit.toLocaleString()}
                  </div>
                </div>
                <div style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Net ROI</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--green-light)' }}>
                    {lockedSummary.roi}%
                  </div>
                </div>
              </div>

              {/* Crop Breakdown */}
              <div style={{ marginTop: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                  Crop Cost Breakdown
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
                    gap: '10px',
                  }}
                >
                  {Object.entries(lockedSummary.byCrop).map(([crop, v], i) => (
                    <div
                      key={i}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-tertiary)',
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{crop}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Area: {v.area} acres</div>
                      <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '2px' }}>Cost: ₹{v.cost.toLocaleString()}</div>
                      <div style={{ fontSize: '12px', color: 'var(--green-light)', marginTop: '2px' }}>Revenue: ₹{v.revenue.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="card-apple" style={{ padding: 'clamp(16px, 3vw, 24px)', marginBottom: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  No active zone locks yet. Configure zone allocations in Farm Network to calculate financials.
                </div>
                <a className="btn btn-primary" href="/network" style={{ minWidth: '140px' }}>
                  Go to Farm Network
                </a>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Financial;
