import { NextResponse } from 'next/server';
import { addWaiver } from '@/lib/waiver-kv';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientName, email, phone, date, isMinor, guardianName, guardianRelationship, waiverType, agreedSections } = body;

    if (!clientName || !email || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const id = await addWaiver({
      clientName,
      email,
      phone: phone || null,
      date,
      isMinor: isMinor || false,
      guardianName: guardianName || null,
      guardianRelationship: guardianRelationship || null,
      waiverType: waiverType || 'consult',
      agreedSections: agreedSections || [],
    });

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('[waiver/submit] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
