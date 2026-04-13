import React from "react";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import useWeekShedulerContext from "../../../../../hooks/useWeekShedulerContext";
import { alpha } from "@mui/system";
import { CardActionArea } from "@mui/material";
import dayjs from "@/lib/dayjs";

const TimeCard = ({ task }) => {
  const { setSelectedTask, setTaskMode } = useWeekShedulerContext();

  const handleClick = () => {
    setSelectedTask({
      ...task,
      startTime: task.startTime ? dayjs(task.startTime, "HH:mm") : null,
      endTime: task.endTime ? dayjs(task.endTime, "HH:mm") : null,
    });
    setTaskMode("update");
  };

  return (
    <Stack direction="row" spacing={2} padding={2} sx={{ paddingRight: 4 }} onClick={handleClick}>
      <Stack direction="column" justifyContent="space-between" alignItems="flex-start">
        <Typography sx={{ fontWeight: 600 }}>{task.startTime}</Typography>
        <Typography sx={{ fontWeight: 600 }}>{task.endTime}</Typography>
      </Stack>

      <CardActionArea>
        <Card
          sx={{
            backgroundColor: alpha("#4782e8", 0.95),
            borderTopRightRadius: "1rem",
            borderBottomRightRadius: "1rem",
            borderLeft: "5px solid #234784",
            width: "100%",
          }}
        >
          <CardContent
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
              paddingLeft: 8,
            }}
          >
            <Typography variant="h6" color="#f6f4fc">
              {task.title}
            </Typography>
            <Typography variant="body1" color="#f6f4fc">
              {task.description}
            </Typography>
          </CardContent>
        </Card>
      </CardActionArea>
    </Stack>
  );
};

export default TimeCard;
