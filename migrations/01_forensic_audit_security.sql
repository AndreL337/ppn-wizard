-- Migration: 01_forensic_audit_security.sql
-- Description: Drop open policies on public.carbon_audits and public.scope3_records,
--              replace them with strictly scoped ownership-based policies,
--              implement PL/pgSQL function and triggers to guarantee forensic immutability,
--              add check constraints and uniqueness, and add finalized report controls.

-- 1. ADD columns and constraints if they do not exist
ALTER TABLE public.carbon_audits ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN DEFAULT false NOT NULL;

-- Add category check constraint on scope3_records
ALTER TABLE public.scope3_records DROP CONSTRAINT IF EXISTS chk_scope3_category;
ALTER TABLE public.scope3_records ADD CONSTRAINT chk_scope3_category CHECK (
  category IN (
    'Category 4: Upstream Transportation & Distribution',
    'Category 5: Operational Waste',
    'Category 6: Business Travel',
    'Category 7: Employee Commuting',
    'Category 9: Downstream Transportation & Distribution'
  )
);

-- Add unique constraint on (audit_id, category) for scope3_records
ALTER TABLE public.scope3_records DROP CONSTRAINT IF EXISTS uq_scope3_records_audit_category;
ALTER TABLE public.scope3_records ADD CONSTRAINT uq_scope3_records_audit_category UNIQUE (audit_id, category);


-- 2. DROP old permissive RLS policies
DROP POLICY IF EXISTS "Users can view their own carbon audits" ON public.carbon_audits;
DROP POLICY IF EXISTS "Users can insert their own carbon audits" ON public.carbon_audits;
DROP POLICY IF EXISTS "Anyone can select scope3 records" ON public.scope3_records;
DROP POLICY IF EXISTS "Anyone can insert scope3 records" ON public.scope3_records;
DROP POLICY IF EXISTS "Users can view their own scope3 records" ON public.scope3_records;
DROP POLICY IF EXISTS "Users can insert their own scope3 records" ON public.scope3_records;

-- 3. CREATE strictly scoped RLS policies for carbon_audits
-- Allow users to view their own audits (or allow view if stripe_session_id matches if we want, but standard RLS checks auth.uid())
CREATE POLICY "Users can view their own carbon audits" ON public.carbon_audits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own carbon audits" ON public.carbon_audits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. CREATE strictly scoped subquery-verified RLS policies for scope3_records
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


-- 5. IMPLEMENT Forensic Immutability PL/pgSQL Function and Triggers
-- Updated to support GDPR right-to-erasure account deletions where user_id/report_id are nulled.
CREATE OR REPLACE FUNCTION public.prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'CRITICAL: Forensic auditing tables are immutable. DELETE is prohibited.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'carbon_audits' THEN
      -- Allow UPDATE if only user_id or report_id (or stripe_session_id) is changing, but actual forensic content remains identical
      IF NEW.audited_factors_snapshot IS NOT DISTINCT FROM OLD.audited_factors_snapshot
         AND NEW.factor_set_version      IS NOT DISTINCT FROM OLD.factor_set_version
         AND NEW.created_at              IS NOT DISTINCT FROM OLD.created_at
      THEN
        RETURN NEW;
      END IF;
    ELSIF TG_TABLE_NAME = 'scope3_records' THEN
      -- scope3_records is completely immutable under updates
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

-- Trigger to block updates and deletes on carbon_audits
DROP TRIGGER IF EXISTS prevent_carbon_audits_mutation ON public.carbon_audits;
CREATE TRIGGER prevent_carbon_audits_mutation
  BEFORE UPDATE OR DELETE ON public.carbon_audits
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_mutation();

-- Trigger to block updates and deletes on scope3_records
DROP TRIGGER IF EXISTS prevent_scope3_records_mutation ON public.scope3_records;
CREATE TRIGGER prevent_scope3_records_mutation
  BEFORE UPDATE OR DELETE ON public.scope3_records
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_mutation();


-- 6. IMPLEMENT Finalized Report Lock on audit_reports
CREATE OR REPLACE FUNCTION public.prevent_finalized_report_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If it was already finalized, block any modification
  IF OLD.is_finalized = true THEN
    RAISE EXCEPTION 'CRITICAL: This audit report is finalized and cannot be modified.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_finalized_report_update_trigger ON public.audit_reports;
CREATE TRIGGER prevent_finalized_report_update_trigger
  BEFORE UPDATE ON public.audit_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_finalized_report_update();
