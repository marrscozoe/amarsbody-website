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

// Format a Date as YYYY-MM-DD in Chicago local time
function chicagoDateStr(date: Date): string {
  // Use en-CA locale which is YYYY-MM-DD and respects local timezone
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
}

// Validate proposed consult settings don't overlap with existing appointments or blocked times.
// Returns { valid: true } (has ≥1 free slot) or { valid: false, hasAnyFreeSlot: false, conflicts: [...] }
// Only returns hasAnyFreeSlot=false (409-eligible) when ZERO free slots exist across ALL open days.
async function validateConsultSettings(
  settings: CalendarConsultSettings
): Promise<{
  valid: boolean;
  hasAnyFreeSlot: boolean;
  conflicts?: Array<{ dayLabel: string; time: string; label: string; fullyBlocked?: boolean }>;
}> {
  const appointments = await getAppointmentsFromRedis();
  const blocked = await getBlockedFromRedis();

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const conflicts: Array<{ dayLabel: string; time: string; label: string; fullyBlocked?: boolean }> = [];

  // Track free slots per day
  const freeSlotsPerDay: Record<number, number> = {};
  for (const dayOfWeek of settings.openDays) {
    freeSlotsPerDay[dayOfWeek] = 0;
  }

  // Sample a representative future date for each open day of the week
  // (we only need one date per day-of-week to check recurring patterns)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const dayOfWeek of settings.openDays) {
    // Find the next date with this dayOfWeek in Chicago local time
    const sampleDate = new Date(today);
    const daysUntil = (dayOfWeek - today.getDay() + 7) % 7;
    sampleDate.setDate(today.getDate() + (daysUntil === 0 ? 7 : daysUntil));
    const dateStr = chicagoDateStr(sampleDate);

    // Generate all possible start times for this day (end exclusive)
    const { start, end } = settings.openHours;
    const slots: string[] = [];
    if (settings.duration === 60) {
      // 60-min: one slot per hour
      for (let hour = start; hour < end; hour++) {
        slots.push(`${hour.toString().padStart(2, "0")}:00`);
      }
    } else {
      // 30-min: two slots per hour
      for (let hour = start; hour < end; hour++) {
        slots.push(`${hour.toString().padStart(2, "0")}:00`);
        slots.push(`${hour.toString().padStart(2, "0")}:30`);
      }
    }

    for (const startTime of slots) {
      const startMins = timeToMinutes(startTime);
      const endMins = startMins + settings.duration;

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
        continue;
      }

      // Slot is free
      freeSlotsPerDay[dayOfWeek]++;
    }
  }

  const hasAnyFreeSlot = Object.values(freeSlotsPerDay).some(count => count > 0);

  // Mark days with zero free slots in conflicts for UX feedback
  const fullyBlockedDays = settings.openDays.filter(d => freeSlotsPerDay[d] === 0);
  for (const dayOfWeek of fullyBlockedDays) {
    // Add a summary conflict for this fully-blocked day
    conflicts.push({
      dayLabel: dayLabels[dayOfWeek],
      time: "all",
      label: "No free slots on this day",
      fullyBlocked: true,
    });
  }

  return {
    valid: hasAnyFreeSlot,
    hasAnyFreeSlot,
    conflicts: conflicts.length > 0 ? conflicts : undefined,
  };
}

const SETTINGS_KEY = "calendar_consult_settings";

export interface CalendarConsultSettings {
  duration: 30 | 60;
  openDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  openHours: { start: number; end: number };
  ctaText: string;
  noTimeAvailable?: boolean; // closed — customers see no slots
  bookAheadEndDate?: string | null; // YYYY-MM-DD in Chicago, null = no limit
  noEndDate?: boolean; // true = no end date cap
  // Customer wording fields
  offerLine?: string;
  confirmTitle?: string;
  waiverText?: string;
  successTitle?: string;
  successBody?: string;
  closedEmptyMessage?: string;
  line1Title?: string;
  line1Subtitle?: string;
  line3Title?: string;
  line3Subtitle?: string;
}

const DEFAULTS: CalendarConsultSettings = {
  duration: 30,
  openDays: [1, 2, 3, 4, 5],
  openHours: { start: 9, end: 20 },
  ctaText: "Book a Free Consultation",
  noTimeAvailable: false,
  bookAheadEndDate: null,
  noEndDate: false,
  offerLine: "Free Consultation",
  confirmTitle: "Confirm Your Consultation",
  waiverText: "I acknowledge this is a free consultation and no services are rendered. I release AMarsBody from liability for any matters discussed.",
  successTitle: "You're Booked!",
  successBody: "We'll send a confirmation to {{email}}",
  closedEmptyMessage: "No consultations available right now.",
  line1Title: "Pick a time that works for you",
  line1Subtitle: "30-minute consultation available on Mon, Wed, Fri",
  line3Title: "No commitment",
  line3Subtitle: "No credit card, no pressure — just a conversation",
};

export async function GET() {
  try {
    const settings = await kv.get<CalendarConsultSettings>(SETTINGS_KEY);
    return NextResponse.json({
      ...DEFAULTS,
      ...(settings ?? {}),
    });
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
      // When noTimeAvailable is true, skip free-slot validation entirely — closed state is always valid
      if (body.noTimeAvailable) {
        return NextResponse.json({ valid: true, hasAnyFreeSlot: false });
      }
      const settings: CalendarConsultSettings = {
        duration: body.duration === 60 ? 60 : 30,
        openDays: Array.isArray(body.openDays) ? body.openDays.filter((d: any) => d >= 0 && d <= 6) : DEFAULTS.openDays,
        openHours: {
          start: typeof body.openHours?.start === "number" ? Math.max(0, Math.min(23, body.openHours.start)) : DEFAULTS.openHours.start,
          end: typeof body.openHours?.end === "number" ? Math.max(0, Math.min(23, body.openHours.end)) : DEFAULTS.openHours.end,
        },
        ctaText: typeof body.ctaText === "string" && body.ctaText.trim() ? body.ctaText.trim() : DEFAULTS.ctaText,
        noTimeAvailable: !!body.noTimeAvailable,
        bookAheadEndDate: body.bookAheadEndDate === null ? null : (typeof body.bookAheadEndDate === "string" ? body.bookAheadEndDate : DEFAULTS.bookAheadEndDate),
        noEndDate: !!body.noEndDate,
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
      noTimeAvailable: !!body.noTimeAvailable,
      bookAheadEndDate: body.bookAheadEndDate === null ? null : (typeof body.bookAheadEndDate === "string" ? body.bookAheadEndDate : DEFAULTS.bookAheadEndDate),
      noEndDate: !!body.noEndDate,
      offerLine: typeof body.offerLine === "string" ? body.offerLine.trim() : DEFAULTS.offerLine!,
      confirmTitle: typeof body.confirmTitle === "string" ? body.confirmTitle.trim() : DEFAULTS.confirmTitle!,
      waiverText: typeof body.waiverText === "string" ? body.waiverText.trim() : DEFAULTS.waiverText!,
      successTitle: typeof body.successTitle === "string" ? body.successTitle.trim() : DEFAULTS.successTitle!,
      successBody: typeof body.successBody === "string" ? body.successBody.trim() : DEFAULTS.successBody!,
      closedEmptyMessage: typeof body.closedEmptyMessage === "string" ? body.closedEmptyMessage.trim() : DEFAULTS.closedEmptyMessage!,
      line1Title: typeof body.line1Title === "string" ? body.line1Title.trim() : DEFAULTS.line1Title!,
      line1Subtitle: typeof body.line1Subtitle === "string" ? body.line1Subtitle.trim() : DEFAULTS.line1Subtitle!,
      line3Title: typeof body.line3Title === "string" ? body.line3Title.trim() : DEFAULTS.line3Title!,
      line3Subtitle: typeof body.line3Subtitle === "string" ? body.line3Subtitle.trim() : DEFAULTS.line3Subtitle!,
    };

    // Validate before saving — skip free-slot check when noTimeAvailable is true (allows zero slots)
    if (!settings.noTimeAvailable) {
      const validation = await validateConsultSettings(settings);
      if (!validation.hasAnyFreeSlot) {
        return NextResponse.json(
          {
            error: "No free consult slots available in the selected window. Choose different days or hours.",
            conflicts: validation.conflicts,
            hasAnyFreeSlot: false,
          },
          { status: 409 }
        );
      }
    }

    await kv.set(SETTINGS_KEY, settings);
    return NextResponse.json(settings);
  } catch (e) {
    console.error("Error saving consult settings:", e);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
