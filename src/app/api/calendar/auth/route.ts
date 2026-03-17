import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');

function readAdmin() {
  const data = fs.readFileSync(ADMIN_FILE, 'utf-8');
  return JSON.parse(data);
}

// POST - Admin login
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { password } = body;

  const admin = readAdmin();
  
  if (password === admin.adminPassword) {
    return NextResponse.json({ success: true, admin: true });
  }
  
  return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
}
