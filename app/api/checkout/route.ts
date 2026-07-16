import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

// Initialize Stripe if secret key is present
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16' as any, // standard robust api version
}) : null;

export async function POST(req: Request) {
  try {
    const origin = req.headers.get('origin') || 'http://localhost:3000';
    
    // If stripe key is missing, return a beautiful simulated link to complete the sandbox loop gracefully
    if (!stripe) {
      console.warn('STRIPE_SECRET_KEY environment variable is not defined. Falling back to sandbox loop.');
      // Simulate successful payment redirect with query parameters
      const sandboxCheckoutUrl = `${origin}/?payment=success&session_id=cs_test_simulated_stripe_session_${Date.now()}`;
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
              name: 'NetZero Carbon reduction Plan (Official PPN 06/21 Compliant PDF)',
              description: 'Unlock official, board-ready, unrestricted download and print access for your Carbon Reduction Plan.',
              images: ['https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400'],
            },
            unit_amount: 19500, // £195.00
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
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
