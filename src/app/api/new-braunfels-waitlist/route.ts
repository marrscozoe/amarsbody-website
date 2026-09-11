import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'new-braunfels-waitlist.json');

interface WaitlistEntry {
  name: string;
  email: string;
  timestamp: string;
}

function readWaitlist(): WaitlistEntry[] {
  try {
    if (existsSync(DATA_FILE)) {
      return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch {}
  return [];
}

function writeWaitlist(entries: WaitlistEntry[]): void {
  writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email } = body;

    if (!name || !email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid name or email' }, { status: 400 });
    }

    const waitlist = readWaitlist();

    // Check for duplicate email
    const existing = waitlist.find(e => e.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return NextResponse.json({ message: 'Already on the list!' }, { status: 200 });
    }

    waitlist.push({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      timestamp: new Date().toISOString(),
    });

    writeWaitlist(waitlist);

    return NextResponse.json({ message: 'Added to waitlist!' }, { status: 200 });
  } catch (err) {
    console.error('Waitlist error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  // Protected — only Allen can view via the leads page
  return NextResponse.json({ count: readWaitlist().length });
}
