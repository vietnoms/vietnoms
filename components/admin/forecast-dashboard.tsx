"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  AlertTriangle,
  TrendingUp,
  CalendarDays,
  Users,
  X,
} from "lucide-react";

// --- Types matching API responses ---

interface ConventionEvent {
  id: number;
  eventName: string;
  startDate: string;
  endDate: string;
  expectedAttendance: number | null;
  eventType: string | null;
  notes: string | null;
  source: string;
}

interface ForecastDay {
  date: string;
  dayOfWeek: number;
  events: ConventionEvent[];
  totalAttendance: number;
  impactLevel: "low" | "medium" | "high" | "critical";
  impactScore: number;
}

interface ForecastWeek {
  weekStart: string;
  weekEnd: string;
  days: ForecastDay[];
  peakAttendance: number;
  totalAttendance: number;
  impactLevel: "low" | "medium" | "high" | "critical";
  eventCount: number;
}

interface ForecastData {
  startDate: string;
  endDate: string;
  totalEvents: number;
  weeks: ForecastWeek[];
  busyWeeks: ForecastWeek[];
  upcomingEvents: ConventionEvent[];
}

// --- Helpers ---

const IMPACT_COLORS = {
  low: "bg-gray-800 text-gray-400",
  medium: "bg-yellow-900/40 text-yellow-400 border border-yellow-800",
  high: "bg-orange-900/40 text-orange-400 border border-orange-800",
  critical: "bg-red-900/40 text-red-400 border border-red-800",
} as const;

const IMPACT_DOT_COLORS = {
  low: "bg-gray-600",
  medium: "bg-yellow-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
} as const;

const IMPACT_LABELS = {
  low: "Normal",
  medium: "Moderate",
  high: "Busy",
  critical: "Very Busy",
} as const;

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatAttendance(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return n.toString();
}

// --- Component ---

export function ForecastDashboard() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [viewMonths, setViewMonths] = useState(3);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedDay, setSelectedDay] = useState<ForecastDay | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const eventsFileRef = useRef<HTMLInputElement>(null);
  const salesFileRef = useRef<HTMLInputElement>(null);

  const fetchForecast = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/forecast?months=${viewMonths}`);
      if (!res.ok) throw new Error("Failed to load forecast");
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [viewMonths]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  const handleCsvUpload = async (
    file: File,
    type: "events" | "sales"
  ) => {
    setUploadStatus(`Importing ${type}...`);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const endpoint =
        type === "events"
          ? "/api/admin/forecast/events"
          : "/api/admin/forecast/sales";
      const res = await fetch(endpoint, { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok) {
        setUploadStatus(`Error: ${json.error}`);
        return;
      }

      setUploadStatus(
        `Imported ${json.imported} ${type} records successfully`
      );
      fetchForecast();
    } catch {
      setUploadStatus("Upload failed");
    }
  };

  const handleAddEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const body = {
      eventName: formData.get("eventName") as string,
      startDate: formData.get("startDate") as string,
      endDate: (formData.get("endDate") as string) || formData.get("startDate"),
      expectedAttendance: formData.get("expectedAttendance") as string,
      eventType: formData.get("eventType") as string,
      notes: formData.get("notes") as string,
    };

    try {
      const res = await fetch("/api/admin/forecast/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json();
        setUploadStatus(`Error: ${json.error}`);
        return;
      }

      setShowAddEvent(false);
      form.reset();
      fetchForecast();
    } catch {
      setUploadStatus("Failed to add event");
    }
  };

  const handleDeleteEvent = async (id: number) => {
    try {
      await fetch(`/api/admin/forecast/events?id=${id}`, { method: "DELETE" });
      fetchForecast();
      if (selectedDay) {
        setSelectedDay({
          ...selectedDay,
          events: selectedDay.events.filter((e) => e.id !== id),
        });
      }
    } catch {
      // Ignore
    }
  };

  // Build calendar grid for current month view
  const calendarDays = buildCalendarGrid(
    calendarMonth.year,
    calendarMonth.month,
    data
  );

  const prevMonth = () => {
    setCalendarMonth((prev) => {
      const m = prev.month - 1;
      return m < 0
        ? { year: prev.year - 1, month: 11 }
        : { year: prev.year, month: m };
    });
  };

  const nextMonth = () => {
    setCalendarMonth((prev) => {
      const m = prev.month + 1;
      return m > 11
        ? { year: prev.year + 1, month: 0 }
        : { year: prev.year, month: m };
    });
  };

  return (
    <div className="space-y-8">
      {/* Status messages */}
      {uploadStatus && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            uploadStatus.startsWith("Error")
              ? "bg-red-900/30 text-red-400"
              : "bg-green-900/30 text-green-400"
          }`}
        >
          {uploadStatus}
          <button
            onClick={() => setUploadStatus(null)}
            className="ml-2 text-gray-400 hover:text-white"
          >
            <X className="h-3 w-3 inline" />
          </button>
        </div>
      )}

      {/* Import & Controls Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={eventsFileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleCsvUpload(file, "events");
            e.target.value = "";
          }}
        />
        <input
          ref={salesFileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleCsvUpload(file, "sales");
            e.target.value = "";
          }}
        />

        <button
          onClick={() => eventsFileRef.current?.click()}
          className="flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red/80 transition-colors"
        >
          <Upload className="h-4 w-4" />
          Import Events CSV
        </button>
        <button
          onClick={() => salesFileRef.current?.click()}
          className="flex items-center gap-2 rounded-lg bg-surface-alt px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
        >
          <Upload className="h-4 w-4" />
          Import Sales CSV
        </button>
        <button
          onClick={() => setShowAddEvent(!showAddEvent)}
          className="flex items-center gap-2 rounded-lg bg-surface-alt px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Event
        </button>

        <div className="ml-auto flex items-center gap-2 text-sm text-gray-400">
          <span>Forecast:</span>
          {[2, 3, 6].map((m) => (
            <button
              key={m}
              onClick={() => setViewMonths(m)}
              className={`rounded px-2 py-1 ${
                viewMonths === m
                  ? "bg-brand-red/20 text-brand-red"
                  : "hover:bg-surface-alt"
              }`}
            >
              {m}mo
            </button>
          ))}
        </div>
      </div>

      {/* Add Event Form */}
      {showAddEvent && (
        <form
          onSubmit={handleAddEvent}
          className="rounded-lg border border-gray-800 bg-surface p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Event Name *
            </label>
            <input
              name="eventName"
              required
              className="w-full rounded bg-surface-alt px-3 py-2 text-sm text-white border border-gray-700 focus:border-brand-red focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Start Date *
            </label>
            <input
              name="startDate"
              type="date"
              required
              className="w-full rounded bg-surface-alt px-3 py-2 text-sm text-white border border-gray-700 focus:border-brand-red focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              End Date
            </label>
            <input
              name="endDate"
              type="date"
              className="w-full rounded bg-surface-alt px-3 py-2 text-sm text-white border border-gray-700 focus:border-brand-red focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Expected Attendance
            </label>
            <input
              name="expectedAttendance"
              type="number"
              className="w-full rounded bg-surface-alt px-3 py-2 text-sm text-white border border-gray-700 focus:border-brand-red focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Event Type
            </label>
            <select
              name="eventType"
              className="w-full rounded bg-surface-alt px-3 py-2 text-sm text-white border border-gray-700 focus:border-brand-red focus:outline-none"
            >
              <option value="">Select type...</option>
              <option value="convention">Convention</option>
              <option value="conference">Conference</option>
              <option value="trade_show">Trade Show</option>
              <option value="concert">Concert</option>
              <option value="festival">Festival</option>
              <option value="corporate">Corporate Event</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes</label>
            <input
              name="notes"
              className="w-full rounded bg-surface-alt px-3 py-2 text-sm text-white border border-gray-700 focus:border-brand-red focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red/80"
            >
              Save Event
            </button>
            <button
              type="button"
              onClick={() => setShowAddEvent(false)}
              className="rounded-lg bg-surface-alt px-4 py-2 text-sm text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && (
        <div className="text-center py-12 text-gray-500">
          Loading forecast...
        </div>
      )}

      {error && (
        <div className="text-center py-12 text-red-400">Error: {error}</div>
      )}

      {data && !loading && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<CalendarDays className="h-5 w-5 text-brand-red" />}
              label="Upcoming Events"
              value={data.totalEvents.toString()}
            />
            <StatCard
              icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
              label="Busy Weeks Ahead"
              value={data.busyWeeks.length.toString()}
            />
            <StatCard
              icon={<Users className="h-5 w-5 text-blue-400" />}
              label="Next Event Attendance"
              value={
                data.upcomingEvents.length > 0 && data.upcomingEvents[0].expectedAttendance
                  ? formatAttendance(data.upcomingEvents[0].expectedAttendance)
                  : "—"
              }
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5 text-green-400" />}
              label="Peak Week Attendance"
              value={
                data.busyWeeks.length > 0
                  ? formatAttendance(
                      Math.max(...data.busyWeeks.map((w) => w.peakAttendance))
                    )
                  : "—"
              }
            />
          </div>

          {/* Busy Weeks Alert */}
          {data.busyWeeks.length > 0 && (
            <div className="rounded-lg border border-orange-800 bg-orange-900/20 p-4">
              <h3 className="text-sm font-semibold text-orange-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Upcoming Busy Periods
              </h3>
              <div className="mt-3 space-y-2">
                {data.busyWeeks.map((week) => {
                  const events = Array.from(
                    new Set(
                      week.days.flatMap((d) =>
                        d.events.map((e) => e.eventName)
                      )
                    )
                  );
                  return (
                    <div
                      key={week.weekStart}
                      className="flex items-center justify-between text-sm"
                    >
                      <div>
                        <span className="text-white font-medium">
                          {formatDate(week.weekStart)} –{" "}
                          {formatDate(week.weekEnd)}
                        </span>
                        <span className="text-gray-400 ml-2">
                          {events.join(", ")}
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          IMPACT_COLORS[week.impactLevel]
                        }`}
                      >
                        {IMPACT_LABELS[week.impactLevel]} –{" "}
                        {formatAttendance(week.peakAttendance)} peak
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Calendar View */}
          <div className="rounded-lg border border-gray-800 bg-surface">
            <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
              <button
                onClick={prevMonth}
                className="rounded p-1 text-gray-400 hover:text-white hover:bg-surface-alt"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold text-white">
                {MONTH_NAMES[calendarMonth.month]} {calendarMonth.year}
              </h2>
              <button
                onClick={nextMonth}
                className="rounded p-1 text-gray-400 hover:text-white hover:bg-surface-alt"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-800">
              {DAY_NAMES.map((d) => (
                <div
                  key={d}
                  className="px-2 py-2 text-center text-xs font-medium text-gray-500"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((cell, i) => (
                <button
                  key={i}
                  onClick={() => cell.forecast && setSelectedDay(cell.forecast)}
                  disabled={!cell.day}
                  className={`min-h-[80px] border-b border-r border-gray-800/50 p-1.5 text-left transition-colors ${
                    cell.forecast && cell.forecast.events.length > 0
                      ? "hover:bg-surface-alt cursor-pointer"
                      : cell.day
                        ? "cursor-default"
                        : ""
                  } ${cell.isToday ? "ring-1 ring-inset ring-brand-red" : ""}`}
                >
                  {cell.day && (
                    <>
                      <span
                        className={`text-xs ${
                          cell.isCurrentMonth
                            ? "text-gray-300"
                            : "text-gray-600"
                        }`}
                      >
                        {cell.day}
                      </span>
                      {cell.forecast && cell.forecast.events.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          <div
                            className={`h-1.5 w-1.5 rounded-full ${
                              IMPACT_DOT_COLORS[cell.forecast.impactLevel]
                            }`}
                          />
                          {cell.forecast.events.slice(0, 2).map((ev) => (
                            <div
                              key={ev.id}
                              className="truncate text-[10px] leading-tight text-gray-400"
                              title={ev.eventName}
                            >
                              {ev.eventName}
                            </div>
                          ))}
                          {cell.forecast.events.length > 2 && (
                            <div className="text-[10px] text-gray-600">
                              +{cell.forecast.events.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Day Detail Panel */}
          {selectedDay && (
            <div className="rounded-lg border border-gray-800 bg-surface p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  {new Date(selectedDay.date + "T00:00:00").toLocaleDateString(
                    "en-US",
                    {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }
                  )}
                </h3>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      IMPACT_COLORS[selectedDay.impactLevel]
                    }`}
                  >
                    {IMPACT_LABELS[selectedDay.impactLevel]}
                  </span>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {selectedDay.totalAttendance > 0 && (
                <p className="mt-1 text-sm text-gray-400">
                  Total expected attendance:{" "}
                  <span className="text-white font-medium">
                    {selectedDay.totalAttendance.toLocaleString()}
                  </span>
                </p>
              )}

              {selectedDay.events.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">
                  No convention events scheduled for this day.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {selectedDay.events.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-start justify-between rounded-lg bg-surface-alt p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          {ev.eventName}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-400">
                          <span>
                            {formatDate(ev.startDate)} –{" "}
                            {formatDate(ev.endDate)}
                          </span>
                          {ev.expectedAttendance && (
                            <span>
                              {ev.expectedAttendance.toLocaleString()} expected
                            </span>
                          )}
                          {ev.eventType && (
                            <span className="capitalize">{ev.eventType.replace("_", " ")}</span>
                          )}
                        </div>
                        {ev.notes && (
                          <p className="mt-1 text-xs text-gray-500">
                            {ev.notes}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors"
                        title="Delete event"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upcoming Events List */}
          {data.upcomingEvents.length > 0 && (
            <div className="rounded-lg border border-gray-800 bg-surface">
              <h3 className="border-b border-gray-800 px-4 py-3 text-sm font-semibold text-white">
                Upcoming Events
              </h3>
              <div className="divide-y divide-gray-800/50">
                {data.upcomingEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {ev.eventName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(ev.startDate)}
                        {ev.endDate !== ev.startDate &&
                          ` – ${formatDate(ev.endDate)}`}
                        {ev.eventType && (
                          <span className="ml-2 capitalize">
                            • {ev.eventType.replace("_", " ")}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {ev.expectedAttendance && (
                        <span className="text-sm text-gray-300">
                          {formatAttendance(ev.expectedAttendance)}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// --- Sub-components ---

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-surface p-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

// --- Calendar grid builder ---

interface CalendarCell {
  day: number | null;
  isCurrentMonth: boolean;
  isToday: boolean;
  forecast: ForecastDay | null;
}

function buildCalendarGrid(
  year: number,
  month: number,
  data: ForecastData | null
): CalendarCell[] {
  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Build a lookup from date string to ForecastDay
  const forecastMap = new Map<string, ForecastDay>();
  if (data) {
    for (const week of data.weeks) {
      for (const day of week.days) {
        forecastMap.set(day.date, day);
      }
    }
  }

  const cells: CalendarCell[] = [];

  // Leading empty cells
  for (let i = 0; i < startDow; i++) {
    cells.push({ day: null, isCurrentMonth: false, isToday: false, forecast: null });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({
      day: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      forecast: forecastMap.get(dateStr) ?? null,
    });
  }

  // Trailing empty cells to fill the last row
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, isCurrentMonth: false, isToday: false, forecast: null });
  }

  return cells;
}
