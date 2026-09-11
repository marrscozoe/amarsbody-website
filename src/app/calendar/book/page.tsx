"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import GoogleCalendar from "../components/GoogleCalendar";

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

// Time slot helpers
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// 60-min: :00 only. 30-min: :00 and :30
const generateTimeSlots = (duration: number, startHour = 5, endHour = 20) => {
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

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  return `${h > 12 ? h - 12 : h}:${minutes} ${h >= 12 ? "PM" : "AM"}`;
};

export default function BookPage() {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    date: "",
    startTime: "",
    duration: "60"
  });

  useEffect(() => {
    const stored = localStorage.getItem("calendarClient");
    if (!stored) {
      router.push("/calendar");
      return;
    }

    const clientData = JSON.parse(stored);
    setClient(clientData);
    loadAppointments(clientData.id);
  }, []);

  const loadAppointments = async (clientId: string) => {
    try {
      const [aptRes, blockedRes] = await Promise.all([
        fetch(`/api/calendar/appointments?clientId=${clientId}`),
        fetch(`/api/calendar/blocked`)
      ]);

      setAppointments(await aptRes.json());
      setBlockedTimes(await blockedRes.json());
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Get blocked times for a date (including recurring)
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

  // Check if a slot is blocked for a date
  const isSlotBlocked = (dateStr: string, time: string): boolean => {
    const blocked = getBlockedForDate(dateStr);
    const mins = timeToMinutes(time);
    return blocked.some(blk => {
      const startMins = timeToMinutes(blk.startTime);
      const endMins = timeToMinutes(blk.endTime);
      return mins >= startMins && mins < endMins;
    });
  };

  // Get available time slots for a date (respects duration)
  const getAvailableSlots = useCallback((dateStr: string, duration: number): string[] => {
    const durationNum = parseInt(String(duration));
    const allSlots = generateTimeSlots(durationNum);
    const clientId = client?.id;

    return allSlots.filter(time => {
      if (isSlotBlocked(dateStr, time)) return false;

      // Check if slot conflicts with any OTHER appointment on this date
      const hasConflict = appointments.some(apt => {
        if (apt.status === "cancelled") return false;
        if (apt.clientId !== clientId) return false;
        if (apt.date !== dateStr) return false;
        const slotMins = timeToMinutes(time);
        const aptStart = timeToMinutes(apt.startTime);
        const aptEnd = timeToMinutes(apt.endTime);
        return slotMins >= aptStart && slotMins < aptEnd;
      });

      return !hasConflict;
    });
  }, [blockedTimes, appointments, client]);

  // Handle booking from calendar
  const handleBook = useCallback((date: string, startTime: string, endTime: string) => {
    setBookingForm({ date, startTime, duration: "60" });
    setShowBookingModal(true);
  }, []);

  const handleConfirmBooking = async () => {
    if (!client || !bookingForm.date || !bookingForm.startTime) return;

    const duration = parseInt(bookingForm.duration);
    const [hours, minutes] = bookingForm.startTime.split(":").map(Number);
    const endMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;

    try {
      const res = await fetch("/api/calendar/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          clientId: client.id,
          date: bookingForm.date,
          startTime: bookingForm.startTime,
          endTime
        })
      });

      if (res.ok) {
        setMessage("Appointment booked successfully!");
        setShowBookingModal(false);
        loadAppointments(client.id);
      } else {
        const data = await res.json();
        setMessage(data.error || "Failed to book appointment");
      }
    } catch (err) {
      setMessage("Failed to book appointment");
    }
  };

  const handleCancelAppointment = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    if (!client) return;

    try {
      const res = await fetch("/api/calendar/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", id })
      });

      if (res.ok) {
        loadAppointments(client.id);
      }
    } catch (err) {
      console.error("Failed to cancel appointment:", err);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !newPassword) return;

    try {
      const res = await fetch("/api/calendar/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "changePassword",
          id: client.id,
          password: newPassword
        })
      });

      if (res.ok) {
        setMessage("Password changed successfully!");
        setNewPassword("");
        setShowPasswordChange(false);
      } else {
        setMessage("Failed to change password");
      }
    } catch (err) {
      setMessage("Failed to change password");
    }
  };

  const logout = () => {
    localStorage.removeItem("calendarClient");
    router.push("/calendar");
  };

  // Filter appointments for current client only
  const clientAppointments = client
    ? appointments.filter(apt => apt.clientId === client.id)
    : [];

  // For the calendar — exclude dates where client already has an active apt
  // (This prevents them from booking another session on a day they already have one)
  const calendarAppointments = clientAppointments;

  if (loading || !client) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <p className="text-orange-500">Loading...</p>
      </div>
    );
  }

  const duration = parseInt(bookingForm.duration);
  const availableSlots = bookingForm.date
    ? getAvailableSlots(bookingForm.date, duration)
    : [];
  const allSlots = generateTimeSlots(duration);
  const unavailableSlots = new Set(
    allSlots.filter(s => !availableSlots.includes(s))
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-orange-500">Book Appointment</h1>
            <p className="text-gray-400">Welcome, {client.firstName}!</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => router.push("/calendar/my-appointments")}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              My Appointments
            </button>
            <button
              onClick={() => setShowPasswordChange(!showPasswordChange)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Change Password
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Password Change */}
        {showPasswordChange && (
          <div className="bg-gray-900 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-3">Change Password</h3>
            <form onSubmit={handlePasswordChange} className="flex gap-3">
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                required
              />
              <button
                type="submit"
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
              >
                Save
              </button>
            </form>
          </div>
        )}

        {message && (
          <div className={`p-3 rounded-lg mb-4 ${message.includes("success") ? "bg-green-900" : "bg-red-900"}`}>
            {message}
          </div>
        )}

        {/* Google Calendar — days with existing appointments are excluded client-side via appointments prop */}
        <GoogleCalendar
          mode="client"
          client={client}
          appointments={calendarAppointments}
          blockedTimes={blockedTimes}
          duration={60}
          onRefresh={() => loadAppointments(client.id)}
          onBook={handleBook}
          onCancel={handleCancelAppointment}
        />
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-xl font-bold">Book Appointment</h3>
              <p className="text-gray-400 text-sm">
                {bookingForm.date && new Date(bookingForm.date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric"
                })}
              </p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Time</label>
                <p className="text-lg font-semibold">{formatTime(bookingForm.startTime)}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Duration</label>
                <select
                  value={bookingForm.duration}
                  onChange={(e) => {
                    const newDuration = e.target.value;
                    // When duration changes, clear the selected time if it's now invalid
                    setBookingForm({ ...bookingForm, duration: newDuration, startTime: "" });
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="30">30 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>

              {/* Time slot picker — respects duration rule */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  {duration === 60
                    ? "60-minute sessions — :00 only"
                    : "30-minute sessions — :00 or :30"}
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                  {generateTimeSlots(duration).map(time => {
                    const taken = unavailableSlots.has(time) || isSlotBlocked(bookingForm.date, time);
                    const selected = bookingForm.startTime === time;
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setBookingForm({ ...bookingForm, startTime: time })}
                        disabled={taken}
                        className={`px-2 py-2 rounded-lg text-sm transition-colors ${
                          selected
                            ? "bg-orange-500 text-white"
                            : taken
                              ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                              : "bg-gray-800 hover:bg-orange-500 text-white"
                        }`}
                      >
                        {formatTime(time)}
                        {taken && <span className="block text-xs opacity-60">taken</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmBooking}
                  disabled={!bookingForm.startTime}
                  className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  Confirm Booking
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
