import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { calculateEmissions, getEffectiveScope3Methodology } from '../../../services/emissionsCalculator';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

// Initialize Stripe cleanly using the correct apiVersion without 'as any'
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2026-06-24.dahlia',
}) : null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

export async function POST(req: Request) {
  // Fail-Fast Key Guard on initialization
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseServiceKey) {
    return NextResponse.json({ error: 'CRITICAL: SUPABASE_SERVICE_ROLE_KEY environment variable is undefined!' }, { status: 500 });
  }

  try {
    const {
      inputs,
      useGasBenchmark,
      useElectricityBenchmark,
      useWasteBenchmark,
      useCommutingBenchmark,
      sessionId,
      reportId,
      isBaselineSimulated,
    } = await req.json();

    if (!inputs) {
      return NextResponse.json({ error: 'Missing inputs' }, { status: 400 });
    }

    // 1. Strict Authentication derivation on the server side via Bearer token
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    }

    // Pass JWT down to database function by attaching it as a Bearer token in the request headers
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized user authentication' }, { status: 401 });
    }
    const serverDerivedUserId = user.id;

    // 2. Double-Gate Simulated Baselines Server-Side
    if (isBaselineSimulated === true) {
      return NextResponse.json(
        { error: 'Submission Blocked: Simulated baselines are prohibited for official PDF generation.' },
        { status: 400 }
      );
    }

    // 3. Double-Door Payment Gateway Check directly with Stripe
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing payment session ID' }, { status: 400 });
    }

    let paymentVerified = false;

    if (!stripe) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Stripe is unconfigured in production environment' }, { status: 500 });
      }
      // Non-production sandbox bypass
      if (sessionId.startsWith('cs_test_simulated_stripe_session_')) {
        paymentVerified = true;
      }
    } else {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session && session.payment_status === 'paid') {
        paymentVerified = true;
        
        // Assert that Stripe metadata reportId and userId match the payload to prevent replay attacks
        const metadataReportId = session.metadata?.reportId;
        const metadataUserId = session.metadata?.userId;

        const normalize = (v: string | null | undefined) => v || '';
        if (normalize(metadataReportId) !== normalize(reportId) || metadataUserId !== serverDerivedUserId) {
          return NextResponse.json({ error: 'Replay protection: session metadata mismatch.' }, { status: 403 });
        }
      }
    }

    if (!paymentVerified) {
      return NextResponse.json({ error: 'Payment verification failed: unpaid or invalid session.' }, { status: 402 });
    }

    // Recalculate all scope 1, 2, and 3 emissions server-side to prevent tampering
    const computedReporting = calculateEmissions(inputs);

    // Prepare Scope 3 records array of objects for PostgreSQL RPC
    const scope3Records = [
      {
        category: 'Category 4: Upstream Transportation & Distribution',
        emissions_tco2e: computedReporting.scope3.cat4UpstreamTrans,
        methodology_basis: getEffectiveScope3Methodology(inputs, 'cat4'),
        calculation_notes: JSON.stringify(inputs.scope3Cat4),
      },
      {
        category: 'Category 5: Operational Waste',
        emissions_tco2e: computedReporting.scope3.cat5OperationalWaste,
        methodology_basis: getEffectiveScope3Methodology(inputs, 'cat5', !!useWasteBenchmark, !!useCommutingBenchmark),
        calculation_notes: JSON.stringify(inputs.scope3Cat5),
      },
      {
        category: 'Category 6: Business Travel',
        emissions_tco2e: computedReporting.scope3.cat6BusinessTravel,
        methodology_basis: getEffectiveScope3Methodology(inputs, 'cat6'),
        calculation_notes: JSON.stringify(inputs.scope3Cat6),
      },
      {
        category: 'Category 7: Employee Commuting',
        emissions_tco2e: computedReporting.scope3.cat7EmployeeCommuting,
        methodology_basis: getEffectiveScope3Methodology(inputs, 'cat7', !!useWasteBenchmark, !!useCommutingBenchmark),
        calculation_notes: JSON.stringify(inputs.scope3Cat7),
      },
      {
        category: 'Category 9: Downstream Transportation & Distribution',
        emissions_tco2e: computedReporting.scope3.cat9DownstreamTrans,
        methodology_basis: getEffectiveScope3Methodology(inputs, 'cat9'),
        calculation_notes: JSON.stringify(inputs.scope3Cat9),
      },
    ];

    // 5. Call atomic Postgres RPC transaction function using supabaseAdmin with explicit authenticated user ID
    const { data: auditId, error: rpcError } = await supabaseAdmin.rpc('finalize_report_and_audit', {
      p_authenticated_user_id: serverDerivedUserId,
      p_report_id: reportId || null,
      p_stripe_session_id: sessionId,
      p_inputs: {
        inputs,
        useGasBenchmark,
        useElectricityBenchmark,
        useWasteBenchmark,
        useCommutingBenchmark,
        isBaselineSimulated: false,
      },
      p_scope3_records: scope3Records,
      p_calculated_emissions: computedReporting,
    });

    if (rpcError) {
      console.error('Error executing finalize_report_and_audit RPC:', rpcError);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, auditId });
  } catch (error: any) {
    console.error('Finalize audit error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
