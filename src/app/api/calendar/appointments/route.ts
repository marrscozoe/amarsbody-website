import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { kv } from '@vercel/kv';

const APPOINTMENTS_KEY = 'calendar_appointments';
const BLOCKED_KEY = 'calendar_blocked_times';

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

async function getBlockedFromRedis(): Promise<any[]> {
  try {
    const blocked = await kv.get<any[]>(BLOCKED_KEY);
    return blocked || [];
  } catch (e) {
    console.error('Error reading blocked from Redis:', e);
    return [];
  }
}

async function checkSlotAvailable(date: string, startTime: string, endTime: string, excludeId?: string): Promise<boolean> {
  const appointments = await getAppointmentsFromRedis();
  const blocked = await getBlockedFromRedis();
  
  // Check appointments
  const hasConflict = appointments.some((apt: any) => {
    if (apt.status === 'cancelled') return false;
    if (excludeId && apt.id === excludeId) return false;
    if (apt.date !== date) return false;
    
    const existingStart = apt.startTime;
    const existingEnd = apt.endTime;
    return !(endTime <= existingStart || startTime >= existingEnd);
  });
  
  if (hasConflict) return false;
  
  // Check blocked times
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
  
  return !isBlocked;
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
  const { action, id, clientId, date, startTime, endTime, status, recurringId, recurringPattern } = body;

  const appointments = await getAppointmentsFromRedis();

  if (action === 'create') {
    if (!await checkSlotAvailable(date, startTime, endTime)) {
      return NextResponse.json({ error: 'Time slot not available' }, { status: 400 });
    }
    
    const newAppointment = {
      id: crypto.randomUUID(),
      clientId,
      date,
      startTime,
      endTime,
      status: 'booked',
      recurringId: recurringId || null,
      recurringPattern: recurringPattern || null,
      createdAt: new Date().toISOString()
    };
    
    appointments.push(newAppointment);
    await saveAppointmentsToRedis(appointments);
    
    return NextResponse.json(newAppointment);
  }

  if (action === 'reschedule') {
    const index = appointments.findIndex((a: any) => a.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }
    
    if (!await checkSlotAvailable(date, startTime, endTime, id)) {
      return NextResponse.json({ error: 'Time slot not available' }, { status: 400 });
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

  if (action === 'cancel') {
    const index = appointments.findIndex((a: any) => a.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }
    
    appointments[index].status = 'cancelled';
    await saveAppointmentsToRedis(appointments);
    return NextResponse.json(appointments[index]);
  }

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
        
        if (await checkSlotAvailable(dateStr, recStartTime, recEndTime)) {
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
