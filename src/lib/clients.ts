// Local JSON file storage for Client Programs
// Data stored in data/clients.json and data/sessions.json

import { Client, Session, WorkoutProgram, WorkoutExercise } from './types';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const CLIENTS_FILE = path.join(DATA_DIR, 'clients.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Generate unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Helper to read JSON file
function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
  }
  return defaultValue;
}

// Helper to write JSON file
function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    throw error;
  }
}

// CLIENT operations
export async function getClients(): Promise<Client[]> {
  return readJsonFile<Client[]>(CLIENTS_FILE, []);
}

export async function getClient(id: string): Promise<Client | undefined> {
  const clients = await getClients();
  return clients.find(c => c.id === id);
}

export async function addClient(client: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
  const clients = await getClients();
  
  const newClient: Client = {
    ...client,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  
  clients.push(newClient);
  writeJsonFile(CLIENTS_FILE, clients);
  
  return newClient;
}

export async function updateClient(id: string, updates: Partial<Client>): Promise<Client | null> {
  const clients = await getClients();
  const index = clients.findIndex(c => c.id === id);
  
  if (index === -1) return null;
  
  clients[index] = { ...clients[index], ...updates };
  writeJsonFile(CLIENTS_FILE, clients);
  
  return clients[index];
}

export async function deleteClient(id: string): Promise<boolean> {
  const clients = await getClients();
  const initialLength = clients.length;
  
  const filteredClients = clients.filter(c => c.id !== id);
  
  if (filteredClients.length < initialLength) {
    writeJsonFile(CLIENTS_FILE, filteredClients);
    
    // Also delete sessions for this client
    const sessions = await getSessions();
    const filteredSessions = sessions.filter(s => s.clientId !== id);
    writeJsonFile(SESSIONS_FILE, filteredSessions);
    
    return true;
  }
  
  return false;
}

// SESSION operations
export async function getSessions(): Promise<Session[]> {
  return readJsonFile<Session[]>(SESSIONS_FILE, []);
}

export async function getClientSessions(clientId: string): Promise<Session[]> {
  const sessions = await getSessions();
  return sessions
    .filter(s => s.clientId === clientId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function addSession(session: Omit<Session, 'id'>): Promise<Session> {
  const sessions = await getSessions();
  
  const newSession: Session = {
    ...session,
    id: generateId(),
  };
  
  sessions.push(newSession);
  writeJsonFile(SESSIONS_FILE, sessions);
  
  // Update client's last workout
  const client = await getClient(session.clientId);
  if (client) {
    await updateClient(session.clientId, { lastWorkout: session.date });
  }
  
  return newSession;
}

// Remove old week exercises and rotate
export async function rotateProgram(clientId: string): Promise<void> {
  const client = await getClient(clientId);
  if (!client || !client.currentProgram) return;
  
  // Increment week number
  client.currentProgram.weekNumber += 1;
  
  // Randomize exercise order (keeping same exercises)
  const shuffled = [...client.currentProgram.exercises].sort(() => Math.random() - 0.5);
  client.currentProgram.exercises = shuffled;
  
  // Clear actual weights for new week
  client.currentProgram.exercises.forEach(ex => {
    ex.actualWeight = undefined;
  });
  
  await updateClient(clientId, { currentProgram: client.currentProgram });
}

// Sync versions for API routes that expect synchronous calls
let clientsCache: Client[] | null = null;
let sessionsCache: Session[] | null = null;
let cacheLoaded = false;

async function loadCache(): Promise<void> {
  if (cacheLoaded) return;
  clientsCache = await getClients();
  sessionsCache = await getSessions();
  cacheLoaded = true;
}

// Sync versions for API routes that expect synchronous calls
export function getClientsSync(): Client[] {
  return clientsCache || [];
}

export function getClientSync(id: string): Client | undefined {
  return (clientsCache || []).find(c => c.id === id);
}

export async function initializeStorage(): Promise<void> {
  await loadCache();
}
