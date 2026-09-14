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
  unusedCredits?: number;
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
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  endDate?: string | null;
}

export default function AdminPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [activeTab, setActiveTab] = useState<"calendar" | "block" | "schedule" | "clients" | "consult">("calendar");
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
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  // Schedule Client form state
  const [scheduleClientForm, setScheduleClientForm] = useState({
    clientId: "",
    startTime: "08:00",
    endTime: "09:00",
    daysOfWeek: [] as number[],
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
    noEndDate: false
  });
  const [appointmentForm, setAppointmentForm] = useState({ clientId: "", date: "", startTime: "08:00", endTime: "09:00" });
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [bookingMode, setBookingMode] = useState<"client" | "personal">("client");
  const [personalLabel, setPersonalLabel] = useState("");
  const [viewClientId, setViewClientId] = useState<string | null>(null);
  
  // Create Client form state
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [createClientForm, setCreateClientForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: ""
  });

  // Consult settings state
  const [consultSettings, setConsultSettings] = useState({
    duration: 30 as 30 | 60,
    openDays: [1, 2, 3, 4, 5] as number[],
    openHours: { start: 9, end: 20 },
    ctaText: "Book a Free Consultation"
  });
  const [consultSettingsOpen, setConsultSettingsOpen] = useState(false);
  const [consultSaving, setConsultSaving] = useState(false);

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
      const [clientsRes, appointmentsRes, blockedRes, settingsRes] = await Promise.all([
        fetch("/api/calendar/clients"),
        fetch("/api/calendar/appointments"),
        fetch("/api/calendar/blocked"),
        fetch("/api/calendar/consult-settings")
      ]);
      
      setClients(await clientsRes.json());
      setAppointments(await appointmentsRes.json());
      setBlockedTimes(await blockedRes.json());
      const settingsData = await settingsRes.json();
      setConsultSettings({
        duration: settingsData.duration || 30,
        openDays: settingsData.openDays || [1, 2, 3, 4, 5],
        openHours: settingsData.openHours || { start: 9, end: 20 },
        ctaText: settingsData.ctaText || "Book a Free Consultation"
      });
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockTime = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = editingBlockId
      ? {
          action: "update",
          id: editingBlockId,
          date: blockForm.date,
          startTime: blockForm.startTime,
          endTime: blockForm.endTime,
          isRecurring: blockType === "recurring",
          daysOfWeek: blockType === "recurring" ? blockForm.daysOfWeek : null,
          endDate: blockType === "recurring" && blockForm.endDate ? blockForm.endDate : null
        }
      : {
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
        setEditingBlockId(null);
        loadData();
      }
    } catch (err) {
      console.error("Failed to block time:", err);
    }
  };

  const handleEditBlock = (blk: BlockedTime) => {
    setEditingBlockId(blk.id);
    setBlockForm({
      date: blk.date || "",
      startTime: blk.startTime,
      endTime: blk.endTime,
      isRecurring: blk.isRecurring || false,
      recurringPattern: "",
      daysOfWeek: blk.daysOfWeek || [],
      endDate: blk.endDate || "",
      noEndDate: !blk.endDate
    });
    setBlockType(blk.isRecurring ? "recurring" : "single");
  };

  const handleCancelEditBlock = () => {
    setEditingBlockId(null);
    setBlockForm({ date: "", startTime: "08:00", endTime: "09:00", isRecurring: false, recurringPattern: "", daysOfWeek: [], endDate: "", noEndDate: false });
    setBlockType("single");
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
    
    if (!confirm(`Schedule recurring appointments for ${client.firstName} ${client.lastName}?\n\nStart Date: ${scheduleClientForm.startDate}\nDays: ${scheduleClientForm.daysOfWeek.sort().map(d => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ")}\nTime: ${formatTime(scheduleClientForm.startTime)} - ${formatTime(scheduleClientForm.endTime)}\n${scheduleClientForm.noEndDate ? "No end date" : `Until: ${scheduleClientForm.endDate}`}`)) {
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
          startDate: scheduleClientForm.startDate,
          endDate: scheduleClientForm.noEndDate ? null : scheduleClientForm.endDate
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        // Update client credit badge immediately
        if (data.unusedCredits !== undefined) {
          setClients(clients.map(c => c.id === scheduleClientForm.clientId ? { ...c, unusedCredits: data.unusedCredits } : c));
        }
        setScheduleClientForm({
          clientId: "",
          startTime: "08:00",
          endTime: "09:00",
          daysOfWeek: [],
          startDate: new Date().toISOString().split('T')[0],
          endDate: "",
          noEndDate: false
        });
        loadData();
        alert(`Client scheduled successfully! Created ${data.appointments?.length ?? 0} appointment(s).`);
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const data = await res.json();
        // Update client credit badge immediately (personal blocks don't affect credits)
        if (data.unusedCredits !== undefined && appointmentForm.clientId) {
          setClients(clients.map(c => c.id === appointmentForm.clientId ? { ...c, unusedCredits: data.unusedCredits } : c));
        }
        setAppointmentForm({ clientId: "", date: "", startTime: "08:00", endTime: "09:00" });
        setPersonalLabel("");
        setBookingMode("client");
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

  const handleAdjustSessions = async (clientId: string, delta: number) => {
    const action = delta > 0 ? 'addSessions' : 'removeSessions';
    try {
      const res = await fetch('/api/calendar/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id: clientId, delta })
      });
      if (res.ok) {
        const data = await res.json();
        setClients(clients.map(c => c.id === clientId ? { ...c, unusedCredits: data.unusedCredits } : c));
      }
    } catch (err) {
      console.error('Failed to adjust sessions:', err);
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
    setBookingMode("client");
    setPersonalLabel("");
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
  for (let hour = 4; hour <= 20; hour++) {
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
      {/* Header — AmarsBody branded */}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">AMarsBody</h1>
                <p className="text-xs text-gray-500 -mt-0.5">Admin Calendar</p>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="group flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-700 hover:border-gray-500 hover:bg-gray-800/60 text-gray-400 hover:text-white transition-all duration-200"
          >
            <svg className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>

        {/* Tabs — scrollable on mobile with snap */}
        <div className="flex gap-1 sm:gap-1.5 mb-8 p-1 bg-gray-900/60 border border-gray-800 rounded-2xl overflow-x-auto snap-x scrollbar-hide w-full sm:w-auto whitespace-nowrap flex-nowrap">
          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 shrink-0 snap-start ${
              activeTab === "calendar"
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                : "text-gray-400 hover:text-white hover:bg-gray-800/80"
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveTab("block")}
            className={`px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 shrink-0 snap-start ${
              activeTab === "block"
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                : "text-gray-400 hover:text-white hover:bg-gray-800/80"
            }`}
          >
            Block
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            className={`px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 shrink-0 snap-start ${
              activeTab === "schedule"
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                : "text-gray-400 hover:text-white hover:bg-gray-800/80"
            }`}
          >
            Schedule
          </button>
          <button
            onClick={() => setActiveTab("clients")}
            className={`px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 shrink-0 snap-start ${
              activeTab === "clients"
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                : "text-gray-400 hover:text-white hover:bg-gray-800/80"
            }`}
          >
            Clients ({clients.length})
          </button>
          <button
            onClick={() => setActiveTab("consult")}
            className={`px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 shrink-0 snap-start ${
              activeTab === "consult"
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                : "text-gray-400 hover:text-white hover:bg-gray-800/80"
            }`}
          >
            Consult
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
          <div className="space-y-5">
            {/* Block Form */}
            <div className="bg-gray-900/70 border border-gray-800 p-5 rounded-2xl">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {editingBlockId ? "Edit Block" : "Block Time"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {editingBlockId ? "Update the blocked time settings below." : "Reserve time slots that are unavailable for appointments."}
                  </p>
                </div>
                {editingBlockId && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCancelEditBlock}
                      className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-gray-300 leading-none"
                      aria-label="Close edit"
                    >
                      ✕
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditBlock}
                      className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors font-medium text-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Block Type Toggle */}
              <div className="flex gap-3 mb-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="blockType"
                    checked={blockType === "single"}
                    onChange={() => setBlockType("single")}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-sm text-gray-300">Single Day</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="blockType"
                    checked={blockType === "recurring"}
                    onChange={() => setBlockType("recurring")}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-sm text-gray-300">Recurring (Days of Week)</span>
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
                      className="px-3 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                      required={blockType === "single"}
                    />
                    <select
                      value={blockForm.startTime}
                      onChange={(e) => setBlockForm({ ...blockForm, startTime: e.target.value })}
                      className="px-3 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                    >
                      {timeSlots.map(time => (
                        <option key={time} value={time}>{formatTime(time)}</option>
                      ))}
                    </select>
                    <select
                      value={blockForm.endTime}
                      onChange={(e) => setBlockForm({ ...blockForm, endTime: e.target.value })}
                      className="px-3 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                    >
                      {timeSlots.map(time => (
                        <option key={time} value={time}>{formatTime(time)}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/20 rounded-xl font-medium transition-all duration-200"
                    >
                      {editingBlockId ? "Update" : "Block"}
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
                              flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 border
                              ${blockForm.daysOfWeek.includes(day.num)
                                ? "bg-orange-500/15 border-orange-500/60 text-orange-400"
                                : "bg-gray-800/60 border-gray-700/60 text-gray-400 hover:border-gray-500 hover:text-gray-200"
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
                              className="w-4 h-4 accent-orange-500"
                            />
                            {day.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Time Range */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="col-span-1">
                        <label className="block text-sm text-gray-400 mb-1.5">Start Time:</label>
                        <select
                          value={blockForm.startTime}
                          onChange={(e) => setBlockForm({ ...blockForm, startTime: e.target.value })}
                          className="w-full px-3 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                        >
                          {timeSlots.map(time => (
                            <option key={time} value={time}>{formatTime(time)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-1">
                        <label className="block text-sm text-gray-400 mb-1.5">End Time:</label>
                        <select
                          value={blockForm.endTime}
                          onChange={(e) => setBlockForm({ ...blockForm, endTime: e.target.value })}
                          className="w-full px-3 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                        >
                          {timeSlots.map(time => (
                            <option key={time} value={time}>{formatTime(time)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-1">
                        <label className="block text-sm text-gray-400 mb-1.5">End Date:</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={blockForm.endDate}
                            onChange={(e) => setBlockForm({ ...blockForm, endDate: e.target.value })}
                            className="flex-1 px-3 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                            disabled={blockForm.noEndDate}
                          />
                          <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={blockForm.noEndDate}
                              onChange={(e) => setBlockForm({ ...blockForm, noEndDate: e.target.checked, endDate: e.target.checked ? "" : blockForm.endDate })}
                              className="w-4 h-4 accent-orange-500 rounded"
                            />
                            <span className="text-sm text-gray-400">No end</span>
                          </label>
                        </div>
                      </div>
                      <div className="col-span-1 flex items-end">
                        <button
                          type="submit"
                          disabled={blockForm.daysOfWeek.length === 0}
                          className="w-full px-4 py-2.5 bg-orange-500 hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/20 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl font-medium transition-all duration-200"
                        >
                          {editingBlockId ? "Update" : "Block"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Blocked Times List */}
            <div className="bg-gray-900/70 border border-gray-800 p-5 rounded-2xl">
              <h3 className="text-base font-semibold text-white mb-4">Blocked Times</h3>
              {blockedTimes.length === 0 ? (
                <p className="text-gray-500 text-sm py-4 text-center">No blocked times set.</p>
              ) : (
                <div className="space-y-2">
                  {blockedTimes.map(blk => (
                    <div key={blk.id} className={`flex justify-between items-center p-3.5 bg-gray-800/60 border rounded-xl ${editingBlockId === blk.id ? "border-orange-500/60" : "border-gray-700/50"}`}>
                      <div>
                        {blk.isRecurring && blk.daysOfWeek ? (
                          <p className="font-medium text-white">
                            {blk.daysOfWeek.sort().map(d => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ")}
                          </p>
                        ) : (
                          <p className="font-medium text-white">{blk.date}</p>
                        )}
                        <p className="text-sm text-gray-400">
                          {formatTime(blk.startTime)} – {formatTime(blk.endTime)}
                          {blk.isRecurring && (
                            <span className="ml-2 text-orange-400/70">
                              {blk.endDate ? `Until ${blk.endDate}` : "Open-ended"}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditBlock(blk)}
                          className="px-3 py-1.5 text-sm bg-blue-600/80 hover:bg-blue-600 rounded-lg transition-colors font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleUnblockTime(blk.id)}
                          className="px-3 py-1.5 text-sm bg-red-600/80 hover:bg-red-600 rounded-lg transition-colors font-medium"
                        >
                          Unblock
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Schedule Client Tab */}
        {activeTab === "schedule" && (
          <div className="space-y-5">
            {/* Schedule Client Form */}
            <div className="bg-gray-900/70 border border-gray-800 p-5 rounded-2xl">
              <h3 className="text-base font-semibold text-white mb-1">Schedule Recurring Appointments</h3>
              <p className="text-gray-500 text-sm mb-5">
                Create recurring sessions for a client on specific days of the week.
              </p>
              
              <form onSubmit={handleScheduleClient} className="space-y-4">
                {/* Client Selection */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Client</label>
                  <select
                    value={scheduleClientForm.clientId}
                    onChange={(e) => setScheduleClientForm({ ...scheduleClientForm, clientId: e.target.value })}
                    className="w-full md:w-1/2 px-3 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
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
                          flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 border
                          ${scheduleClientForm.daysOfWeek.includes(day.num)
                            ? "bg-orange-500/15 border-orange-500/60 text-orange-400"
                            : "bg-gray-800/60 border-gray-700/60 text-gray-400 hover:border-gray-500 hover:text-gray-200"
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
                          className="w-4 h-4 accent-orange-500"
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Time Range */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="col-span-1">
                    <label className="block text-sm text-gray-400 mb-1.5">Start Time:</label>
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
                    <label className="block text-sm text-gray-400 mb-1.5">End Time:</label>
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
                    <label className="block text-sm text-gray-400 mb-1.5">Start Date:</label>
                    <input
                      type="date"
                      value={scheduleClientForm.startDate}
                      onChange={(e) => setScheduleClientForm({ ...scheduleClientForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm text-gray-400 mb-1.5">End Date:</label>
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
                          className="w-4 h-4 accent-orange-500 rounded"
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
          <div className="bg-gray-900/70 border border-gray-800 p-5 rounded-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-semibold text-white">All Clients</h3>
              <button
                type="button"
                onClick={() => setShowCreateClientModal(true)}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/20 text-white rounded-xl text-sm font-medium transition-all duration-200"
              >
                + Add Client
              </button>
            </div>
            {clients.length === 0 ? (
              <p className="text-gray-500 text-sm py-6 text-center">No clients registered yet.</p>
            ) : (
              <div className="space-y-2">
                {[...clients].sort((a, b) => a.firstName.localeCompare(b.firstName, undefined, { sensitivity: 'base' }) || a.lastName.localeCompare(b.lastName, undefined, { sensitivity: 'base' })).map(client => (
                  <div key={client.id} className="flex justify-between items-center p-3.5 bg-gray-800/60 border border-gray-700/50 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setViewClientId(client.id)}
                      className="flex-1 text-left hover:bg-gray-700/60 rounded-xl p-1.5 -m-1.5 transition-colors"
                    >
                      <p className="font-medium text-white">{client.firstName} {client.lastName}</p>
                      <p className="text-sm text-gray-500">
                        {client.email} {client.phone && `• ${client.phone}`}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClient(client.id)}
                      className="ml-3 px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-sm shrink-0 font-medium transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Consult Settings Tab */}
        {activeTab === "consult" && (
          <div className="space-y-5">
            <div className="bg-gray-900/70 border border-gray-800 p-5 rounded-2xl">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <h3 className="text-base font-semibold text-white">Free Consultation Settings</h3>
                  <p className="text-sm text-gray-500">Configure how customers book free consults.</p>
                </div>
              </div>

              <div className="space-y-5 mt-4">
                {/* Duration */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Consultation Duration</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setConsultSettings(s => ({ ...s, duration: 30 }))}
                      className={`py-3 rounded-xl font-medium transition-all border ${
                        consultSettings.duration === 30
                          ? "bg-orange-500/15 border-orange-500/60 text-orange-400"
                          : "bg-gray-800/60 border-gray-700/60 text-gray-400 hover:border-gray-500"
                      }`}
                    >
                      30 minutes
                    </button>
                    <button
                      type="button"
                      onClick={() => setConsultSettings(s => ({ ...s, duration: 60 }))}
                      className={`py-3 rounded-xl font-medium transition-all border ${
                        consultSettings.duration === 60
                          ? "bg-orange-500/15 border-orange-500/60 text-orange-400"
                          : "bg-gray-800/60 border-gray-700/60 text-gray-400 hover:border-gray-500"
                      }`}
                    >
                      60 minutes
                    </button>
                  </div>
                  {consultSettings.duration === 60 && (
                    <p className="text-xs text-gray-500 mt-1">60-min sessions available at :00 only (9:00, 10:00, etc.)</p>
                  )}
                  {consultSettings.duration === 30 && (
                    <p className="text-xs text-gray-500 mt-1">30-min sessions available at :00 and :30</p>
                  )}
                </div>

                {/* Open Days */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Open Days</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { num: 0, label: "Sun" },
                      { num: 1, label: "Mon" },
                      { num: 2, label: "Tue" },
                      { num: 3, label: "Wed" },
                      { num: 4, label: "Thu" },
                      { num: 5, label: "Fri" },
                      { num: 6, label: "Sat" }
                    ].map(day => (
                      <label
                        key={day.num}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 border ${
                          consultSettings.openDays.includes(day.num)
                            ? "bg-orange-500/15 border-orange-500/60 text-orange-400"
                            : "bg-gray-800/60 border-gray-700/60 text-gray-400 hover:border-gray-500"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={consultSettings.openDays.includes(day.num)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setConsultSettings(s => ({
                                ...s,
                                openDays: [...s.openDays, day.num].sort()
                              }));
                            } else {
                              setConsultSettings(s => ({
                                ...s,
                                openDays: s.openDays.filter(d => d !== day.num)
                              }));
                            }
                          }}
                          className="w-4 h-4 accent-orange-500"
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Open Hours */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Open Hours</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Start (hour, 0–23)</label>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={consultSettings.openHours.start}
                        onChange={(e) => setConsultSettings(s => ({
                          ...s,
                          openHours: { ...s.openHours, start: parseInt(e.target.value) || 0 }
                        }))}
                        className="w-full px-3 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">End (hour, 0–23, through 20 = 8pm)</label>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={consultSettings.openHours.end}
                        onChange={(e) => setConsultSettings(s => ({
                          ...s,
                          openHours: { ...s.openHours, end: parseInt(e.target.value) || 20 }
                        }))}
                        className="w-full px-3 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* CTA Text */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Landing Button Text</label>
                  <input
                    type="text"
                    value={consultSettings.ctaText}
                    onChange={(e) => setConsultSettings(s => ({ ...s, ctaText: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                    placeholder="Book a Free Consultation"
                    maxLength={80}
                  />
                  <p className="text-xs text-gray-500 mt-1">{consultSettings.ctaText.length}/80 characters</p>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={consultSaving}
                    onClick={async () => {
                      setConsultSaving(true);
                      try {
                        const res = await fetch("/api/calendar/consult-settings", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(consultSettings)
                        });
                        if (res.ok) {
                          const saved = await res.json();
                          setConsultSettings(saved);
                          alert("Settings saved!");
                        } else {
                          alert("Failed to save settings.");
                        }
                      } catch {
                        alert("Failed to save settings.");
                      } finally {
                        setConsultSaving(false);
                      }
                    }}
                    className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/20 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl font-medium transition-all duration-200"
                  >
                    {consultSaving ? "Saving..." : "Save Settings"}
                  </button>
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="bg-gray-900/50 border border-gray-800 p-5 rounded-2xl">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Preview (what customers see)</h4>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-xs mb-1">Landing button on /calendar</p>
                <div className="py-3 px-6 bg-orange-500 text-white font-semibold rounded-lg inline-block text-sm">
                  {consultSettings.ctaText}
                </div>
                <div className="mt-4 text-left">
                  <p className="text-gray-400 text-xs mb-1">Slots shown for open days ({consultSettings.openDays.map(d => ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d]).join(", ")})</p>
                  <p className="text-gray-400 text-xs">
                    Hours: {consultSettings.openHours.start}:00 – {consultSettings.openHours.end}:00
                    {consultSettings.openHours.end === 20 && " (through 8pm)"}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Duration: {consultSettings.duration} min
                    {consultSettings.duration === 60 ? " → :00 slots only" : " → :00/:30 slots"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Client Session View Modal */}
      {viewClientId && (() => {
        const client = clients.find(c => c.id === viewClientId);
        const clientAppts = appointments.filter(a => a.clientId === viewClientId && a.status !== 'cancelled');
        if (!client) return null;
        const unusedCredits = client.unusedCredits ?? 0;
        return (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-gray-800 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-xl font-bold">{client.firstName} {client.lastName}'s Sessions</h3>
                  <p className="text-sm text-gray-400">{client.email} {client.phone && `• ${client.phone}`}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewClientId(null)}
                  className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-lg leading-none"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              {/* Credits control */}
              <div className="px-4 pt-3 pb-1 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="bg-orange-500/15 border border-orange-500/30 rounded-lg px-3 py-2">
                  <p className="text-sm text-gray-400">Unused / remaining</p>
                  <p className="text-lg font-bold text-orange-400">{unusedCredits} session{unusedCredits !== 1 ? 's' : ''} left to schedule</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val > 0) handleAdjustSessions(client.id, val);
                      e.target.value = '';
                    }}
                    className="px-2 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm min-w-[100px]"
                    defaultValue=""
                  >
                    <option value="">Add pack...</option>
                    <option value="12">12 sessions</option>
                    <option value="18">18 sessions</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleAdjustSessions(client.id, -1)}
                    disabled={unusedCredits <= 0}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white rounded-lg text-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustSessions(client.id, 1)}
                    className="px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-lg font-medium min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                {clientAppts.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No sessions scheduled for {client.firstName}.</p>
                ) : (
                  <div className="space-y-2">
                    {clientAppts
                      .sort((a, b) => a.date < b.date ? 1 : -1)
                      .map(apt => (
                        <div key={apt.id} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                          <div>
                            <p className="font-medium">{apt.date}</p>
                            <p className="text-sm text-gray-400">
                              {formatTime(apt.startTime)} – {formatTime(apt.endTime)}
                              <span className={`ml-2 inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                apt.status === 'completed' ? 'bg-green-900 text-green-300' :
                                apt.status === 'cancelled' ? 'bg-red-900 text-red-300' :
                                apt.status === 'consultation' ? 'bg-blue-900 text-blue-300' :
                                'bg-orange-900 text-orange-300'
                              }`}>
                                {apt.status}
                              </span>
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => { setRescheduleId(apt.id); setShowBookingModal(true); }}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                            >
                              Reschedule
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelAppointment(apt.id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full shadow-2xl shadow-black/50">
            <div className="p-5 border-b border-gray-800/80 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">
                {rescheduleId ? "Reschedule Appointment" : "Book New Appointment"}
              </h3>
              <button
                type="button"
                onClick={() => { setShowBookingModal(false); setRescheduleId(null); setBookingMode("client"); setPersonalLabel(""); }}
                className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-lg leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={rescheduleId ? handleReschedule : handleCreateAppointment} className="p-5 space-y-4">
              {/* Client / Non-Client toggle */}
              {!rescheduleId && (
                <div className="flex gap-2 p-1 bg-gray-800/80 rounded-xl mb-1">
                  <button
                    type="button"
                    onClick={() => setBookingMode("client")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      bookingMode === "client"
                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Client Appointment
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingMode("personal")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      bookingMode === "personal"
                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Non-Client Event
                  </button>
                </div>
              )}
              
              {/* Client selector (when in client mode, or rescheduling) */}
              {(bookingMode === "client" || rescheduleId) ? (
                <select
                  value={appointmentForm.clientId}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, clientId: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  required={bookingMode === "client" && !rescheduleId}
                >
                  <option value="">Select Client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                    </option>
                  ))}
                </select>
              ) : (
                /* Non-client event title input */
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Event Title</label>
                  <input
                    type="text"
                    value={personalLabel}
                    onChange={(e) => setPersonalLabel(e.target.value)}
                    placeholder="e.g. BNI Meeting, Lunch, Personal"
                    className="w-full px-3 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">Named event without a client (BNI, lunch, personal, etc.)</p>
                </div>
              )}
              <input
                type="date"
                value={appointmentForm.date}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={appointmentForm.startTime}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, startTime: e.target.value })}
                  className="px-3 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                >
                  {timeSlots.map(time => (
                    <option key={time} value={time}>{formatTime(time)}</option>
                  ))}
                </select>
                <select
                  value={appointmentForm.endTime}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, endTime: e.target.value })}
                  className="px-3 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                >
                  {timeSlots.map(time => (
                    <option key={time} value={time}>{formatTime(time)}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowBookingModal(false); setRescheduleId(null); setBookingMode("client"); setPersonalLabel(""); }}
                  className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-xl transition-all text-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/20 rounded-xl font-medium transition-all duration-200"
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full shadow-2xl shadow-black/50">
            <div className="p-5 border-b border-gray-800/80 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Add New Client</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateClientModal(false);
                  setCreateClientForm({ firstName: "", lastName: "", email: "", phone: "", password: "" });
                }}
                className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-lg leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateClient} className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">First Name *</label>
                <input
                  type="text"
                  value={createClientForm.firstName}
                  onChange={(e) => setCreateClientForm({ ...createClientForm, firstName: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Last Name *</label>
                <input
                  type="text"
                  value={createClientForm.lastName}
                  onChange={(e) => setCreateClientForm({ ...createClientForm, lastName: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={createClientForm.email}
                  onChange={(e) => setCreateClientForm({ ...createClientForm, email: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={createClientForm.phone}
                  onChange={(e) => setCreateClientForm({ ...createClientForm, phone: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Password *</label>
                <input
                  type="password"
                  value={createClientForm.password}
                  onChange={(e) => setCreateClientForm({ ...createClientForm, password: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  required
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateClientModal(false);
                    setCreateClientForm({ firstName: "", lastName: "", email: "", phone: "", password: "" });
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-xl transition-all text-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/20 rounded-xl font-medium transition-all duration-200"
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
