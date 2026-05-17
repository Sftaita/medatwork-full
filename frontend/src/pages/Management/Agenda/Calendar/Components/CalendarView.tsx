import React, { useState, useMemo } from "react";
import { Box, Drawer } from "@mui/material";
import dayjs from "@/lib/dayjs";
import useManagersCalendarContext from "../../../../../hooks/useManagersCalendarContext";
import YearSelect from "../../../../../components/YearSelect";
import { useTopbarSearch } from "../../../../../hooks/useTopbarSearch";
import useAxiosPrivate from "../../../../../hooks/useAxiosPrivate";
import calendarApi from "../../../../../services/calendarApi";
import { handleApiError } from "@/services/apiError";
import type { HospitalYear } from "../../../../../services/hospitalAdminApi";
import MonthCalendar, { type MCMacc, type MCService, type MCEvent } from "./MonthCalendar";
import EventEditor from "./EventEditor";

// ── Palette pour les codes service ───────────────────────────────────────────

const SERVICE_TINTS = [
  '#9C27B0', '#3aa676', '#e85a6a', '#5b8def',
  '#f0a93b', '#1fb3d6', '#d05a8a', '#6b6bd6',
  '#e8853b', '#3F7A4E',
];

function serviceCode(title: string): string {
  return title.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 4) || title.slice(0, 3).toUpperCase();
}

// ── Composant ─────────────────────────────────────────────────────────────────

const CalendarView = () => {
  const {
    years, yearResidents, schedules, currentYear,
    setCurrentYear, setResidents: setYearResidents,
    setYearResidents: setContextResidents,
    setSchedules, setSelectedResidents,
  } = useManagersCalendarContext() as any;

  const axiosPrivate = useAxiosPrivate();
  const maccSearch = useTopbarSearch("Rechercher un MACC…");

  const [viewMonth, setViewMonth]       = useState(new Date());
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate]       = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen]           = useState(false);

  const today = dayjs().format('YYYY-MM-DD');

  // ── Mapping maccs ────────────────────────────────────────────────────────

  const maccs = useMemo<MCMacc[]>(() =>
    (yearResidents as any[]).map((r: any) => ({
      id:    String(r.residentId),
      name:  `${r.residentFirstname ?? ''} ${r.residentLastname ?? ''}`.trim(),
      color: r.residentColor ?? '#9C27B0',
    })),
    [yearResidents]
  );

  // ── Mapping services ─────────────────────────────────────────────────────

  const services = useMemo<Record<string, MCService>>(() => {
    const titles: string[] = [...new Set((schedules as any[]).map((s: any) => s.title as string))];
    return Object.fromEntries(titles.map((title, i) => [
      title,
      { code: serviceCode(title), label: title, tint: SERVICE_TINTS[i % SERVICE_TINTS.length] },
    ]));
  }, [schedules]);

  // ── Mapping events ────────────────────────────────────────────────────────

  const events = useMemo<Record<string, MCEvent[]>>(() => {
    const result: Record<string, MCEvent[]> = {};
    (schedules as any[]).forEach((s: any) => {
      if (!s.start || !s.extendedProps) return;
      const dateKey = s.start.slice(0, 10);
      const startTime = dayjs.utc(s.start).format('HH:mm');
      const endTime   = s.end ? dayjs.utc(s.end).format('HH:mm') : '';
      if (!result[dateKey]) result[dateKey] = [];
      result[dateKey].push({
        maccId:    String(s.extendedProps.residentId),
        serviceId: s.title,
        start:     startTime,
        end:       endTime,
        _calId:    s.residentYearCalendarId,
      });
    });
    return result;
  }, [schedules]);

  // ── Mapping années pour YearSelect ───────────────────────────────────────

  const mappedYears = useMemo<HospitalYear[]>(() =>
    (years as any[]).map((y: any) => ({
      id:           y.yearId,
      title:        y.title ?? String(y.yearId),
      period:       y.period   ?? null,
      location:     y.location ?? null,
      speciality:   y.speciality ?? null,
      comment:      null,
      status:       y.status ?? 'active',
      dateOfStart:  y.dateOfStart ?? null,
      dateOfEnd:    y.dateOfEnd   ?? null,
      residentCount: y.residents?.length ?? 0,
      managerCount:  0,
    })),
    [years]
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleYearChange = async (yearId: number | '') => {
    if (!yearId) return;
    const y = (years as any[]).find((yr: any) => yr.yearId === yearId);
    if (!y) return;
    setCurrentYear({ yearId: String(y.yearId), title: y.title });
    if (y.residents) { setContextResidents?.(y.residents); setSelectedResidents?.(y.residents.map((r: any) => r.residentId)); }
    localStorage.setItem('calendar_selectedYearId', String(yearId));
    try {
      const { method, url } = calendarApi.loadSchedulesByYearId(yearId);
      const res = await axiosPrivate[method](url);
      setSchedules(res?.data?.schedules ?? []);
    } catch (err) {
      handleApiError(err);
    }
  };

  const handleAddEvent = (dateKey: string) => {
    setSelectedDate(dateKey);
    setSelectedEventId(null);
    setDrawerOpen(true);
  };

  const handleEventClick = (_dateKey: string, ev: MCEvent) => {
    setSelectedEventId((ev._calId as number) ?? null);
    setSelectedDate(null);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => { setDrawerOpen(false); setSelectedEventId(null); };

  const yearSelector = (
    <YearSelect
      years={mappedYears}
      value={currentYear ? parseInt(currentYear.yearId) : ''}
      onChange={handleYearChange}
      label="Année académique"
    />
  );

  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      <MonthCalendar
        maccs={maccs}
        services={services}
        events={events}
        viewMonth={viewMonth}
        today={today}
        maccSearch={maccSearch}
        yearId={currentYear?.yearId}
        yearSelector={yearSelector}
        onPrevMonth={() => setViewMonth((d) => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; })}
        onNextMonth={() => setViewMonth((d) => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; })}
        onTodayClick={() => setViewMonth(new Date())}
        onDayClick={(key) => setSelectedDate(key)}
        onAddEvent={handleAddEvent}
        onEventClick={handleEventClick}
      />

      <Drawer anchor="right" open={drawerOpen} onClose={handleDrawerClose}>
        <Box sx={{ width: { xs: '100vw', md: '380px' }, height: '100%' }}>
          <EventEditor
            handleDrawerClose={handleDrawerClose}
            selectedEventId={selectedEventId}
            selectedDate={selectedDate}
          />
        </Box>
      </Drawer>
    </Box>
  );
};

export default CalendarView;
