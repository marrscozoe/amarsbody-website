import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientName, email, phone, date, isMinor, guardianName, guardianRelationship, waiverType, agreedSections, waiverText } = body;

    if (!clientName || !email || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

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
        waiver_text: waiverText || null,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[waiver/submit] Supabase error:', res.status, data);
      return NextResponse.json({ error: 'Failed to save waiver', detail: data, status: res.status }, { status: 500 });
    }

    // Send Telegram notification
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (botToken && chatId) {
      const msg = `📋 *New Consult Signup!*\n\n*Name:* ${clientName}\n*Email:* ${email}\n*Phone:* ${phone || '—'}\n*Date:* ${date}\n${isMinor ? `*Minor:* Yes (Guardian: ${guardianName})` : ''}`;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, id: data[0]?.id });
  } catch (err: any) {
    console.error('[waiver/submit] Error:', err);
    return NextResponse.json({ error: 'Internal server error', detail: err?.message || String(err) }, { status: 500 });
  }
}
