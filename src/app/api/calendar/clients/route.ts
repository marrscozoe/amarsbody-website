import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { kv } from '@vercel/kv';

const CALENDAR_CLIENTS_KEY = 'calendar_clients';
const DATA_DIR = path.join(process.cwd(), 'data');
const CLIENTS_FILE = path.join(DATA_DIR, 'calendar_clients.json');

// Check if Redis is available
const hasRedisConfig = !!process.env.KV_REST_API_URL;

function readClientsFromFile() {
  try {
    if (fs.existsSync(CLIENTS_FILE)) {
      return JSON.parse(fs.readFileSync(CLIENTS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading clients from file:', e);
  }
  return [];
}

function writeClientsToFile(clients: any[]) {
  const dir = path.dirname(CLIENTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2));
}

async function getClientsFromRedis() {
  try {
    const clients = await kv.get<any[]>(CALENDAR_CLIENTS_KEY);
    return clients || [];
  } catch (e) {
    console.error('Error reading clients from Redis:', e);
    return [];
  }
}

async function saveClientsToRedis(clients: any[]) {
  if (!await kv.set(CALENDAR_CLIENTS_KEY, clients)) {
    throw new Error('Failed to save clients');
  }
}

async function getClients() {
  if (hasRedisConfig) {
    const clients = await getClientsFromRedis();
    if (clients.length > 0) {
      return clients;
    }
  }
  return readClientsFromFile();
}

async function saveClients(clients: any[]) {
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

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// GET - List all clients
export async function GET() {
  try {
    const clients = await getClients();
    return NextResponse.json(clients.map((c: any) => ({ ...c, password: undefined })));
  } catch (e) {
    console.error('Error in GET:', e);
    return NextResponse.json([]);
  }
}

// POST - Create new client or login
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, firstName, lastName, password, email, phone, id } = body;

  if (action === 'login') {
    const clients = await getClients();
    const client = clients.find((c: any) => 
      c.firstName.toLowerCase() === firstName?.toLowerCase() && 
      c.lastName.toLowerCase() === lastName?.toLowerCase()
    );
    
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 401 });
    }
    
    if (client.password !== hashPassword(password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    return NextResponse.json({ 
      id: client.id, 
      firstName: client.firstName, 
      lastName: client.lastName,
      email: client.email,
      phone: client.phone
    });
  }

  if (action === 'changePassword') {
    const clients = await getClients();
    const clientIndex = clients.findIndex((c: any) => c.id === id);
    
    if (clientIndex === -1) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    
    clients[clientIndex].password = hashPassword(password);
    await saveClients(clients);
    
    return NextResponse.json({ success: true });
  }

  if (action === 'create') {
    const clients = await getClients();
    
    // Check if client already exists
    const existing = clients.find((c: any) => 
      c.firstName.toLowerCase() === firstName?.toLowerCase() && 
      c.lastName.toLowerCase() === lastName?.toLowerCase()
    );
    
    if (existing) {
      return NextResponse.json({ error: 'Client already exists' }, { status: 400 });
    }
    
    const newClient = {
      id: crypto.randomUUID(),
      firstName,
      lastName,
      password: hashPassword(password),
      email: email || '',
      phone: phone || ''
    };
    
    clients.push(newClient);
    await saveClients(clients);
    
    return NextResponse.json({ 
      id: newClient.id, 
      firstName: newClient.firstName, 
      lastName: newClient.lastName,
      email: newClient.email,
      phone: newClient.phone
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// DELETE - Delete a client
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'Client ID required' }, { status: 400 });
  }
  
  try {
    const clients = await getClients();
    const initialLength = clients.length;
    const filtered = clients.filter((c: any) => c.id !== id);
    
    if (filtered.length < initialLength) {
      await saveClients(filtered);
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  } catch (e) {
    console.error('Error deleting client:', e);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
