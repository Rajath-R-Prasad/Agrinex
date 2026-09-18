-- ====================================================================
-- AGRINEX SUPABASE DATABASE SCHEMA
-- Paste this entire SQL into your Supabase SQL Editor and click "RUN"
-- ====================================================================

-- 1. Create Profiles Table (links directly to Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    state TEXT DEFAULT 'Karnataka',
    district TEXT DEFAULT 'Bengaluru',
    village TEXT,
    coordinates TEXT DEFAULT '12.9716, 77.5946',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);


-- 2. Create Farms Table
CREATE TABLE IF NOT EXISTS public.farms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    coordinates TEXT NOT NULL,
    area_acres NUMERIC DEFAULT 5.0,
    soil_type TEXT DEFAULT 'Loamy Soil',
    crop_type TEXT,
    moisture NUMERIC DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own farms" 
ON public.farms FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own farms" 
ON public.farms FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own farms" 
ON public.farms FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own farms" 
ON public.farms FOR DELETE USING (auth.uid() = user_id);


-- 3. Create Soil & Crop Recommendations Table
CREATE TABLE IF NOT EXISTS public.soil_predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    soil_type TEXT,
    soil_feel TEXT,
    nitrogen NUMERIC,
    phosphorus NUMERIC,
    potassium NUMERIC,
    ph NUMERIC,
    recommended_crops JSONB,
    soil_health_score NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.soil_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their soil predictions" 
ON public.soil_predictions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert soil predictions" 
ON public.soil_predictions FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 4. Create Irrigation & Hyperlocal Weather Logs Table
CREATE TABLE IF NOT EXISTS public.irrigation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    farm_name TEXT,
    coordinates TEXT,
    decision TEXT,
    water_recommended_mm NUMERIC,
    duration_hours NUMERIC,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.irrigation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their irrigation logs" 
ON public.irrigation_logs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert irrigation logs" 
ON public.irrigation_logs FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 5. Auto-Profile Creation Trigger on User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, state, district, coordinates)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.email,
        COALESCE(new.raw_user_meta_data->>'state', 'Karnataka'),
        COALESCE(new.raw_user_meta_data->>'district', 'Bengaluru'),
        COALESCE(new.raw_user_meta_data->>'coordinates', '12.9716, 77.5946')
    )
    ON CONFLICT (id) DO NOTHING;

    -- Also create an initial default farm for the new user
    INSERT INTO public.farms (user_id, name, location, coordinates, area_acres, soil_type)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'farm_name', 'Primary Farm'),
        COALESCE(new.raw_user_meta_data->>'district', 'Bengaluru') || ', ' || COALESCE(new.raw_user_meta_data->>'state', 'Karnataka'),
        COALESCE(new.raw_user_meta_data->>'coordinates', '12.9716, 77.5946'),
        5.0,
        'Loamy Soil'
    );

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
