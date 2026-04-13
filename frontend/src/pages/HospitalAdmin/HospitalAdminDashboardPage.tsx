import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActionArea from "@mui/material/CardActionArea";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";

import SearchIcon from "@mui/icons-material/Search";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";

import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import adminApi from "../../services/adminApi";
import type { HospitalYear } from "../../types/entities";

// ── Helpers ───────────────────────────────────────────────────────────────────

const NameTooltip = ({ names, emptyLabel }: { names: string[]; emptyLabel: string }) => (
  <>
    {names.length > 0 ? (
      <Box component="ul" sx={{ m: 0, pl: 2, py: 0.5, textAlign: "left" }}>
        {names.map((n, i) => (
          <li key={i}>{n}</li>
        ))}
      </Box>
    ) : (
      emptyLabel
    )}
  </>
);

// ── Skeleton card ─────────────────────────────────────────────────────────────

const SkeletonCard = () => (
  <Card variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
    <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5, p: 2.5 }}>
      <Skeleton variant="text" width="65%" height={26} />
      <Skeleton variant="text" width="45%" height={18} />
      <Box flex={1} minHeight={16} />
      <Box display="flex" gap={1}>
        <Skeleton variant="rounded" width={90} height={26} />
        <Skeleton variant="rounded" width={90} height={26} />
      </Box>
    </CardContent>
    <Divider />
    <Box sx={{ px: 1.5, py: 0.75 }}>
      <Skeleton variant="text" width="70%" height={22} />
    </Box>
  </Card>
);

// ── Year card ─────────────────────────────────────────────────────────────────

const YearCard = ({ year, searchQuery }: { year: HospitalYear; searchQuery: string }) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!year.token) return;
    navigator.clipboard.writeText(year.token).then(() => {
      setCopied(true);
      toast.success("Code copié !");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const residentNames = (year.residents ?? []).map((r) => `${r.firstname} ${r.lastname}`);
  const managerNames = (year.managers ?? []).map((m) => `${m.firstname} ${m.lastname}`);
  const residentCount = year.residents?.length ?? year.residentCount ?? 0;
  const managerCount = managerNames.length;

  const q = searchQuery.trim().toLowerCase();
  const residentMatch = q.length > 0 && residentNames.some((n) => n.toLowerCase().includes(q));
  const managerMatch = q.length > 0 && managerNames.some((n) => n.toLowerCase().includes(q));

  const goToYear = (defaultTab?: string) =>
    navigate("/manager/year-detail", {
      state: { id: year.id, title: year.title, adminRights: true, defaultTab },
    });

  return (
    <Card
      variant="outlined"
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.15s ease, border-color 0.15s ease",
        "&:hover": { boxShadow: 4, borderColor: "primary.main" },
      }}
    >
      {/* Clickable area — navigates to year detail */}
      <CardActionArea
        onClick={() => goToYear()}
        sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "stretch" }}
      >
        <CardContent
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            p: 2.5,
            "&:last-child": { pb: 2.5 },
          }}
        >
          {/* Title */}
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              lineHeight: 1.35,
              minHeight: "2.7em",
              mb: 1,
            }}
          >
            {year.title}
          </Typography>

          {/* Spacer */}
          <Box flex={1} />

          {/* Location + speciality */}
          {year.location && (
            <Box display="flex" alignItems="center" gap={0.5} mb={1.5}>
              <LocationOnOutlinedIcon sx={{ fontSize: 14, color: "text.disabled" }} />
              <Typography variant="caption" color="text.secondary" noWrap>
                {year.location}
                {year.speciality ? ` — ${year.speciality}` : ""}
              </Typography>
            </Box>
          )}

          {/* Stats chips */}
          <Box display="flex" gap={1} flexWrap="wrap">
            {/* Residents */}
            <Tooltip
              title={<NameTooltip names={residentNames} emptyLabel="Aucun résident" />}
              placement="top"
              arrow
            >
              <Box
                display="inline-flex"
                alignItems="center"
                gap={0.5}
                sx={{
                  bgcolor: residentMatch ? "success.50" : "grey.100",
                  border: "1px solid",
                  borderColor: residentMatch ? "success.300" : "transparent",
                  borderRadius: 1,
                  px: 1,
                  py: 0.4,
                  cursor: "pointer",
                  transition: "background-color 0.2s, border-color 0.2s",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  goToYear("residents");
                }}
              >
                <PeopleOutlineIcon
                  sx={{ fontSize: 16, color: residentMatch ? "success.main" : "text.secondary" }}
                />
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color={residentMatch ? "success.main" : "text.secondary"}
                >
                  {residentCount}&nbsp;résident{residentCount !== 1 ? "s" : ""}
                </Typography>
              </Box>
            </Tooltip>

            {/* Managers */}
            <Tooltip
              title={<NameTooltip names={managerNames} emptyLabel="Aucun manager" />}
              placement="top"
              arrow
            >
              <Box
                display="inline-flex"
                alignItems="center"
                gap={0.5}
                sx={{
                  bgcolor: managerMatch ? "success.50" : "grey.100",
                  border: "1px solid",
                  borderColor: managerMatch ? "success.300" : "transparent",
                  borderRadius: 1,
                  px: 1,
                  py: 0.4,
                  cursor: "pointer",
                  transition: "background-color 0.2s, border-color 0.2s",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  goToYear("partners");
                }}
              >
                <PersonOutlineIcon
                  sx={{ fontSize: 16, color: managerMatch ? "success.main" : "text.secondary" }}
                />
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color={managerMatch ? "success.main" : "text.secondary"}
                >
                  {managerCount}&nbsp;manager{managerCount !== 1 ? "s" : ""}
                </Typography>
              </Box>
            </Tooltip>
          </Box>
        </CardContent>
      </CardActionArea>

      {/* Token — outside CardActionArea: copy without navigating */}
      {year.token && (
        <>
          <Divider />
          <Box
            display="flex"
            alignItems="center"
            sx={{ bgcolor: "grey.50", px: 1.5, py: 0.75 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography
              variant="body2"
              sx={{
                fontFamily: "monospace",
                fontSize: "0.8rem",
                letterSpacing: "0.06em",
                color: "text.primary",
                userSelect: "all",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                mr: 0.5,
              }}
            >
              {year.token}
            </Typography>
            <Tooltip title={copied ? "Copié !" : "Copier le code"} placement="top" arrow>
              <IconButton
                size="small"
                onClick={handleCopy}
                color={copied ? "success" : "default"}
                sx={{ flexShrink: 0 }}
              >
                {copied ? (
                  <CheckIcon sx={{ fontSize: 16 }} />
                ) : (
                  <ContentCopyIcon sx={{ fontSize: 16 }} />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </>
      )}
    </Card>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const ALL_TAB = "__all__";

const HospitalAdminDashboardPage = () => {
  useAxiosPrivate();
  const { data: years = [], isLoading } = useQuery({
    queryKey: ["hospital-admin-years"],
    queryFn: adminApi.listMyYears,
  });

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState(ALL_TAB);
  const tabInitialized = useRef(false);

  // Unique periods sorted newest → oldest
  const periods = useMemo(() => {
    const unique = [...new Set(years.map((y) => y.period))];
    return unique.sort((a, b) => b.localeCompare(a));
  }, [years]);

  // Auto-select current period (or most recent) on first data load
  useEffect(() => {
    if (tabInitialized.current || years.length === 0) return;
    tabInitialized.current = true;
    const today = new Date();
    const current = years.find((y) => {
      const start = new Date(y.dateOfStart);
      const end = new Date(y.dateOfEnd);
      return today >= start && today <= end;
    });
    setTab(current?.period ?? periods[0] ?? ALL_TAB);
  }, [years, periods]);

  // Filter by tab + search, sort alphabetically by title
  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    return years
      .filter((y) => {
        if (tab !== ALL_TAB && y.period !== tab) return false;
        if (!q) return true;
        const residentNames = (y.residents ?? [])
          .map((r) => `${r.firstname} ${r.lastname}`.toLowerCase())
          .join(" ");
        const managerNames = (y.managers ?? [])
          .map((m) => `${m.firstname} ${m.lastname}`.toLowerCase())
          .join(" ");
        return (
          y.title.toLowerCase().includes(q) ||
          (y.location ?? "").toLowerCase().includes(q) ||
          (y.speciality ?? "").toLowerCase().includes(q) ||
          residentNames.includes(q) ||
          managerNames.includes(q)
        );
      })
      .sort((a, b) => a.title.localeCompare(b.title, "fr", { sensitivity: "base" }));
  }, [years, tab, q]);

  const activeTab = periods.includes(tab) ? tab : ALL_TAB;

  return (
    <Container maxWidth="lg" sx={{ pb: 6 }}>
      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <Box
        position="sticky"
        top={0}
        zIndex={10}
        bgcolor="background.paper"
        borderBottom={1}
        borderColor="divider"
        pt={3}
        pb={1.5}
        mb={3}
      >
        <Box mb={1.5}>
          <Typography variant="h5" fontWeight={700}>
            Tableau de bord
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Années de formation rattachées à votre hôpital
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Tabs
            value={activeTab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ flex: 1, minWidth: 0 }}
          >
            <Tab label="Toutes" value={ALL_TAB} />
            {periods.map((p) => (
              <Tab key={p} label={p} value={p} />
            ))}
          </Tabs>
          <TextField
            size="small"
            placeholder="Titre, résident, manager…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: { xs: "100%", sm: 260 }, flexShrink: 0 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Box>

      {/* ── Grid ──────────────────────────────────────────────────────────── */}
      <Grid container spacing={2.5} alignItems="stretch">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Grid key={i} item xs={12} sm={6} md={4} sx={{ display: "flex" }}>
                <Box width="100%">
                  <SkeletonCard />
                </Box>
              </Grid>
            ))
          : filtered.map((year) => (
              <Grid key={year.id} item xs={12} sm={6} md={4} sx={{ display: "flex" }}>
                <YearCard year={year} searchQuery={search} />
              </Grid>
            ))}
      </Grid>

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!isLoading && filtered.length === 0 && (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          py={10}
          gap={1.5}
        >
          {years.length === 0 ? (
            <Alert severity="info" sx={{ maxWidth: 440 }}>
              Aucune année de formation enregistrée pour cet hôpital.
            </Alert>
          ) : (
            <Typography variant="h6" color="text.secondary" fontWeight={500}>
              Aucune année trouvée
            </Typography>
          )}
        </Box>
      )}
    </Container>
  );
};

export default HospitalAdminDashboardPage;
