-- Migration: 02_atomic_finalize.sql
-- Description: Add calculated_emissions column to public.carbon_audits and implement the atomic finalize_report_and_audit SECURITY DEFINER function.

-- 1. Alter carbon_audits to add calculated_emissions column if it doesn't exist
ALTER TABLE public.carbon_audits ADD COLUMN IF NOT EXISTS calculated_emissions JSONB;

-- 2. Drop existing signatures of the function to prevent overloading issues
DROP FUNCTION IF EXISTS public.finalize_report_and_audit(UUID, TEXT, JSONB, JSONB, JSONB);
DROP FUNCTION IF EXISTS public.finalize_report_and_audit(UUID, UUID, TEXT, JSONB, JSONB, JSONB);

-- 3. Create the atomic PostgreSQL transaction function with explicit user ID parameter
CREATE OR REPLACE FUNCTION public.finalize_report_and_audit(
  p_authenticated_user_id UUID,
  p_report_id UUID,
  p_stripe_session_id TEXT,
  p_inputs JSONB,
  p_scope3_records JSONB,
  p_calculated_emissions JSONB
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_record JSONB;
  v_report_owner UUID;
  v_user_id UUID;
BEGIN
  -- Validate the explicitly passed authenticated caller's identity
  v_user_id := p_authenticated_user_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: p_authenticated_user_id is NULL' USING ERRCODE = '42501';
  END IF;

  -- Strict Ownership Check
  IF p_report_id IS NOT NULL THEN
    SELECT user_id INTO v_report_owner
    FROM public.audit_reports
    WHERE id = p_report_id;
    
    IF v_report_owner IS NULL OR v_report_owner <> v_user_id THEN
      RAISE EXCEPTION 'Ownership verification failed: Report does not belong to user or does not exist.' USING ERRCODE = '42501';
    END IF;

    -- Atomic Write: Update target audit_reports row
    UPDATE public.audit_reports
    SET is_finalized = true,
        raw_inputs = p_inputs
    WHERE id = p_report_id;
  END IF;

  -- Atomic Write: Insert forensic audit record
  INSERT INTO public.carbon_audits (
    user_id,
    report_id,
    stripe_session_id,
    factor_set_version,
    audited_factors_snapshot,
    calculated_emissions
  )
  VALUES (
    v_user_id,
    p_report_id,
    p_stripe_session_id,
    '2026-v1.0',
    '{"factors": "2026.json"}'::jsonb,
    p_calculated_emissions
  )
  RETURNING id INTO v_audit_id;

  -- Deconstruct and insert scope3 records
  FOR v_record IN SELECT * FROM jsonb_array_elements(p_scope3_records) LOOP
    INSERT INTO public.scope3_records (
      audit_id,
      category,
      emissions_tco2e,
      methodology_basis,
      calculation_notes
    )
    VALUES (
      v_audit_id,
      (v_record->>'category'),
      (v_record->>'emissions_tco2e')::NUMERIC,
      (v_record->>'methodology_basis'),
      (v_record->>'calculation_notes')
    );
  END LOOP;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant proper execution privileges
GRANT EXECUTE ON FUNCTION public.finalize_report_and_audit(UUID, UUID, TEXT, JSONB, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_report_and_audit(UUID, UUID, TEXT, JSONB, JSONB, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.finalize_report_and_audit(UUID, UUID, TEXT, JSONB, JSONB, JSONB) TO service_role;
