import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, Farm } from '../contexts/AuthContext';
import api from '../lib/api';
import DynamicBackground from '../components/DynamicBackground';

const Profile: React.FC = () => {
  const { user, updateUser, addFarm, updateFarm, deleteFarm } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'personal' | 'farms'>('personal');
  const [editingFarmId, setEditingFarmId] = useState<string | null>(null);
  const [deviceCoords, setDeviceCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<{ loading: boolean; text: string }>({ loading: false, text: '' });

  // Personal details form state
  const [personalDetails, setPersonalDetails] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });

  useEffect(() => {
    if (user) {
      setPersonalDetails({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
      });
      if (!user.farms || user.farms.length === 0) {
        setActiveTab('farms');
      }
    }
  }, [user]);

  // New farm form state
  const [newFarm, setNewFarm] = useState<Partial<Farm>>({
    name: '',
    location: '',
    coordinates: '',
    area: 0,
    cropType: '',
    soilType: '',
    moisture: 50,
  });

  useEffect(() => {
    const run = async () => {
      const q = (newFarm.location || '').trim();
      if (!q) return;
      setGeoStatus({ loading: true, text: 'Detecting coordinates…' });
      try {
        const res = await api.get('/api/geocode', { params: { q } });
        const list = res?.results || res?.data?.results || [];
        const first = list.length > 0 ? list[0] : null;
        if (first && typeof first.lat === 'number' && typeof first.lon === 'number') {
          const coords = `${Number(first.lat.toFixed(4))}, ${Number(first.lon.toFixed(4))}`;
          setNewFarm((prev) => ({ ...prev, coordinates: coords }));
          setGeoStatus({ loading: false, text: `Auto-detected: ${coords} (${first.name}, ${first.region})` });
        } else {
          setGeoStatus({ loading: false, text: 'No coordinates found' });
        }
      } catch {
        setGeoStatus({ loading: false, text: 'Failed to detect coordinates' });
      }
    };
    const t = setTimeout(run, 500);
    return () => clearTimeout(t);
  }, [newFarm.location]);

  const useCurrentLocation = async () => {
    if (!('geolocation' in navigator)) {
      setGeoStatus({ loading: false, text: 'Geolocation not supported' });
      return;
    }
    setGeoStatus({ loading: true, text: 'Locating device…' });
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });
      const lat = Number(position.coords.latitude.toFixed(4));
      const lon = Number(position.coords.longitude.toFixed(4));
      const coords = `${lat}, ${lon}`;
      setDeviceCoords({ lat, lon });
      setNewFarm((prev) => ({ ...prev, coordinates: coords }));
      setGeoStatus({ loading: false, text: `Current device: ${coords}` });
    } catch {
      setGeoStatus({ loading: false, text: 'Could not access device location' });
    }
  };

  const handlePersonalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser(personalDetails);
    alert('Personal details updated successfully!');
  };

  const handleAddFarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFarm.name || !newFarm.location || !newFarm.coordinates) {
      alert('Please fill in farm name, location, and coordinates');
      return;
    }

    const farm: Farm = {
      id: `farm_${Date.now()}`,
      name: newFarm.name!,
      location: newFarm.location!,
      coordinates: newFarm.coordinates!,
      area: newFarm.area || 0,
      cropType: newFarm.cropType,
      soilType: newFarm.soilType,
      moisture: typeof newFarm.moisture === 'number' ? newFarm.moisture : undefined,
    };

    addFarm(farm);
    setNewFarm({
      name: '',
      location: '',
      coordinates: '',
      area: 0,
      cropType: '',
      soilType: '',
      moisture: 50,
    });
    alert('Farm added successfully!');
  };

  const handleUpdateFarm = (farmId: string, farmData: Partial<Farm>) => {
    updateFarm(farmId, farmData);
    setEditingFarmId(null);
    alert('Farm updated successfully!');
  };

  const handleDeleteFarm = (farmId: string) => {
    if (user && user.farms.length === 1) {
      alert('You must have at least one farm.');
      return;
    }
    if (confirm('Are you sure you want to delete this farm?')) {
      deleteFarm(farmId);
      alert('Farm deleted successfully!');
    }
  };

  return (
    <>
      <DynamicBackground />
      <section className="section" style={{ position: 'relative', zIndex: 10 }}>
        <div className="container">
          {/* Header */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <div className="pill" style={{ marginBottom: 'var(--space-xs)' }}>Profile Setup</div>
            <h1 style={{ fontSize: 'var(--h1)', marginBottom: 'var(--space-xs)', color: 'var(--text-primary)' }}>
              Profile & Farm Operations
            </h1>
            <p style={{ fontSize: 'var(--body-lg)', color: 'var(--text-secondary)', maxWidth: 'var(--narrow-width)' }}>
              Manage your personal information and configure your farm perimeters for hyperlocal forecasts and soil advisories.
            </p>
            {deviceCoords && (
              <div style={{ marginTop: '8px' }}>
                <span className="pill" style={{ fontSize: 11, background: 'rgba(16,185,129,0.12)', borderColor: 'var(--green-primary)', color: 'var(--green-light)' }}>
                  📡 GPS Active: {deviceCoords.lat}, {deviceCoords.lon}
                </span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: 'var(--space-md)',
              borderBottom: '1px solid var(--border-color)',
              overflowX: 'auto',
              paddingBottom: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              style={{
                padding: '10px 18px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'personal' ? '2px solid var(--green-primary)' : '2px solid transparent',
                color: activeTab === 'personal' ? 'var(--green-primary)' : 'var(--text-tertiary)',
                fontSize: '14px',
                fontWeight: activeTab === 'personal' ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              👤 Personal Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('farms')}
              style={{
                padding: '10px 18px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'farms' ? '2px solid var(--green-primary)' : '2px solid transparent',
                color: activeTab === 'farms' ? 'var(--green-primary)' : 'var(--text-tertiary)',
                fontSize: '14px',
                fontWeight: activeTab === 'farms' ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              🌾 My Farms ({user?.farms.length || 0})
            </button>
          </div>

          {/* Personal Details Tab */}
          {activeTab === 'personal' && (
            <div className="card-apple" style={{ maxWidth: '680px' }}>
              <h2 style={{ fontSize: 'var(--h2)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
                Personal Information
              </h2>
              <form onSubmit={handlePersonalSubmit} style={{ display: 'grid', gap: '14px' }}>
                <div className="form-row">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    id="name"
                    type="text"
                    value={personalDetails.name}
                    onChange={(e) => setPersonalDetails({ ...personalDetails, name: e.target.value })}
                    placeholder="Rajesh Kumar"
                    required
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    id="email"
                    type="email"
                    value={personalDetails.email}
                    onChange={(e) => setPersonalDetails({ ...personalDetails, email: e.target.value })}
                    placeholder="rajesh@example.com"
                    required
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    id="phone"
                    type="tel"
                    value={personalDetails.phone}
                    onChange={(e) => setPersonalDetails({ ...personalDetails, phone: e.target.value })}
                    placeholder="+91 9876543210"
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="address">Address / District</label>
                  <textarea
                    id="address"
                    value={personalDetails.address}
                    onChange={(e) => setPersonalDetails({ ...personalDetails, address: e.target.value })}
                    placeholder="Village, District, State"
                    rows={3}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
                  Save Personal Details
                </button>
              </form>
            </div>
          )}

          {/* Farms Tab */}
          {activeTab === 'farms' && (
            <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
              {/* Existing Farms List */}
              {user?.farms && user.farms.length > 0 ? (
                <div>
                  <h2 style={{ fontSize: 'var(--h2)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-sm)' }}>
                    Your Farm Locations
                  </h2>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {user.farms.map((farm) => (
                      <FarmCard
                        key={farm.id}
                        farm={farm}
                        isEditing={editingFarmId === farm.id}
                        onEdit={() => setEditingFarmId(farm.id)}
                        onCancel={() => setEditingFarmId(null)}
                        onUpdate={(data) => handleUpdateFarm(farm.id, data)}
                        onDelete={() => handleDeleteFarm(farm.id)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="card-apple" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🌾</div>
                  <h2 style={{ fontSize: 'var(--h2)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    No Farms Configured Yet
                  </h2>
                  <p style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)', maxWidth: 'var(--narrow-width)', margin: '0 auto 16px' }}>
                    Add your farm coordinates below to activate live micro weather forecasting and zone-based soil diagnostics.
                  </p>
                </div>
              )}

              {/* Add New Farm Form */}
              <div
                className="card-apple"
                style={{
                  border: '2px dashed var(--green-primary)',
                  background: 'linear-gradient(180deg, rgba(16,185,129,0.06), transparent)',
                }}
              >
                <h2 style={{ fontSize: 'var(--h2)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-sm)' }}>
                  ➕ Add New Farm
                </h2>
                <form onSubmit={handleAddFarm} style={{ display: 'grid', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '12px' }}>
                    <div className="form-row">
                      <label htmlFor="farm-name">Farm Name *</label>
                      <input
                        id="farm-name"
                        type="text"
                        value={newFarm.name}
                        onChange={(e) => setNewFarm({ ...newFarm, name: e.target.value })}
                        placeholder="e.g. North Plot Farm"
                        required
                      />
                    </div>

                    <div className="form-row">
                      <label htmlFor="farm-location">Location (City / District) *</label>
                      <input
                        id="farm-location"
                        type="text"
                        value={newFarm.location}
                        onChange={(e) => setNewFarm({ ...newFarm, location: e.target.value })}
                        placeholder="e.g. Mysuru, Karnataka"
                        required
                      />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={useCurrentLocation}
                          style={{ padding: '4px 10px', fontSize: 12, minHeight: '30px' }}
                        >
                          Use GPS
                        </button>
                        {geoStatus.text && (
                          <span className="pill" style={{ fontSize: 11, background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                            {geoStatus.text}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <label htmlFor="farm-coordinates">Coordinates * (Latitude, Longitude)</label>
                    <input
                      id="farm-coordinates"
                      type="text"
                      value={newFarm.coordinates}
                      onChange={(e) => setNewFarm({ ...newFarm, coordinates: e.target.value })}
                      placeholder="12.9716, 77.5946"
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '12px' }}>
                    <div className="form-row">
                      <label htmlFor="farm-area">Area (acres)</label>
                      <input
                        id="farm-area"
                        type="number"
                        step="0.1"
                        value={newFarm.area || ''}
                        onChange={(e) => setNewFarm({ ...newFarm, area: parseFloat(e.target.value) || 0 })}
                        placeholder="5.0"
                      />
                    </div>

                    <div className="form-row">
                      <label htmlFor="farm-crop">Primary Crop</label>
                      <select
                        id="farm-crop"
                        value={newFarm.cropType || ''}
                        onChange={(e) => setNewFarm({ ...newFarm, cropType: e.target.value })}
                      >
                        <option value="">Select crop</option>
                        <option value="Wheat">Wheat</option>
                        <option value="Rice">Rice</option>
                        <option value="Cotton">Cotton</option>
                        <option value="Sugarcane">Sugarcane</option>
                        <option value="Vegetables">Vegetables</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="form-row">
                      <label htmlFor="farm-soil">Soil Type</label>
                      <select
                        id="farm-soil"
                        value={newFarm.soilType || ''}
                        onChange={(e) => setNewFarm({ ...newFarm, soilType: e.target.value })}
                      >
                        <option value="">Select soil type</option>
                        <option value="Loamy Soil">Loamy Soil</option>
                        <option value="Red Soil">Red Soil</option>
                        <option value="Black Soil">Black Soil</option>
                        <option value="Alluvial Soil">Alluvial Soil</option>
                        <option value="Sandy Soil">Sandy Soil</option>
                        <option value="Clay Soil">Clay Soil</option>
                        <option value="Laterite Soil">Laterite Soil</option>
                      </select>
                    </div>

                    <div className="form-row">
                      <label htmlFor="farm-moisture">Target Moisture (%)</label>
                      <input
                        id="farm-moisture"
                        type="number"
                        min={0}
                        max={100}
                        step="1"
                        value={newFarm.moisture ?? 50}
                        onChange={(e) => setNewFarm({ ...newFarm, moisture: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                        placeholder="50"
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}>
                    Add Farm Location
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Back Action */}
          <div style={{ marginTop: 'var(--space-lg)' }}>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn btn-secondary"
              style={{ minWidth: '180px' }}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </section>
    </>
  );
};

interface FarmCardProps {
  farm: Farm;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onUpdate: (data: Partial<Farm>) => void;
  onDelete: () => void;
}

const FarmCard: React.FC<FarmCardProps> = ({ farm, isEditing, onEdit, onCancel, onUpdate, onDelete }) => {
  const [editData, setEditData] = useState<Partial<Farm>>(farm);
  const [editGeoStatus, setEditGeoStatus] = useState<{ loading: boolean; text: string }>({ loading: false, text: '' });

  useEffect(() => {
    const run = async () => {
      const q = (editData.location || '').trim();
      if (!isEditing || !q) return;
      setEditGeoStatus({ loading: true, text: 'Detecting coordinates…' });
      try {
        const res = await api.get('/api/geocode', { params: { q } });
        const list = res?.results || res?.data?.results || [];
        const first = list.length > 0 ? list[0] : null;
        if (first && typeof first.lat === 'number' && typeof first.lon === 'number') {
          const coords = `${Number(first.lat.toFixed(4))}, ${Number(first.lon.toFixed(4))}`;
          setEditData((prev) => ({ ...prev, coordinates: coords }));
          setEditGeoStatus({ loading: false, text: `Auto-detected: ${coords}` });
        } else {
          setEditGeoStatus({ loading: false, text: 'No coordinates found' });
        }
      } catch {
        setEditGeoStatus({ loading: false, text: 'Failed to detect coordinates' });
      }
    };
    const t = setTimeout(run, 500);
    return () => clearTimeout(t);
  }, [editData.location, isEditing]);

  const fillWithCurrent = async () => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });
      const lat = Number(position.coords.latitude.toFixed(4));
      const lon = Number(position.coords.longitude.toFixed(4));
      const coords = `${lat}, ${lon}`;
      setEditData((prev) => ({ ...prev, coordinates: coords }));
      setEditGeoStatus({ loading: false, text: `Current device: ${coords}` });
    } catch {
      setEditGeoStatus({ loading: false, text: 'Could not access device location' });
    }
  };

  if (isEditing) {
    return (
      <div
        className="card-apple"
        style={{
          border: '2px solid var(--green-primary)',
          background: 'linear-gradient(180deg, rgba(16,185,129,0.08), transparent)',
          padding: 'clamp(14px, 2.5vw, 20px)',
        }}
      >
        <div style={{ display: 'grid', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '10px' }}>
            <div className="form-row">
              <label>Farm Name *</label>
              <input
                type="text"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-row">
              <label>Location *</label>
              <input
                type="text"
                value={editData.location}
                onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                required
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={fillWithCurrent}
                  style={{ padding: '4px 8px', fontSize: 11, minHeight: '28px' }}
                >
                  GPS
                </button>
                {editGeoStatus.text && (
                  <span className="pill" style={{ fontSize: 10, background: 'var(--bg-tertiary)' }}>
                    {editGeoStatus.text}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="form-row">
            <label>Coordinates *</label>
            <input
              type="text"
              value={editData.coordinates}
              onChange={(e) => setEditData({ ...editData, coordinates: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '10px' }}>
            <div className="form-row">
              <label>Area (acres)</label>
              <input
                type="number"
                step="0.1"
                value={editData.area || ''}
                onChange={(e) => setEditData({ ...editData, area: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="form-row">
              <label>Current Crop</label>
              <select
                value={editData.cropType || ''}
                onChange={(e) => setEditData({ ...editData, cropType: e.target.value })}
              >
                <option value="">Select crop</option>
                <option value="Wheat">Wheat</option>
                <option value="Rice">Rice</option>
                <option value="Cotton">Cotton</option>
                <option value="Sugarcane">Sugarcane</option>
                <option value="Vegetables">Vegetables</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-row">
              <label>Soil Type</label>
              <select
                value={editData.soilType || ''}
                onChange={(e) => setEditData({ ...editData, soilType: e.target.value })}
              >
                <option value="">Select soil</option>
                <option value="Loamy Soil">Loamy Soil</option>
                <option value="Red Soil">Red Soil</option>
                <option value="Black Soil">Black Soil</option>
                <option value="Alluvial Soil">Alluvial Soil</option>
                <option value="Sandy Soil">Sandy Soil</option>
                <option value="Clay Soil">Clay Soil</option>
                <option value="Laterite Soil">Laterite Soil</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onUpdate(editData)}
              className="btn btn-primary"
              style={{ minWidth: '120px' }}
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
              style={{ minWidth: '100px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-apple" style={{ padding: 'clamp(14px, 2.5vw, 20px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 'min(100%, 200px)' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
            🌾 {farm.name}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            📍 {farm.location}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
            {typeof farm.coordinates === 'object' && farm.coordinates !== null
              ? `${(farm.coordinates as any).lat}, ${(farm.coordinates as any).lon}`
              : String(farm.coordinates || '')}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
            {farm.area > 0 && (
              <span className="pill" style={{ fontSize: 11 }}>
                📐 {farm.area} acres
              </span>
            )}
            {farm.cropType && (
              <span className="pill" style={{ fontSize: 11, color: 'var(--green-light)', borderColor: 'var(--green-primary)' }}>
                🌾 {farm.cropType}
              </span>
            )}
            {farm.soilType && (
              <span className="pill" style={{ fontSize: 11 }}>
                🌱 {farm.soilType}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onEdit}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px', minHeight: '32px' }}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              minHeight: '32px',
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
