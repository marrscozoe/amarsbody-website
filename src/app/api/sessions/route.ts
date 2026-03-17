import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { kv } from '@vercel/kv';

const SESSIONS_KEY = 'sessions';
const DATA_FILE = path.join(process.cwd(), 'data', 'sessions.json');

// Check if Redis is available (KV_REST_API_URL is set and not empty)
const hasRedisConfig = !!process.env.KV_REST_API_URL;

// File-based storage (for development without Redis)
function readSessionsFromFile() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading sessions from file:', e);
  }
  return [];
}

function writeSessionsToFile(sessions: any[]) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(sessions, null, 2));
}

// Redis-based storage (for production with Redis)
async function getSessionsFromRedis() {
  try {
    const sessions = await kv.get<any[]>(SESSIONS_KEY);
    return sessions || [];
  } catch (e) {
    console.error('Error reading sessions from Redis:', e);
    return [];
  }
}

async function saveSessionsToRedis(sessions: any[]) {
  if (!await kv.set(SESSIONS_KEY, sessions)) {
    throw new Error('Failed to save sessions');
  }
}

// Unified interface - uses Redis if configured, falls back to file storage
async function getSessions() {
  if (hasRedisConfig) {
    console.log('Using Redis for sessions storage');
    const sessions = await getSessionsFromRedis();
    // If Redis has data, return it; otherwise fall back to file
    if (sessions.length > 0) {
      return sessions;
    }
    console.log('Redis is empty, falling back to file storage');
  }
  console.log('Using file storage for sessions');
  return readSessionsFromFile();
}

async function saveSessions(sessions: any[]) {
  if (hasRedisConfig) {
    try {
      await saveSessionsToRedis(sessions);
      console.log('Saved sessions to Redis');
    } catch (e) {
      console.error('Failed to save to Redis, falling back to file:', e);
      writeSessionsToFile(sessions);
    }
  } else {
    writeSessionsToFile(sessions);
  }
}

export async function GET() {
  try {
    const sessions = await getSessions();
    return NextResponse.json(sessions);
  } catch (e: unknown) {
    console.error('Error in GET /api/sessions:', e);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const newSession = await request.json();
    const sessions = await getSessions();
    
    // Generate ID
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    const sessionWithId = {
      ...newSession,
      id
    };
    
    sessions.push(sessionWithId);
    await saveSessions(sessions);
    
    return NextResponse.json(sessionWithId);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('Error in POST /api/sessions:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
