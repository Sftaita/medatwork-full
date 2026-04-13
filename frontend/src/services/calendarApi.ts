import type { ApiCall } from "./api.types";

const calendarApi = {
  dispacthWeek(yearId: string | number): ApiCall {
    return {
      method: "put",
      url: `managers/residentWeeklySchedule/update/${yearId}`,
    };
  },

  fetchFirstLoadSchedules(): ApiCall {
    return {
      method: "get",
      url: "managers/managerCalendar/firstLoad",
    };
  },

  loadSchedulesByYearId(yearId: string | number): ApiCall {
    return {
      method: "get",
      url: `managers/managerCalendar/schedules/${yearId}`,
    };
  },

  addEvent(): ApiCall {
    return {
      method: "post",
      url: "managers/managerCalendar/addEvent",
    };
  },

  updateEvent(): ApiCall {
    return {
      method: "put",
      url: "managers/managerCalendar/updateEvent",
    };
  },

  deleteEvent(residentYearCalendarId: string | number): ApiCall {
    return {
      method: "delete",
      url: `managers/managerCalendar/deleteEvent/${residentYearCalendarId}`,
    };
  },

  /** Absorbed from ShedulerAPI — fetch data for the manager scheduler */
  fetchManagerSchedulerData(): ApiCall {
    return {
      method: "get",
      url: "fetchSchedule/",
    };
  },
};

export default calendarApi;
