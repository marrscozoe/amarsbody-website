import { NextResponse } from 'next/server';
import { getLeads, getLead, addLead, updateLead, deleteLead, getLeadsByStatus, getLeadStats } from '@/lib/leads-kv';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  
  if (type === 'byStatus') {
    const leads = await getLeadsByStatus();
    return NextResponse.json(leads);
  }
  
  if (type === 'stats') {
    const stats = await getLeadStats();
    return NextResponse.json(stats);
  }
  
  if (id) {
    const lead = await getLead(Number(id));
    return NextResponse.json(lead);
  }
  
  const leads = await getLeads();
  return NextResponse.json(leads);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, phone, source, eventDate, eventType, notes, followUpDate } = body;
  
  const id = await addLead(name, email || null, phone || null, source || null, eventDate || null, eventType || null, notes || null, followUpDate || null);
  return NextResponse.json({ id, success: true });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, name, email, phone, source, event_date, event_type, status, notes, follow_up_date } = body;
  
  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }
  
  await updateLead(Number(id), {
    name,
    email,
    phone,
    source,
    event_date,
    event_type,
    status,
    notes,
    follow_up_date
  });
  
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (id) {
    await deleteLead(Number(id));
  }
  return NextResponse.json({ success: true });
}
