
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
  daysOfWeek?: number[];
  endDate?: string;
}

export default function MyAppointmentsPage() {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleWeekOffset, setRescheduleWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const timeSlots: string[] = [];
  for (let hour = 6; hour <= 20; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
    timeSlots.push(`${hour.toString().padStart(2, "0")}:30`);
  }

  useEffect(() => {
    const stored = localStorage.getItem("calendarClient");
    if (!stored) {
      router.push("/calendar");
      return;
    }
    
    const clientData = JSON.parse(stored);
    setClient(clientData);
    loadData(clientData.id);
  }, []);

  const loadData = async (clientId: string) => {
    setLoading(true);
    try {
      const [appointmentsRes, blockedRes] = await Promise.all([
        fetch(`/api/calendar/appointments?clientId=${clientId}`),
        fetch("/api/calendar/blocked")
      ]);
      
      if (appointmentsRes.ok) {
        setAppointments(await appointmentsRes.json());
      }
      if (blockedRes.ok) {
        setBlockedTimes(await blockedRes.json());
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    
    try {
      const res = await fetch(`/api/calendar/appointments/${appointmentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAppointments(appointments.filter((apt) => apt.id !== appointmentId));
      }
    } catch (err) {
      console.error("Failed to cancel appointment:", err);
    }
  };

  const handleReschedule = async (appointmentId: string) => {
    if (!selectedDate || !selectedTime) {
      alert("Please select a new date and time");
      return;
    }

    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (!appointment) return;

    // Calculate end time (assume 60 min)
    const [hours, minutes] = selectedTime.split(":");
    let h = parseInt(hours);
    let m = parseInt(minutes) + 60;
    if (m >= 60) {
      h += Math.floor(m / 60);
      m = m % 60;
    }
    const endTime = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;

    try {
      const res = await fetch("/api/calendar/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          id: appointmentId,
          date: selectedDate,
          startTime: selectedTime,
          endTime: endTime
        })
      });

      if (res.ok) {
        setAppointments(appointments.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, date: selectedDate, startTime: selectedTime, endTime: endTime }
            : apt
        ));
        setRescheduleId(null);
        setSelectedDate("");
        setSelectedTime("");
        setRescheduleWeekOffset(0);
        alert("Appointment rescheduled successfully!");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to reschedule");
      }
    } catch (err) {
      console.error("Failed to reschedule:", err);
      alert("Failed to reschedule");
    }
  };

  // Week calendar helpers - ensures offset=0 shows current week (starting from today)
  const getWeekDates = (offset: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate the Sunday of the current week
    const dayOfWeek = today.getDay();
    const daysFromSunday = dayOfWeek; // How many days since Sunday
    
    // Start from today, not from the beginning of the week
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + (offset * 7));
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates(rescheduleWeekOffset);

  const getAvailableSlotsForDate = (dateStr: string) => {
    // Get client's appointments on this date (excluding the one being rescheduled)
    const dateAppointments = appointments.filter(apt => 
      apt.date === dateStr && 
      apt.clientId === client?.id && 
      apt.status !== "cancelled" &&
      apt.id !== rescheduleId
    );
    
    const bookedTimes = dateAppointments.map(apt => ({
      start: apt.startTime,
      end: apt.endTime
    }));
    
    // Check for exact date match OR recurring blocks
    const dateObj = new Date(dateStr + "T12:00:00");
    const dayOfWeek = dateObj.getDay();
    
    const dateBlocked = blockedTimes.filter(bt => {
      // Exact date match
      if (bt.date === dateStr) return true;
      // Recurring block - check if the day of week matches
      if (bt.isRecurring && bt.daysOfWeek && bt.daysOfWeek.includes(dayOfWeek)) {
        // Check if we're past the end date
        if (bt.endDate && dateStr > bt.endDate) return false;
        return true;
      }
      return false;
    });
    
    return timeSlots.filter(time => {
      const isBlocked = dateBlocked.some(bt => {
        return time >= bt.startTime && time < bt.endTime;
      });
      if (isBlocked) return false;
      
      const hasAppointment = bookedTimes.some(bt => {
        return time >= bt.start && time < bt.end;
      });
      if (hasAppointment) return false;
      
      return true;
    });
  };

  const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const isMoreThan24Hours = (dateStr: string, timeStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(dateStr + "T12:00:00");
    appointmentDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((appointmentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 2;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-orange-600">AMarsBody</h1>
          <div className="flex gap-4">
            <button
              onClick={() => router.push("/calendar")}
              className="text-gray-600 hover:text-orange-600"
            >
              ← Back
            </button>
            <button
              onClick={() => router.push("/calendar/book")}
              className="text-gray-600 hover:text-orange-600"
            >
              Book
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("calendarClient");
                router.push("/calendar");
              }}
              className="text-gray-600 hover:text-orange-600"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Welcome, {client?.firstName}!
          </h2>
          <p className="text-gray-600">{client?.email}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">My Appointments</h3>
          
          {appointments.length === 0 || appointments.every(apt => apt.status === "cancelled") ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">You don't have any appointments yet.</p>
              <button
                onClick={() => router.push("/calendar/book")}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600"
              >
                Book an Appointment
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="border rounded-lg p-4"
                >
                  {apt.status === "cancelled" ? (
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-400 line-through">
                          {formatDate(apt.date)}
                        </p>
                        <p className="text-gray-400">
                          {formatTime(apt.startTime)} - {formatTime(apt.endTime)}
                        </p>
                        <p className="text-sm text-red-500">Cancelled</p>
                      </div>
                    </div>
                  ) : rescheduleId === apt.id ? (
                    <div>
                      <p className="font-semibold text-gray-800 mb-3">
                        Reschedule: {formatDate(apt.date)} at {formatTime(apt.startTime)} - {formatTime(apt.endTime)}
                      </p>
                      
                      {/* Week Calendar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <button
                            onClick={() => setRescheduleWeekOffset(rescheduleWeekOffset - 1)}
                            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700"
                          >
                            ← Prev
                          </button>
                          <span className="text-gray-700 font-medium">
                            {weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                          <button
                            onClick={() => setRescheduleWeekOffset(rescheduleWeekOffset + 1)}
                            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700"
                          >
                            Next →
                          </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {weekDates.filter(date => {
                            // Only show days that are at least 2 days in the future
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const checkDate = new Date(formatDateKey(date));
                            checkDate.setHours(0, 0, 0, 0);
                            const diffDays = Math.ceil((checkDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                            if (diffDays < 2) return false;
                            
                            // Check if day is a weekend (Saturday=6, Sunday=0) and has any recurring weekend block
                            const dateObj = new Date(formatDateKey(date) + "T12:00:00");
                            const dayOfWeek = dateObj.getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            
                            if (isWeekend) {
                              // Check if there's a recurring weekend block
                              const hasWeekendBlock = blockedTimes.some(bt => 
                                bt.isRecurring && bt.daysOfWeek && bt.daysOfWeek.includes(dayOfWeek)
                              );
                              if (hasWeekendBlock) return false; // Hide weekends entirely if blocked
                            }
                            
                            // Check if client already has an appointment on this day (exclude the one being rescheduled)
                            const dateKey = formatDateKey(date);
                            const hasAppointmentOnDay = appointments.some(apt => 
                              apt.date === dateKey && 
                              apt.clientId === client?.id && 
                              apt.status !== "cancelled" &&
                              apt.id !== rescheduleId
                            );
                            if (hasAppointmentOnDay) return false;
                            
                            // Check if day is fully blocked (no available slots)
                            const availableSlots = getAvailableSlotsForDate(dateKey);
                            if (availableSlots.length === 0) return false;
                            
                            return true;
                          }).map((date) => {
                            const dateKey = formatDateKey(date);
                            const availableSlots = getAvailableSlotsForDate(dateKey);
                            const isSelected = selectedDate === dateKey;
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const checkDate = new Date(dateKey + "T00:00:00");
                            const isPast = checkDate < today;
                            
                            return (
                              <div
                                key={dateKey}
                                className={`p-2 rounded-lg text-center cursor-pointer ${
                                  isSelected 
                                    ? "bg-orange-500 text-white" 
                                    : isPast || availableSlots.length === 0
                                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                                onClick={() => !isPast && availableSlots.length > 0 && setSelectedDate(dateKey)}
                              >
                                <div className="text-xs">{date.toLocaleDateString("en-US", { weekday: "short" })}</div>
                                <div className="text-lg font-bold">{date.getDate()}</div>
                                <div className="text-xs">{availableSlots.length} slots</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Time slots */}
                      {selectedDate && (
                        <div className="mb-3">
                          <label className="block text-sm text-gray-600 mb-2">
                            Select new time for {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                          </label>
                          <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                            {getAvailableSlotsForDate(selectedDate).map(time => (
                              <button
                                key={time}
                                onClick={() => setSelectedTime(time)}
                                className={`px-2 py-2 rounded-lg text-sm ${
                                  selectedTime === time
                                    ? "bg-orange-500 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                              >
                                {formatTime(time)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setRescheduleId(null); setSelectedDate(""); setSelectedTime(""); }}
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReschedule(apt.id)}
                          disabled={!selectedDate || !selectedTime}
                          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-white disabled:bg-gray-300 disabled:text-gray-500"
                        >
                          Confirm Reschedule
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-800">
                          {formatDate(apt.date)}
                        </p>
                        <p className="text-gray-600">
                          {formatTime(apt.startTime)} - {formatTime(apt.endTime)}
                        </p>
                        <p className="text-sm text-gray-500 capitalize">
                          Status: {apt.status}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {apt.status !== "cancelled" && isMoreThan24Hours(apt.date, apt.startTime) ? (
                          <button
                            onClick={() => { setRescheduleId(apt.id); setRescheduleWeekOffset(0); }}
                            className="text-blue-500 hover:text-blue-700 text-sm"
                          >
                            Reschedule
                          </button>
                        ) : apt.status !== "cancelled" ? (
                          <span className="text-gray-400 text-sm">
                            3+ days required
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
