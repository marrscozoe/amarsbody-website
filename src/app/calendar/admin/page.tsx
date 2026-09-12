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
  label?: string;
  isPersonalBlock?: boolean;
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

type AdminView = "calendar" | "clients";

export default function AdminPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [adminView, setAdminView] = useState<AdminView>("calendar");
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({ clientId: "", date: "", startTime: "08:00", endTime: "09:00" });
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [bookingMode, setBookingMode] = useState<"client" | "personal">("client");
  const [personalLabel, setPersonalLabel] = useState("");
  const [viewClientId, setViewClientId] = useState<string | null>(null);
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [createClientForm, setCreateClientForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", password: ""
  });

  useEffect(() => {
    const isAdmin = localStorage.getItem("calendarAdmin");
    if (!isAdmin) { router.push("/calendar"); return; }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientsRes, appointmentsRes, blockedRes] = await Promise.all([
        fetch("/api/calendar/clients"),
        fetch("/api/calendar/appointments"),
        fetch("/api/calendar/blocked")
      ]);
      setClients(await clientsRes.json());
      setAppointments(await appointmentsRes.json());
      setBlockedTimes(await blockedRes.json());
    } catch (err) { console.error("Failed to load data:", err); }
    finally { setLoading(false); }
  };

  // ── Booking ─────────────────────────────────────────────────────────
  // Called by GoogleCalendar day-click (admin mode): pre-fill 08:00–09:00, open modal
  const handleBook = useCallback((date: string, startTime: string, endTime: string) => {
    setAppointmentForm({ clientId: "", date, startTime: "08:00", endTime: "09:00" });
    setRescheduleId(null);
    setBookingMode("client");
    setPersonalLabel("");
    setShowBookingModal(true);
  }, []);

  const handleCancel = useCallback(async (id: string) => {
    if (!confirm("Cancel this appointment?")) return;
    try {
      const res = await fetch("/api/calendar/appointments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", id })
      });
      if (res.ok) loadData();
    } catch (err) { console.error("Failed to cancel:", err); }
  }, []);

  const handleRescheduleClick = useCallback((appointment: Appointment) => {
    setAppointmentForm({
      clientId: appointment.clientId,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime
    });
    setRescheduleId(appointment.id);
    setShowBookingModal(true);
  }, []);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    const isPersonal = bookingMode === "personal";
    const payload: any = {
      action: "create",
      date: appointmentForm.date,
      startTime: appointmentForm.startTime,
      endTime: appointmentForm.endTime,
    };
    if (isPersonal) {
      payload.clientId = null;
      payload.label = personalLabel || "Personal Block";
      payload.isPersonalBlock = true;
    } else {
      payload.clientId = appointmentForm.clientId;
    }
    try {
      const res = await fetch("/api/calendar/appointments", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        setAppointmentForm({ clientId: "", date: "", startTime: "08:00", endTime: "09:00" });
        setPersonalLabel(""); setBookingMode("client");
        loadData(); setShowBookingModal(false);
      } else {
        const data = await res.json(); alert(data.error || "Failed to book");
      }
    } catch (err) { console.error("Failed to create appointment:", err); }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleId) return;
    try {
      const res = await fetch("/api/calendar/appointments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reschedule", id: rescheduleId, ...appointmentForm })
      });
      if (res.ok) {
        setRescheduleId(null);
        setAppointmentForm({ clientId: "", date: "", startTime: "08:00", endTime: "09:00" });
        loadData(); setShowBookingModal(false);
      } else { const data = await res.json(); alert(data.error || "Failed to reschedule"); }
    } catch (err) { console.error("Failed to reschedule:", err); }
  };

  // ── Clients ──────────────────────────────────────────────────────────
  const handleDeleteClient = async (id: string) => {
    if (!confirm("Delete this client and their appointments?")) return;
    try {
      const res = await fetch(`/api/calendar/clients?id=${id}`, { method: "DELETE" });
      if (res.ok) setClients(clients.filter(c => c.id !== id));
      else { const data = await res.json(); alert(data.error || "Failed to delete client"); }
    } catch (err) { console.error("Failed to delete client:", err); }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createClientForm.firstName || !createClientForm.lastName || !createClientForm.password) {
      alert("Fill in required fields"); return;
    }
    try {
      const res = await fetch("/api/calendar/clients", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...createClientForm })
      });
      const data = await res.json();
      if (res.ok) {
        setShowCreateClientModal(false);
        setCreateClientForm({ firstName: "", lastName: "", email: "", phone: "", password: "" });
        loadData(); alert("Client created!");
      } else { alert(data.error || "Failed to create client"); }
    } catch (err) { console.error("Failed to create client:", err); }
  };

  const logout = () => { localStorage.removeItem("calendarAdmin"); router.push("/calendar"); };

  const formatTime = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return `${h > 12 ? h - 12 : h}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  };

  const timeSlots = [];
  for (let h = 4; h <= 18; h++) {
    timeSlots.push(`${h.toString().padStart(2, "0")}:00`);
    timeSlots.push(`${h.toString().padStart(2, "0")}:30`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <p className="text-orange-500">Loading...</p>
      </div>
    );
  }

  // ── CLIENTS VIEW ────────────────────────────────────────────────────
  if (adminView === "clients") {
    const viewClient = viewClientId ? clients.find(c => c.id === viewClientId) : null;
    const clientAppts = viewClient
      ? appointments.filter(a => a.clientId === viewClient.id && a.status !== "cancelled")
      : [];
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pt-4">
            <div>
              <h1 className="text-2xl font-bold text-orange-500">Clients</h1>
              <p className="text-gray-400 text-sm">{clients.length} registered</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateClientModal(true)}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium transition-colors"
              >
                + Add
              </button>
              <button
                onClick={() => setAdminView("calendar")}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
              >
                ← Calendar
              </button>
            </div>
          </div>

          {/* Client list */}
          {clients.length === 0 ? (
            <p className="text-gray-400 text-center py-12">No clients yet.</p>
          ) : (
            <div className="space-y-2">
              {clients.map(client => (
                <button
                  key={client.id}
                  onClick={() => setViewClientId(client.id)}
                  className="w-full flex justify-between items-center p-4 bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors text-left"
                >
                  <div>
                    <p className="font-semibold">{client.firstName} {client.lastName}</p>
                    <p className="text-sm text-gray-400">{client.email}{client.phone && ` · ${client.phone}`}</p>
                  </div>
                  <span className="text-gray-500">→</span>
                </button>
              ))}
            </div>
          )}

          {/* Client sessions modal */}
          {viewClient && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-900 rounded-xl max-w-md w-full max-h-[80vh] flex flex-col">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center shrink-0">
                  <div>
                    <h3 className="text-xl font-bold">{viewClient.firstName}'s Sessions</h3>
                    <p className="text-sm text-gray-400">{viewClient.email}</p>
                  </div>
                  <button
                    onClick={() => setViewClientId(null)}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                  >
                    Close
                  </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                  {clientAppts.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No sessions for {viewClient.firstName}.</p>
                  ) : (
                    <div className="space-y-2">
                      {clientAppts.sort((a, b) => a.date.localeCompare(b.date)).map(apt => (
                        <div key={apt.id} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                          <div>
                            <p className="font-medium">{apt.date}</p>
                            <p className="text-sm text-gray-400">
                              {formatTime(apt.startTime)} – {formatTime(apt.endTime)}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            apt.status === "completed" ? "bg-green-900 text-green-300" :
                            apt.status === "cancelled" ? "bg-red-900 text-red-300" :
                            "bg-orange-900 text-orange-300"
                          }`}>{apt.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Create Client Modal */}
          {showCreateClientModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-900 rounded-xl max-w-md w-full">
                <div className="p-4 border-b border-gray-800">
                  <h3 className="text-xl font-bold">Add Client</h3>
                </div>
                <form onSubmit={handleCreateClient} className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">First Name *</label>
                      <input type="text" value={createClientForm.firstName}
                        onChange={e => setCreateClientForm({...createClientForm, firstName: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                        required />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Last Name *</label>
                      <input type="text" value={createClientForm.lastName}
                        onChange={e => setCreateClientForm({...createClientForm, lastName: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                        required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Email</label>
                    <input type="email" value={createClientForm.email}
                      onChange={e => setCreateClientForm({...createClientForm, email: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Phone</label>
                    <input type="tel" value={createClientForm.phone}
                      onChange={e => setCreateClientForm({...createClientForm, phone: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Password *</label>
                    <input type="password" value={createClientForm.password}
                      onChange={e => setCreateClientForm({...createClientForm, password: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                      required />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowCreateClientModal(false)}
                      className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
                      Cancel
                    </button>
                    <button type="submit"
                      className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium">
                      Create
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── CALENDAR VIEW (default) ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header — matches client book/consult style */}
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-orange-500">AMarsBody</h1>
          <button
            onClick={() => setAdminView("clients")}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            Clients
          </button>
          <button
            onClick={logout}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Calendar fills the screen */}
      <div className="max-w-7xl mx-auto px-4 pb-4">
        <GoogleCalendar
          mode="admin"
          clients={clients}
          appointments={appointments}
          blockedTimes={blockedTimes}
          onRefresh={loadData}
          onBook={handleBook}
          onCancel={handleCancel}
          onReschedule={handleRescheduleClick}
        />
      </div>

      {/* Booking Modal — same style as client book, max-w-md centered card */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-xl font-bold text-orange-500">
                {rescheduleId ? "Reschedule" : "Add Appointment"}
              </h3>
            </div>

            {/* Client / Personal toggle */}
            {!rescheduleId && (
              <div className="px-4 pt-4">
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setBookingMode("client")}
                    className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-colors ${
                      bookingMode === "client" ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    Client
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingMode("personal")}
                    className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-colors ${
                      bookingMode === "personal" ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    Personal / Block
                  </button>
                </div>
              </div>
            )}

            <form
              onSubmit={rescheduleId ? handleReschedule : handleCreateAppointment}
              className="p-4 space-y-4"
            >
              {bookingMode === "client" || rescheduleId ? (
                <select
                  value={appointmentForm.clientId}
                  onChange={e => setAppointmentForm({ ...appointmentForm, clientId: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500 text-base"
                  required={bookingMode === "client" && !rescheduleId}
                >
                  <option value="">Select Client</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={personalLabel}
                  onChange={e => setPersonalLabel(e.target.value)}
                  placeholder="Personal Block (optional)"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500 text-base"
                />
              )}

              <input
                type="date"
                value={appointmentForm.date}
                onChange={e => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500 text-base"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Start</label>
                  <select
                    value={appointmentForm.startTime}
                    onChange={e => setAppointmentForm({ ...appointmentForm, startTime: e.target.value })}
                    className="w-full px-3 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500 text-base"
                  >
                    {timeSlots.map(t => <option key={t} value={t}>{formatTime(t)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">End</label>
                  <select
                    value={appointmentForm.endTime}
                    onChange={e => setAppointmentForm({ ...appointmentForm, endTime: e.target.value })}
                    className="w-full px-3 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500 text-base"
                  >
                    {timeSlots.map(t => <option key={t} value={t}>{formatTime(t)}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowBookingModal(false); setRescheduleId(null); setBookingMode("client"); setPersonalLabel(""); }}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 rounded-lg font-semibold transition-colors"
                >
                  {rescheduleId ? "Update" : "Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
