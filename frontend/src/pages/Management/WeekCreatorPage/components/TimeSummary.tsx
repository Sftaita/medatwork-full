import React from "react";
import useWeekShedulerContext from "../../../../hooks/useWeekShedulerContext";

// Local component:
import WeekCard from "./WeekCreator/DayBar";
import HoursCircle from "./WeekCreator/HoursCircle";
const TimeSummary = () => {
  const { currentWeek } = useWeekShedulerContext();
  const dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  const timeToSeconds = (time) => {
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
  const dayTimeTotalSeconds = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

  for (const task of currentWeek) {
    const timeObj = calculateTime(task.startTime, task.endTime);
    const seconds = timeObj.hours * 3600 + timeObj.minutes * 60;

    dayTimeTotalSeconds[task.dayOfWeek] += seconds;
    totalTimeSeconds += seconds;
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

export default TimeSummary;
