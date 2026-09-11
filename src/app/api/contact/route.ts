import { NextResponse } from 'next/server';

// Email Allen directly via Resend — the source of truth for lead capture.
// No disk writes. No submissions.json. Mailto backup is in the UI.

async function emailAllen(name: string, email: string, phone: string, message: string): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY not set — cannot email Allen');
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: 'AMarsBody Lead <onboarding@resend.dev>',
      to: ['amarsbody@gmail.com'],
      subject: `New lead from ${name} — amarsbody.com`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
        <hr />
        <p><em>Sent from amarsbody.com contact form</em></p>
      `,
      text: `New Contact Form Submission\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || 'Not provided'}\n\nMessage:\n${message}\n\n---\nSent from amarsbody.com contact form`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Resend error:', err);
    throw new Error(err);
  }

  console.log('Email sent to Allen for:', name, email);
}

// Optional: also save to Vercel KV so leads show in the admin pipeline
async function saveLeadToKV(name: string, email: string, phone: string, message: string): Promise<void> {
  try {
    const { kv } = await import('@vercel/kv');
    const id = Date.now();
    await kv.set(`lead:${id}`, {
      id,
      name,
      email,
      phone: phone || '',
      message,
      source: 'website-contact',
      timestamp: new Date().toISOString(),
      status: 'new',
    });
    // Add to the leads list
    const existing = (await kv.get<number[]>('lead-ids')) || [];
    await kv.set('lead-ids', [...existing, id]);
    console.log('Lead saved to KV:', id);
  } catch (e) {
    // KV is optional — don't fail the request if it errors
    console.warn('KV save failed, skipping:', e);
  }
}

// Send auto-reply to the submitter via Resend
async function sendAutoReply(toEmail: string, name: string): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Allen Marrs <onboarding@resend.dev>',
        to: [toEmail],
        subject: 'Got your message — Allen will reply within 1 business day',
        html: `
          <h2>Hi ${name},</h2>
          <p>Thanks for reaching out! Allen will be in touch within <strong>1 business day</strong>.</p>
          <p>In the meantime, feel free to check out <a href="https://amarsbody.com">amarsbody.com</a> to learn more about his training programs.</p>
          <p>Looking forward to helping you reach your goals!</p>
          <p>Best,<br/>Allen</p>
        `,
      }),
    });
    if (!res.ok) {
      console.warn('Auto-reply failed:', await res.text());
    }
  } catch (e) {
    console.warn('Auto-reply error:', e);
  }
}

export async function POST(request: Request) {
  try {
    const { name, email, phone, message } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    const finalMessage = message?.trim() || 'No message provided';

    // Email Allen — this is the primary action
    await emailAllen(name, email, phone || '', finalMessage);

    // Optional: also persist to Vercel KV
    await saveLeadToKV(name, email, phone || '', finalMessage);

    // Send auto-reply to the submitter (non-blocking)
    sendAutoReply(email, name).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Got it — Allen will reply within 1 business day.',
    });
  } catch (error: any) {
    console.error('Contact form error:', error);
    const msg = error?.message || 'Failed to send email';
    return NextResponse.json(
      { error: 'Failed to send your message. Please email amarsbody@gmail.com directly.', detail: msg },
      { status: 500 }
    );
  }
}
