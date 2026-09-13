"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  unusedCredits?: number;
}

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
}

// Helpers
const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const formatTime = (time: string): string => {
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return time || "--:--";
  return `${h > 12 ? h - 12 : h}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
};

const formatDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
};

// 60-min: :00 only. 30-min: :00 or :30
const generateTimeSlots = (duration: number, startHour = 5, endHour = 20): string[] => {
  const slots: string[] = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    if (duration === 60) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
    } else {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
  }
  return slots;
};

type Step = "date" | "time" | "confirm" | "reschedule" | "done";
type ViewMode = "pick" | "appointments";

export default function BookPage() {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [clientAppointments, setClientAppointments] = useState<Appointment[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("pick");
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // Booking flow state
  const [step, setStep] = useState<Step>("date");
  const [duration, setDuration] = useState<number>(60);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  // In reschedule: has user picked a NEW date yet (vs. the pre-filled old date)?
  const [newDatePicked, setNewDatePicked] = useState(false);
  const [rescheduleApt, setRescheduleApt] = useState<Appointment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bookingRef, setBookingRef] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("calendarClient");
    if (!stored) { router.push("/calendar"); return; }
    const clientData = JSON.parse(stored);
    setClient(clientData);
    loadData(clientData.id);
  }, []);

  const loadData = async (clientId: string) => {
    setLoading(true);
    try {
      const [allAptRes, clientAptRes, blockedRes] = await Promise.all([
        fetch("/api/calendar/appointments"),
        fetch(`/api/calendar/appointments?clientId=${clientId}`),
        fetch("/api/calendar/blocked")
      ]);
      setAllAppointments(await allAptRes.json());
      setClientAppointments((await clientAptRes.json()).filter((a: Appointment) => a.status !== "cancelled"));
      setBlockedTimes(await blockedRes.json());
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Availability helpers ────────────────────────────────────────────────

  const getBlockedForDate = (dateStr: string): BlockedTime[] => {
    const d = new Date(dateStr + "T00:00:00");
    const dow = d.getDay();
    return blockedTimes.filter(blk => {
      if (blk.date === dateStr) return true;
      if (blk.isRecurring && blk.daysOfWeek?.length) {
        if (!blk.daysOfWeek.includes(dow)) return false;
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
      const s = timeToMinutes(blk.startTime);
      const e = timeToMinutes(blk.endTime);
      return mins >= s && mins < e;
    });
  };

  const isSlotTaken = (dateStr: string, time: string, excludeId?: string): boolean => {
    const mins = timeToMinutes(time);
    return allAppointments.some(apt => {
      if (apt.status === "cancelled") return false;
      if (excludeId && apt.id === excludeId) return false;
      if (apt.date !== dateStr) return false;
      const s = timeToMinutes(apt.startTime);
      const e = timeToMinutes(apt.endTime);
      return mins >= s && mins < e;
    });
  };

  // Does this client already have an active appointment on this date?
  const clientHasAppointmentOnDate = (dateStr: string, excludeId?: string): boolean => {
    return clientAppointments.some(apt => {
      if (excludeId && apt.id === excludeId) return false;
      return apt.date === dateStr && apt.status !== "cancelled";
    });
  };

  // Available time slots for a date (filtered by duration rule + availability)
  const getAvailableSlots = (dateStr: string, excludeId?: string): string[] => {
    const slots = generateTimeSlots(duration);
    return slots.filter(t => !isSlotBlocked(dateStr, t) && !isSlotTaken(dateStr, t, excludeId));
  };

  // Dates with at least one open slot, excluding client's booked days (for new bookings)
  const getBookableDates = (): Date[] => {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today); start.setDate(start.getDate() + 1);
    const end = new Date(today); end.setDate(end.getDate() + 56);
    const cur = new Date(start);
    while (cur <= end) {
      const ds = formatDateKey(cur);
      // For new bookings: exclude days where client already has an apt
      const slots = getAvailableSlots(ds);
      if (slots.length > 0 && !clientHasAppointmentOnDate(ds)) {
        dates.push(new Date(cur));
      }
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  // Month groups for date picker
  const getMonthGroups = (): { month: string; dates: Date[] }[] => {
    const dates = getBookableDates();
    const groups: { [k: string]: Date[] } = {};
    dates.forEach(d => {
      const key = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    });
    return Object.entries(groups).map(([month, dates]) => ({ month, dates }));
  };

  // ── Booking actions ────────────────────────────────────────────────────

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
    if (!client || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    setMessage("");

    const [h, m] = selectedTime.split(":").map(Number);
    const endMins = h * 60 + m + duration;
    const endTime = `${Math.floor(endMins / 60).toString().padStart(2, "0")}:${(endMins % 60).toString().padStart(2, "0")}`;

    try {
      let res: Response;
      if (rescheduleApt) {
        res = await fetch("/api/calendar/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reschedule",
            id: rescheduleApt.id,
            clientId: client.id,
            date: selectedDate,
            startTime: selectedTime,
            endTime
          })
        });
      } else {
        res = await fetch("/api/calendar/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            clientId: client.id,
            date: selectedDate,
            startTime: selectedTime,
            endTime
          })
        });
      }

      if (res.ok) {
        const data = await res.json();
        setBookingRef(data.id || `APT-${Date.now()}`);
        setStep("done");
        // Update client credits from response and persist to localStorage
        if (data.unusedCredits !== undefined) {
          const updated = { ...client, unusedCredits: data.unusedCredits };
          setClient(updated);
          localStorage.setItem("calendarClient", JSON.stringify(updated));
        }
        // Reload so client's appointments list is fresh — non-blocking
        loadData(client.id);
      } else {
        const data = await res.json();
        setMessage(data.error || "Booking failed. Please try again.");
      }
    } catch {
      setMessage("Booking failed. Please try again.");
    } finally {
      // Always unlock the submit button, unless we're on the done step
      setSubmitting(false);
    }
  };

  const handleReschedule = (apt: Appointment) => {
    setRescheduleApt(apt);
    setSelectedDate(apt.date);
    setSelectedTime("");
    setDuration(60); // default; could derive from apt
    setStep("reschedule");
    setNewDatePicked(false); // reset: user hasn't picked new date yet
  };

  const handleCancelAppointment = async (id: string) => {
    if (!confirm("Cancel this appointment?")) return;
    try {
      const res = await fetch("/api/calendar/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", id })
      });
      if (res.ok && client) await loadData(client.id);
    } catch (err) {
      console.error("Failed to cancel:", err);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !newPassword) return;
    try {
      const res = await fetch("/api/calendar/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "changePassword", id: client.id, password: newPassword })
      });
      if (res.ok) {
        setMessage("Password changed!");
        setNewPassword("");
        setShowPasswordChange(false);
      } else {
        setMessage("Failed to change password");
      }
    } catch {
      setMessage("Failed to change password");
    }
  };

  const logout = () => { localStorage.removeItem("calendarClient"); router.push("/calendar"); };

  const monthGroups = getMonthGroups();
  // For reschedule view: available slots on the OLD date (excluding the apt being moved)
  const rescheduleOldDaySlots = rescheduleApt ? getAvailableSlots(rescheduleApt.date, rescheduleApt.id) : [];
  // For reschedule new date view: same but no exclusion
  const rescheduleNewDaySlots = selectedDate ? getAvailableSlots(selectedDate) : [];
  const timeSlots30 = generateTimeSlots(30);
  const timeSlots60 = generateTimeSlots(60);

  // ── Render helpers ────────────────────────────────────────────────────

  if (loading || !client) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <p className="text-orange-500">Loading...</p>
      </div>
    );
  }

  // ── DONE ─────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-4">
        <div className="max-w-md mx-auto text-center">
          <div className="pt-16 mb-6">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {rescheduleApt ? "Rescheduled!" : "You're Booked!"}
            </h1>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 text-left space-y-3">
            <div className="flex justify-between"><span className="text-gray-400">Date</span><span className="font-medium">{formatDate(selectedDate)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Time</span><span className="font-medium">{formatTime(selectedTime)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Duration</span><span className="font-medium">{duration} min</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Ref</span><span className="font-mono text-sm text-orange-500">{bookingRef.slice(0, 8).toUpperCase()}</span></div>
          </div>
          <button onClick={() => { setStep("date"); setRescheduleApt(null); setSelectedDate(""); setSelectedTime(""); setNewDatePicked(false); }} className="w-full mt-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg">Book Another</button>
          <button onClick={() => { setStep("date"); setViewMode("appointments"); }} className="w-full mt-2 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg">My Appointments</button>
          <button onClick={logout} className="w-full mt-2 py-2 text-gray-500 hover:text-white text-sm">Logout</button>
        </div>
      </div>
    );
  }

  // ── RESCHEDULE FLOW ───────────────────────────────────────────────────
  if (step === "reschedule" && rescheduleApt) {
    const oldDateLabel = formatDate(rescheduleApt.date);

    const handleRescheduleDatePick = (date: Date) => {
      setSelectedDate(formatDateKey(date));
      setSelectedTime("");
      setNewDatePicked(true); // now show time picker
    };

    // Step A: choose new date (same logic as getBookableDates but allowing the old date too)
    const getRescheduleDates = (): Date[] => {
      const dates: Date[] = [];
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const start = new Date(today); start.setDate(start.getDate() + 1);
      const end = new Date(today); end.setDate(end.getDate() + 56);
      const cur = new Date(start);
      while (cur <= end) {
        const ds = formatDateKey(cur);
        const slots = getAvailableSlots(ds, rescheduleApt.id);
        // For reschedule: allow old date if it has other apts (they keep it blocked)
        // but also check same-day rule: if client has OTHER apt on old date, can't book new on same day
        if (slots.length > 0 && !clientHasAppointmentOnDate(ds, rescheduleApt.id)) {
          dates.push(new Date(cur));
        }
        cur.setDate(cur.getDate() + 1);
      }
      return dates;
    };

    const rescheduleMonthGroups = ((): { month: string; dates: Date[] }[] => {
      const dates = getRescheduleDates();
      const groups: { [k: string]: Date[] } = {};
      dates.forEach(d => {
        const key = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        if (!groups[key]) groups[key] = [];
        groups[key].push(d);
      });
      return Object.entries(groups).map(([month, dates]) => ({ month, dates }));
    })();

    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6 pt-4">
            <button onClick={() => { setStep("date"); setRescheduleApt(null); setViewMode("appointments"); setNewDatePicked(false); }} className="text-gray-400 hover:text-white">← Back</button>
            <h1 className="text-xl font-bold text-orange-500">Reschedule Appointment</h1>
          </div>

          <div className="bg-gray-900 rounded-xl p-4 mb-4">
            <p className="text-gray-400 text-sm mb-1">Current appointment</p>
            <p className="font-medium">{oldDateLabel} at {formatTime(rescheduleApt.startTime)}</p>
          </div>

          {step === "reschedule" && !newDatePicked ? (
            <>
              <h2 className="text-lg font-semibold mb-3">Pick a new date</h2>
              {rescheduleMonthGroups.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No available dates found.</div>
              ) : (
                rescheduleMonthGroups.map(({ month, dates }) => (
                  <div key={month} className="mb-6">
                    <h3 className="text-gray-400 text-sm mb-2">{month}</h3>
                    <div className="grid grid-cols-7 gap-1">
                      {dates.map(date => {
                        const ds = formatDateKey(date);
                        const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
                        const isSelected = ds === selectedDate;
                        return (
                          <button key={ds} onClick={() => handleRescheduleDatePick(date)}
                            className={`flex flex-col items-center p-2 rounded-lg text-sm transition-colors ${isSelected ? "bg-orange-500 text-white" : "bg-gray-800 hover:bg-gray-700"}`}>
                            <span className="text-xs opacity-60">{dayNames[date.getDay()]}</span>
                            <span className="font-bold">{date.getDate()}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-3">{formatDate(selectedDate)} — pick a time</h2>
              {duration === 60 && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2 mb-3 text-sm text-center text-gray-400">
                  60-min sessions start at :00 only
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                {(duration === 60 ? timeSlots60 : timeSlots30).map(time => {
                  const isAvail = rescheduleNewDaySlots.includes(time);
                  return (
                    <button key={time} onClick={() => isAvail && setSelectedTime(time)}
                      disabled={!isAvail}
                      className={`py-3 rounded-lg font-medium text-sm transition-colors ${isAvail ? "bg-gray-800 hover:bg-orange-500 text-white" : "bg-gray-900 text-gray-600 cursor-not-allowed"}`}>
                      {formatTime(time)}
                      {!isAvail && <span className="block text-xs opacity-50">unavailable</span>}
                    </button>
                  );
                })}
              </div>
              {selectedTime && (
                <div className="mt-4 bg-gray-900 rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-2">New time: <span className="text-white font-medium">{formatTime(selectedTime)}</span></p>
                  <div className="flex gap-3">
                    <button onClick={() => setSelectedTime("")} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Change</button>
                    <button onClick={handleConfirm} disabled={submitting}
                      className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 rounded-lg font-medium">
                      {submitting ? "Saving..." : "Confirm"}
                    </button>
                  </div>
                  {message && <p className="text-red-500 text-sm mt-2">{message}</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── MY APPOINTMENTS VIEW ──────────────────────────────────────────────
  if (viewMode === "appointments") {
    const activeApts = clientAppointments.filter(a => a.status !== "cancelled");
    const pastApts = clientAppointments.filter(a => a.status === "cancelled" || a.status === "completed");
    const upcomingApts = activeApts.filter(a => a.date >= formatDateKey(new Date()));
    const pastActiveApts = activeApts.filter(a => a.date < formatDateKey(new Date()));

    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-4">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-6 pt-4">
            <h1 className="text-2xl font-bold text-orange-500">My Appointments</h1>
            {(client.unusedCredits ?? 0) > 0
              ? <button onClick={() => setViewMode("pick")} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium">+ Book New</button>
              : <span className="text-gray-500 text-sm italic">No sessions left</span>
            }
          </div>

          {message && <div className={`p-3 rounded-lg mb-4 ${message.includes("success") || message.includes("changed") ? "bg-green-900" : "bg-red-900"}`}>{message}</div>}

          {(client.unusedCredits ?? 0) > 0 && (
            <div className="bg-orange-500/20 border border-orange-500/40 rounded-xl p-4 mb-6 text-center">
              <p className="text-orange-400 font-semibold">
                You have {client.unusedCredits} appointment{(client.unusedCredits ?? 0) !== 1 ? 's' : ''} left to schedule
              </p>
            </div>
          )}
          {(client.unusedCredits ?? 0) < 1 && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-6 text-center">
              <p className="text-gray-300 font-medium">
                You have 0 appointments left to schedule. Ask your trainer to add sessions.
              </p>
            </div>
          )}

          <h2 className="text-gray-400 text-sm font-medium mb-3">UPCOMING</h2>
          {upcomingApts.length === 0 ? <p className="text-gray-500 mb-6">No upcoming appointments.</p> : (
            <div className="space-y-3 mb-8">
              {upcomingApts.sort((a, b) => a.date.localeCompare(b.date)).map(apt => (
                <div key={apt.id} className="bg-gray-900 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{formatDate(apt.date)}</p>
                    <p className="text-gray-400 text-sm">{formatTime(apt.startTime)} – {formatTime(apt.endTime)}</p>
                  </div>
                  <button onClick={() => handleReschedule(apt)} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm">Reschedule</button>
                </div>
              ))}
            </div>
          )}

          {pastActiveApts.length > 0 && (
            <>
              <h2 className="text-gray-400 text-sm font-medium mb-3">PAST (STILL ACTIVE)</h2>
              <div className="space-y-3 mb-8 opacity-60">
                {pastActiveApts.sort((a, b) => b.date.localeCompare(a.date)).map(apt => (
                  <div key={apt.id} className="bg-gray-900 rounded-xl p-4">
                    <p className="font-semibold">{formatDate(apt.date)}</p>
                    <p className="text-gray-400 text-sm">{formatTime(apt.startTime)} – {formatTime(apt.endTime)}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {(client.unusedCredits ?? 0) > 0 && (
            <button onClick={() => setViewMode("pick")} className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium mb-3">+ Book New Appointment</button>
          )}
          <button onClick={() => setShowPasswordChange(s => !s)} className="w-full py-2 text-gray-400 hover:text-white text-sm mb-2">Change Password</button>
          {showPasswordChange && (
            <form onSubmit={handlePasswordChange} className="flex gap-2 mb-4">
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white" required />
              <button type="submit" className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg">Save</button>
            </form>
          )}
          <button onClick={logout} className="w-full py-2 text-red-400 hover:text-red-300 text-sm">Logout</button>
        </div>
      </div>
    );
  }

  // ── BOOKING FLOW ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-4">
          <div>
            <h1 className="text-2xl font-bold text-orange-500">Book Appointment</h1>
            <p className="text-gray-400 text-sm">Welcome, {client.firstName}!</p>
          </div>
          <button onClick={() => { setStep("date"); setViewMode("appointments"); }} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm">My Appointments</button>
        </div>

        {message && <div className="bg-red-900 p-3 rounded-lg mb-4 text-sm">{message}</div>}

        {/* Step 1: Pick Date */}
        {(step === "date" || step === "time" || step === "confirm") && (client.unusedCredits ?? 0) < 1 ? (
          <>
            <div className="text-center py-16">
              <div className="text-4xl mb-4">📅</div>
              <h2 className="text-xl font-bold text-white mb-2">No Sessions Available</h2>
              <p className="text-gray-400">You have 0 appointments left to schedule.<br />Ask your trainer to add sessions.</p>
            </div>
          </>
        ) : (
          <>
        {step === "date" && (
          <>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-400 text-sm">Duration:</span>
                <div className="flex gap-2">
                  <button onClick={() => setDuration(30)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium ${duration === 30 ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400"}`}>30 min</button>
                  <button onClick={() => setDuration(60)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium ${duration === 60 ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400"}`}>60 min</button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16"><p className="text-orange-500">Loading availability...</p></div>
            ) : monthGroups.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-400">No available dates in the next 8 weeks.</p>
                <p className="text-gray-500 text-sm mt-2">You may already have appointments on all open days.</p>
                <button onClick={() => setViewMode("appointments")} className="mt-4 text-orange-500 hover:text-orange-400">View my appointments →</button>
              </div>
            ) : (
              monthGroups.map(({ month, dates }) => (
                <div key={month} className="mb-6">
                  <h3 className="text-gray-400 text-sm font-medium mb-2">{month}</h3>
                  <div className="grid grid-cols-7 gap-1">
                    {dates.map(date => {
                      const ds = formatDateKey(date);
                      const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
                      return (
                        <button key={ds} onClick={() => handleSelectDate(date)}
                          className="flex flex-col items-center p-2 rounded-lg bg-gray-800 hover:bg-orange-500 transition-colors">
                          <span className="text-xs text-gray-500">{dayNames[date.getDay()]}</span>
                          <span className="text-lg font-bold">{date.getDate()}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* Step 2: Pick Time */}
        {step === "time" && (
          <>
            <button onClick={() => setStep("date")} className="text-gray-400 hover:text-white text-sm mb-4">← Back to dates</button>
            <h2 className="text-xl font-bold mb-1">{formatDate(selectedDate)}</h2>
            <p className="text-gray-400 text-sm mb-4">
              Duration: <button onClick={() => setDuration(d => d === 30 ? 60 : 30)} className="text-orange-500 hover:text-orange-400">{duration} min</button>
              {" "}— {duration === 60 ? "starts at :00 only" : "starts at :00 or :30"}
            </p>

            {duration === 60 && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2 mb-3 text-sm text-center text-gray-400">
                60-minute sessions start at :00 only (9:00, 10:00, 11:00...)
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {(duration === 60 ? timeSlots60 : timeSlots30).map(time => {
                const isAvail = getAvailableSlots(selectedDate).includes(time);
                return (
                  <button key={time} onClick={() => isAvail && handleSelectTime(time)}
                    disabled={!isAvail}
                    className={`py-3 rounded-lg font-medium text-sm transition-colors ${isAvail ? "bg-gray-800 hover:bg-orange-500 text-white" : "bg-gray-900 text-gray-600 cursor-not-allowed"}`}>
                    {formatTime(time)}
                    {!isAvail && <span className="block text-xs opacity-50">taken</span>}
                  </button>
                );
              })}
            </div>

            {getAvailableSlots(selectedDate).length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-400">No open times on this date.</p>
                <button onClick={() => setStep("date")} className="mt-3 text-orange-500 hover:text-orange-400">Choose another date →</button>
              </div>
            )}
          </>
        )}

        {/* Step 3: Confirm */}
        {step === "confirm" && (
          <>
            <button onClick={() => setStep("time")} className="text-gray-400 hover:text-white text-sm mb-4">← Back</button>
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">📅</div>
              <h1 className="text-2xl font-bold">Confirm Appointment</h1>
            </div>
            <div className="bg-gray-900 rounded-xl p-6 space-y-3">
              <div className="flex justify-between"><span className="text-gray-400">Date</span><span className="font-medium">{formatDate(selectedDate)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Time</span><span className="font-medium">{formatTime(selectedTime)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Duration</span><span className="font-medium">{duration} minutes</span></div>
            </div>
            {message && <p className="text-red-500 text-sm mt-3">{message}</p>}
            <button onClick={handleConfirm} disabled={submitting}
              className="w-full mt-4 py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors">
              {submitting ? "Booking..." : "Confirm Booking"}
            </button>
          </>
        )}

        {/* Bottom nav */}
        <div className="mt-8 pt-4 border-t border-gray-800 flex justify-between text-sm text-gray-500">
          <button onClick={() => { setStep("date"); setViewMode("appointments"); }}>My Appointments</button>
          <button onClick={logout}>Logout</button>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
