import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { client_name, email, phone, date } = await request.json();

    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const res = await fetch(`${supabaseUrl}/rest/v1/consult_waivers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        client_name: client_name || 'New Client',
        email: email || '',
        phone: phone || null,
        date: date || new Date().toISOString().split('T')[0],
        waiver_type: 'manual',
        paid: false,
        invoice_sent: false,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: 'Failed to create waiver', detail: err }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, waiver: data[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
