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
  isRecurring: boolean;
  recurringPattern?: string;
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  endDate?: string | null;
}

export default function AdminPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [activeTab, setActiveTab] = useState<"calendar" | "block" | "schedule" | "clients">("calendar");
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  
  // Form states
  const [blockType, setBlockType] = useState<"single" | "recurring">("single");
  const [blockForm, setBlockForm] = useState({ 
    date: "", 
    startTime: "08:00", 
    endTime: "09:00", 
    isRecurring: false, 
    recurringPattern: "",
    daysOfWeek: [] as number[],
    endDate: "",
    noEndDate: false
  });
  // Schedule Client form state
  const [scheduleClientForm, setScheduleClientForm] = useState({
    clientId: "",
    startTime: "08:00",
    endTime: "09:00",
    daysOfWeek: [] as number[],
    endDate: "",
    noEndDate: false
  });
  const [appointmentForm, setAppointmentForm] = useState({ clientId: "", date: "", startTime: "08:00", endTime: "09:00" });
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  
  // Create Client form state
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [createClientForm, setCreateClientForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: ""
  });

  useEffect(() => {
    // Check admin auth
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
        fetch("/api/calendar/blocked")
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

  const handleBlockTime = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      action: "block",
      date: blockForm.date,
      startTime: blockForm.startTime,
      endTime: blockForm.endTime,
      isRecurring: blockType === "recurring",
      daysOfWeek: blockType === "recurring" ? blockForm.daysOfWeek : null,
      endDate: blockType === "recurring" && blockForm.endDate ? blockForm.endDate : null
    };
    
    try {
      const res = await fetch("/api/calendar/blocked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setBlockForm({ date: "", startTime: "08:00", endTime: "09:00", isRecurring: false, recurringPattern: "", daysOfWeek: [], endDate: "", noEndDate: false });
        setBlockType("single");
        loadData();
      }
    } catch (err) {
      console.error("Failed to block time:", err);
    }
  };

  const handleUnblockTime = async (id: string) => {
    try {
      const res = await fetch("/api/calendar/blocked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unblock", id })
      });
      
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error("Failed to unblock time:", err);
    }
  };

  const handleScheduleClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!scheduleClientForm.clientId) {
      alert("Please select a client");
      return;
    }
    
    if (scheduleClientForm.daysOfWeek.length === 0) {
      alert("Please select at least one day");
      return;
    }
    
    // Get the client to display name
    const client = clients.find(c => c.id === scheduleClientForm.clientId);
    if (!client) return;
    
    if (!confirm(`Schedule recurring appointments for ${client.firstName} ${client.lastName}?\n\nDays: ${scheduleClientForm.daysOfWeek.sort().map(d => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ")}\nTime: ${formatTime(scheduleClientForm.startTime)} - ${formatTime(scheduleClientForm.endTime)}\n${scheduleClientForm.noEndDate ? "No end date" : `Until: ${scheduleClientForm.endDate}`}`)) {
      return;
    }
    
    try {
      const res = await fetch("/api/calendar/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "schedule-recurring",
          clientId: scheduleClientForm.clientId,
          startTime: scheduleClientForm.startTime,
          endTime: scheduleClientForm.endTime,
          daysOfWeek: scheduleClientForm.daysOfWeek,
          endDate: scheduleClientForm.noEndDate ? null : scheduleClientForm.endDate
        })
      });
      
      if (res.ok) {
        setScheduleClientForm({
          clientId: "",
          startTime: "08:00",
          endTime: "09:00",
          daysOfWeek: [],
          endDate: "",
          noEndDate: false
        });
        loadData();
        alert("Client scheduled successfully!");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to schedule client");
      }
    } catch (err) {
      console.error("Failed to schedule client:", err);
      alert("Failed to schedule client");
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch("/api/calendar/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...appointmentForm })
      });
      
      if (res.ok) {
        setAppointmentForm({ clientId: "", date: "", startTime: "08:00", endTime: "09:00" });
        loadData();
        setShowBookingModal(false);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create appointment");
      }
    } catch (err) {
      console.error("Failed to create appointment:", err);
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleId) return;
    
    try {
      const res = await fetch("/api/calendar/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "reschedule", 
          id: rescheduleId,
          ...appointmentForm 
        })
      });
      
      if (res.ok) {
        setRescheduleId(null);
        setAppointmentForm({ clientId: "", date: "", startTime: "08:00", endTime: "09:00" });
        loadData();
        setShowBookingModal(false);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to reschedule");
      }
    } catch (err) {
      console.error("Failed to reschedule:", err);
    }
  };

  const handleCancelAppointment = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    
    try {
      const res = await fetch("/api/calendar/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", id })
      });
      
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error("Failed to cancel appointment:", err);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client? This will also remove their appointments.')) return;
    
    try {
      const res = await fetch(`/api/calendar/clients?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setClients(clients.filter(c => c.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete client');
      }
    } catch (err) {
      console.error('Failed to delete client:', err);
      alert('Failed to delete client');
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createClientForm.firstName || !createClientForm.lastName || !createClientForm.password) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      const res = await fetch('/api/calendar/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'create',
          firstName: createClientForm.firstName,
          lastName: createClientForm.lastName,
          email: createClientForm.email,
          phone: createClientForm.phone,
          password: createClientForm.password
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setShowCreateClientModal(false);
        setCreateClientForm({ firstName: "", lastName: "", email: "", phone: "", password: "" });
        loadData();
        alert('Client created successfully!');
      } else {
        alert(data.error || 'Failed to create client');
      }
    } catch (err) {
      console.error('Failed to create client:', err);
      alert('Failed to create client');
    }
  };

  // Calendar callback handlers
  const handleBook = useCallback((date: string, startTime: string, endTime: string) => {
    setAppointmentForm({
      clientId: "",
      date,
      startTime,
      endTime
    });
    setRescheduleId(null);
    setShowBookingModal(true);
  }, []);

  const handleCancel = useCallback(async (id: string) => {
    await handleCancelAppointment(id);
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

  const logout = () => {
    localStorage.removeItem("calendarAdmin");
    router.push("/calendar");
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    return `${h > 12 ? h - 12 : h}:${minutes} ${h >= 12 ? "PM" : "AM"}`;
  };

  const timeSlots = [];
  for (let hour = 4; hour <= 18; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
    timeSlots.push(`${hour.toString().padStart(2, "0")}:30`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <p className="text-orange-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-orange-500">Admin Dashboard</h1>
          <button
            onClick={logout}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "calendar" ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400"
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveTab("block")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "block" ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400"
            }`}
          >
            Block Time
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "schedule" ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400"
            }`}
          >
            Schedule Client
          </button>
          <button
            onClick={() => setActiveTab("clients")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "clients" ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400"
            }`}
          >
            Clients ({clients.length})
          </button>
        </div>

        {/* Calendar Tab */}
        {activeTab === "calendar" && (
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
        )}

        {/* Block Time Tab */}
        {activeTab === "block" && (
          <div className="space-y-6">
            {/* Block Form */}
            <div className="bg-gray-900 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Block Time</h3>
              
              {/* Block Type Toggle */}
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="blockType"
                    checked={blockType === "single"}
                    onChange={() => setBlockType("single")}
                    className="w-4 h-4 text-orange-500"
                  />
                  <span className="text-white">Single Day</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="blockType"
                    checked={blockType === "recurring"}
                    onChange={() => setBlockType("recurring")}
                    className="w-4 h-4 text-orange-500"
                  />
                  <span className="text-white">Recurring (Days of Week)</span>
                </label>
              </div>

              <form onSubmit={handleBlockTime} className="space-y-4">
                {/* Single Day Options */}
                {blockType === "single" && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <input
                      type="date"
                      value={blockForm.date}
                      onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })}
                      className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                      required={blockType === "single"}
                    />
                    <select
                      value={blockForm.startTime}
                      onChange={(e) => setBlockForm({ ...blockForm, startTime: e.target.value })}
                      className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    >
                      {timeSlots.map(time => (
                        <option key={time} value={time}>{formatTime(time)}</option>
                      ))}
                    </select>
                    <select
                      value={blockForm.endTime}
                      onChange={(e) => setBlockForm({ ...blockForm, endTime: e.target.value })}
                      className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    >
                      {timeSlots.map(time => (
                        <option key={time} value={time}>{formatTime(time)}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
                    >
                      Block
                    </button>
                  </div>
                )}

                {/* Recurring Days Options */}
                {blockType === "recurring" && (
                  <div className="space-y-4">
                    {/* Days of Week */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Select Days:</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { num: 1, label: "Mon" },
                          { num: 2, label: "Tue" },
                          { num: 3, label: "Wed" },
                          { num: 4, label: "Thu" },
                          { num: 5, label: "Fri" },
                          { num: 6, label: "Sat" },
                          { num: 0, label: "Sun" }
                        ].map(day => (
                          <label
                            key={day.num}
                            className={`
                              flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors border
                              ${blockForm.daysOfWeek.includes(day.num)
                                ? "bg-orange-500/20 border-orange-500 text-orange-500"
                                : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                              }
                            `}
                          >
                            <input
                              type="checkbox"
                              checked={blockForm.daysOfWeek.includes(day.num)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setBlockForm({ ...blockForm, daysOfWeek: [...blockForm.daysOfWeek, day.num] });
                                } else {
                                  setBlockForm({ ...blockForm, daysOfWeek: blockForm.daysOfWeek.filter(d => d !== day.num) });
                                }
                              }}
                              className="w-4 h-4"
                            />
                            {day.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Time Range */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="col-span-1">
                        <label className="block text-sm text-gray-400 mb-1">Start Time:</label>
                        <select
                          value={blockForm.startTime}
                          onChange={(e) => setBlockForm({ ...blockForm, startTime: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                        >
                          {timeSlots.map(time => (
                            <option key={time} value={time}>{formatTime(time)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-1">
                        <label className="block text-sm text-gray-400 mb-1">End Time:</label>
                        <select
                          value={blockForm.endTime}
                          onChange={(e) => setBlockForm({ ...blockForm, endTime: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                        >
                          {timeSlots.map(time => (
                            <option key={time} value={time}>{formatTime(time)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-1">
                        <label className="block text-sm text-gray-400 mb-1">End Date:</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={blockForm.endDate}
                            onChange={(e) => setBlockForm({ ...blockForm, endDate: e.target.value })}
                            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                            disabled={blockForm.noEndDate}
                          />
                          <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={blockForm.noEndDate}
                              onChange={(e) => setBlockForm({ ...blockForm, noEndDate: e.target.checked, endDate: e.target.checked ? "" : blockForm.endDate })}
                              className="w-4 h-4 text-orange-500 rounded"
                            />
                            <span className="text-sm text-gray-400">No end date</span>
                          </label>
                        </div>
                      </div>
                      <div className="col-span-1 flex items-end">
                        <button
                          type="submit"
                          disabled={blockForm.daysOfWeek.length === 0}
                          className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                        >
                          Block
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Blocked Times List */}
            <div className="bg-gray-900 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Blocked Times</h3>
              {blockedTimes.length === 0 ? (
                <p className="text-gray-400">No blocked times</p>
              ) : (
                <div className="space-y-2">
                  {blockedTimes.map(blk => (
                    <div key={blk.id} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                      <div>
                        {blk.isRecurring && blk.daysOfWeek ? (
                          <p className="font-medium">
                            {blk.daysOfWeek.sort().map(d => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ")}
                          </p>
                        ) : (
                          <p className="font-medium">{blk.date}</p>
                        )}
                        <p className="text-sm text-gray-400">
                          {formatTime(blk.startTime)} - {formatTime(blk.endTime)}
                          {blk.isRecurring && (
                            <span className="ml-2 text-orange-500">
                              {blk.endDate ? `Until ${blk.endDate}` : "No end date"}
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => handleUnblockTime(blk.id)}
                        className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded transition-colors"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Schedule Client Tab */}
        {activeTab === "schedule" && (
          <div className="space-y-6">
            {/* Schedule Client Form */}
            <div className="bg-gray-900 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Schedule Recurring Client Appointments</h3>
              <p className="text-gray-400 text-sm mb-4">
                Create recurring appointments for a client on specific days of the week.
              </p>
              
              <form onSubmit={handleScheduleClient} className="space-y-4">
                {/* Client Selection */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Select Client:</label>
                  <select
                    value={scheduleClientForm.clientId}
                    onChange={(e) => setScheduleClientForm({ ...scheduleClientForm, clientId: e.target.value })}
                    className="w-full md:w-1/2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    required
                  >
                    <option value="">Select a client...</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.firstName} {client.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Days of Week */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Select Days:</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { num: 1, label: "Mon" },
                      { num: 2, label: "Tue" },
                      { num: 3, label: "Wed" },
                      { num: 4, label: "Thu" },
                      { num: 5, label: "Fri" },
                      { num: 6, label: "Sat" },
                      { num: 0, label: "Sun" }
                    ].map(day => (
                      <label
                        key={day.num}
                        className={`
                          flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors border
                          ${scheduleClientForm.daysOfWeek.includes(day.num)
                            ? "bg-orange-500/20 border-orange-500 text-orange-500"
                            : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                          }
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={scheduleClientForm.daysOfWeek.includes(day.num)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setScheduleClientForm({ ...scheduleClientForm, daysOfWeek: [...scheduleClientForm.daysOfWeek, day.num] });
                            } else {
                              setScheduleClientForm({ ...scheduleClientForm, daysOfWeek: scheduleClientForm.daysOfWeek.filter(d => d !== day.num) });
                            }
                          }}
                          className="w-4 h-4"
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Time Range */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="col-span-1">
                    <label className="block text-sm text-gray-400 mb-1">Start Time:</label>
                    <select
                      value={scheduleClientForm.startTime}
                      onChange={(e) => setScheduleClientForm({ ...scheduleClientForm, startTime: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    >
                      {timeSlots.map(time => (
                        <option key={time} value={time}>{formatTime(time)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm text-gray-400 mb-1">End Time:</label>
                    <select
                      value={scheduleClientForm.endTime}
                      onChange={(e) => setScheduleClientForm({ ...scheduleClientForm, endTime: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    >
                      {timeSlots.map(time => (
                        <option key={time} value={time}>{formatTime(time)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm text-gray-400 mb-1">End Date:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={scheduleClientForm.endDate}
                        onChange={(e) => setScheduleClientForm({ ...scheduleClientForm, endDate: e.target.value })}
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                        disabled={scheduleClientForm.noEndDate}
                      />
                      <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={scheduleClientForm.noEndDate}
                          onChange={(e) => setScheduleClientForm({ ...scheduleClientForm, noEndDate: e.target.checked, endDate: e.target.checked ? "" : scheduleClientForm.endDate })}
                          className="w-4 h-4 text-orange-500 rounded"
                        />
                        <span className="text-sm text-gray-400">No end</span>
                      </label>
                    </div>
                  </div>
                  <div className="col-span-1 flex items-end">
                    <button
                      type="submit"
                      disabled={!scheduleClientForm.clientId || scheduleClientForm.daysOfWeek.length === 0}
                      className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      Schedule
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Existing Recurring Appointments Info */}
            <div className="bg-gray-900 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Upcoming Appointments</h3>
              <p className="text-gray-400 text-sm">
                View the calendar to see all scheduled appointments. Use the calendar view to manage or cancel individual appointments.
              </p>
            </div>
          </div>
        )}

        {/* Clients Tab */}
        {activeTab === "clients" && (
          <div className="bg-gray-900 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">All Clients</h3>
              <button
                type="button"
                onClick={() => setShowCreateClientModal(true)}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm"
              >
                + Add Client
              </button>
            </div>
            {clients.length === 0 ? (
              <p className="text-gray-400">No clients registered</p>
            ) : (
              <div className="space-y-2">
                {clients.map(client => (
                  <div key={client.id} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium">{client.firstName} {client.lastName}</p>
                      <p className="text-sm text-gray-400">
                        {client.email} {client.phone && `• ${client.phone}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteClient(client.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-xl font-bold">
                {rescheduleId ? "Reschedule Appointment" : "Book New Appointment"}
              </h3>
            </div>
            <form onSubmit={rescheduleId ? handleReschedule : handleCreateAppointment} className="p-4 space-y-4">
              <select
                value={appointmentForm.clientId}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, clientId: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                required
              >
                <option value="">Select Client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.firstName} {client.lastName}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={appointmentForm.date}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={appointmentForm.startTime}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, startTime: e.target.value })}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  {timeSlots.map(time => (
                    <option key={time} value={time}>{formatTime(time)}</option>
                  ))}
                </select>
                <select
                  value={appointmentForm.endTime}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, endTime: e.target.value })}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  {timeSlots.map(time => (
                    <option key={time} value={time}>{formatTime(time)}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowBookingModal(false); setRescheduleId(null); }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
                >
                  {rescheduleId ? "Update" : "Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Client Modal */}
      {showCreateClientModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-xl font-bold">Add New Client</h3>
            </div>
            <form onSubmit={handleCreateClient} className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">First Name *</label>
                <input
                  type="text"
                  value={createClientForm.firstName}
                  onChange={(e) => setCreateClientForm({ ...createClientForm, firstName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Last Name *</label>
                <input
                  type="text"
                  value={createClientForm.lastName}
                  onChange={(e) => setCreateClientForm({ ...createClientForm, lastName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={createClientForm.email}
                  onChange={(e) => setCreateClientForm({ ...createClientForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Phone</label>
                <input
                  type="tel"
                  value={createClientForm.phone}
                  onChange={(e) => setCreateClientForm({ ...createClientForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Password *</label>
                <input
                  type="password"
                  value={createClientForm.password}
                  onChange={(e) => setCreateClientForm({ ...createClientForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateClientModal(false);
                    setCreateClientForm({ firstName: "", lastName: "", email: "", phone: "", password: "" });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
                >
                  Create Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
