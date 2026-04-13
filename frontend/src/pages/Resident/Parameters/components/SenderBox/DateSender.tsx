import Typography from "@mui/material/Typography";
import DateHandler from "../../../../../components/medium/DateHandler";

const DateSender = ({ value, label, onChange }) => {
  return (
    <>
      <Typography variant={"subtitle2"} sx={{ marginBottom: 2 }} fontWeight={700}>
        {label}
      </Typography>

      <DateHandler value={value} label={label} onChange={onChange} />
    </>
  );
};

export default DateSender;
