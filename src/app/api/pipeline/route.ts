import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'leads.json');
const PENDING_FILE = path.join(process.cwd(), 'data', 'pending-replies.json');

export interface Lead {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  event_date: string | null;
  event_type: string | null;
  status: string;
  notes: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
  subject?: string | null;
  body?: string | null;
}

export interface PendingReply {
  to_email: string;
  to_name: string;
  subject: string;
  lead_name: string;
  lead_email: string;
  lead_subject: string;
  lead_body: string;
  created_at: string;
  status: string;
  index?: number;
}

interface LeadStats {
  total: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  conversionRate: string;
  thisWeek: number;
}

function readLeads(): Lead[] {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeLeads(leads: Lead[]): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2));
  } catch (err) {
    console.error('[pipeline API] Write error:', err);
  }
}

function readPending(): PendingReply[] {
  try {
    if (!fs.existsSync(PENDING_FILE)) return [];
    const data = fs.readFileSync(PENDING_FILE, 'utf-8');
    const pending = JSON.parse(data) as PendingReply[];
    return pending.map((p, i) => ({ ...p, index: i }));
  } catch {
    return [];
  }
}

function writePending(pending: PendingReply[]): void {
  try {
    fs.writeFileSync(PENDING_FILE, JSON.stringify(pending, null, 2));
  } catch (err) {
    console.error('[pipeline API] Write pending error:', err);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (type === 'pending') {
    const pending = readPending();
    return NextResponse.json(pending);
  }

  const leads = readLeads();

  if (type === 'byStatus') {
    const stages = ['new', 'contacted', 'consultation', 'booked', 'lost'];
    const result: Record<string, Lead[]> = {};
    for (const stage of stages) {
      result[stage] = leads.filter(l => l.status === stage);
    }
    return NextResponse.json(result);
  }

  if (type === 'stats') {
    const stages = ['new', 'contacted', 'consultation', 'booked', 'lost'];
    const byStatus: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    for (const stage of stages) {
      byStatus[stage] = leads.filter(l => l.status === stage).length;
    }
    for (const lead of leads) {
      const src = lead.source || 'Unknown';
      bySource[src] = (bySource[src] || 0) + 1;
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = leads.filter(l => new Date(l.created_at) >= weekAgo).length;

    const total = leads.length;
    const booked = byStatus['booked'] || 0;
    const conversionRate = total > 0 ? Math.round((booked / total) * 100) : '0';

    const stats: LeadStats = {
      total,
      byStatus,
      bySource,
      conversionRate: String(conversionRate),
      thisWeek,
    };
    return NextResponse.json(stats);
  }

  return NextResponse.json(leads);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action, index, leadId, status, notes, leadData } = body;

  // Approve a pending reply
  if (action === 'approveReply' && typeof index === 'number') {
    const { execSync } = await import('child_process');
    const scriptPath = path.join(process.cwd(), 'scripts', 'approve-reply.py');
    try {
      execSync(`python3 "${scriptPath}" "${index + 1}"`, { timeout: 30000 });
      return NextResponse.json({ success: true, message: 'Reply sent successfully' });
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ success: false, error }, { status: 500 });
    }
  }

  // Reject/dismiss a pending reply
  if (action === 'rejectReply' && typeof index === 'number') {
    const pending = readPending();
    if (index >= 0 && index < pending.length) {
      pending.splice(index, 1);
      writePending(pending);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: 'Invalid index' }, { status: 400 });
  }

  // Update lead status
  if (action === 'updateStatus' && leadId !== undefined && status) {
    const leads = readLeads();
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      lead.status = status;
      lead.updated_at = new Date().toISOString();
      writeLeads(leads);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
  }

  // Add note to lead
  if (action === 'addNote' && leadId !== undefined) {
    const leads = readLeads();
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      const existingNotes = lead.notes ? `${lead.notes}\n` : '';
      const timestamp = new Date().toLocaleString();
      lead.notes = `${existingNotes}[${timestamp}] ${notes}`;
      lead.updated_at = new Date().toISOString();
      writeLeads(leads);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
  }

  // Update lead data
  if (action === 'updateLead' && leadData) {
    const leads = readLeads();
    const idx = leads.findIndex(l => l.id === leadData.id);
    if (idx >= 0) {
      leads[idx] = {
        ...leads[idx],
        name: leadData.name ?? leads[idx].name,
        email: leadData.email ?? leads[idx].email,
        phone: leadData.phone ?? leads[idx].phone,
        source: leadData.source ?? leads[idx].source,
        event_date: leadData.event_date ?? leads[idx].event_date,
        event_type: leadData.event_type ?? leads[idx].event_type,
        notes: leadData.notes ?? leads[idx].notes,
        follow_up_date: leadData.follow_up_date ?? leads[idx].follow_up_date,
        status: leadData.status ?? leads[idx].status,
        updated_at: new Date().toISOString(),
      };
      writeLeads(leads);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
}