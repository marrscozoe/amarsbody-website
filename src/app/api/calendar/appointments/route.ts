import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { kv } from '@vercel/kv';

const APPOINTMENTS_KEY = 'calendar_appointments';
const BLOCKED_KEY = 'calendar_blocked_times';
const CALENDAR_CLIENTS_KEY = 'calendar_clients';
const DATA_DIR = path.join(process.cwd(), 'data');
const CLIENTS_FILE = path.join(DATA_DIR, 'calendar_clients.json');

async function getAppointmentsFromRedis(): Promise<any[]> {
  try {
    const appointments = await kv.get<any[]>(APPOINTMENTS_KEY);
    return appointments || [];
  } catch (e) {
    console.error('Error reading appointments from Redis:', e);
    return [];
  }
}

async function saveAppointmentsToRedis(appointments: any[]): Promise<void> {
  await kv.set(APPOINTMENTS_KEY, appointments);
}

// ── Client credit helpers (mirrors clients/route.ts storage) ───────────────
const hasRedisConfig = !!process.env.KV_REST_API_URL;

function readClientsFromFile(): any[] {
  try {
    if (fs.existsSync(CLIENTS_FILE)) {
      return JSON.parse(fs.readFileSync(CLIENTS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading clients from file:', e);
  }
  return [];
}

function writeClientsToFile(clients: any[]): void {
  const dir = path.dirname(CLIENTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2));
}

async function getClientsFromRedis(): Promise<any[]> {
  try {
    const clients = await kv.get<any[]>(CALENDAR_CLIENTS_KEY);
    return clients || [];
  } catch (e) {
    console.error('Error reading clients from Redis:', e);
    return [];
  }
}

async function saveClientsToRedis(clients: any[]): Promise<void> {
  if (!await kv.set(CALENDAR_CLIENTS_KEY, clients)) {
    throw new Error('Failed to save clients');
  }
}

async function getClients(): Promise<any[]> {
  if (hasRedisConfig) {
    const clients = await getClientsFromRedis();
    if (clients.length > 0) return clients;
  }
  return readClientsFromFile();
}

async function saveClients(clients: any[]): Promise<void> {
  if (hasRedisConfig) {
    try {
      await saveClientsToRedis(clients);
    } catch (e) {
      console.error('Failed to save to Redis, falling back to file:', e);
      writeClientsToFile(clients);
    }
  } else {
    writeClientsToFile(clients);
  }
}

async function adjustClientCredit(clientId: string, delta: number): Promise<void> {
  const clients = await getClients();
  const idx = clients.findIndex((c: any) => c.id === clientId);
  if (idx === -1) return;
  const current = clients[idx].unusedCredits ?? 10;
  clients[idx].unusedCredits = Math.max(0, current + delta);
  await saveClients(clients);
}

async function getBlockedFromRedis(): Promise<any[]> {
  try {
    const blocked = await kv.get<any[]>(BLOCKED_KEY);
    return blocked || [];
  } catch (e) {
    console.error('Error reading blocked from Redis:', e);
    return [];
  }
}

async function checkSlotAvailable(
  date: string,
  startTime: string,
  endTime: string,
  excludeId?: string,
  clientIdForSameDayCheck?: string
): Promise<{ available: boolean; reason?: string }> {
  const appointments = await getAppointmentsFromRedis();
  const blocked = await getBlockedFromRedis();

  // ── Same-day double-book prevention ──────────────────────────────────────
  // If a client already has an active appointment on this date, reject.
  // For reschedules (excludeId set), only check OTHER appointments on the same day.
  if (clientIdForSameDayCheck) {
    const hasOtherAppointmentOnDay = appointments.some((apt: any) => {
      if (apt.status === 'cancelled') return false;
      if (excludeId && apt.id === excludeId) return false;
      if (apt.date !== date) return false;
      if (apt.clientId !== clientIdForSameDayCheck) return false;
      return true;
    });
    if (hasOtherAppointmentOnDay) {
      return { available: false, reason: 'You already have an appointment on this day' };
    }
  }

  // ── Slot conflict check ──────────────────────────────────────────────────
  const hasConflict = appointments.some((apt: any) => {
    if (apt.status === 'cancelled') return false;
    if (excludeId && apt.id === excludeId) return false;
    if (apt.date !== date) return false;
    const existingStart = apt.startTime;
    const existingEnd = apt.endTime;
    return !(endTime <= existingStart || startTime >= existingEnd);
  });

  if (hasConflict) return { available: false, reason: 'Time slot not available' };

  // ── Blocked time check ───────────────────────────────────────────────────
  const requestedDate = new Date(date + "T00:00:00");
  const dayOfWeek = requestedDate.getDay();

  const isBlocked = blocked.some((blk: any) => {
    if (blk.date === date) {
      return !(endTime <= blk.startTime || startTime >= blk.endTime);
    }
    if (blk.isRecurring && blk.daysOfWeek && blk.daysOfWeek.includes(dayOfWeek)) {
      if (blk.endDate && date > blk.endDate) return false;
      return !(endTime <= blk.startTime || startTime >= blk.endTime);
    }
    return false;
  });

  if (isBlocked) return { available: false, reason: 'Time slot is blocked' };

  return { available: true };
}

// GET - List appointments
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const date = searchParams.get('date');

  let appointments = await getAppointmentsFromRedis();

  if (clientId) {
    appointments = appointments.filter((a: any) => a.clientId === clientId);
  }

  if (date) {
    appointments = appointments.filter((a: any) => a.date === date);
  }

  return NextResponse.json(appointments);
}

// POST - Create or update appointment
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, id, clientId, clientName, clientEmail, clientPhone, date, startTime, endTime, status, duration, recurringId, recurringPattern, label, isPersonalBlock } = body;

  const appointments = await getAppointmentsFromRedis();

  // ── Create consultation ─────────────────────────────────────────────────
  if (action === 'create-consult') {
    const [hours, minutes] = startTime.split(":").map(Number);
    const endMinutes = hours * 60 + minutes + (duration || 30);
    const computedEndTime = endTime || `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;

    const check = await checkSlotAvailable(date, startTime, computedEndTime);
    if (!check.available) {
      return NextResponse.json({ error: check.reason }, { status: 400 });
    }

    const newAppointment = {
      id: crypto.randomUUID(),
      clientId: clientId || `consult_${crypto.randomUUID()}`,
      clientName: clientName || '',
      clientEmail: clientEmail || '',
      clientPhone: clientPhone || '',
      date,
      startTime,
      endTime: computedEndTime,
      status: 'consultation',
      duration: duration || 30,
      createdAt: new Date().toISOString()
    };

    appointments.push(newAppointment);
    await saveAppointmentsToRedis(appointments);

    return NextResponse.json(newAppointment);
  }

  // ── Create regular appointment ─────────────────────────────────────────
  if (action === 'create') {
    const check = await checkSlotAvailable(date, startTime, endTime, undefined, clientId);
    if (!check.available) {
      return NextResponse.json({ error: check.reason }, { status: 400 });
    }

    const newAppointment = {
      id: crypto.randomUUID(),
      clientId,
      date,
      startTime,
      endTime,
      status: isPersonalBlock ? 'personal-block' : 'booked',
      recurringId: recurringId || null,
      recurringPattern: recurringPattern || null,
      label: label || null,
      isPersonalBlock: isPersonalBlock || false,
      createdAt: new Date().toISOString()
    };

    appointments.push(newAppointment);
    await saveAppointmentsToRedis(appointments);

    // Decrement client credit on booking (personal blocks don't use credits)
    if (!isPersonalBlock) {
      await adjustClientCredit(clientId, -1);
    }

    return NextResponse.json(newAppointment);
  }

  // ── Reschedule ──────────────────────────────────────────────────────────
  // When rescheduling FROM date D to new date+time:
  // - The appointment being moved is temporarily "free" during the check (excludeId)
  // - The same-day rule still applies: if client has ANOTHER apt on D, can't book another on D
  if (action === 'reschedule') {
    const index = appointments.findIndex((a: any) => a.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const apt = appointments[index];
    // Check the new slot — excludeId = id so we don't conflict with the appointment being moved
    // clientId is the same client, so same-day check fires and prevents booking same day as their other apt
    const check = await checkSlotAvailable(date, startTime, endTime, id, apt.clientId);
    if (!check.available) {
      return NextResponse.json({ error: check.reason }, { status: 400 });
    }

    appointments[index] = {
      ...appointments[index],
      date,
      startTime,
      endTime
    };

    await saveAppointmentsToRedis(appointments);
    return NextResponse.json(appointments[index]);
  }

  // ── Cancel ────────────────────────────────────────────────────────────
  if (action === 'cancel') {
    const index = appointments.findIndex((a: any) => a.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const apt = appointments[index];
    const wasBooked = apt.status === 'booked';
    const isPersonalBlock = apt.isPersonalBlock;

    appointments[index].status = 'cancelled';
    await saveAppointmentsToRedis(appointments);

    // Restore +1 unused session credit on cancel (personal blocks don't use credits)
    if (apt.clientId && wasBooked && !isPersonalBlock) {
      await adjustClientCredit(apt.clientId, 1);
    }

    return NextResponse.json(appointments[index]);
  }

  // ── Schedule recurring ─────────────────────────────────────────────────
  if (action === 'schedule-recurring') {
    const { clientId: recClientId, startTime: recStartTime, endTime: recEndTime, daysOfWeek, endDate } = body;

    if (!recClientId || !recStartTime || !recEndTime || !daysOfWeek || daysOfWeek.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const recurringId = crypto.randomUUID();
    const createdAppointments = [];
    const today = new Date();
    const maxDate = endDate ? new Date(endDate) : new Date(today);
    maxDate.setFullYear(maxDate.getFullYear() + 1);

    const currentDate = new Date(today);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= maxDate) {
      const dayOfWeek = currentDate.getDay();

      if (daysOfWeek.includes(dayOfWeek)) {
        const dateStr = currentDate.toISOString().split('T')[0];

        const check = await checkSlotAvailable(dateStr, recStartTime, recEndTime, undefined, recClientId);
        if (check.available) {
          const newAppointment = {
            id: crypto.randomUUID(),
            clientId: recClientId,
            date: dateStr,
            startTime: recStartTime,
            endTime: recEndTime,
            status: 'booked',
            recurringId,
            recurringPattern: daysOfWeek.join(','),
            createdAt: new Date().toISOString()
          };

          appointments.push(newAppointment);
          createdAppointments.push(newAppointment);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    await saveAppointmentsToRedis(appointments);
    return NextResponse.json({
      message: `Created ${createdAppointments.length} appointments`,
      recurringId,
      appointments: createdAppointments
    });
  }

  // ── Mark complete ───────────────────────────────────────────────────────
  if (action === 'complete') {
    const index = appointments.findIndex((a: any) => a.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    appointments[index].status = 'completed';
    await saveAppointmentsToRedis(appointments);
    return NextResponse.json(appointments[index]);
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// DELETE - Delete appointment
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 });
  }

  const appointments = await getAppointmentsFromRedis();
  const index = appointments.findIndex((a: any) => a.id === id);

  if (index === -1) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
  }

  appointments.splice(index, 1);
  await saveAppointmentsToRedis(appointments);

  return NextResponse.json({ success: true });
}
