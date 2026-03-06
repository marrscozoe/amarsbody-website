import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy-key-for-build');

// Store submissions in a simple JSON file
const SUBMISSIONS_FILE = '/tmp/amarsbody-submissions.json';

function saveSubmission(data: any) {
  try {
    const dir = dirname(SUBMISSIONS_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    
    let submissions: any[] = [];
    if (existsSync(SUBMISSIONS_FILE)) {
      const content = require('fs').readFileSync(SUBMISSIONS_FILE, 'utf8');
      submissions = JSON.parse(content);
    }
    
    submissions.unshift({
      ...data,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100
    submissions = submissions.slice(0, 100);
    
    require('fs').writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
  } catch (e) {
    console.error('Error saving submission:', e);
  }
}

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 500 }
    );
  }

  try {
    const { name, email, phone, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Send email notification
    const data = await resend.emails.send({
      from: 'AMarsBody Contact <onboarding@resend.dev>',
      to: 'marrsco.zoe@gmail.com',
      subject: `New Contact Form Submission from ${name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
      replyTo: email,
    });

    // Save submission
    saveSubmission({ name, email, phone, message });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
