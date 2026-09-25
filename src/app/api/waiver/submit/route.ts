import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientName, email, phone, date, isMinor, guardianName, guardianRelationship, waiverType, agreedSections } = body;

    if (!clientName || !email || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured', supabaseUrl, supabaseKey }, { status: 500 });
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
        client_name: clientName,
        email,
        phone: phone || null,
        date,
        is_minor: isMinor ?? false,
        guardian_name: guardianName || null,
        guardian_relationship: guardianRelationship || null,
        waiver_type: waiverType || 'consult',
        agreed_sections: agreedSections || [],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[waiver/submit] Supabase error:', res.status, data);
      return NextResponse.json({ error: 'Failed to save waiver', detail: data, status: res.status }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data[0]?.id });
  } catch (err: any) {
    console.error('[waiver/submit] Error:', err);
    return NextResponse.json({ error: 'Internal server error', detail: err?.message || String(err) }, { status: 500 });
  }
}
