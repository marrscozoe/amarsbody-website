import { NextResponse } from 'next/server';

export async function PATCH(request: Request) {
  try {
    const { id, invoice_sent, invoice_sent_date, paid, paid_date, payment_method, amount } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing waiver id' }, { status: 400 });
    }

    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const updates: Record<string, any> = {};
    if (invoice_sent !== undefined) updates.invoice_sent = invoice_sent;
    if (invoice_sent_date !== undefined) updates.invoice_sent_date = invoice_sent_date;
    if (paid !== undefined) updates.paid = paid;
    if (paid_date !== undefined) updates.paid_date = paid_date;
    if (payment_method !== undefined) updates.payment_method = payment_method || null;
    if (amount !== undefined) updates.amount = amount ? parseFloat(amount) : null;

    const res = await fetch(`${supabaseUrl}/rest/v1/consult_waivers?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: 'Failed to update waiver', detail: err }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, waiver: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
