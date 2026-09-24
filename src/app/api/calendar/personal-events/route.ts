import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { kv } from '@vercel/kv';

const PERSONAL_EVENTS_KEY = 'calendar_personal_events';
const DATA_DIR = path.join(process.cwd(), 'data');
const PERSONAL_EVENTS_FILE = path.join(DATA_DIR, 'personal-events.json');

// Check if Redis is available
const hasRedisConfig = !!process.env.KV_REST_API_URL;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

async function getPersonalEventsFromRedis(): Promise<any[]> {
  try {
    const events = await kv.get<any[]>(PERSONAL_EVENTS_KEY);
    return events || [];
  } catch (e) {
    console.error('Error reading personal events from Redis:', e);
    return [];
  }
}

async function savePersonalEventsToRedis(events: any[]): Promise<void> {
  await kv.set(PERSONAL_EVENTS_KEY, events);
}

function readPersonalEventsFromFile(): any[] {
  try {
    if (fs.existsSync(PERSONAL_EVENTS_FILE)) {
      return JSON.parse(fs.readFileSync(PERSONAL_EVENTS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading personal events from file:', e);
  }
  return [];
}

function savePersonalEventsToFile(events: any[]): void {
  try {
    ensureDataDir();
    fs.writeFileSync(PERSONAL_EVENTS_FILE, JSON.stringify(events, null, 2));
  } catch (e) {
    console.error('Error saving personal events to file:', e);
  }
}

async function getPersonalEvents(): Promise<any[]> {
  if (hasRedisConfig) {
    return await getPersonalEventsFromRedis();
  }
  return readPersonalEventsFromFile();
}

async function savePersonalEvents(events: any[]): Promise<void> {
  if (hasRedisConfig) {
    await savePersonalEventsToRedis(events);
  } else {
    savePersonalEventsToFile(events);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  
  let events = await getPersonalEvents();
  
  if (date) {
    events = events.filter((e: any) => e.date === date);
  }
  
  return NextResponse.json(events);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, id, title, date, startTime, endTime } = body;

  if (action === 'create' || action === 'reschedule') {
    if (!date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Date, start time, and end time are required' }, { status: 400 });
    }
    if (startTime >= endTime) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }
  }

  const events = await getPersonalEvents();

  if (action === 'create') {
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    
    const newEvent = {
      id: crypto.randomUUID(),
      personalEventTitle: title,
      date,
      startTime,
      endTime,
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };
    
    events.push(newEvent);
    await savePersonalEvents(events);
    
    return NextResponse.json(newEvent);
  }

  if (action === 'reschedule') {
    const index = events.findIndex((e: any) => e.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Personal event not found' }, { status: 404 });
    }
    
    events[index] = {
      ...events[index],
      date,
      startTime,
      endTime
    };
    
    await savePersonalEvents(events);
    return NextResponse.json(events[index]);
  }

  if (action === 'cancel') {
    const index = events.findIndex((e: any) => e.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Personal event not found' }, { status: 404 });
    }
    
    events[index].status = 'cancelled';
    await savePersonalEvents(events);
    return NextResponse.json(events[index]);
  }

  if (action === 'delete') {
    const index = events.findIndex((e: any) => e.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Personal event not found' }, { status: 404 });
    }
    
    events.splice(index, 1);
    await savePersonalEvents(events);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'Personal event ID required' }, { status: 400 });
  }
  
  const events = await getPersonalEvents();
  const index = events.findIndex((e: any) => e.id === id);
  
  if (index === -1) {
    return NextResponse.json({ error: 'Personal event not found' }, { status: 404 });
  }
  
  events.splice(index, 1);
  await savePersonalEvents(events);
  
  return NextResponse.json({ success: true });
}