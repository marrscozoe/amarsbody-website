import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { kv } from '@vercel/kv';

const CLIENTS_KEY = 'clients';
const DATA_FILE = path.join(process.cwd(), 'data', 'clients.json');

// Check if Redis is available (KV_REST_API_URL is set and not empty)
const hasRedisConfig = !!process.env.KV_REST_API_URL;

// File-based storage (for development without Redis)
function readClientsFromFile() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading clients from file:', e);
  }
  return [];
}

function writeClientsToFile(clients: any[]) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(clients, null, 2));
}

// Redis-based storage (for production with Redis)
async function getClientsFromRedis() {
  try {
    const clients = await kv.get<any[]>(CLIENTS_KEY);
    return clients || [];
  } catch (e) {
    console.error('Error reading clients from Redis:', e);
    return [];
  }
}

async function saveClientsToRedis(clients: any[]) {
  if (!await kv.set(CLIENTS_KEY, clients)) {
    throw new Error('Failed to save clients');
  }
}

// Unified interface - uses Redis if configured, falls back to file storage
async function getClients() {
  if (hasRedisConfig) {
    console.log('Using Redis for clients storage');
    const clients = await getClientsFromRedis();
    // If Redis has data, return it; otherwise fall back to file
    if (clients.length > 0) {
      return clients;
    }
    console.log('Redis is empty, falling back to file storage');
  }
  console.log('Using file storage for clients');
  return readClientsFromFile();
}

async function saveClients(clients: any[]) {
  if (hasRedisConfig) {
    try {
      await saveClientsToRedis(clients);
      console.log('Saved clients to Redis');
    } catch (e) {
      console.error('Failed to save to Redis, falling back to file:', e);
      writeClientsToFile(clients);
    }
  } else {
    writeClientsToFile(clients);
  }
}

export async function GET() {
  try {
    const clients = await getClients();
    return NextResponse.json(clients);
  } catch (e: unknown) {
    console.error('Error in GET /api/clients:', e);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const newClient = await request.json();
    const clients = await getClients();
    
    // Generate ID
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    const clientWithId = {
      ...newClient,
      id,
      createdAt: new Date().toISOString()
    };
    
    clients.push(clientWithId);
    await saveClients(clients);
    
    return NextResponse.json(clientWithId);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('Error in POST /api/clients:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const updatedClient = await request.json();
    const clients = await getClients();
    
    const index = clients.findIndex((c: any) => c.id === updatedClient.id);
    if (index === -1) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    
    clients[index] = { ...clients[index], ...updatedClient };
    await saveClients(clients);
    
    return NextResponse.json(clients[index]);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('Error in PUT /api/clients:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 });
    }
    
    let clients = await getClients();
    const initialLength = clients.length;
    clients = clients.filter((c: any) => c.id !== id);
    
    if (clients.length < initialLength) {
      await saveClients(clients);
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('Error in DELETE /api/clients:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
