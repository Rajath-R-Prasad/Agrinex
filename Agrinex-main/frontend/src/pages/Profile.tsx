import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, Farm } from '../contexts/AuthContext';
import api from '../lib/api';

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

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      setPersonalDetails({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
      });
      // If user has no farms, show farms tab
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
          setNewFarm(prev => ({ ...prev, coordinates: coords }));
          setGeoStatus({ loading: false, text: `Auto-detected: ${coords} (${first.name}, ${first.region})` });
        } else {
          setGeoStatus({ loading: false, text: 'No coordinates found for location' });
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
      setNewFarm(prev => ({ ...prev, coordinates: coords }));
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
      alert('You must have at least one farm. Cannot delete the last farm.');
      return;
    }
    if (confirm('Are you sure you want to delete this farm?')) {
      deleteFarm(farmId);
      alert('Farm deleted successfully!');
    }
  };

  return (
    <section className="section" style={{ paddingTop: 'var(--space-xl)' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="pill" style={{ marginBottom: 'var(--space-sm)' }}>Profile Setup</div>
          <h1 style={{ fontSize: 'var(--h1)', marginBottom: 'var(--space-md)', color: 'var(--text-primary)' }}>
            Your Profile & Farm Details
          </h1>
          <p style={{ fontSize: 'var(--body-lg)', color: 'var(--text-secondary)', maxWidth: 'var(--narrow-width)' }}>
            Manage your personal information and add all your farms. You can access weather and analytics for each farm separately.
          </p>
          {deviceCoords && (
            <div style={{ marginTop: 'var(--space-sm)' }}>
              <span className="pill" style={{ fontSize: 12, background: 'rgba(16,185,129,0.12)', borderColor: 'var(--green-primary)', color: 'var(--green-light)' }}>
                📡 Current device: {deviceCoords.lat}, {deviceCoords.lon}
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', borderBottom: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('personal')}
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'personal' ? '2px solid var(--green-primary)' : '2px solid transparent',
              color: activeTab === 'personal' ? 'var(--green-primary)' : 'var(--text-tertiary)',
              fontSize: 'var(--body)',
              fontWeight: activeTab === 'personal' ? 600 : 400,
              cursor: 'pointer',
              transition: 'all var(--transition-fast) var(--easing)',
            }}
          >
            👤 Personal Details
          </button>
          <button
            onClick={() => setActiveTab('farms')}
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'farms' ? '2px solid var(--green-primary)' : '2px solid transparent',
              color: activeTab === 'farms' ? 'var(--green-primary)' : 'var(--text-tertiary)',
              fontSize: 'var(--body)',
              fontWeight: activeTab === 'farms' ? 600 : 400,
              cursor: 'pointer',
              transition: 'all var(--transition-fast) var(--easing)',
            }}
          >
            🌾 My Farms ({user?.farms.length || 0})
          </button>
        </div>

        {/* Personal Details Tab */}
        {activeTab === 'personal' && (
          <div className="card-apple">
            <h2 style={{ fontSize: 'var(--h2)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
              Personal Information
            </h2>
            <form onSubmit={handlePersonalSubmit} style={{ display: 'grid', gap: 'var(--space-md)' }}>
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
                <label htmlFor="address">Address</label>
                <textarea
                  id="address"
                  value={personalDetails.address}
                  onChange={(e) => setPersonalDetails({ ...personalDetails, address: e.target.value })}
                  placeholder="Village, District, State"
                  rows={3}
                  style={{
                    padding: '14px 12px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--body)',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-sm)' }}>
                Save Personal Details
              </button>
            </form>
          </div>
        )}

        {/* Farms Tab */}
        {activeTab === 'farms' && (
          <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
            {/* Existing Farms */}
            {user?.farms && user.farms.length > 0 ? (
              <div>
                <h2 style={{ fontSize: 'var(--h2)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
                  Your Farms
                </h2>
                <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
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
              <div className="card-apple" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                <div style={{ fontSize: 'var(--h2)', marginBottom: 'var(--space-md)' }}>🌾</div>
                <h2 style={{ fontSize: 'var(--h2)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-sm)' }}>
                  No Farms Added Yet
                </h2>
                <p style={{ fontSize: 'var(--body-lg)', color: 'var(--text-secondary)', maxWidth: 'var(--narrow-width)', margin: '0 auto var(--space-md)' }}>
                  Add your first farm to start getting weather forecasts, irrigation recommendations, and AI-powered insights.
                </p>
              </div>
            )}

            {/* Add New Farm */}
            <div className="card-apple" style={{ border: '2px dashed var(--green-primary)', background: 'linear-gradient(180deg, rgba(16,185,129,0.06), transparent)' }}>
              <h2 style={{ fontSize: 'var(--h2)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
                ➕ Add New Farm
              </h2>
              <form onSubmit={handleAddFarm} style={{ display: 'grid', gap: 'var(--space-md)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-md)' }}>
                  <div className="form-row">
                    <label htmlFor="farm-name">Farm Name *</label>
                    <input
                      id="farm-name"
                      type="text"
                      value={newFarm.name}
                      onChange={(e) => setNewFarm({ ...newFarm, name: e.target.value })}
                      placeholder="Rajesh Kumar Farm"
                      required
                    />
                  </div>

                  <div className="form-row">
                    <label htmlFor="farm-location">Location *</label>
                    <input
                      id="farm-location"
                      type="text"
                      value={newFarm.location}
                      onChange={(e) => setNewFarm({ ...newFarm, location: e.target.value })}
                      placeholder="Punjab, India"
                      required
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <button type="button" className="btn btn-secondary" onClick={useCurrentLocation} style={{ padding: '6px 10px', fontSize: 12 }}>
                        Use current location
                      </button>
                      {geoStatus.text && (
                        <span className="pill" style={{ fontSize: 11, background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-tertiary)' }}>
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
                    placeholder="30.7333°N, 76.7794°E or 30.7333, 76.7794"
                    required
                  />
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    💡 Auto-detects from location; or use your device location
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                  <div className="form-row">
                    <label htmlFor="farm-area">Area (acres)</label>
                    <input
                      id="farm-area"
                      type="number"
                      step="0.1"
                      value={newFarm.area || ''}
                      onChange={(e) => setNewFarm({ ...newFarm, area: parseFloat(e.target.value) || 0 })}
                      placeholder="5.2"
                    />
                  </div>

                  <div className="form-row">
                    <label htmlFor="farm-crop">Current Crop</label>
                    <select
                      id="farm-crop"
                      value={newFarm.cropType || ''}
                      onChange={(e) => setNewFarm({ ...newFarm, cropType: e.target.value })}
                      style={{
                        padding: '14px 12px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        fontSize: 'var(--body)',
                      }}
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
                      style={{
                        padding: '14px 12px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        fontSize: 'var(--body)',
                      }}
                    >
                      <option value="">Select soil type</option>
                      <option value="Loamy">Loamy</option>
                      <option value="Clay">Clay</option>
                      <option value="Sandy">Sandy</option>
                      <option value="Silty">Silty</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <label htmlFor="farm-moisture">Avg Moisture (%)</label>
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

                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-sm)' }}>
                  Add Farm
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Back Button */}
        <div style={{ marginTop: 'var(--space-xl)', display: 'flex', gap: 'var(--space-sm)' }}>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-secondary"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </section>
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
          setEditData(prev => ({ ...prev, coordinates: coords }));
          setEditGeoStatus({ loading: false, text: `Auto-detected: ${coords} (${first.name}, ${first.region})` });
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
      setEditData(prev => ({ ...prev, coordinates: coords }));
      setEditGeoStatus({ loading: false, text: `Current device: ${coords}` });
    } catch {
      setEditGeoStatus({ loading: false, text: 'Could not access device location' });
    }
  };

  if (isEditing) {
    return (
      <div className="card-apple" style={{ border: '2px solid var(--green-primary)', background: 'linear-gradient(180deg, rgba(16,185,129,0.06), transparent)' }}>
        <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-md)' }}>
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
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="button" className="btn btn-secondary" onClick={fillWithCurrent} style={{ padding: '6px 10px', fontSize: 12 }}>
                  Use current location
                </button>
                {editGeoStatus.text && (
                  <span className="pill" style={{ fontSize: 11, background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-tertiary)' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
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
                style={{
                  padding: '14px 12px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--body)',
                }}
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
                style={{
                  padding: '14px 12px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--body)',
                }}
              >
                <option value="">Select soil type</option>
                <option value="Loamy">Loamy</option>
                <option value="Clay">Clay</option>
                <option value="Sandy">Sandy</option>
                <option value="Silty">Silty</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-row">
              <label>Avg Moisture (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step="1"
                value={editData.moisture ?? 50}
                onChange={(e) => setEditData({ ...editData, moisture: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button
              type="button"
              onClick={() => onUpdate(editData)}
              className="btn btn-primary"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-apple">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 'var(--h3)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
            🌾 {farm.name}
          </div>
          <div style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            📍 {farm.location}
          </div>
          <div style={{ fontSize: 'var(--body)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-xs)' }}>
            {typeof farm.coordinates === 'object' && farm.coordinates !== null ? `${(farm.coordinates as any).lat}, ${(farm.coordinates as any).lon}` : String(farm.coordinates || '')}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-sm)', flexWrap: 'wrap' }}>
            {farm.area > 0 && (
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Area: </span>
                <span style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)' }}>{farm.area} acres</span>
              </div>
            )}
            {farm.cropType && (
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Crop: </span>
                <span style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--green-light)' }}>{farm.cropType}</span>
              </div>
            )}
            {farm.soilType && (
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Soil: </span>
                <span style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)' }}>{farm.soilType}</span>
              </div>
            )}
            {typeof farm.moisture === 'number' && (
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Moisture: </span>
                <span style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)' }}>{farm.moisture}%</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
          <button
            onClick={onEdit}
            className="btn btn-secondary"
            style={{ padding: 'var(--space-xs) var(--space-sm)', fontSize: '12px' }}
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            style={{
              padding: 'var(--space-xs) var(--space-sm)',
              fontSize: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              cursor: 'pointer',
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

