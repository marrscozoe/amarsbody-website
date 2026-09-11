"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface Appointment {
  id: string;
  clientId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  recurringId?: string | null;
  recurringPattern?: string | null;
}

interface BlockedTime {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  recurringPattern?: string;
  daysOfWeek?: number[];
  endDate?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  return `${h > 12 ? h - 12 : h}:${minutes} ${h >= 12 ? "PM" : "AM"}`;
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const generateTimeSlots = (startHour = 5, endHour = 20) => {
  const slots: string[] = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    slots.push(`${hour.toString().padStart(2, "0")}:00`);
    slots.push(`${hour.toString().padStart(2, "0")}:30`);
  }
  return slots;
};

const timeSlots = generateTimeSlots(5, 20);
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [loading, setLoading] = useState(true);

  // Week navigation
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  // Modal state
  const [modal, setModal] = useState<{
    type: "book" | "block" | "booking-detail" | "blocked-detail";
    date?: string;
    time?: string;
    appointment?: Appointment;
    blocked?: BlockedTime;
  } | null>(null);

  // Forms
  const [bookForm, setBookForm] = useState({ clientId: "", date: "", startTime: "", endTime: "" });
  const [blockForm, setBlockForm] = useState({ date: "", startTime: "", endTime: "", note: "" });
  const [moveForm, setMoveForm] = useState<{ appointmentId: string; date: string; startTime: string; endTime: string } | null>(null);

  // Client expansion state
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  // Auth check + load data
  useEffect(() => {
    const isAdmin = localStorage.getItem("calendarAdmin");
    if (!isAdmin) {
      router.push("/calendar");
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientsRes, appointmentsRes, blockedRes] = await Promise.all([
        fetch("/api/calendar/clients"),
        fetch("/api/calendar/appointments"),
        fetch("/api/calendar/blocked"),
      ]);
      setClients(await clientsRes.json());
      setAppointments(await appointmentsRes.json());
      setBlockedTimes(await blockedRes.json());
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Week dates ──────────────────────────────────────────────────────────────

  const weekDates = useMemo(() => {
    const today = new Date();
    today.setDate(today.getDate() + weekOffset * 7);
    const startOfWeek = new Date(today);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  const today = formatDateToString(new Date());
  const displayDates = viewMode === "day" ? [selectedDay] : weekDates;

  // ─── Data lookups ────────────────────────────────────────────────────────────

  const getAppointmentsForDate = useCallback(
    (dateStr: string) => appointments.filter((a) => a.date === dateStr && a.status !== "cancelled"),
    [appointments]
  );

  const getBlockedForDate = useCallback(
    (dateStr: string): BlockedTime[] => {
      const date = new Date(dateStr + "T00:00:00");
      const dayOfWeek = date.getDay();
      return blockedTimes.filter((blk) => {
        if (blk.date === dateStr) return true;
        if (blk.isRecurring && blk.daysOfWeek && blk.daysOfWeek.includes(dayOfWeek)) {
          if (blk.endDate && dateStr > blk.endDate) return false;
          return true;
        }
        return false;
      });
    },
    [blockedTimes]
  );

  const isSlotBlocked = useCallback(
    (dateStr: string, time: string): BlockedTime | null => {
      const blocked = getBlockedForDate(dateStr);
      const mins = timeToMinutes(time);
      return (
        blocked.find((blk) => {
          const startMins = timeToMinutes(blk.startTime);
          const endMins = timeToMinutes(blk.endTime);
          return mins >= startMins && mins < endMins;
        }) || null
      );
    },
    [getBlockedForDate]
  );

  const isSlotBooked = useCallback(
    (dateStr: string, time: string): Appointment | null => {
      const dayAppts = getAppointmentsForDate(dateStr);
      const mins = timeToMinutes(time);
      for (const apt of dayAppts) {
        const startMins = timeToMinutes(apt.startTime);
        const endMins = timeToMinutes(apt.endTime);
        if (mins >= startMins && mins < endMins) return apt;
      }
      return null;
    },
    [getAppointmentsForDate]
  );

  const getClientName = (clientId: string) => {
    const c = clients.find((cl) => cl.id === clientId);
    return c ? `${c.firstName} ${c.lastName}` : "Unknown";
  };

  const getClient = (clientId: string) => clients.find((cl) => cl.id === clientId);

  // ─── Slot click handler ──────────────────────────────────────────────────────

  const handleSlotClick = (date: Date, time: string) => {
    const dateStr = formatDateToString(date);
    const booked = isSlotBooked(dateStr, time);
    if (booked) {
      setModal({ type: "booking-detail", date: dateStr, time, appointment: booked });
      return;
    }
    const blocked = isSlotBlocked(dateStr, time);
    if (blocked) {
      setModal({ type: "blocked-detail", date: dateStr, time, blocked });
      return;
    }
    // Empty slot → book or block
    setModal({ type: "book", date: dateStr, time });
    setBookForm({ clientId: "", date: dateStr, startTime: time, endTime: getNextHalfHour(time) });
  };

  const getNextHalfHour = (time: string): string => {
    const mins = timeToMinutes(time) + 30;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  // ─── Book / Block / Move / Cancel ──────────────────────────────────────────

  const handleBookClient = async () => {
    if (!bookForm.clientId || !bookForm.date || !bookForm.startTime) return;
    try {
      const res = await fetch("/api/calendar/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...bookForm }),
      });
      if (res.ok) {
        setModal(null);
        setBookForm({ clientId: "", date: "", startTime: "", endTime: "" });
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to book");
      }
    } catch {
      alert("Failed to book");
    }
  };

  const handleBlockTime = async () => {
    if (!blockForm.date || !blockForm.startTime || !blockForm.endTime) return;
    try {
      const res = await fetch("/api/calendar/blocked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "block",
          date: blockForm.date,
          startTime: blockForm.startTime,
          endTime: blockForm.endTime,
          isRecurring: false,
        }),
      });
      if (res.ok) {
        setModal(null);
        setBlockForm({ date: "", startTime: "", endTime: "", note: "" });
        loadData();
      }
    } catch {
      alert("Failed to block time");
    }
  };

  const handleCancelAppointment = async (id: string) => {
    if (!confirm("Cancel this appointment?")) return;
    try {
      const res = await fetch("/api/calendar/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", id }),
      });
      if (res.ok) {
        setModal(null);
        loadData();
      }
    } catch {
      alert("Failed to cancel");
    }
  };

  const handleMoveAppointment = async () => {
    if (!moveForm) return;
    try {
      const res = await fetch("/api/calendar/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reschedule", id: moveForm.appointmentId, ...moveForm }),
      });
      if (res.ok) {
        setModal(null);
        setMoveForm(null);
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to move");
      }
    } catch {
      alert("Failed to move");
    }
  };

  const handleUnblockTime = async (id: string) => {
    try {
      const res = await fetch("/api/calendar/blocked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unblock", id }),
      });
      if (res.ok) {
        setModal(null);
        loadData();
      }
    } catch {
      alert("Failed to unblock");
    }
  };

  // ─── Client sessions grouped ────────────────────────────────────────────────

  const clientSessions = useMemo(() => {
    const activeAppointments = appointments.filter((a) => a.status !== "cancelled" && a.recurringId);
    const seriesMap = new Map<string, Appointment[]>();
    for (const apt of activeAppointments) {
      const key = `${apt.clientId}||${apt.recurringId}`;
      if (!seriesMap.has(key)) seriesMap.set(key, []);
      seriesMap.get(key)!.push(apt);
    }

    return Array.from(seriesMap.values())
      .map((apts) => {
        const sorted = [...apts].sort((a, b) => a.date.localeCompare(b.date));
        const daysSet = new Set<string>();
        for (const apt of sorted) {
          const dow = new Date(apt.date + "T00:00:00").getDay();
          daysSet.add(dayNames[dow]);
        }
        const days = [...daysSet].sort((a, b) => dayNames.indexOf(a) - dayNames.indexOf(b));
        const time = formatTime(sorted[0].startTime);
        const isActive = sorted.some((a) => a.date >= today);
        const client = getClient(sorted[0].clientId);
        return {
          clientId: sorted[0].clientId,
          clientName: client ? `${client.firstName} ${client.lastName}` : "Unknown",
          recurringId: sorted[0].recurringId!,
          days,
          time,
          count: sorted.length,
          isActive,
          upcoming: sorted
            .filter((a) => a.date >= today)
            .slice(0, 5)
            .map((a) => ({ date: a.date, time: formatTime(a.startTime), id: a.id })),
        };
      })
      .sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [appointments, clients, today]);

  // ─── Upcoming non-recurring appointments ────────────────────────────────────

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.status !== "cancelled" && !a.recurringId && a.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .slice(0, 20)
      .map((a) => ({ ...a, clientName: getClientName(a.clientId), time: formatTime(a.startTime) }));
  }, [appointments, today]);

  // ─── Navigation ──────────────────────────────────────────────────────────────

  const goToToday = () => {
    setWeekOffset(0);
    setSelectedDay(new Date());
  };

  const navTitle = () => {
    if (viewMode === "day") {
      return selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    }
    const start = weekDates[0];
    const end = weekDates[6];
    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString("en-US", { month: "long" })} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${start.toLocaleDateString("en-US", { month: "short" })} ${start.getDate()} – ${end.toLocaleDateString("en-US", { month: "short" })} ${end.getDate()}, ${end.getFullYear()}`;
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <p className="text-orange-500 text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[#0a0a0a] border-b border-gray-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-orange-500">📅 Admin Calendar</h1>
            <button
              onClick={() => {
                localStorage.removeItem("calendarAdmin");
                router.push("/calendar");
              }}
              className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Logout
            </button>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("week")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === "week" ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode("day")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === "day" ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              Day
            </button>
          </div>
        </div>

        {/* Week nav */}
        <div className="max-w-7xl mx-auto flex items-center gap-3 mt-3">
          <button onClick={() => setWeekOffset((w) => w - 1)} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={goToToday} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors">
            Today
          </button>
          <button onClick={() => setWeekOffset((w) => w + 1)} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <span className="text-sm font-medium text-gray-300">{navTitle()}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* ── Calendar ──────────────────────────────────────────────────────── */}
        <section>
          <div className="bg-gray-900 rounded-xl overflow-hidden">
            {/* Day headers */}
            <div
              className="grid border-b border-gray-800"
              style={{ gridTemplateColumns: viewMode === "week" ? "60px repeat(7, 1fr)" : "60px 1fr" }}
            >
              <div className="p-2 text-xs text-gray-500" />
              {displayDates.map((date, i) => {
                const dateStr = formatDateToString(date);
                const isToday = dateStr === today;
                return (
                  <div
                    key={i}
                    onClick={() => {
                      if (viewMode === "week") {
                        setSelectedDay(date);
                        setViewMode("day");
                      }
                    }}
                    className={`p-2 text-center cursor-pointer transition-colors ${isToday ? "bg-orange-500/10" : "hover:bg-gray-800"} ${viewMode === "day" ? "cursor-default" : ""}`}
                  >
                    <div className="text-xs text-gray-400">{viewMode === "week" ? dayNames[i] : date.toLocaleDateString("en-US", { weekday: "short" })}</div>
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full mx-auto mt-1 text-sm font-medium ${isToday ? "bg-orange-500 text-white" : "text-gray-300"}`}>
                      {date.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time grid */}
            <div className="max-h-[60vh] overflow-y-auto">
              {timeSlots.map((time, timeIdx) => (
                <div
                  key={time}
                  className="grid border-b border-gray-800/40"
                  style={{ gridTemplateColumns: viewMode === "week" ? "60px repeat(7, 1fr)" : "60px 1fr", minHeight: "48px" }}
                >
                  {/* Time label */}
                  <div className="p-1 text-xs text-gray-500 text-right pr-2 flex items-start justify-end">
                    {timeIdx % 2 === 0 && <span className="mt-0.5">{formatTime(time)}</span>}
                  </div>

                  {/* Day columns */}
                  {displayDates.map((date, dayIdx) => {
                    const dateStr = formatDateToString(date);
                    const booked = isSlotBooked(dateStr, time);
                    const blocked = isSlotBlocked(dateStr, time);
                    const isFirstSlot = !booked || time === booked.startTime;
                    const isFirstBlocked = !blocked || time === blocked.startTime;

                    if (!isFirstSlot && booked) return <div key={dayIdx} />;
                    if (!isFirstBlocked && blocked) return <div key={dayIdx} />;

                    return (
                      <div
                        key={dayIdx}
                        onClick={() => handleSlotClick(date, time)}
                        className={`relative min-h-[48px] border-l border-gray-800/40 cursor-pointer transition-colors ${
                          booked
                            ? booked.status === "booked"
                              ? "bg-orange-500/20 hover:bg-orange-500/30"
                              : "bg-green-900/20 hover:bg-green-900/30"
                            : blocked
                            ? "bg-gray-700/40 hover:bg-gray-700/60"
                            : "hover:bg-gray-800/40"
                        } ${viewMode === "day" ? "cursor-default" : ""}`}
                      >
                        {booked && isFirstSlot && (
                          <div className="absolute inset-x-0.5 top-0.5 bottom-0.5 rounded-lg bg-orange-500 px-2 py-1 overflow-hidden">
                            <div className="font-semibold text-sm text-white truncate">{getClientName(booked.clientId)}</div>
                            <div className="text-xs text-orange-100 truncate">{formatTime(booked.startTime)} – {formatTime(booked.endTime)}</div>
                          </div>
                        )}
                        {blocked && isFirstBlocked && (
                          <div className="absolute inset-x-0.5 top-0.5 bottom-0.5 rounded-lg bg-gray-600 px-2 py-1 flex items-center">
                            <span className="text-xs text-gray-300 truncate">Blocked</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-2 px-1 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-orange-500" /> Client booked
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-gray-600" /> Blocked
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-gray-800 border border-gray-700" /> Available
            </span>
          </div>
        </section>

        {/* ── Client Sessions List ────────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-orange-400 mb-3">Client Sessions</h2>

          {clientSessions.length === 0 ? (
            <div className="bg-gray-900 rounded-xl p-6 text-center text-gray-400">
              No recurring sessions scheduled
            </div>
          ) : (
            <div className="space-y-2">
              {clientSessions.map((session) => (
                <div key={`${session.clientId}-${session.recurringId}`} className="bg-gray-900 rounded-xl overflow-hidden">
                  {/* Client row */}
                  <button
                    onClick={() => setExpandedClient(expandedClient === session.recurringId ? null : session.recurringId)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors text-left min-h-[60px]"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${session.isActive ? "bg-orange-500/20 text-orange-400" : "bg-gray-700 text-gray-400"}`}>
                        {session.clientName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{session.clientName}</div>
                        <div className="text-sm text-orange-400">
                          {session.days.join(" / ")} at {session.time}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded ${session.isActive ? "bg-green-900/50 text-green-400" : "bg-gray-700 text-gray-400"}`}>
                        {session.isActive ? "Active" : "Past"}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedClient === session.recurringId ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </button>

                  {/* Expanded: upcoming appointments */}
                  {expandedClient === session.recurringId && (
                    <div className="border-t border-gray-800 p-4 bg-gray-800/30">
                      {session.upcoming.length === 0 ? (
                        <p className="text-gray-500 text-sm">No upcoming appointments</p>
                      ) : (
                        <div className="space-y-1.5">
                          {session.upcoming.map((apt) => (
                            <div key={apt.id} className="flex items-center justify-between py-1.5 px-3 bg-gray-800 rounded-lg">
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-300">{apt.date}</span>
                                <span className="text-sm text-gray-400">{apt.time}</span>
                              </div>
                              <button
                                onClick={() => handleCancelAppointment(apt.id)}
                                className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/30 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Upcoming One-Off Appointments ────────────────────────────────── */}
        {upcomingAppointments.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-orange-400 mb-3">Upcoming Sessions</h2>
            <div className="bg-gray-900 rounded-xl overflow-hidden divide-y divide-gray-800">
              {upcomingAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
                      {apt.clientName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-white">{apt.clientName}</div>
                      <div className="text-sm text-gray-400">{apt.date} · {apt.time}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancelAppointment(apt.id)}
                    className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-900/30 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── MODAL ──────────────────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => { setModal(null); setMoveForm(null); }}>
          <div className="bg-gray-900 rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>

            {/* Book (empty slot) */}
            {modal.type === "book" && (
              <>
                <div className="p-4 border-b border-gray-800">
                  <h3 className="text-xl font-bold">Book or Block</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {modal.date} at {modal.time && formatTime(modal.time!)}
                  </p>
                </div>
                <div className="p-4 space-y-3">
                  <button
                    onClick={() => {
                      if (!modal.date || !modal.time) return;
                      setBookForm({ clientId: "", date: modal.date, startTime: modal.time, endTime: getNextHalfHour(modal.time) });
                    }}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 rounded-xl font-semibold text-white transition-colors min-h-[52px]"
                  >
                    Book a Client
                  </button>
                  <button
                    onClick={() => {
                      if (!modal.date || !modal.time) return;
                      setBlockForm({ date: modal.date, startTime: modal.time, endTime: getNextHalfHour(modal.time), note: "" });
                    }}
                    className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold text-white transition-colors min-h-[52px]"
                  >
                    Block this Time
                  </button>
                  <button onClick={() => setModal(null)} className="w-full py-2 text-gray-400 hover:text-white transition-colors">
                    Cancel
                  </button>
                </div>
              </>
            )}

            {/* Book form */}
            {modal.type === "book" && bookForm.date && !modal.appointment && (
              <>
                <div className="p-4 border-b border-gray-800">
                  <h3 className="text-xl font-bold">Book Client</h3>
                </div>
                <div className="p-4 space-y-3">
                  <select
                    value={bookForm.clientId}
                    onChange={(e) => setBookForm({ ...bookForm, clientId: e.target.value })}
                    className="w-full px-3 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 text-base"
                  >
                    <option value="">Select client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={bookForm.date}
                    onChange={(e) => setBookForm({ ...bookForm, date: e.target.value })}
                    className="w-full px-3 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 text-base"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={bookForm.startTime}
                      onChange={(e) => setBookForm({ ...bookForm, startTime: e.target.value })}
                      className="px-3 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 text-base"
                    >
                      {timeSlots.map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
                    </select>
                    <select
                      value={bookForm.endTime}
                      onChange={(e) => setBookForm({ ...bookForm, endTime: e.target.value })}
                      className="px-3 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 text-base"
                    >
                      {timeSlots.map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
                    </select>
                  </div>
                  <button
                    onClick={handleBookClient}
                    disabled={!bookForm.clientId}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl font-semibold text-white transition-colors min-h-[52px]"
                  >
                    Save Booking
                  </button>
                  <button
                    onClick={() => { setModal(null); setBookForm({ clientId: "", date: "", startTime: "", endTime: "" }); }}
                    className="w-full py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {/* Booking detail */}
            {modal.type === "booking-detail" && modal.appointment && !moveForm && (
              <>
                <div className="p-4 border-b border-gray-800">
                  <h3 className="text-xl font-bold">{getClientName(modal.appointment.clientId)}</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {modal.appointment.date} · {formatTime(modal.appointment.startTime)} – {formatTime(modal.appointment.endTime)}
                  </p>
                </div>
                <div className="p-4 space-y-3">
                  <button
                    onClick={() => setMoveForm({ appointmentId: modal.appointment!.id, date: modal.appointment!.date, startTime: modal.appointment!.startTime, endTime: modal.appointment!.endTime })}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-white transition-colors min-h-[52px]"
                  >
                    Move
                  </button>
                  <button
                    onClick={() => handleCancelAppointment(modal.appointment!.id)}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-xl font-semibold text-white transition-colors min-h-[52px]"
                  >
                    Cancel
                  </button>
                  <button onClick={() => setModal(null)} className="w-full py-2 text-gray-400 hover:text-white transition-colors">
                    Close
                  </button>
                </div>
              </>
            )}

            {/* Move form */}
            {modal.type === "booking-detail" && moveForm && (
              <>
                <div className="p-4 border-b border-gray-800">
                  <h3 className="text-xl font-bold">Move Appointment</h3>
                </div>
                <div className="p-4 space-y-3">
                  <input
                    type="date"
                    value={moveForm.date}
                    onChange={(e) => setMoveForm({ ...moveForm, date: e.target.value })}
                    className="w-full px-3 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 text-base"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={moveForm.startTime}
                      onChange={(e) => setMoveForm({ ...moveForm, startTime: e.target.value })}
                      className="px-3 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 text-base"
                    >
                      {timeSlots.map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
                    </select>
                    <select
                      value={moveForm.endTime}
                      onChange={(e) => setMoveForm({ ...moveForm, endTime: e.target.value })}
                      className="px-3 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 text-base"
                    >
                      {timeSlots.map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
                    </select>
                  </div>
                  <button
                    onClick={handleMoveAppointment}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-white transition-colors min-h-[52px]"
                  >
                    Save Move
                  </button>
                  <button
                    onClick={() => setMoveForm(null)}
                    className="w-full py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {/* Block form */}
            {modal.type === "block" && (
              <>
                <div className="p-4 border-b border-gray-800">
                  <h3 className="text-xl font-bold">Block Time</h3>
                </div>
                <div className="p-4 space-y-3">
                  <input
                    type="date"
                    value={blockForm.date}
                    onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })}
                    className="w-full px-3 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 text-base"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={blockForm.startTime}
                      onChange={(e) => setBlockForm({ ...blockForm, startTime: e.target.value })}
                      className="px-3 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 text-base"
                    >
                      {timeSlots.map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
                    </select>
                    <select
                      value={blockForm.endTime}
                      onChange={(e) => setBlockForm({ ...blockForm, endTime: e.target.value })}
                      className="px-3 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 text-base"
                    >
                      {timeSlots.map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="Note (optional)"
                    value={blockForm.note}
                    onChange={(e) => setBlockForm({ ...blockForm, note: e.target.value })}
                    className="w-full px-3 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-base"
                  />
                  <button
                    onClick={handleBlockTime}
                    className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold text-white transition-colors min-h-[52px]"
                  >
                    Save Block
                  </button>
                  <button onClick={() => setModal(null)} className="w-full py-2 text-gray-400 hover:text-white transition-colors">
                    Cancel
                  </button>
                </div>
              </>
            )}

            {/* Blocked slot detail */}
            {modal.type === "blocked-detail" && modal.blocked && (
              <>
                <div className="p-4 border-b border-gray-800">
                  <h3 className="text-xl font-bold">Blocked</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {modal.blocked.date} · {formatTime(modal.blocked.startTime)} – {formatTime(modal.blocked.endTime)}
                  </p>
                </div>
                <div className="p-4 space-y-3">
                  <button
                    onClick={() => handleUnblockTime(modal.blocked!.id)}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-xl font-semibold text-white transition-colors min-h-[52px]"
                  >
                    Unblock
                  </button>
                  <button onClick={() => setModal(null)} className="w-full py-2 text-gray-400 hover:text-white transition-colors">
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
