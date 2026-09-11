import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

const PENDING_FILE = path.join(process.cwd(), 'data', 'pending-replies.json');
const LEADS_FILE = path.join(process.cwd(), 'data', 'leads.json');

function readPending() {
  try {
    if (!fs.existsSync(PENDING_FILE)) return [];
    const data = fs.readFileSync(PENDING_FILE, 'utf-8');
    return JSON.parse(data);
  } catch { return []; }
}

function savePending(pending: any[]) {
  fs.writeFileSync(PENDING_FILE, JSON.stringify(pending, null, 2));
}

function sendReply(toEmail: string, toName: string, subject: string) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'amarsbody@gmail.com',
      pass: 'ygldhjrpvaxhzjtg',
    },
  });
  
  const body = `Hi ${toName},

Thanks for reaching out! I'm Allen Marrs, personal trainer and nutrition coach specializing in event preparation — weddings, beach trips, reunions, you name it.

I'd love to learn more about your goals and see if we're a good fit. Are you available for a quick call this week?

You can reply directly to this email or reach me at amarsbody@gmail.com.

Looking forward to connecting!

Allen
AMarsBody Personal Training`;

  transporter.sendMail({
    from: 'amarsbody@gmail.com',
    to: toEmail,
    subject: `Re: ${subject || 'Thanks for reaching out - AMarsBody'}`,
    text: body,
  });
}

export async function GET() {
  const pending = readPending();
  return NextResponse.json(pending);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action, lead_email } = body;
  
  if (action === 'approve' && lead_email) {
    const pending = readPending();
    const reply = pending.find((p: any) => p.lead_email === lead_email);
    
    if (reply) {
      try {
        sendReply(reply.to_email, reply.to_name, reply.subject);
        
        // Update lead status
        const leadsData = fs.existsSync(LEADS_FILE) ? JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8')) : [];
        const leadIndex = leadsData.findIndex((l: any) => l.email === lead_email);
        if (leadIndex !== -1) {
          leadsData[leadIndex].status = 'contacted';
          leadsData[leadIndex].updated_at = new Date().toISOString();
          fs.writeFileSync(LEADS_FILE, JSON.stringify(leadsData, null, 2));
        }
        
        // Remove from pending
        const newPending = pending.filter((p: any) => p.lead_email !== lead_email);
        savePending(newPending);
        
        return NextResponse.json({ success: true, message: 'Reply sent!' });
      } catch (err) {
        return NextResponse.json({ success: false, error: 'Failed to send reply' }, { status: 500 });
      }
    }
  }
  
  return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
}