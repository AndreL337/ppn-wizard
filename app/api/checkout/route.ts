import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

// Initialize Stripe cleanly using the correct apiVersion without 'as any'
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2026-06-24.dahlia',
}) : null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export async function POST(req: Request) {
  try {
    const origin = req.headers.get('origin') || 'http://localhost:3000';
    
    // Auth derivation strictly via server-side Bearer token
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let reportId: string | null = null;
    try {
      const body = await req.json();
      reportId = body.reportId || null;
    } catch {
      // Body may be empty
    }

    // Verify report ownership if reportId is supplied
    if (reportId) {
      const { data: report, error: reportError } = await supabase
        .from('audit_reports')
        .select('user_id')
        .eq('id', reportId)
        .single();
      
      if (reportError || !report || report.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden: Unauthorized report ID ownership' }, { status: 403 });
      }
    }

    // If stripe key is missing, return a beautiful simulated link to complete the sandbox loop gracefully
    if (!stripe) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Stripe is unconfigured in production environment' }, { status: 500 });
      }
      console.warn('STRIPE_SECRET_KEY environment variable is not defined. Falling back to sandbox loop.');
      const simulatedSessionId = `cs_test_simulated_stripe_session_${Date.now()}`;
      const sandboxCheckoutUrl = `${origin}/?payment=success&session_id=${simulatedSessionId}`;
      return NextResponse.json({ url: sandboxCheckoutUrl, isSimulated: true });
    }

    // 195.00 GBP = 19500 cents
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'NetZero Carbon Reduction Plan (Official PPN 06/21 Compliant PDF)',
              description: 'Unlock official, board-ready, unrestricted download and print access for your Carbon Reduction Plan.',
              images: ['https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400'],
            },
            unit_amount: 19500, // £195.00
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        reportId: reportId || '',
        userId: user.id,
      },
      success_url: `${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?payment=cancel`,
    });

    return NextResponse.json({ url: session.url, isSimulated: false });
  } catch (error: any) {
    console.error('Stripe session creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
