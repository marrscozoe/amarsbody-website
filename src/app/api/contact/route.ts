import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const SUBMISSIONS_FILE = path.join(process.cwd(), 'submissions.json');

async function getSubmissions() {
  try {
    const data = await fs.readFile(SUBMISSIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveSubmissions(submissions: any[]) {
  await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
}

// Send auto-reply email using Resend
async function sendAutoReply(toEmail: string, name: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    console.log('RESEND_API_KEY not found, skipping auto-reply');
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Zoe ~ Allen\'s Assistant <onboarding@resend.dev>',
        to: toEmail,
        subject: 'Thanks for reaching out to Allen!',
        html: `
          <h2>Hi ${name},</h2>
          <p>Thanks for contacting Allen! He'll be in touch within 1 business day.</p>
          <p>In the meantime, feel free to check out his website at <a href="https://amarsbody.com">amarsbody.com</a> to learn more about his training programs.</p>
          <p>Looking forward to helping you reach your fitness goals!</p>
          <p>Best,<br/>Zoe ~ Allen's Assistant</p>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend error:', error);
    } else {
      console.log('Auto-reply sent to:', toEmail);
    }
  } catch (error) {
    console.error('Failed to send auto-reply:', error);
  }
}

export async function POST(request: any) {
  try {
    const { name, email, phone, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Save submission to local JSON file
    const submissions = await getSubmissions();
    const newSubmission = {
      id: Date.now().toString(),
      name,
      email,
      phone: phone || '',
      message,
      timestamp: new Date().toISOString(),
    };
    submissions.push(newSubmission);
    await saveSubmissions(submissions);

    console.log('Contact form submission saved:', newSubmission);

    // Send auto-reply email
    await sendAutoReply(email, name);

    return NextResponse.json({ 
      success: true,
      message: 'Thank you! Allen will be in touch within 1 business day.'
    });
  } catch (error: any) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
