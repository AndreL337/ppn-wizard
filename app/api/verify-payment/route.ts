import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

// Clean instantiation without "as any"
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2026-06-24.dahlia',
}) : null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export async function POST(req: Request) {
  try {
    const { sessionId, reportId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ verified: false, error: 'Missing sessionId parameter' }, { status: 400 });
    }

    // Auth derivation strictly via server-side Bearer token
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ verified: false, error: 'Missing authorization token' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ verified: false, error: 'Unauthorized authentication' }, { status: 401 });
    }

    // Environment Protection on Bypass
    if (!stripe) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ verified: false, error: 'Stripe is unconfigured in production environment' }, { status: 500 });
      }
      // Allow simulated bypass in non-production
      if (sessionId.startsWith('cs_test_simulated_stripe_session_')) {
        return NextResponse.json({ verified: true, isSimulated: true });
      }
      return NextResponse.json({ verified: false, error: 'Invalid simulated session id or Stripe is unconfigured' }, { status: 400 });
    }

    // Retrieve and verify the real Stripe checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      return NextResponse.json({ verified: false, error: 'Stripe session not found' }, { status: 404 });
    }

    const isPaid = session.payment_status === 'paid';
    if (!isPaid) {
      return NextResponse.json({ verified: false, error: 'Session is not paid' }, { status: 400 });
    }

    // Prevent Replay Attacks: assert metadata matches reportId and user.id
    const metadataReportId = session.metadata?.reportId;
    const metadataUserId = session.metadata?.userId;

    const normalize = (v: string | null | undefined) => v || '';
    if (normalize(metadataReportId) !== normalize(reportId) || metadataUserId !== user.id) {
      return NextResponse.json({
        verified: false,
        error: 'Replay protection: session metadata ownership mismatch.'
      }, { status: 403 });
    }

    return NextResponse.json({ verified: true, isSimulated: false });
  } catch (error: any) {
    console.error('Verify payment error:', error);
    return NextResponse.json(
      { verified: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
