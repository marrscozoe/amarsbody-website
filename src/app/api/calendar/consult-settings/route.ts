import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const APPOINTMENTS_KEY = "calendar_appointments";
const BLOCKED_KEY = "calendar_blocked_times";

async function getAppointmentsFromRedis(): Promise<any[]> {
  try {
    const appointments = await kv.get<any[]>(APPOINTMENTS_KEY);
    return appointments || [];
  } catch (e) {
    console.error("Error reading appointments:", e);
    return [];
  }
}

async function getBlockedFromRedis(): Promise<any[]> {
  try {
    const blocked = await kv.get<any[]>(BLOCKED_KEY);
    return blocked || [];
  } catch (e) {
    console.error("Error reading blocked times:", e);
    return [];
  }
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(mins: number): string {
  return `${Math.floor(mins / 60).toString().padStart(2, "0")}:${(mins % 60).toString().padStart(2, "0")}`;
}

// Validate proposed consult settings don't overlap with existing appointments or blocked times.
// Returns { valid: true } or { valid: false, conflicts: [{ date, time, label }] }
async function validateConsultSettings(
  settings: CalendarConsultSettings
): Promise<{ valid: boolean; conflicts?: Array<{ dayLabel: string; time: string; label: string }> }> {
  const appointments = await getAppointmentsFromRedis();
  const blocked = await getBlockedFromRedis();

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const conflicts: Array<{ dayLabel: string; time: string; label: string }> = [];

  // Sample a representative future date for each open day of the week
  // (we only need one date per day-of-week to check recurring patterns)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const dayOfWeek of settings.openDays) {
    // Find the next date with this dayOfWeek
    const sampleDate = new Date(today);
    const daysUntil = (dayOfWeek - today.getDay() + 7) % 7;
    sampleDate.setDate(today.getDate() + (daysUntil === 0 ? 7 : daysUntil));
    const dateStr = sampleDate.toISOString().split("T")[0];

    // Generate all possible start times for this day
    const { start, end } = settings.openHours;
    const slots: string[] = [];
    for (let hour = start; hour <= end; hour++) {
      if (settings.duration === 60) {
        slots.push(`${hour.toString().padStart(2, "0")}:00`);
      } else {
        slots.push(`${hour.toString().padStart(2, "0")}:00`);
        slots.push(`${hour.toString().padStart(2, "0")}:30`);
      }
    }

    for (const startTime of slots) {
      const startMins = timeToMinutes(startTime);
      const endMins = startMins + settings.duration;
      const endTime = minutesToTime(endMins);

      // Check for conflicting appointment (any non-cancelled)
      const conflictingApt = appointments.find((apt: any) => {
        if (apt.status === "cancelled") return false;
        if (apt.date !== dateStr) return false;
        const aptStart = timeToMinutes(apt.startTime);
        const aptEnd = timeToMinutes(apt.endTime || apt.startTime);
        // Overlap: [startMins, endMins) ∩ [aptStart, aptEnd) ≠ ∅
        return startMins < aptEnd && endMins > aptStart;
      });

      if (conflictingApt) {
        conflicts.push({
          dayLabel: dayLabels[dayOfWeek],
          time: startTime,
          label: conflictingApt.label || conflictingApt.clientName || conflictingApt.clientEmail || "Existing appointment",
        });
        continue; // no need to also check blocked times for this slot
      }

      // Check for conflicting blocked time
      const conflictingBlock = blocked.find((blk: any) => {
        // Single-date block on same date
        if (blk.date === dateStr) {
          const blkStart = timeToMinutes(blk.startTime);
          const blkEnd = timeToMinutes(blk.endTime);
          return startMins < blkEnd && endMins > blkStart;
        }
        // Recurring block matching this day of week
        if (blk.isRecurring && blk.daysOfWeek && blk.daysOfWeek.includes(dayOfWeek)) {
          if (blk.endDate && dateStr > blk.endDate) return false;
          const blkStart = timeToMinutes(blk.startTime);
          const blkEnd = timeToMinutes(blk.endTime);
          return startMins < blkEnd && endMins > blkStart;
        }
        return false;
      });

      if (conflictingBlock) {
        conflicts.push({
          dayLabel: dayLabels[dayOfWeek],
          time: startTime,
          label: "Blocked time",
        });
      }
    }
  }

  return conflicts.length > 0 ? { valid: false, conflicts } : { valid: true };
}

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

    // validateOnly=true skips the save and only returns conflict info
    if (body.validateOnly) {
      const settings: CalendarConsultSettings = {
        duration: body.duration === 60 ? 60 : 30,
        openDays: Array.isArray(body.openDays) ? body.openDays.filter((d: any) => d >= 0 && d <= 6) : DEFAULTS.openDays,
        openHours: {
          start: typeof body.openHours?.start === "number" ? Math.max(0, Math.min(23, body.openHours.start)) : DEFAULTS.openHours.start,
          end: typeof body.openHours?.end === "number" ? Math.max(0, Math.min(23, body.openHours.end)) : DEFAULTS.openHours.end,
        },
        ctaText: typeof body.ctaText === "string" && body.ctaText.trim() ? body.ctaText.trim() : DEFAULTS.ctaText,
      };
      const result = await validateConsultSettings(settings);
      return NextResponse.json(result);
    }

    const settings: CalendarConsultSettings = {
      duration: body.duration === 60 ? 60 : 30,
      openDays: Array.isArray(body.openDays) ? body.openDays.filter((d: any) => d >= 0 && d <= 6) : DEFAULTS.openDays,
      openHours: {
        start: typeof body.openHours?.start === "number" ? Math.max(0, Math.min(23, body.openHours.start)) : DEFAULTS.openHours.start,
        end: typeof body.openHours?.end === "number" ? Math.max(0, Math.min(23, body.openHours.end)) : DEFAULTS.openHours.end,
      },
      ctaText: typeof body.ctaText === "string" && body.ctaText.trim() ? body.ctaText.trim() : DEFAULTS.ctaText,
    };

    // Validate before saving — reject if any slot in the window conflicts
    const validation = await validateConsultSettings(settings);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "Consult window conflicts with existing appointments or blocked times",
          conflicts: validation.conflicts,
        },
        { status: 409 }
      );
    }

    await kv.set(SETTINGS_KEY, settings);
    return NextResponse.json(settings);
  } catch (e) {
    console.error("Error saving consult settings:", e);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
