import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { kv } from '@vercel/kv';

const BLOCKED_KEY = 'calendar_blocked_times';

// Redis is required for this API
async function getBlockedFromRedis(): Promise<any[]> {
  try {
    const blocked = await kv.get<any[]>(BLOCKED_KEY);
    return blocked || [];
  } catch (e) {
    console.error('Error reading blocked from Redis:', e);
    return [];
  }
}

async function saveBlockedToRedis(blocked: any[]): Promise<void> {
  await kv.set(BLOCKED_KEY, blocked);
}

// GET - List blocked times
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  
  let blocked = await getBlockedFromRedis();
  
  if (date) {
    const requestedDate = new Date(date + "T00:00:00");
    const dayOfWeek = requestedDate.getDay();
    
    blocked = blocked.filter((b: any) => {
      // Direct date match
      if (b.date === date) return true;
      
      // Check recurring blocks with days of week
      if (b.isRecurring && b.daysOfWeek && b.daysOfWeek.length > 0) {
        if (!b.daysOfWeek.includes(dayOfWeek)) return false;
        if (b.endDate && date > b.endDate) return false;
        return true;
      }
      
      return false;
    });
  }
  
  return NextResponse.json(blocked);
}

// POST - Create or update blocked time
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, id, date, startTime, endTime, isRecurring, recurringPattern, endDate, daysOfWeek } = body;

  const blocked = await getBlockedFromRedis();

  if (action === 'block') {
    const newBlocked = {
      id: crypto.randomUUID(),
      date,
      startTime,
      endTime,
      isRecurring: isRecurring || false,
      recurringPattern: recurringPattern || null,
      endDate: endDate || null,
      daysOfWeek: daysOfWeek || null,
      createdAt: new Date().toISOString()
    };
    
    blocked.push(newBlocked);
    await saveBlockedToRedis(blocked);
    
    return NextResponse.json(newBlocked);
  }

  if (action === 'unblock') {
    const index = blocked.findIndex((b: any) => b.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Blocked time not found' }, { status: 404 });
    }
    
    blocked.splice(index, 1);
    await saveBlockedToRedis(blocked);
    
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
