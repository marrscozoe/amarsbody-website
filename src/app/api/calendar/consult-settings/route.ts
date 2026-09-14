import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const SETTINGS_KEY = "calendar_consult_settings";

export interface CalendarConsultSettings {
  duration: 30 | 60;
  openDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  openHours: { start: number; end: number };
  ctaText: string;
}

const DEFAULTS: CalendarConsultSettings = {
  duration: 30,
  openDays: [1, 2, 3, 4, 5],
  openHours: { start: 9, end: 20 },
  ctaText: "Book a Free Consultation",
};

export async function GET() {
  try {
    const settings = await kv.get<CalendarConsultSettings>(SETTINGS_KEY);
    return NextResponse.json(settings ?? DEFAULTS);
  } catch (e) {
    console.error("Error reading consult settings:", e);
    return NextResponse.json(DEFAULTS);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const settings: CalendarConsultSettings = {
      duration: body.duration === 60 ? 60 : 30,
      openDays: Array.isArray(body.openDays) ? body.openDays.filter((d: any) => d >= 0 && d <= 6) : DEFAULTS.openDays,
      openHours: {
        start: typeof body.openHours?.start === "number" ? Math.max(0, Math.min(23, body.openHours.start)) : DEFAULTS.openHours.start,
        end: typeof body.openHours?.end === "number" ? Math.max(0, Math.min(23, body.openHours.end)) : DEFAULTS.openHours.end,
      },
      ctaText: typeof body.ctaText === "string" && body.ctaText.trim() ? body.ctaText.trim() : DEFAULTS.ctaText,
    };
    await kv.set(SETTINGS_KEY, settings);
    return NextResponse.json(settings);
  } catch (e) {
    console.error("Error saving consult settings:", e);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
