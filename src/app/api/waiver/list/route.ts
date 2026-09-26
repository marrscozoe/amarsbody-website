import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const res = await fetch(`${supabaseUrl}/rest/v1/consult_waivers?select=*&order=created_at.desc`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch waivers' }, { status: 500 });
    }

    const waivers = await res.json();
    return NextResponse.json({ waivers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
