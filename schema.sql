-- Schema setup for Supabase NetZero Carbon Wizard
-- Execute this in your Supabase Project's SQL Editor (https://database.new)

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  company_name TEXT,
  employee_headcount INT DEFAULT 50,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Create audit_reports table
CREATE TABLE IF NOT EXISTS public.audit_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_name TEXT,
  baseline_year TEXT,
  reporting_year TEXT,
  net_zero_target_year INT,
  commitment_statement TEXT,
  employee_headcount INT,
  planned_reductions TEXT,
  -- Nested inputs captured as JSONB to perfectly represent the raw TypeScript sub-interfaces (Scope1, Scope2, etc.)
  scope1 JSONB,
  scope2 JSONB,
  scope3_cat4 JSONB,
  scope3_cat5 JSONB,
  scope3_cat6 JSONB,
  scope3_cat7 JSONB,
  scope3_cat9 JSONB,
  -- Backup flat copy of the complete RawAuditInputs structure
  raw_inputs JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on audit_reports
ALTER TABLE public.audit_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit reports" ON public.audit_reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit reports" ON public.audit_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own audit reports" ON public.audit_reports
  FOR UPDATE USING (auth.uid() = user_id);

-- 3. Automatic profiles trigger on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, company_name, employee_headcount)
  VALUES (new.id, '', 50);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 4. Create carbon_audits table
CREATE TABLE IF NOT EXISTS public.carbon_audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  report_id UUID REFERENCES public.audit_reports(id) ON DELETE SET NULL,
  factor_set_version TEXT NOT NULL,
  audited_factors_snapshot JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on carbon_audits
ALTER TABLE public.carbon_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own carbon audits" ON public.carbon_audits
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own carbon audits" ON public.carbon_audits
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);


-- 5. Create scope3_records table
CREATE TABLE IF NOT EXISTS public.scope3_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID REFERENCES public.carbon_audits(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  emissions_tco2e NUMERIC NOT NULL,
  methodology_basis TEXT,
  calculation_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on scope3_records
ALTER TABLE public.scope3_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can select scope3 records" ON public.scope3_records
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert scope3 records" ON public.scope3_records
  FOR INSERT WITH CHECK (true);

