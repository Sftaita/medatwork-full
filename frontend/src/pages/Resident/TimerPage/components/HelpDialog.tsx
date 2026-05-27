import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

type TabKey = "timer" | "garde" | "absence";
const tabKeys: TabKey[] = ["timer", "garde", "absence"];

const HelpDialog = ({ open, onClose, initialTab = "timer" }: {
  open: boolean;
  onClose: () => void;
  initialTab?: TabKey;
}) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>(initialTab);

  const steps: Record<TabKey, { label: string; intro: string; items: string[]; tips: { label: string; text: string }[] }> = {
    timer: {
      label: t("timer.tabs.timer"),
      intro: t("timer.help.schedule.intro"),
      items: [t("timer.help.schedule.step1"), t("timer.help.schedule.step2"), t("timer.help.schedule.step3"), t("timer.help.schedule.step4"), t("timer.help.schedule.step5")],
      tips: [
        { label: t("timer.help.schedule.tip1Label"), text: t("timer.help.schedule.tip1") },
        { label: t("timer.help.schedule.tip2Label"), text: t("timer.help.schedule.tip2") },
        { label: t("timer.help.schedule.tip3Label"), text: t("timer.help.schedule.tip3") },
      ],
    },
    garde: {
      label: t("timer.tabs.garde"),
      intro: t("timer.help.garde.intro"),
      items: [t("timer.help.garde.step1"), t("timer.help.garde.step2"), t("timer.help.garde.step3"), t("timer.help.garde.step4"), t("timer.help.garde.step5"), t("timer.help.garde.step6")],
      tips: [
        { label: t("timer.help.garde.tip1Label"), text: t("timer.help.garde.tip1") },
        { label: t("timer.help.garde.tip2Label"), text: t("timer.help.garde.tip2") },
      ],
    },
    absence: {
      label: t("timer.tabs.absence"),
      intro: t("timer.help.absence.intro"),
      items: [t("timer.help.absence.step1"), t("timer.help.absence.step2"), t("timer.help.absence.step3"), t("timer.help.absence.step4"), t("timer.help.absence.step5")],
      tips: [
        { label: t("timer.help.absence.tip1Label"), text: t("timer.help.absence.tip1") },
        { label: t("timer.help.absence.tip2Label"), text: t("timer.help.absence.tip2") },
      ],
    },
  };

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  const section = steps[tab];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, py: 1.5, px: 3 }}>
        <HelpOutlineIcon color="primary" fontSize="small" />
        <Typography variant="h6" component="span">
          {t("timer.help.title")}
        </Typography>
      </DialogTitle>

      <Divider />

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{ px: 2, minHeight: 40, "& .MuiTab-root": { minHeight: 40, py: 0.5 } }}
      >
        {tabKeys.map((key) => (
          <Tab key={key} value={key} label={steps[key].label} />
        ))}
      </Tabs>

      <Divider />

      <DialogContent sx={{ px: 3, py: 2 }}>
        <Typography variant="body2" color="text.secondary" mb={2}>
          {section.intro}
        </Typography>

        <Typography variant="subtitle2" mb={0.75}>
          {t("timer.help.steps")}
        </Typography>
        <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
          {section.items.map((item, i) => (
            <Typography
              key={i}
              component="li"
              variant="body2"
              sx={{ mb: 0.5, lineHeight: 1.5 }}
            >
              {item}
            </Typography>
          ))}
        </Box>

        {section.tips.length > 0 && (
          <>
            <Typography variant="subtitle2" mt={2} mb={0.75}>
              {t("timer.help.tips")}
            </Typography>
            <Box display="flex" flexDirection="column" gap={0.75}>
              {section.tips.map((tip) => (
                <Box key={tip.label} display="flex" alignItems="center" gap={1}>
                  <Chip
                    label={tip.label}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ flexShrink: 0, height: 22, fontSize: "0.7rem" }}
                  />
                  <Typography variant="body2" color="text.secondary" lineHeight={1.4}>
                    {tip.text}
                  </Typography>
                </Box>
              ))}
            </Box>
          </>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="contained" color="primary" size="small">
          {t("timer.help.understood")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HelpDialog;
