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

  // Handle booking from calendar
  const handleBook = useCallback((date: string, startTime: string, endTime: string) => {
    setBookingForm({ date, startTime, duration: "60" });
    setShowBookingModal(true);
  }, []);

  const handleConfirmBooking = async () => {
    if (!client || !bookingForm.date || !bookingForm.startTime) return;
    
    const [hours, minutes] = bookingForm.startTime.split(":").map(Number);
    const endMinutes = hours * 60 + minutes + parseInt(bookingForm.duration);
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

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    return `${h > 12 ? h - 12 : h}:${minutes} ${h >= 12 ? "PM" : "AM"}`;
  };

  // Filter appointments for current client only
  const clientAppointments = client 
    ? appointments.filter(apt => apt.clientId === client.id)
    : [];

  if (loading || !client) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <p className="text-orange-500">Loading...</p>
      </div>
    );
  }

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

        {/* Google Calendar */}
        <GoogleCalendar
          mode="client"
          client={client}
          appointments={clientAppointments}
          blockedTimes={blockedTimes}
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
                  onChange={(e) => setBookingForm({ ...bookingForm, duration: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                </select>
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
                  className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
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
