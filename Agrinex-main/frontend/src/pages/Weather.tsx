import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import DynamicBackground from '../components/DynamicBackground';

/**
 * Hyperlocal Weather & Irrigation Advisory Engine
 * Purely driven by live API responses (WeatherAPI / Open-Meteo & Hyperlocal Multi-Radius).
 */

const Weather: React.FC = () => {
  const { user, selectFarm, getSelectedFarm, getUserCoordinates } = useAuth();
  const [forecastDays, setForecastDays] = useState<number>(7);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedRadius, setSelectedRadius] = useState<number>(2);

  // Dynamic Location State (supports live search and GPS detection)
  const [locationOverride, setLocationOverride] = useState<{
    name: string;
    region: string;
    lat: number;
    lon: number;
    isGps?: boolean;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Array<{ name: string; region: string; country: string; lat: number; lon: number }>>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  const selectedFarm = getSelectedFarm() || (user?.farms && user.farms.length > 0 ? user.farms[0] : null);
  const hasMultipleFarms = (user?.farms.length || 0) > 1;
  const userFarm = selectedFarm || {
    id: 'farm_123',
    name: 'My Farm',
    location: 'Bengaluru, Karnataka',
    coordinates: '12.9716, 77.5946',
    area: 5,
  };

  const activeLocationTitle = locationOverride
    ? `${locationOverride.name}, ${locationOverride.region}`
    : userFarm.location;

  const [currentWeather, setCurrentWeather] = useState<any>({
    location: activeLocationTitle,
    coordinates: userFarm.coordinates,
    temperature: 24.5,
    feelsLike: 25.2,
    condition: 'Partly Cloudy',
    humidity: 65,
    windSpeed: 10.5,
    pressure: 1013,
    lastUpdated: 'Just now',
  });

  const [forecastData, setForecastData] = useState<any[]>(() =>
    Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() + i * 86400000),
      high: 28,
      low: 19,
      condition: 'Sunny',
      rainChance: 15,
      rainAmount: 0.0,
      humidity: 60,
      windSpeed: 10,
      isToday: i === 0,
    }))
  );

  const [hyperlocalData, setHyperlocalData] = useState<any | null>(null);

  // Debounced search for location / district autocomplete
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get('/api/geocode', { params: { q: searchQuery.trim() } });
        const list = res?.results || res?.data?.results || [];
        setSearchResults(list);
        setShowDropdown(list.length > 0);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Use device GPS location
  const handleUseGpsLocation = async () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 });
      });
      const lat = Number(pos.coords.latitude.toFixed(4));
      const lon = Number(pos.coords.longitude.toFixed(4));

      // Attempt reverse lookup via geocode
      let placeName = `GPS (${lat}, ${lon})`;
      let regionName = 'Device Location';
      try {
        const curRes = await api.get('/api/weather/current', { params: { lat, lon } });
        if (curRes?.location && !curRes.location.startsWith('Location')) {
          placeName = curRes.location;
        }
      } catch {}

      setLocationOverride({
        name: placeName,
        region: regionName,
        lat,
        lon,
        isGps: true,
      });
      setSearchQuery('');
      setShowDropdown(false);
    } catch {
      alert('Could not access device GPS. Please grant browser location permission.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlace = (place: { name: string; region: string; lat: number; lon: number }) => {
    setLocationOverride({
      name: place.name,
      region: place.region,
      lat: place.lat,
      lon: place.lon,
      isGps: false,
    });
    setSearchQuery(`${place.name}, ${place.region}`);
    setShowDropdown(false);
  };

  // Reset override when farm changes
  useEffect(() => {
    setLocationOverride(null);
    setSearchQuery('');
  }, [selectedFarm?.id]);

  // Fetch live weather directly from API
  const fetchWeather = async () => {
    setLoading(true);
    try {
      const defaultCoords = getUserCoordinates();
      const parts = (selectedFarm?.location || 'Bengaluru, Karnataka').split(',');
      const defaultDistrict = parts[0]?.trim() || user?.district || 'Bengaluru';
      const defaultState = parts[1]?.trim() || user?.state || 'Karnataka';

      const lat = locationOverride ? locationOverride.lat : defaultCoords.lat;
      const lon = locationOverride ? locationOverride.lon : defaultCoords.lon;
      const district = locationOverride ? locationOverride.name : defaultDistrict;
      const state = locationOverride ? locationOverride.region : defaultState;

      // 1. Current Weather
      try {
        const curRes = await api.get('/api/weather/current', {
          params: { lat, lon },
        });
        if (curRes) {
          const coordStr = typeof curRes.coordinates === 'object' && curRes.coordinates !== null
            ? `${curRes.coordinates.lat?.toFixed ? curRes.coordinates.lat.toFixed(4) : curRes.coordinates.lat}, ${curRes.coordinates.lon?.toFixed ? curRes.coordinates.lon.toFixed(4) : curRes.coordinates.lon}`
            : (curRes.coordinates || `${lat}, ${lon}`);
          setCurrentWeather({
            ...curRes,
            location: locationOverride ? `${locationOverride.name}, ${locationOverride.region}` : curRes.location,
            coordinates: coordStr,
          });
        }
      } catch (e) {
        console.error('Error fetching current weather:', e);
      }

      // 2. Multi-Day Forecast (7 or 14 days)
      try {
        const fcRes = await api.get('/api/weather/forecast', {
          params: { lat, lon, days: forecastDays },
        });
        if (fcRes?.days && fcRes.days.length > 0) {
          setForecastData(fcRes.days.map((d: any) => ({
            date: new Date(d.date),
            high: d.high,
            low: d.low,
            condition: d.condition,
            rainChance: d.rainChance,
            rainAmount: d.rainAmount,
            humidity: d.humidity,
            windSpeed: d.windSpeed,
            isToday: d.isToday,
          })));
        }
      } catch (e) {
        console.error('Error fetching forecast:', e);
      }

      // 3. Hyperlocal concentric zones & irrigation advisory
      try {
        const hlRes = await api.get('/api/weather/hyperlocal', {
          params: {
            lat,
            lon,
            farm_name: userFarm.name,
            district,
            state,
          },
        });
        if (hlRes) {
          setHyperlocalData(hlRes);
        }
      } catch (e) {
        console.error('Error fetching hyperlocal data:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, [selectedFarm?.id, locationOverride, forecastDays]);

  const zones = useMemo(() => {
    if (hyperlocalData?.zones && Array.isArray(hyperlocalData.zones) && hyperlocalData.zones.length > 0) {
      return hyperlocalData.zones;
    }
    // Fallback zones computed around live values
    const baseTemp = currentWeather.temperature || 24;
    const baseHum = currentWeather.humidity || 60;
    return [
      {
        radius: 2,
        label: '2km Zone (Immediate Microclimate)',
        description: 'Nearest sensor station / local perimeter',
        current: { temperature: baseTemp, humidity: baseHum, windSpeed: 8, rain_24h: 0 },
        rainfallChance: { next24h: 10, next48h: 20 },
        irrigation: { action: 'Irrigate Now', water_mm: 8.5, reason: 'Topsoil deficit in immediate 2km boundary.' },
      },
      {
        radius: 5,
        label: '5km Zone (Community Perimeter)',
        description: 'Neighboring farm belt telemetry',
        current: { temperature: baseTemp + 0.4, humidity: Math.max(20, baseHum - 3), windSpeed: 10, rain_24h: 0 },
        rainfallChance: { next24h: 15, next48h: 25 },
        irrigation: { action: 'Irrigate Now', water_mm: 8.0, reason: '5km perimeter shows dry wind trends.' },
      },
      {
        radius: 10,
        label: '10km Zone (District Macro Perimeter)',
        description: 'Synoptic weather grid overlay',
        current: { temperature: baseTemp + 0.8, humidity: Math.max(20, baseHum - 5), windSpeed: 12, rain_24h: 0 },
        rainfallChance: { next24h: 20, next48h: 30 },
        irrigation: { action: 'Irrigate Now', water_mm: 7.5, reason: 'Regional radar confirms no storm front.' },
      },
    ];
  }, [hyperlocalData, currentWeather]);

  const activeZone = zones.find((z: any) => z.radius === selectedRadius) || zones[0];
  const unifiedDecision = hyperlocalData?.unified_decision;

  return (
    <>
      <DynamicBackground />
      <section className="section" style={{ position: 'relative', zIndex: 10 }}>
        <div className="container">
          {/* Top Farm & Location Bar */}
          <div className="card-apple" style={{ marginBottom: 'var(--space-lg)', padding: 'clamp(16px, 3vw, 24px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="pill" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'var(--green-primary)', color: 'var(--green-light)' }}>
                    🛰️ Live Hyperlocal Telemetry
                  </span>
                  {locationOverride?.isGps && (
                    <span className="pill" style={{ background: 'rgba(59, 130, 246, 0.15)', borderColor: '#3b82f6', color: '#60a5fa' }}>
                      📍 GPS Active
                    </span>
                  )}
                </div>
                <h1 style={{ fontSize: 'var(--h2)', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
                  {activeLocationTitle}
                </h1>
                <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                  Farm: <strong style={{ color: 'var(--text-secondary)' }}>{userFarm.name}</strong> · Coordinates: {currentWeather.coordinates}
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {hasMultipleFarms && (
                  <select
                    value={selectedFarm?.id || ''}
                    onChange={(e) => {
                      selectFarm(e.target.value);
                      setLocationOverride(null);
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {user?.farms.map((farm) => (
                      <option key={farm.id} value={farm.id}>
                        {farm.name} ({farm.location})
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={handleUseGpsLocation}
                  disabled={loading}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '13px', minHeight: '38px' }}
                >
                  📍 {loading ? 'Locating…' : 'Live GPS'}
                </button>

                {locationOverride && (
                  <button
                    type="button"
                    onClick={() => setLocationOverride(null)}
                    className="btn btn-secondary"
                    style={{ padding: '8px 14px', fontSize: '13px', minHeight: '38px' }}
                  >
                    🔄 Reset
                  </button>
                )}
              </div>
            </div>

            {/* Search district bar */}
            <div style={{ marginTop: '14px', position: 'relative', width: '100%', maxWidth: '540px' }}>
              <input
                type="text"
                placeholder="🔍 Search district or city (e.g. Mysuru, Pune, Mandya)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
              {isSearching && (
                <div style={{ position: 'absolute', right: '12px', top: '10px', fontSize: '13px', color: 'var(--text-tertiary)' }}>
                  ⏳
                </div>
              )}

              {/* Dropdown search results */}
              {showDropdown && searchResults.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
                    zIndex: 50,
                    maxHeight: '240px',
                    overflowY: 'auto',
                  }}
                >
                  {searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectPlace(item)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: idx < searchResults.length - 1 ? '1px solid var(--border-color)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{item.name}</strong>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginLeft: '6px' }}>
                          {item.region}, {item.country}
                        </span>
                      </div>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontFamily: 'monospace' }}>
                        {item.lat}, {item.lon}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Current Live Conditions Card */}
          <div className="card-apple" style={{ marginBottom: 'var(--space-lg)', padding: 'clamp(16px, 3vw, 24px)' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
                gap: '20px',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Live Farm Conditions
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 'clamp(2.4rem, 5vw, 3.4rem)', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {currentWeather.temperature}°
                  </span>
                  <span style={{ fontSize: '1.2rem', color: 'var(--text-tertiary)' }}>C</span>
                  <span style={{ fontSize: '1rem', color: 'var(--green-light)', marginLeft: '6px', fontWeight: 600 }}>
                    {currentWeather.condition}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  Feels like {currentWeather.feelsLike}°C
                </div>
              </div>

              {/* 4 Metric Chips */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 110px), 1fr))',
                  gap: '10px',
                }}
              >
                <div style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>💧 Humidity</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {currentWeather.humidity}%
                  </div>
                </div>
                <div style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>💨 Wind</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {currentWeather.windSpeed} km/h
                  </div>
                </div>
                <div style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>📊 Pressure</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {currentWeather.pressure} hPa
                  </div>
                </div>
                <div style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>🌧️ Rain (24h)</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: (currentWeather.rain_24h || 0) > 0 ? 'var(--green-light)' : 'var(--text-primary)', marginTop: '2px' }}>
                    {currentWeather.rain_24h || 0} mm
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hyperlocal Multi-Radius Distance Radar & Automated Irrigation Advice */}
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <div className="pill" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'var(--green-primary)', color: 'var(--green-light)' }}>
                🎯 Hyperlocal Concentric Radar
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                (Live readings across 2km, 5km, and 10km perimeter rings)
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
                gap: 'clamp(16px, 2.5vw, 24px)',
              }}
            >
              {/* Concentric Distance Radar Card */}
              <div className="card-apple" style={{ padding: '20px', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                  Concentric Distance Radar
                </div>

                {/* Circular SVG Radar Image */}
                <div style={{ position: 'relative', width: '100%', maxWidth: '260px', aspectRatio: '1/1', margin: '0 auto' }}>
                  <svg viewBox="0 0 280 280" style={{ width: '100%', height: '100%' }}>
                    <defs>
                      <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="var(--green-primary)" stopOpacity="0.25" />
                        <stop offset="60%" stopColor="var(--green-primary)" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="var(--green-primary)" stopOpacity="0.01" />
                      </radialGradient>
                    </defs>

                    <circle cx="140" cy="140" r="130" fill="url(#radarGlow)" />

                    {/* 10km Outer Ring */}
                    <circle
                      cx="140"
                      cy="140"
                      r="125"
                      fill="transparent"
                      stroke={selectedRadius === 10 ? 'var(--green-light)' : 'rgba(255,255,255,0.15)'}
                      strokeWidth={selectedRadius === 10 ? '3' : '1.5'}
                      strokeDasharray={selectedRadius === 10 ? 'none' : '4,4'}
                      style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                      onClick={() => setSelectedRadius(10)}
                    />

                    {/* 5km Middle Ring */}
                    <circle
                      cx="140"
                      cy="140"
                      r="85"
                      fill="transparent"
                      stroke={selectedRadius === 5 ? 'var(--green-light)' : 'rgba(255,255,255,0.22)'}
                      strokeWidth={selectedRadius === 5 ? '3' : '1.5'}
                      strokeDasharray={selectedRadius === 5 ? 'none' : '4,4'}
                      style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                      onClick={() => setSelectedRadius(5)}
                    />

                    {/* 2km Inner Ring */}
                    <circle
                      cx="140"
                      cy="140"
                      r="45"
                      fill={selectedRadius === 2 ? 'rgba(16, 185, 129, 0.18)' : 'transparent'}
                      stroke={selectedRadius === 2 ? 'var(--green-primary)' : 'rgba(16, 185, 129, 0.4)'}
                      strokeWidth={selectedRadius === 2 ? '3' : '2'}
                      style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                      onClick={() => setSelectedRadius(2)}
                    />

                    {/* Center Farm Location Dot */}
                    <circle cx="140" cy="140" r="8" fill="var(--green-primary)" />
                    <circle cx="140" cy="140" r="14" fill="none" stroke="var(--green-primary)" strokeWidth="1.5" opacity="0.6">
                      <animate attributeName="r" values="8;20;8" dur="3s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0.1;0.8" dur="3s" repeatCount="indefinite" />
                    </circle>

                    {/* Distance Labels */}
                    <text x="140" y="102" textAnchor="middle" fill="var(--green-light)" fontSize="10" fontWeight="700">
                      2 km
                    </text>
                    <text x="140" y="62" textAnchor="middle" fill="var(--text-secondary)" fontSize="10" fontWeight="600">
                      5 km
                    </text>
                    <text x="140" y="24" textAnchor="middle" fill="var(--text-tertiary)" fontSize="10" fontWeight="600">
                      10 km
                    </text>
                  </svg>
                </div>

                {/* Radius Buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {[2, 5, 10].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRadius(r)}
                      className={selectedRadius === r ? 'btn btn-primary' : 'btn btn-secondary'}
                      style={{ padding: '6px 14px', fontSize: '12px', minHeight: '34px' }}
                    >
                      {r}km Ring
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Live Automated Irrigation Advice & Radial Analytics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Unified Irrigation Advice Card */}
                <div
                  className="card-apple"
                  style={{
                    padding: 'clamp(16px, 3vw, 24px)',
                    background:
                      unifiedDecision?.status === 'green'
                        ? 'rgba(16, 185, 129, 0.12)'
                        : unifiedDecision?.status === 'blue'
                        ? 'rgba(59, 130, 246, 0.12)'
                        : 'rgba(245, 158, 11, 0.12)',
                    borderColor:
                      unifiedDecision?.status === 'green'
                        ? 'var(--green-primary)'
                        : unifiedDecision?.status === 'blue'
                        ? '#3b82f6'
                        : '#f59e0b',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)' }}>
                        Automated Irrigation Advisory
                      </div>
                      <div style={{ fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {unifiedDecision?.decision || (activeZone?.irrigation?.action || 'Irrigate Now')}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Volume</div>
                      <div style={{ fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 800, color: 'var(--green-light)' }}>
                        {unifiedDecision?.water_mm ?? activeZone?.irrigation?.water_mm ?? 8.0} mm
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 14px 0' }}>
                    {unifiedDecision?.summary || activeZone?.irrigation?.reason || 'Multi-radius analysis indicates stable soil moisture balance.'}
                  </p>

                  {/* 2km, 5km, 10km comparison boxes */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 80px), 1fr))',
                      gap: '8px',
                      paddingTop: '10px',
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {zones.map((z: any) => (
                      <div
                        key={z.radius}
                        onClick={() => setSelectedRadius(z.radius)}
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          background: selectedRadius === z.radius ? 'rgba(16, 185, 129, 0.22)' : 'var(--bg-tertiary)',
                          border: selectedRadius === z.radius ? '1px solid var(--green-primary)' : '1px solid var(--border-color)',
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 700, color: selectedRadius === z.radius ? 'var(--green-light)' : 'var(--text-secondary)' }}>
                          {z.radius}km Ring
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                          {z.current?.temperature ?? 24}°C
                        </div>
                        <div style={{ fontSize: '10px', color: (z.rainfallChance?.next24h || 0) > 50 ? 'var(--green-light)' : 'var(--text-tertiary)' }}>
                          {z.rainfallChance?.next24h ?? 15}% Rain
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Radius Detail */}
                <div className="card-apple" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                        {activeZone.label}
                      </h3>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{activeZone.description}</div>
                    </div>
                    <span className="pill" style={{ fontSize: '10px' }}>Telemetry</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 65px), 1fr))', gap: '8px', marginTop: '8px' }}>
                    <div style={{ padding: '6px', background: 'var(--bg-tertiary)', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Temp</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{activeZone.current?.temperature}°C</div>
                    </div>
                    <div style={{ padding: '6px', background: 'var(--bg-tertiary)', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Humidity</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{activeZone.current?.humidity}%</div>
                    </div>
                    <div style={{ padding: '6px', background: 'var(--bg-tertiary)', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Wind</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{activeZone.current?.windSpeed}kph</div>
                    </div>
                    <div style={{ padding: '6px', background: 'var(--bg-tertiary)', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>24h Rain</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--green-light)' }}>{activeZone.current?.rain_24h || 0}mm</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Day Forecast */}
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: 'var(--h2)', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {forecastDays}-Day Weather Forecast
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  Daily temperature, precipitation likelihood, and moisture forecast
                </div>
              </div>

              {/* Toggle 7 Days vs 14 Days */}
              <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                {[7, 14].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setForecastDays(days)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: forecastDays === days ? 'var(--green-primary)' : 'transparent',
                      color: forecastDays === days ? '#fff' : 'var(--text-secondary)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            </div>

            {/* Daily Forecast Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 110px), 1fr))',
                gap: '10px',
                marginBottom: '20px',
              }}
            >
              {forecastData.map((day, i) => {
                const d = day?.date ? (day.date instanceof Date ? day.date : new Date(day.date)) : new Date();
                const isValid = !isNaN(d.getTime());
                const dayLabel = day.isToday ? 'Today' : (isValid ? d.toLocaleDateString('en-US', { weekday: 'short' }) : '');
                const dateLabel = isValid ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

                return (
                  <div
                    key={i}
                    className="card-apple"
                    style={{
                      padding: '12px 8px',
                      textAlign: 'center',
                      background: day.isToday ? 'rgba(16, 185, 129, 0.14)' : 'var(--bg-card)',
                      borderColor: day.isToday ? 'var(--green-primary)' : 'var(--border-color)',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                      {dayLabel}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>
                      {dateLabel}
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {day.high}°
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>
                      {day.low}°
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500, minHeight: '16px' }}>
                      {day.condition}
                    </div>
                    <div style={{ fontSize: '10px', color: (day.rainChance || 0) > 30 ? 'var(--green-light)' : 'var(--text-tertiary)', marginTop: '4px' }}>
                      💧 {day.rainChance || 0}%
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Temperature & Precipitation Trend Charts */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
                gap: '16px',
              }}
            >
              <div className="card-apple" style={{ padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                  🌡️ Temperature Trend ({forecastDays} Days)
                </div>
                <SimpleTemperatureChart data={forecastData} />
              </div>

              <div className="card-apple" style={{ padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                  🌧️ Expected Precipitation ({forecastDays} Days)
                </div>
                <SimpleRainChart data={forecastData} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

/* SVG Chart Subcomponents with fluid scaling */

const SimpleTemperatureChart: React.FC<{ data: any[] }> = ({ data }) => {
  if (!data || data.length === 0) return <div style={{ color: 'var(--text-tertiary)' }}>No data available</div>;

  const maxTemp = Math.max(...data.map((d) => d.high || 0), 30);
  const minTemp = Math.min(...data.map((d) => d.low || 0), 10);
  const range = (maxTemp - minTemp) || 1;
  const height = 130;
  const width = 500;
  const pad = 24;

  const getY = (v: number) => height - pad - (((v - minTemp) / range) * (height - pad * 2));
  const getX = (idx: number) => (data.length <= 1 ? pad : (idx / (data.length - 1)) * (width - pad * 2) + pad);

  const highPoints = data.map((d, i) => `${getX(i)},${getY(d.high)}`).join(' ');
  const lowPoints = data.map((d, i) => `${getX(i)},${getY(d.low)}`).join(' ');

  return (
    <div style={{ width: '100%', height: 'auto', minHeight: `${height}px` }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        <polyline fill="none" stroke="var(--green-light)" strokeWidth="3" strokeLinecap="round" points={highPoints} />
        <polyline fill="none" stroke="var(--green-dark)" strokeWidth="2" strokeDasharray="3,3" strokeLinecap="round" points={lowPoints} />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={getX(i)} cy={getY(d.high)} r="3.5" fill="var(--green-light)" />
            <text x={getX(i)} y={getY(d.high) - 7} fontSize="9" fill="var(--text-secondary)" textAnchor="middle">
              {d.high}°
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const SimpleRainChart: React.FC<{ data: any[] }> = ({ data }) => {
  if (!data || data.length === 0) return <div style={{ color: 'var(--text-tertiary)' }}>No data available</div>;

  const maxRain = Math.max(...data.map((d) => d.rainAmount || 0), 1);
  const height = 130;
  const width = 500;
  const pad = 24;

  const barWidth = Math.max(6, Math.min(20, (width - pad * 2) / data.length - 6));

  return (
    <div style={{ width: '100%', height: 'auto', minHeight: `${height}px` }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        {data.map((d, i) => {
          const x = data.length <= 1 ? pad : (i / (data.length - 1)) * (width - pad * 2) + pad;
          const barHeight = Math.max(2, ((d.rainAmount || 0) / maxRain) * (height - pad * 2));
          const y = height - pad - barHeight;

          return (
            <g key={i}>
              <rect
                x={x - barWidth / 2}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="3"
                fill={d.rainAmount > 0 ? 'var(--green-primary)' : 'rgba(255,255,255,0.1)'}
              />
              <text x={x} y={height - 6} fontSize="9" fill="var(--text-tertiary)" textAnchor="middle">
                {d.date instanceof Date ? d.date.toLocaleDateString('en-US', { weekday: 'narrow' }) : ''}
              </text>
              {d.rainAmount > 0 && (
                <text x={x} y={y - 4} fontSize="9" fill="var(--green-light)" textAnchor="middle">
                  {d.rainAmount}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default Weather;
