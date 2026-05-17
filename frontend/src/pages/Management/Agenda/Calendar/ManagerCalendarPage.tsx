import React, { useEffect } from "react";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import calendarApi from "../../../../services/calendarApi";
import useManagersCalendarContext from "../../../../hooks/useManagersCalendarContext";
import { handleApiError } from "@/services/apiError";
import CalendarView from "./Components/CalendarView";

const ManagerCalendarPage = () => {
  const axiosPrivate = useAxiosPrivate();
  const {
    setYears,
    setCurrentYear,
    setYearResidents,
    setSelectedResidents,
    setSchedules,
  } = useManagersCalendarContext() as any;

  useEffect(() => {
    const load = async () => {
      try {
        const { method, url } = calendarApi.fetchFirstLoadSchedules();
        const res  = await axiosPrivate[method](url);
        const data = res?.data?.years;
        if (!data?.length) return;

        setYears(data);
        const savedId = localStorage.getItem('calendar_selectedYearId');
        const initial = data.find((y: any) => String(y.yearId) === savedId) ?? data[0];
        setCurrentYear({ yearId: String(initial.yearId), title: initial.title });
        setYearResidents(initial.residents ?? []);
        setSelectedResidents((initial.residents ?? []).map((r: any) => r.residentId));

        // Le backend n'inclut les schedules que pour la 1ère année de la boucle.
        // Si l'année sélectionnée est différente (localStorage), on charge via l'API.
        const embedded: unknown[] = initial.schedules ?? [];
        if (embedded.length > 0) {
          setSchedules(embedded);
        } else {
          const { method: sm, url: su } = calendarApi.loadSchedulesByYearId(initial.yearId);
          const sr = await axiosPrivate[sm](su);
          setSchedules(sr?.data?.schedules ?? []);
        }
      } catch (err) {
        handleApiError(err);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <CalendarView />;
};

export default ManagerCalendarPage;
