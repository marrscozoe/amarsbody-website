"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Appointment {
  id: string;
  clientId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface BlockedTime {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isRecurring?: boolean;
  daysOfWeek?: number[] | null;
  endDate?: string | null;
  type?: string; // 'block'
}

interface CalendarConsultSettings {
  duration: 30 | 60;
  openDays: number[];
  openHours: { start: number; end: number };
  ctaText: string;
  noTimeAvailable?: boolean;
  bookAheadEndDate?: string | null;
  offerLine?: string;
  confirmTitle?: string;
  waiverText?: string;
  successTitle?: string;
  successBody?: string;
  closedEmptyMessage?: string;
}

const DEFAULT_SETTINGS: CalendarConsultSettings = {
  duration: 30,
  openDays: [1, 2, 3, 4, 5],
  openHours: { start: 9, end: 20 },
  ctaText: "Book a Free Consultation",
  noTimeAvailable: false,
  bookAheadEndDate: null,
  offerLine: "Free Consultation",
  confirmTitle: "Confirm Your Consultation",
  waiverText: "I acknowledge this is a free consultation and no services are rendered. I release AMarsBody from liability for any matters discussed.",
  successTitle: "You're Booked!",
  successBody: "We'll send a confirmation to {{email}}",
  closedEmptyMessage: "No consultations available right now.",
};

// Generate time slots filtered by duration + admin open hours
const generateTimeSlots = (duration: number, openHours: { start: number; end: number }) => {
  const slots: string[] = [];
  const { start, end } = openHours;
  for (let hour = start; hour < end; hour++) {
    if (duration === 60) {
      // 60-min: :00 only
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
    } else {
      // 30-min: :00 and :30
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
  }
  return slots;
};

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  return `${h > 12 ? h - 12 : h}:${minutes} ${h >= 12 ? "PM" : "AM"}`;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

type Step = "info" | "form" | "date" | "time" | "confirm" | "done";

export default function ConsultPage() {
  const router = useRouter();

  // Step flow: info → form → date → time → confirm → done
  const [step, setStep] = useState<Step>("info");

  // Consult settings (from admin)
  const [settings, setSettings] = useState<CalendarConsultSettings>(DEFAULT_SETTINGS);

  // Contact info
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });

  // Waiver checkbox
  const [waiverChecked, setWaiverChecked] = useState(false);

  // Calendar data
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  // Error/success
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Confirmation data
  const [bookingRef, setBookingRef] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [aptRes, blockedRes, settingsRes] = await Promise.all([
        fetch("/api/calendar/appointments"),
        fetch("/api/calendar/blocked"),
        fetch("/api/calendar/consult-settings")
      ]);
      setAppointments(await aptRes.json());
      setBlockedTimes(await blockedRes.json());
      const settingsData = await settingsRes.json();
      setSettings({
        duration: settingsData.duration || DEFAULT_SETTINGS.duration,
        openDays: settingsData.openDays || DEFAULT_SETTINGS.openDays,
        openHours: settingsData.openHours || DEFAULT_SETTINGS.openHours,
        ctaText: settingsData.ctaText || DEFAULT_SETTINGS.ctaText,
        noTimeAvailable: settingsData.noTimeAvailable ?? false,
        bookAheadEndDate: settingsData.bookAheadEndDate ?? null,
        offerLine: settingsData.offerLine || DEFAULT_SETTINGS.offerLine!,
        confirmTitle: settingsData.confirmTitle || DEFAULT_SETTINGS.confirmTitle!,
        waiverText: settingsData.waiverText || DEFAULT_SETTINGS.waiverText!,
        successTitle: settingsData.successTitle || DEFAULT_SETTINGS.successTitle!,
        successBody: settingsData.successBody || DEFAULT_SETTINGS.successBody!,
        closedEmptyMessage: settingsData.closedEmptyMessage || DEFAULT_SETTINGS.closedEmptyMessage!,
      });
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getBlockedForDate = (dateStr: string): BlockedTime[] => {
    const date = new Date(dateStr + "T00:00:00");
    const dayOfWeek = date.getDay();

    return blockedTimes.filter(blk => {
      if (blk.date === dateStr) return true;
      if (blk.isRecurring && blk.daysOfWeek && blk.daysOfWeek.length > 0) {
        if (!blk.daysOfWeek.includes(dayOfWeek)) return false;
        if (blk.endDate && dateStr > blk.endDate) return false;
        return true;
      }
      return false;
    });
  };

  const isSlotBlocked = (dateStr: string, time: string): boolean => {
    const blocked = getBlockedForDate(dateStr);
    const mins = timeToMinutes(time);
    return blocked.some(blk => {
      const startMins = timeToMinutes(blk.startTime);
      const endMins = timeToMinutes(blk.endTime);
      // Guard against malformed blocked time ranges
      if (isNaN(startMins) || isNaN(endMins)) return false;
      // Back-to-back: slot at blk.endTime is free
      return mins >= startMins && mins < endMins;
    });
  };

  const isSlotBooked = (dateStr: string, time: string): boolean => {
    const dayAppts = appointments.filter(apt => apt.date === dateStr && apt.status !== "cancelled");
    const mins = timeToMinutes(time);
    return dayAppts.some(apt => {
      const startMins = timeToMinutes(apt.startTime);
      const endMins = timeToMinutes(apt.endTime);
      // Guard against malformed endTime (NaN) in stored data
      if (isNaN(startMins) || isNaN(endMins)) return false;
      // Back-to-back: slot at apt.endTime is free (interval is [start, end))
      return mins >= startMins && mins < endMins;
    });
  };

  // Get available time slots for a given date, filtered by openDays/openHours + blocked/booked slots + book-ahead end date.
  const getAvailableSlots = (dateStr: string): string[] => {
    const allSlots = generateTimeSlots(settings.duration, settings.openHours);
    const mins24hFromNow = (() => {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).getTime();
    })();
    return allSlots.filter(time => {
      if (isSlotBlocked(dateStr, time)) return false;
      if (isSlotBooked(dateStr, time)) return false;
      // 24h lead time
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hour, minute] = time.split(':').map(Number);
      const requestedMs = new Date(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00-05:00`).getTime();
      if (requestedMs < mins24hFromNow) return false;
      // Book-ahead end date filter
      if (settings.bookAheadEndDate && dateStr > settings.bookAheadEndDate) return false;
      return true;
    });
  };

  // Get dates that have at least one available slot (next 8 weeks, filtered by openDays)
  const getAvailableDates = (): Date[] => {
    // No slots when admin marked consult as closed
    if (settings.noTimeAvailable) return [];

    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start from tomorrow
    const start = new Date(today);
    start.setDate(start.getDate() + 1);

    // Go up to 8 weeks out
    const end = new Date(today);
    end.setDate(end.getDate() + 56);

    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      // Only show dates that are admin-open days
      if (!settings.openDays.includes(dayOfWeek)) {
        current.setDate(current.getDate() + 1);
        continue;
      }
      const dateStr = formatDateKey(current);
      const slots = getAvailableSlots(dateStr);
      if (slots.length > 0) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  // Group available dates by month for display
  const getMonthGroups = (): { month: string; dates: Date[] }[] => {
    const dates = getAvailableDates();
    const groups: { [key: string]: Date[] } = {};

    dates.forEach(date => {
      const key = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      if (!groups[key]) groups[key] = [];
      groups[key].push(date);
    });

    return Object.entries(groups).map(([month, dates]) => ({ month, dates }));
  };

  const handleSubmitForm = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }
    setError("");
    setStep("date");
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(formatDateKey(date));
    setSelectedTime("");
    setStep("time");
  };

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
    setStep("confirm");
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setError("");

    try {
      // Calculate end time
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const endMinutes = hours * 60 + minutes + settings.duration;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;

      // Create a temporary "client" record for the consult
      const consultClientId = `consult_${Date.now()}`;

      const res = await fetch("/api/calendar/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-consult",
          clientId: consultClientId,
          clientName: `${form.firstName} ${form.lastName}`,
          clientEmail: form.email,
          clientPhone: form.phone,
          date: selectedDate,
          startTime: selectedTime,
          endTime,
          duration: settings.duration,
          waiverAck: waiverChecked
        })
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to book. Please try again.");
        setSubmitting(false);
        return;
      }

      const data = await res.json();
      setBookingRef(data.id || `CONSULT-${Date.now()}`);
      setStep("done");
    } catch (err) {
      setError("Failed to book. Please try again.");
      setSubmitting(false);
    }
  };

  const monthGroups = getMonthGroups();
  const availableSlots = selectedDate ? getAvailableSlots(selectedDate) : [];
  const timeSlots30 = generateTimeSlots(30, settings.openHours);
  const timeSlots60 = generateTimeSlots(60, settings.openHours);
  const slotsForDuration = settings.duration === 60 ? timeSlots60 : timeSlots30;

  // Info screen
  if (step === "info") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8 pt-8">
            <h1 className="text-3xl font-bold text-orange-500 mb-2">AMarsBody</h1>
            <p className="text-gray-400">{settings.offerLine || DEFAULT_SETTINGS.offerLine}</p>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold text-center mb-4">What to Expect</h2>

            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="text-orange-500 text-xl">📅</span>
                <div>
                  <p className="font-medium">Pick a time that works for you</p>
                  <p className="text-sm text-gray-400">
                    {settings.duration}-minute consultation available on{" "}
                    {settings.openDays.map(d => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ")}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-orange-500 text-xl">💬</span>
                <div>
                  <p className="font-medium">{settings.offerLine || DEFAULT_SETTINGS.offerLine}</p>
                  <p className="text-sm text-gray-400">Discuss your goals and see if we're a good fit</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-orange-500 text-xl">🔒</span>
                <div>
                  <p className="font-medium">No commitment</p>
                  <p className="text-sm text-gray-400">No credit card, no pressure — just a conversation</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep("form")}
              className="w-full mt-4 py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors text-lg"
            >
              {settings.ctaText}
            </button>

            <button
              onClick={() => router.push("/calendar")}
              className="w-full py-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Contact form — NO duration toggle (admin controls duration)
  if (step === "form") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6 pt-4">
            <h1 className="text-2xl font-bold text-orange-500 mb-1">{settings.ctaText}</h1>
            <p className="text-gray-400 text-sm">Step 1 of 3 — Your info</p>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">First Name *</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={e => setForm({ ...form, firstName: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  placeholder="First"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Last Name *</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={e => setForm({ ...form, lastName: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  placeholder="Last"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                placeholder="you@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Duration shown as info only — customer cannot change */}
            <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3">
              <p className="text-sm text-gray-400">Consultation Length</p>
              <p className="text-white font-medium">{settings.duration} minutes</p>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              onClick={handleSubmitForm}
              className="w-full mt-2 py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
            >
              Continue →
            </button>

            <button
              onClick={() => setStep("info")}
              className="w-full py-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Date picker — only shows admin-open days
  if (step === "date") {
    if (loading) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
          <p className="text-orange-500">Loading availability...</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-6 pt-4">
            <h1 className="text-2xl font-bold text-orange-500 mb-1">{settings.ctaText}</h1>
            <p className="text-gray-400 text-sm">Step 2 of 3 — Pick a date</p>
          </div>

          <div className="mb-4">
            <span className="text-gray-400 text-sm">
              {settings.duration}-minute consultation for{" "}
              <span className="text-white">{form.firstName}</span>
              {" — "}
              Available{" "}
              {settings.openDays.map(d => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ")}
            </span>
          </div>

          <div className="bg-gray-900 rounded-xl p-4 space-y-6">
            {settings.noTimeAvailable ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">{settings.closedEmptyMessage || DEFAULT_SETTINGS.closedEmptyMessage}</p>
                <p className="text-gray-500 text-sm mt-2">Check back soon.</p>
              </div>
            ) : monthGroups.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No available slots in the next 8 weeks.</p>
                <p className="text-gray-500 text-sm mt-2">Check back soon or contact us directly.</p>
              </div>
            ) : (
              monthGroups.map(({ month, dates }) => (
                <div key={month}>
                  <h3 className="text-gray-400 text-sm font-medium mb-3">{month}</h3>
                  <div className="grid grid-cols-7 gap-1">
                    {dates.map(date => {
                      const dateStr = formatDateKey(date);
                      const slots = getAvailableSlots(dateStr);
                      const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
                      return (
                        <button
                          key={dateStr}
                          onClick={() => handleSelectDate(date)}
                          className="flex flex-col items-center p-2 rounded-lg bg-gray-800 hover:bg-orange-500 transition-colors"
                        >
                          <span className="text-xs text-gray-400">{dayNames[date.getDay()]}</span>
                          <span className="text-lg font-bold">{date.getDate()}</span>
                          <span className="text-xs text-gray-500">{slots.length} open</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => setStep("form")}
            className="w-full mt-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // Time picker — uses admin-configured duration for slot generation
  if (step === "time") {
    const dateObj = new Date(selectedDate + "T12:00:00");
    const dateLabel = dateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

    // Show filtered slots based on admin-configured duration
    const available = getAvailableSlots(selectedDate);
    const availableSet = new Set(available);

    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6 pt-4">
            <h1 className="text-2xl font-bold text-orange-500 mb-1">{dateLabel}</h1>
            <p className="text-gray-400 text-sm">Step 3 of 3 — Select a time</p>
          </div>

          {settings.duration === 60 && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-4 text-sm text-center">
              60-minute sessions are available at :00 only (e.g., 9:00, 10:00)
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {available.map(time => (
              <button
                key={time}
                onClick={() => handleSelectTime(time)}
                className="py-3 rounded-lg font-medium bg-gray-800 hover:bg-orange-500 text-white transition-colors"
              >
                {formatTime(time)}
              </button>
            ))}
          </div>

          {available.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400">No available times on this date.</p>
              <button
                onClick={() => setStep("date")}
                className="mt-3 text-orange-500 hover:text-orange-400"
              >
                Choose another date →
              </button>
            </div>
          )}

          <button
            onClick={() => setStep("date")}
            className="w-full mt-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // Confirmation
  if (step === "confirm") {
    const dateObj = new Date(selectedDate + "T12:00:00");

    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6 pt-4">
            <div className="text-5xl mb-3">📅</div>
            <h1 className="text-2xl font-bold text-white mb-1">{settings.confirmTitle || DEFAULT_SETTINGS.confirmTitle}</h1>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 space-y-4">
            <div className="space-y-3 text-center">
              <div>
                <p className="text-gray-400 text-sm">Name</p>
                <p className="text-lg font-semibold">{form.firstName} {form.lastName}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Date</p>
                <p className="text-lg font-semibold">{formatDate(selectedDate)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Time</p>
                <p className="text-lg font-semibold">{formatTime(selectedTime)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Duration</p>
                <p className="text-lg font-semibold">{settings.duration} minutes</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Contact</p>
                <p className="text-sm">{form.email}</p>
                {form.phone && <p className="text-sm text-gray-500">{form.phone}</p>}
              </div>
            </div>

            {/* Waiver checkbox */}
            <label className="flex items-start gap-3 p-3 bg-gray-800/60 border border-gray-700 rounded-xl cursor-pointer hover:border-gray-600 transition-colors">
              <input
                type="checkbox"
                checked={waiverChecked}
                onChange={(e) => setWaiverChecked(e.target.checked)}
                className="w-5 h-5 mt-0.5 accent-orange-500 shrink-0"
              />
              <span className="text-sm text-gray-300 leading-relaxed">
                {settings.waiverText || DEFAULT_SETTINGS.waiverText}
              </span>
            </label>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              onClick={handleConfirm}
              disabled={submitting || !waiverChecked}
              className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {submitting ? "Booking..." : "Confirm Booking"}
            </button>

            <button
              onClick={() => setStep("time")}
              disabled={submitting}
              className="w-full py-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Done
  if (step === "done") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-4">
        <div className="max-w-md mx-auto text-center">
          <div className="pt-16 mb-6">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-3xl font-bold text-white mb-2">{settings.successTitle || DEFAULT_SETTINGS.successTitle}</h1>
            <p className="text-gray-400">{(settings.successBody || DEFAULT_SETTINGS.successBody || "We'll send a confirmation").replace("{{email}}", form.email)}</p>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 text-left space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Date</span>
              <span className="font-medium">{formatDate(selectedDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Time</span>
              <span className="font-medium">{formatTime(selectedTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Duration</span>
              <span className="font-medium">{settings.duration} minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Reference</span>
              <span className="font-mono text-sm text-orange-500">{bookingRef.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => {
                const params = new URLSearchParams({
                  firstName: form.firstName,
                  lastName: form.lastName,
                  email: form.email,
                  phone: form.phone || '',
                  date: selectedDate,
                });
                router.push(`/consult-waiver?${params.toString()}`);
              }}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors"
            >
              Next: Sign Waiver →
            </button>
            <button
              onClick={() => router.push("https://amarsbody.com")}
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
