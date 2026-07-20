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
  is_finalized BOOLEAN DEFAULT false NOT NULL,
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
  stripe_session_id TEXT,
  factor_set_version TEXT NOT NULL,
  audited_factors_snapshot JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on carbon_audits
ALTER TABLE public.carbon_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own carbon audits" ON public.carbon_audits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own carbon audits" ON public.carbon_audits
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 5. Create scope3_records table
CREATE TABLE IF NOT EXISTS public.scope3_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID REFERENCES public.carbon_audits(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  emissions_tco2e NUMERIC NOT NULL,
  methodology_basis TEXT,
  calculation_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT chk_scope3_category CHECK (
    category IN (
      'Category 4: Upstream Transportation & Distribution',
      'Category 5: Operational Waste',
      'Category 6: Business Travel',
      'Category 7: Employee Commuting',
      'Category 9: Downstream Transportation & Distribution'
    )
  ),
  CONSTRAINT uq_scope3_records_audit_category UNIQUE (audit_id, category)
);

-- Enable RLS on scope3_records
ALTER TABLE public.scope3_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scope3 records" ON public.scope3_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.carbon_audits a
      WHERE a.id = audit_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own scope3 records" ON public.scope3_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carbon_audits a
      WHERE a.id = audit_id AND a.user_id = auth.uid()
    )
  );


-- 6. Forensic Immutability Triggers
CREATE OR REPLACE FUNCTION public.prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'CRITICAL: Forensic auditing tables are immutable. DELETE is prohibited.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'carbon_audits' THEN
      IF NEW.audited_factors_snapshot IS NOT DISTINCT FROM OLD.audited_factors_snapshot
         AND NEW.factor_set_version      IS NOT DISTINCT FROM OLD.factor_set_version
         AND NEW.created_at              IS NOT DISTINCT FROM OLD.created_at
      THEN
        RETURN NEW;
      END IF;
    ELSIF TG_TABLE_NAME = 'scope3_records' THEN
      IF NEW.id IS NOT DISTINCT FROM OLD.id
         AND NEW.audit_id IS NOT DISTINCT FROM OLD.audit_id
         AND NEW.category IS NOT DISTINCT FROM OLD.category
         AND NEW.emissions_tco2e IS NOT DISTINCT FROM OLD.emissions_tco2e
         AND NEW.methodology_basis IS NOT DISTINCT FROM OLD.methodology_basis
         AND NEW.calculation_notes IS NOT DISTINCT FROM OLD.calculation_notes
         AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at
      THEN
        RETURN NEW;
      END IF;
    END IF;
  END IF;

  RAISE EXCEPTION 'CRITICAL: Forensic auditing tables are immutable except for owner anonymization on account deletion.';
END;
$$ LANGUAGE plpgsql;

-- Trigger for carbon_audits
CREATE OR REPLACE TRIGGER prevent_carbon_audits_mutation
  BEFORE UPDATE OR DELETE ON public.carbon_audits
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_mutation();

-- Trigger for scope3_records
CREATE OR REPLACE TRIGGER prevent_scope3_records_mutation
  BEFORE UPDATE OR DELETE ON public.scope3_records
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_mutation();


-- 7. Finalized Report Lock on audit_reports
CREATE OR REPLACE FUNCTION public.prevent_finalized_report_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_finalized = true THEN
    RAISE EXCEPTION 'CRITICAL: This audit report is finalized and cannot be modified.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER prevent_finalized_report_update_trigger
  BEFORE UPDATE ON public.audit_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_finalized_report_update();


