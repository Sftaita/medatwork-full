import React, { useState, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from "@fullcalendar/core/locales/fr"; // import French locale
import useManagersCalendarContext from "../../../../../hooks/useManagersCalendarContext";
import dayjs from "@/lib/dayjs";

// Material UI
import { Typography, Box, Drawer } from "@mui/material";

// CSS
import "../CSS/FullCalendarStyle.css";
import EventEditor from "./EventEditor";

const ManagerCalendarPage = ({ isMd }) => {
  const { schedules, selectedResidents } = useManagersCalendarContext();

  const selectedSchedules = useMemo(
    () => (schedules as any[]).filter((s) => selectedResidents.includes(s.extendedProps?.residentId)),
    [schedules, selectedResidents]
  );
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const handleDateClick = (arg) => {
    setSelectedDate(arg.dateStr);
    setSelectedEventId(null);
    setDrawerOpen(true);
  };

  const handleEventClick = (arg) => {
    setSelectedEventId(arg.event.extendedProps.residentYearCalendarId);
    setSelectedDate(null);
    setDrawerOpen(true);
  };

  const renderEventContent = (eventInfo) => {
    const firstname: string = eventInfo.event.extendedProps.residentFirstname ?? "";
    const lastname: string = eventInfo.event.extendedProps.residentLastname ?? "";
    const initials = `${firstname.charAt(0)}${lastname.charAt(0)}`;

    const startTime = dayjs.utc(eventInfo.event.start).format("HH:mm");
    const endTime = dayjs.utc(eventInfo.event.end).format("HH:mm");

    return (
      <Box
        width={"100%"}
        paddingLeft={1}
        paddingRight={1}
        style={{
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          overflow: "hidden",
          backgroundColor: `${eventInfo.event.extendedProps.residentColor}66`,
          cursor: "pointer",
          borderRadius: "4px",
        }}
        sx={{ maxWidth: "90%" }}
      >
        <Typography
          style={{
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >{`${initials} - ${eventInfo.event.title} (${startTime} - ${endTime})`}</Typography>
      </Box>
    );
  };

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedEventId(null);
  };
  return (
    <Box>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        headerToolbar={{
          left: isMd ? "prev,next today" : "prev,next, title",
          center: isMd && "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
        }}
        initialView="dayGridMonth"
        timeZone="UTC"
        selectable={true}
        dateClick={handleDateClick}
        events={selectedSchedules}
        eventClick={handleEventClick}
        locale={frLocale}
        eventContent={renderEventContent}
        dayMaxEvents={2}
        height={"auto"}
        allDaySlot={false}
        slotMinTime="07:00:00"
      />
      <Drawer anchor="right" open={drawerOpen} onClose={() => handleDrawerClose()}>
        <Box
          // Adjust the width here:
          sx={{ width: isMd ? "380px" : "100vw", height: "100%" }}
        >
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

export default ManagerCalendarPage;
