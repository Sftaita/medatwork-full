import { useState, useEffect } from "react";
import periodsApi from "../../../../services/periodsApi";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import { handleApiError } from "@/services/apiError";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useTheme } from "@mui/material/styles";
import dayjs from "@/lib/dayjs";

const ISSUE_LABELS: Record<string, string> = {
  smoothed_average_warning: "Lissage moyen — attention",
  smoothed_average_exceeded: "Lissage moyen — dépassement légal",
  weekly_absolute_limit_exceeded: "Limite absolue hebdomadaire dépassée",
  max_shift_duration_exceeded: "Durée max de prestation dépassée (> 24 h)",
  minimum_rest_violated: "Repos insuffisant après prestation ≥ 12 h",
};

type Issue = {
  type: string;
  severity: "warning" | "critical";
  weekStart: string;
  description: string;
  context: Record<string, unknown>;
};

type Period = {
  periodStart: string;
  periodEnd: string;
  issues: Issue[];
};

type ResidentReport = {
  residentId: number;
  residentFirstname: string;
  residentLastname: string;
  optingOut: boolean;
  periods: Period[];
};

const IssueSeverityIcon = ({ severity }: { severity: string }) => {
  if (severity === "critical") return <ErrorOutlineIcon color="error" fontSize="small" />;
  return <WarningAmberIcon color="warning" fontSize="small" />;
};

const PeriodRow = ({ period }: { period: Period }) => {
  const [open, setOpen] = useState(false);
  const hasIssues = period.issues.length > 0;
  const hasCritical = period.issues.some((i) => i.severity === "critical");

  return (
    <Box mb={1}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          cursor: "pointer",
          px: 1,
          py: 0.5,
          borderRadius: 1,
          "&:hover": { bgcolor: "action.hover" },
        }}
        onClick={() => setOpen((v) => !v)}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton size="small">
            {open ? (
              <KeyboardArrowUpIcon fontSize="small" />
            ) : (
              <KeyboardArrowDownIcon fontSize="small" />
            )}
          </IconButton>
          <Typography variant="body2">
            {dayjs(period.periodStart).format("DD/MM/YYYY")} →{" "}
            {dayjs(period.periodEnd).format("DD/MM/YYYY")}
          </Typography>
        </Stack>
        {!hasIssues && (
          <Chip size="small" color="success" icon={<CheckCircleOutlineIcon />} label="Conforme" />
        )}
        {hasIssues && !hasCritical && (
          <Chip
            size="small"
            color="warning"
            icon={<WarningAmberIcon />}
            label={`${period.issues.length} attention`}
          />
        )}
        {hasCritical && (
          <Chip
            size="small"
            color="error"
            icon={<ErrorOutlineIcon />}
            label={`${period.issues.length} violation(s)`}
          />
        )}
      </Stack>

      <Collapse in={open} timeout={0} unmountOnExit>
        <Box px={2} pb={1}>
          {!hasIssues && (
            <Alert severity="success" sx={{ mt: 1 }}>
              Aucune anomalie détectée pour cette période.
            </Alert>
          )}
          {period.issues.map((issue, i) => (
            <Alert
              key={i}
              severity={issue.severity === "critical" ? "error" : "warning"}
              icon={<IssueSeverityIcon severity={issue.severity} />}
              sx={{ mt: 1 }}
            >
              <Typography variant="body2" fontWeight={600}>
                {ISSUE_LABELS[issue.type] ?? issue.type}
              </Typography>
              <Typography variant="body2">{issue.description}</Typography>
              <Typography variant="caption" color="text.secondary">
                Semaine du {dayjs(issue.weekStart).format("DD/MM/YYYY")}
              </Typography>
            </Alert>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};

const ResidentRow = ({ report }: { report: ResidentReport }) => {
  const [open, setOpen] = useState(false);
  const theme = useTheme();

  const totalIssues = report.periods.reduce((acc, p) => acc + p.issues.length, 0);
  const hasCritical = report.periods.some((p) => p.issues.some((i) => i.severity === "critical"));

  return (
    <Box
      mb={2}
      border={1}
      borderColor={
        hasCritical ? "error.light" : totalIssues > 0 ? "warning.light" : "success.light"
      }
      borderRadius={1}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: 2,
          py: 1,
          cursor: "pointer",
          borderRadius: "4px 4px 0 0",
          bgcolor: hasCritical
            ? "error.lighter"
            : totalIssues > 0
              ? "warning.lighter"
              : "success.lighter",
        }}
        onClick={() => setOpen((v) => !v)}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton size="small">
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
          <Typography fontWeight={600}>
            {report.residentFirstname} {report.residentLastname}
          </Typography>
          {report.optingOut && (
            <Chip size="small" label="Opting-out" color="primary" variant="outlined" />
          )}
        </Stack>

        <Stack direction="row" spacing={1}>
          {totalIssues === 0 && (
            <Chip size="small" color="success" icon={<CheckCircleOutlineIcon />} label="Conforme" />
          )}
          {totalIssues > 0 && !hasCritical && (
            <Chip
              size="small"
              color="warning"
              icon={<WarningAmberIcon />}
              label={`${totalIssues} alerte(s)`}
            />
          )}
          {hasCritical && (
            <Chip
              size="small"
              color="error"
              icon={<ErrorOutlineIcon />}
              label={`${totalIssues} violation(s) légales`}
            />
          )}
        </Stack>
      </Stack>

      <Collapse in={open} timeout={0} unmountOnExit>
        <Box px={2} py={1}>
          <Table size="small" sx={{ mb: 1 }}>
            <TableBody>
              <TableRow>
                <TableCell style={{ border: "none" }}>Opting-out :</TableCell>
                <TableCell style={{ border: "none" }}>
                  <Chip
                    size="small"
                    color={report.optingOut ? "primary" : "default"}
                    label={report.optingOut ? "OUI" : "NON"}
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell style={{ border: "none" }}>Périodes de 13 semaines :</TableCell>
                <TableCell style={{ border: "none" }} sx={{ color: theme.palette.primary.main }}>
                  {report.periods.length}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Divider sx={{ mb: 1 }} />
          {report.periods.map((period, i) => (
            <PeriodRow key={i} period={period} />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};

const Compliance = ({ yearId }: { yearId: number | null }) => {
  const axiosPrivate = useAxiosPrivate();
  const [reports, setReports] = useState<ResidentReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!yearId) return;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const { method, url } = periodsApi.getComplianceReport();
        const res = await axiosPrivate[method](url + yearId);
        setReports(res?.data ?? []);
      } catch (err) {
        handleApiError(err);
        setError("Impossible de charger les données de conformité.");
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [yearId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (reports.length === 0) {
    return (
      <Alert severity="info">
        Aucun MACCS actif trouvé pour cette année ou aucune donnée de conformité disponible.
      </Alert>
    );
  }

  const totalViolations = reports.reduce(
    (acc, r) =>
      acc +
      r.periods.reduce((a, p) => a + p.issues.filter((i) => i.severity === "critical").length, 0),
    0
  );

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" fontWeight={700}>
          Conformité légale — Temps de travail MACCS
        </Typography>
        {totalViolations > 0 ? (
          <Chip
            color="error"
            icon={<ErrorOutlineIcon />}
            label={`${totalViolations} violation(s) légale(s)`}
          />
        ) : (
          <Chip color="success" icon={<CheckCircleOutlineIcon />} label="Aucune violation légale" />
        )}
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {reports.map((report) => (
        <ResidentRow key={report.residentId} report={report} />
      ))}
    </Box>
  );
};

export default Compliance;
