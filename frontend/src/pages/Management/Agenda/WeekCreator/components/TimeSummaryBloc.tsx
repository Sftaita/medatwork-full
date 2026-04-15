import React from "react";
import useWeekShedulerContext from "../../../../../hooks/useWeekShedulerContext";

// Local components:
import WeekCard from "./DayBar";
import HoursCircle from "./HoursCircle";
const TimeSummaryBloc = () => {
  const { selectedWeekId, weekTemplates } = useWeekShedulerContext();
  const dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  const timeToSeconds = (time) => {
    if (time === null) {
      return 0;
    }

    const [hours, minutes] = time.split(":").map(Number);
    return hours * 3600 + minutes * 60;
  };

  const secondsToTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return { hours, minutes };
  };

  const calculateTime = (start, end) => {
    const startSeconds = timeToSeconds(start);
    const endSeconds = timeToSeconds(end);
    return secondsToTime(endSeconds - startSeconds);
  };

  let totalTimeSeconds = 0;
  const dayTimeTotalSeconds: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

  const selectedWeek = weekTemplates.find((weekType) => weekType.id === selectedWeekId) || {
    tasks: [],
  };

  if (selectedWeek && Array.isArray(selectedWeek.weekTaskList)) {
    for (const task of selectedWeek.weekTaskList) {
      const timeObj = calculateTime(task.startTime, task.endTime);
      const seconds = timeObj.hours * 3600 + timeObj.minutes * 60;
      const dayKey = Number(task.dayOfWeek);

      if (dayKey >= 1 && dayKey <= 7) {
        dayTimeTotalSeconds[dayKey] += seconds;
      }
      totalTimeSeconds += seconds;
    }
  }

  const totalTime = secondsToTime(totalTimeSeconds);
  const dayTimeTotal = {};
  for (const day in dayTimeTotalSeconds) {
    dayTimeTotal[day] = secondsToTime(dayTimeTotalSeconds[day]);
  }

  return (
    <>
      <HoursCircle hours={totalTime.hours} minutes={totalTime.minutes} />
      <WeekCard
        days={dayNames.map((day, index) => ({
          dayName: day,
          hours: dayTimeTotal[index + 1].hours,
          minutes: dayTimeTotal[index + 1].minutes,
        }))}
      />
    </>
  );
};

export default TimeSummaryBloc;
