"use client";

import { useState, useEffect, useMemo } from "react";
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
  daysOfWeek?: number[] | null;
  endDate?: string | null;
}

interface CalendarProps {
  mode: "admin" | "client";
  client?: Client | null;
  clients?: Client[];
  appointments: Appointment[];
  blockedTimes: BlockedTime[];
  onRefresh?: () => void;
  onBook?: (date: string, startTime: string, endTime: string) => void;
  onCancel?: (id: string) => void;
  onReschedule?: (appointment: Appointment) => void;
}

type ViewType = "month" | "week" | "day";

// Helper function to format date as YYYY-MM-DD in local timezone
const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Format time for display
const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  return `${h > 12 ? h - 12 : h}:${minutes} ${h >= 12 ? "PM" : "AM"}`;
};

// Parse time to minutes from midnight
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// Generate time slots
const generateTimeSlots = (startHour = 4, endHour = 18) => {
  const slots = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    slots.push(`${hour.toString().padStart(2, "0")}:00`);
    slots.push(`${hour.toString().padStart(2, "0")}:30`);
  }
  return slots;
};

const timeSlots = generateTimeSlots();

export default function GoogleCalendar({
  mode,
  client,
  clients = [],
  appointments,
  blockedTimes,
  onRefresh,
  onBook,
  onCancel,
  onReschedule,
}: CalendarProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>("month");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDayAppointments, setSelectedDayAppointments] = useState<Appointment[]>([]);

  // Get week dates
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentDate]);

  // Get month days
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    // Add empty days for padding
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add actual days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [currentDate]);

  // Get appointments for a specific date
  const getAppointmentsForDate = (dateStr: string): Appointment[] => {
    return appointments.filter(apt => apt.date === dateStr && apt.status !== "cancelled");
  };

  // Get blocked times for a specific date
  const getBlockedForDate = (dateStr: string): BlockedTime[] => {
    const date = new Date(dateStr + "T00:00:00");
    const dayOfWeek = date.getDay();
    
    return blockedTimes.filter(blk => {
      // Direct date match
      if (blk.date === dateStr) return true;
      
      // Check recurring blocks with days of week
      if (blk.isRecurring && blk.daysOfWeek && blk.daysOfWeek.length > 0) {
        // Check if the day of week matches
        if (!blk.daysOfWeek.includes(dayOfWeek)) return false;
        
        // Check if end date is set and we're past it
        if (blk.endDate && dateStr > blk.endDate) return false;
        
        return true;
      }
      
      return false;
    });
  };

  // Check if a time slot is blocked
  const isSlotBlocked = (dateStr: string, time: string): boolean => {
    const blocked = getBlockedForDate(dateStr);
    const mins = timeToMinutes(time);
    
    return blocked.some(blk => {
      const startMins = timeToMinutes(blk.startTime);
      const endMins = timeToMinutes(blk.endTime);
      return mins >= startMins && mins < endMins;
    });
  };

  // Check if a time slot is booked
  const isSlotBooked = (dateStr: string, time: string): Appointment | null => {
    const dayAppts = getAppointmentsForDate(dateStr);
    const mins = timeToMinutes(time);
    
    for (const apt of dayAppts) {
      const startMins = timeToMinutes(apt.startTime);
      const endMins = timeToMinutes(apt.endTime);
      if (mins >= startMins && mins < endMins) {
        return apt;
      }
    }
    return null;
  };

  // Get client name by ID
  const getClientName = (clientId: string): string => {
    if (mode === "client" && client) {
      return `${client.firstName} ${client.lastName}`;
    }
    const c = clients.find(cl => cl.id === clientId);
    return c ? `${c.firstName} ${c.lastName}` : "Unknown";
  };

  // Navigate functions
  const goToToday = () => setCurrentDate(new Date());

  const goToPrev = () => {
    if (view === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (view === "week") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1));
    }
  };

  const goToNext = () => {
    if (view === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (view === "week") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1));
    }
  };

  // Handle clicking on a day in month view
  const handleDayClick = (day: Date) => {
    const dateStr = formatDateToString(day);
    const dayAppts = getAppointmentsForDate(dateStr);
    setSelectedDate(dateStr);
    setSelectedDayAppointments(dayAppts);
    setShowDayModal(true);
  };

  // Handle clicking on a time slot in week/day view
  const handleTimeSlotClick = (date: Date, time: string) => {
    const dateStr = formatDateToString(date);
    if (isSlotBlocked(dateStr, time)) return;
    
    const booked = isSlotBooked(dateStr, time);
    if (booked) {
      // Show appointment details
      const dayAppts = getAppointmentsForDate(dateStr);
      setSelectedDate(dateStr);
      setSelectedDayAppointments(dayAppts);
      setShowDayModal(true);
    } else if (mode === "admin" && onBook) {
      // In admin mode, show booking options
      const dayAppts = getAppointmentsForDate(dateStr);
      setSelectedDate(dateStr);
      setSelectedDayAppointments(dayAppts);
      setShowDayModal(true);
    } else if (mode === "client" && onBook) {
      // In client mode, book the slot
      const endTime = timeToMinutes(time) + 60; // Default 60 min
      const endHour = Math.floor(endTime / 60);
      const endMin = endTime % 60;
      const endTimeStr = `${endHour.toString().padStart(2, "0")}:${endMin.toString().padStart(2, "0")}`;
      onBook(dateStr, time, endTimeStr);
    }
  };

  // Get appointment position for week/day view
  const getAppointmentStyle = (apt: Appointment, dateStr: string) => {
    const startMins = timeToMinutes(apt.startTime);
    const endMins = timeToMinutes(apt.endTime);
    const dayStartMins = 4 * 60; // 4 AM
    const slotHeight = 40; // pixels per 30-min slot

    const top = ((startMins - dayStartMins) / 30) * slotHeight;
    const height = ((endMins - startMins) / 30) * slotHeight;

    return {
      top: `${top}px`,
      height: `${Math.max(height, 20)}px`,
    };
  };

  // Get date string for a week day
  const getWeekDayDateStr = (date: Date): string => formatDateToString(date);

  // Navigation title
  const getNavigationTitle = () => {
    if (view === "month") {
      return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } else if (view === "week") {
      const start = weekDates[0];
      const end = weekDates[6];
      if (start.getMonth() === end.getMonth()) {
        return `${start.toLocaleDateString("en-US", { month: "long" })} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
      }
      return `${start.toLocaleDateString("en-US", { month: "short" })} ${start.getDate()} - ${end.toLocaleDateString("en-US", { month: "short" })} ${end.getDate()}, ${end.getFullYear()}`;
    } else {
      return currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    }
  };

  // Get day names for week view
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = formatDateToString(new Date());

  return (
    <div className="calendar-container">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
          >
            Today
          </button>
          <div className="flex gap-1">
            <button
              onClick={goToPrev}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <h2 className="text-xl font-semibold">{getNavigationTitle()}</h2>
        </div>

        {/* View Switcher */}
        <div className="flex bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setView("month")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === "month" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setView("week")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === "week" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setView("day")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === "day" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Day
          </button>
        </div>
      </div>

      {/* Month View */}
      {view === "month" && (
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-800">
            {dayNames.map(day => (
              <div key={day} className="p-3 text-center text-gray-400 font-medium">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {monthDays.map((day, index) => {
              if (!day) return <div key={index} className="bg-gray-900/50 min-h-[100px]" />;

              const dateStr = formatDateToString(day);
              const dayAppts = getAppointmentsForDate(dateStr);
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

              return (
                <div
                  key={index}
                  onClick={() => handleDayClick(day)}
                  className={`
                    min-h-[100px] p-2 border-t border-r border-gray-800 cursor-pointer transition-colors
                    ${isToday ? "bg-orange-500/10" : ""}
                    ${isSelected ? "bg-orange-500/20" : ""}
                    ${!isPast ? "hover:bg-gray-800" : ""}
                    ${isPast ? "opacity-50" : ""}
                  `}
                >
                  <div className={`
                    w-8 h-8 flex items-center justify-center rounded-full mb-1
                    ${isToday ? "bg-orange-500 text-white" : ""}
                  `}>
                    <span className={`text-sm ${isToday ? "font-bold" : ""}`}>{day.getDate()}</span>
                  </div>
                  
                  {/* Appointment indicators */}
                  {dayAppts.length > 0 && (
                    <div className="space-y-1">
                      {dayAppts.slice(0, 3).map(apt => (
                        <div
                          key={apt.id}
                          className={`
                            text-xs px-1 py-0.5 rounded truncate
                            ${apt.status === "completed" ? "bg-green-900 text-green-300" : 
                              apt.status === "booked" ? "bg-orange-900 text-orange-300" : "bg-gray-700"}
                          `}
                        >
                          {formatTime(apt.startTime)} {getClientName(apt.clientId).split(" ")[0]}
                        </div>
                      ))}
                      {dayAppts.length > 3 && (
                        <div className="text-xs text-gray-500">+{dayAppts.length - 3} more</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {view === "week" && (
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          {/* Week header */}
          <div className="grid grid-cols-8 border-b border-gray-800">
            <div className="p-3 text-gray-400"></div>
            {weekDates.map((date, index) => {
              const dateStr = formatDateToString(date);
              const isToday = dateStr === today;
              return (
                <div
                  key={index}
                  onClick={() => {
                    setCurrentDate(date);
                    setView("day");
                  }}
                  className={`
                    p-3 text-center cursor-pointer transition-colors
                    ${isToday ? "bg-orange-500/20" : ""}
                    hover:bg-gray-800
                  `}
                >
                  <div className="text-gray-400 text-sm">{dayNames[index]}</div>
                  <div className={`
                    w-8 h-8 flex items-center justify-center rounded-full mx-auto
                    ${isToday ? "bg-orange-500 text-white font-bold" : ""}
                  `}>
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div className="max-h-[600px] overflow-y-auto">
            {timeSlots.map((time, timeIndex) => (
              <div key={time} className="grid grid-cols-8 border-b border-gray-800/50">
                {/* Time label */}
                <div className="p-2 text-xs text-gray-500 text-right pr-3 -mt-2">
                  {timeIndex % 2 === 0 && formatTime(time)}
                </div>
                
                {/* Day columns */}
                {weekDates.map((date, dayIndex) => {
                  const dateStr = formatDateToString(date);
                  const bookedApt = isSlotBooked(dateStr, time);
                  const isBlocked = isSlotBlocked(dateStr, time);
                  
                  return (
                    <div
                      key={dayIndex}
                      className={`
                        relative min-h-[40px] border-l border-gray-800/50 cursor-pointer
                        ${isBlocked ? "bg-gray-800/50" : "hover:bg-gray-800/30"}
                      `}
                      onClick={() => handleTimeSlotClick(date, time)}
                    >
                      {bookedApt && time === bookedApt.startTime && (
                        <div
                          className={`
                            absolute left-1 right-1 p-1 rounded text-xs overflow-hidden
                            ${bookedApt.status === "completed" ? "bg-green-600" : 
                              bookedApt.status === "booked" ? "bg-orange-500" : "bg-gray-600"}
                          `}
                          style={getAppointmentStyle(bookedApt, dateStr)}
                        >
                          <div className="font-medium truncate">{getClientName(bookedApt.clientId)}</div>
                          <div className="opacity-80 truncate">{formatTime(bookedApt.startTime)} - {formatTime(bookedApt.endTime)}</div>
                        </div>
                      )}
                      {isBlocked && time === getBlockedForDate(dateStr)[0]?.startTime && (
                        <div className="absolute inset-x-1 top-1 bottom-1 bg-gray-700 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-400">Blocked</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day View */}
      {view === "day" && (
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          {/* Day header */}
          <div className="p-4 border-b border-gray-800">
            <div className="text-2xl font-bold">{currentDate.toLocaleDateString("en-US", { weekday: "long" })}</div>
            <div className="text-gray-400">{currentDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
          </div>

          {/* Time grid */}
          <div className="max-h-[600px] overflow-y-auto">
            {timeSlots.map((time, timeIndex) => {
              const dateStr = formatDateToString(currentDate);
              const bookedApt = isSlotBooked(dateStr, time);
              const isBlocked = isSlotBlocked(dateStr, time);
              
              return (
                <div
                  key={time}
                  className="grid grid-cols-[80px_1fr] border-b border-gray-800/50"
                >
                  {/* Time label */}
                  <div className="p-3 text-sm text-gray-500 text-right pr-4">
                    {timeIndex % 2 === 0 && formatTime(time)}
                  </div>
                  
                  {/* Slot content */}
                  <div
                    className={`
                      relative min-h-[60px] cursor-pointer
                      ${isBlocked ? "bg-gray-800/50" : "hover:bg-gray-800/30"}
                    `}
                    onClick={() => handleTimeSlotClick(currentDate, time)}
                  >
                    {bookedApt && time === bookedApt.startTime && (
                      <div
                        className={`
                          absolute left-2 right-2 top-1 p-3 rounded-lg text-sm
                          ${bookedApt.status === "completed" ? "bg-green-600" : 
                            bookedApt.status === "booked" ? "bg-orange-500" : "bg-gray-600"}
                        `}
                        style={getAppointmentStyle(bookedApt, dateStr)}
                      >
                        <div className="font-semibold text-base">{getClientName(bookedApt.clientId)}</div>
                        <div className="opacity-90">{formatTime(bookedApt.startTime)} - {formatTime(bookedApt.endTime)}</div>
                        {mode === "admin" && (
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); onReschedule?.(bookedApt); }}
                              className="text-xs bg-blue-700 px-2 py-1 rounded hover:bg-blue-600"
                            >
                              Reschedule
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onCancel?.(bookedApt.id); }}
                              className="text-xs bg-red-700 px-2 py-1 rounded hover:bg-red-600"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {isBlocked && time === getBlockedForDate(dateStr)[0]?.startTime && (
                      <div className="absolute inset-x-2 top-2 bottom-2 bg-gray-700 rounded-lg flex items-center justify-center">
                        <span className="text-sm text-gray-400">Blocked</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day Detail Modal */}
      {showDayModal && selectedDate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowDayModal(false)}>
          <div 
            className="bg-gray-900 rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-800">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { 
                    weekday: "long", 
                    month: "long", 
                    day: "numeric" 
                  })}
                </h3>
                <button
                  onClick={() => setShowDayModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                {selectedDayAppointments.length} appointment{selectedDayAppointments.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="p-4">
              {selectedDayAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No appointments for this day</p>
                  {mode === "admin" && (
                    <button
                      onClick={() => {
                        setShowDayModal(false);
                        // Trigger booking - could pass a callback
                      }}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg"
                    >
                      Add Appointment
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayAppointments.map(apt => (
                    <div
                      key={apt.id}
                      className={`
                        p-4 rounded-lg
                        ${apt.status === "completed" ? "bg-green-900/50 border border-green-700" : 
                          apt.status === "booked" ? "bg-orange-900/50 border border-orange-700" : 
                          "bg-gray-800"}
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-lg">
                            {mode === "client" ? "Your Session" : getClientName(apt.clientId)}
                          </div>
                          <div className="text-gray-400">
                            {formatTime(apt.startTime)} - {formatTime(apt.endTime)}
                          </div>
                          <div className={`
                            text-sm mt-1
                            ${apt.status === "completed" ? "text-green-400" : 
                              apt.status === "booked" ? "text-orange-400" : "text-gray-400"}
                          `}>
                            {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                          </div>
                        </div>
                        {mode === "admin" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => { onReschedule?.(apt); setShowDayModal(false); }}
                              className="text-sm bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
                            >
                              Reschedule
                            </button>
                            <button
                              onClick={() => { onCancel?.(apt.id); setShowDayModal(false); }}
                              className="text-sm bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Book for Client */}
              {mode === "client" && selectedDayAppointments.length === 0 && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <p className="text-gray-400 text-sm mb-3">Available times for this day:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {generateTimeSlots(6, 19).filter((_, i) => i % 2 === 0).map(time => {
                      const isBlocked = isSlotBlocked(selectedDate, time);
                      if (isBlocked) return null;
                      return (
                        <button
                          key={time}
                          onClick={() => {
                            if (onBook) {
                              const endMins = timeToMinutes(time) + 60;
                              const endTime = `${Math.floor(endMins / 60).toString().padStart(2, "0")}:${(endMins % 60).toString().padStart(2, "0")}`;
                              onBook(selectedDate, time, endTime);
                              setShowDayModal(false);
                            }
                          }}
                          className="px-3 py-2 bg-gray-800 hover:bg-orange-500 rounded-lg text-sm transition-colors"
                        >
                          {formatTime(time)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
