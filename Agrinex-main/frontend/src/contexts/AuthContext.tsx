import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import api from '../lib/api';

export interface Farm {
  id: string;
  name: string;
  location: string;
  coordinates: string; // "12.9716, 77.5946" or "30.7333°N, 76.7794°E"
  area: number; // in acres
  cropType?: string;
  soilType?: string;
  moisture?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  state?: string;
  district?: string;
  village?: string;
  coordinates?: string;
  farms: Farm[];
  selectedFarmId?: string; // Currently selected farm for viewing
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  addFarm: (farm: Farm) => void;
  updateFarm: (farmId: string, farmData: Partial<Farm>) => void;
  deleteFarm: (farmId: string) => void;
  selectFarm: (farmId: string) => void;
  getSelectedFarm: () => Farm | null;
  getUserCoordinates: () => { lat: number; lon: number };
  getSelectedFarmZoneLocks: () => Array<{ id: string; crop: string; area: number; estimatedCostPerAcre: number; expectedRevenuePerAcre: number }>;
  setSelectedFarmZoneLocks: (locks: Array<{ id: string; crop: string; area: number; estimatedCostPerAcre: number; expectedRevenuePerAcre: number }>) => void;
  addSelectedFarmZoneLock: (lock: { id: string; crop: string; area: number; estimatedCostPerAcre: number; expectedRevenuePerAcre: number }) => void;
  removeSelectedFarmZoneLock: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Parse coordinates helper
  const parseCoordinates = (coordStr?: string): { lat: number; lon: number } => {
    if (!coordStr) return { lat: 12.9716, lon: 77.5946 }; // Default Bengaluru
    const cleaned = coordStr.replace(/[^\d\.,\- ]/g, '');
    const parts = cleaned.split(',').map(s => s.trim());
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lon)) {
        return { lat, lon };
      }
    }
    return { lat: 12.9716, lon: 77.5946 };
  };

  useEffect(() => {
    // 1. Load saved user from local storage
    const savedUser = localStorage.getItem('agrinex_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        if (parsedUser.farms && parsedUser.farms.length > 0 && !parsedUser.selectedFarmId) {
          parsedUser.selectedFarmId = parsedUser.farms[0].id;
          setUser(parsedUser);
        }
      } catch {}
    }

    // 2. Supabase Auth Session listener
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const meta = session.user.user_metadata || {};
          const email = session.user.email || '';
          const name = meta.full_name || meta.name || email.split('@')[0];
          const existingFarms = meta.farms || [
            {
              id: 'farm_default',
              name: meta.farm_name || `${name}'s Farm`,
              location: meta.district ? `${meta.district}, ${meta.state || 'India'}` : 'Bengaluru, Karnataka',
              coordinates: meta.coordinates || '12.9716, 77.5946',
              area: 5.0,
              soilType: 'Loamy Soil',
            }
          ];

          const supabaseUser: User = {
            id: session.user.id,
            name,
            email,
            phone: meta.phone || '',
            address: meta.village || meta.address || '',
            state: meta.state || 'Karnataka',
            district: meta.district || 'Bengaluru',
            coordinates: meta.coordinates || '12.9716, 77.5946',
            farms: existingFarms,
            selectedFarmId: existingFarms[0]?.id,
          };
          setUser(supabaseUser);
          localStorage.setItem('agrinex_user', JSON.stringify(supabaseUser));
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session?.user) {
          // If signed out from Supabase and user was logged in via Supabase
          // setUser(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const login = (userData: User) => {
    if (userData.farms && userData.farms.length > 0 && !userData.selectedFarmId) {
      userData.selectedFarmId = userData.farms[0].id;
    }
    setUser(userData);
    localStorage.setItem('agrinex_user', JSON.stringify(userData));

    // Send profile sync to backend via POST
    api.post('/api/v1/auth/profile', {
      full_name: userData.name,
      email: userData.email,
      phone: userData.phone || '',
      village: userData.village || userData.address || '',
      district: userData.district || 'Bengaluru',
      state: userData.state || 'Karnataka',
      coordinates: userData.coordinates || '',
    }).catch(() => {});
  };

  const logout = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch {}
    setUser(null);
    localStorage.removeItem('agrinex_user');
  };

  const updateUser = async (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('agrinex_user', JSON.stringify(updatedUser));

      // Sync to Supabase user metadata if available
      try {
        if (isSupabaseConfigured) {
          await supabase.auth.updateUser({
            data: {
              full_name: updatedUser.name,
              district: updatedUser.district,
              state: updatedUser.state,
              village: updatedUser.village,
              coordinates: updatedUser.coordinates,
              farms: updatedUser.farms,
            }
          });
        }
      } catch {}

      // Sync to backend POST
      try {
        await api.post('/api/v1/auth/profile', {
          full_name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone || '',
          village: updatedUser.village || updatedUser.address || '',
          district: updatedUser.district || 'Bengaluru',
          state: updatedUser.state || 'Karnataka',
          coordinates: updatedUser.coordinates || '',
        });
      } catch {}
    }
  };

  const addFarm = (farm: Farm) => {
    if (user) {
      const updatedUser = {
        ...user,
        farms: [...user.farms, farm],
        selectedFarmId: user.selectedFarmId || farm.id,
      };
      setUser(updatedUser);
      localStorage.setItem('agrinex_user', JSON.stringify(updatedUser));
      updateUser({ farms: updatedUser.farms });
    }
  };

  const updateFarm = (farmId: string, farmData: Partial<Farm>) => {
    if (user) {
      const updatedUser = {
        ...user,
        farms: user.farms.map(farm => farm.id === farmId ? { ...farm, ...farmData } : farm),
      };
      setUser(updatedUser);
      localStorage.setItem('agrinex_user', JSON.stringify(updatedUser));
      updateUser({ farms: updatedUser.farms });
    }
  };

  const deleteFarm = (farmId: string) => {
    if (user && user.farms.length > 1) {
      const updatedFarms = user.farms.filter(farm => farm.id !== farmId);
      const updatedUser = {
        ...user,
        farms: updatedFarms,
        selectedFarmId: updatedFarms.length > 0 ? updatedFarms[0].id : undefined,
      };
      setUser(updatedUser);
      localStorage.setItem('agrinex_user', JSON.stringify(updatedUser));
      updateUser({ farms: updatedFarms, selectedFarmId: updatedUser.selectedFarmId });
    }
  };

  const selectFarm = (farmId: string) => {
    if (user) {
      const updatedUser = { ...user, selectedFarmId: farmId };
      setUser(updatedUser);
      localStorage.setItem('agrinex_user', JSON.stringify(updatedUser));
    }
  };

  const getSelectedFarm = (): Farm | null => {
    if (!user) return null;
    if (user.selectedFarmId) {
      const found = user.farms.find(farm => farm.id === user.selectedFarmId);
      if (found) return found;
    }
    return user.farms && user.farms.length > 0 ? user.farms[0] : null;
  };

  const getUserCoordinates = (): { lat: number; lon: number } => {
    const farm = getSelectedFarm();
    if (farm?.coordinates) {
      return parseCoordinates(farm.coordinates);
    }
    if (user?.coordinates) {
      return parseCoordinates(user.coordinates);
    }
    return { lat: 12.9716, lon: 77.5946 };
  };

  const getSelectedFarmZoneLocks = () => {
    const farm = getSelectedFarm();
    if (!farm) return [];
    const key = `agrinex_zone_locks_${farm.id}`;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const setSelectedFarmZoneLocks = (locks: Array<{ id: string; crop: string; area: number; estimatedCostPerAcre: number; expectedRevenuePerAcre: number }>) => {
    const farm = getSelectedFarm();
    if (!farm) return;
    const key = `agrinex_zone_locks_${farm.id}`;
    localStorage.setItem(key, JSON.stringify(locks));
  };

  const addSelectedFarmZoneLock = (lock: { id: string; crop: string; area: number; estimatedCostPerAcre: number; expectedRevenuePerAcre: number }) => {
    const locks = getSelectedFarmZoneLocks();
    const idx = locks.findIndex(l => l.id === lock.id);
    if (idx >= 0) {
      locks[idx] = lock;
      setSelectedFarmZoneLocks([...locks]);
    } else {
      setSelectedFarmZoneLocks([...locks, lock]);
    }
  };

  const removeSelectedFarmZoneLock = (id: string) => {
    const locks = getSelectedFarmZoneLocks();
    setSelectedFarmZoneLocks(locks.filter(l => l.id !== id));
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      login, 
      logout,
      updateUser,
      addFarm,
      updateFarm,
      deleteFarm,
      selectFarm,
      getSelectedFarm,
      getUserCoordinates,
      getSelectedFarmZoneLocks,
      setSelectedFarmZoneLocks,
      addSelectedFarmZoneLock,
      removeSelectedFarmZoneLock,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


