import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientName, email, phone, date, isMinor, guardianName, guardianRelationship, waiverType } = body;

    if (!clientName || !email || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await (supabase.from('consult_waivers') as any).insert({
      client_name: clientName,
      email,
      phone: phone || null,
      date,
      is_minor: isMinor || false,
      guardian_name: guardianName || null,
      guardian_relationship: guardianRelationship || null,
      waiver_type: waiverType || 'consult',
    }).select('id').single();

    if (error) {
      console.error('[waiver/submit] Supabase error:', error);
      return NextResponse.json({ error: 'Failed to save waiver' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error('[waiver/submit] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
