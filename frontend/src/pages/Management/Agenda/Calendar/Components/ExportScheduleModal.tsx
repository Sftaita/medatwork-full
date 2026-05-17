import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack, Divider, CircularProgress, Typography, Box,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import 'dayjs/locale/fr';
import dayjs, { type Dayjs } from 'dayjs';
import { toast } from 'react-toastify';
import useAxiosPrivate from '../../../../../hooks/useAxiosPrivate';
import calendarApi from '../../../../../services/calendarApi';
import type { MCMacc, MCService, MCEvent } from './MonthCalendar';
import { downloadSchedulePdf, printSchedule, pdfToBase64 } from './exportSchedulePdf';

interface Props {
  open:         boolean;
  onClose:      () => void;
  maccs:        MCMacc[];
  enabledMaccs: Set<string>;
  events:       Record<string, MCEvent[]>;
  services:     Record<string, MCService>;
  yearId?:      string | number;
}

type SendTarget = 'maccs' | 'manager' | 'hr';

export default function ExportScheduleModal({
  open, onClose, maccs, enabledMaccs, events, services, yearId,
}: Props) {
  const axiosPrivate = useAxiosPrivate();

  const [fromDate, setFromDate] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [toDate,   setToDate]   = useState<Dayjs | null>(dayjs().endOf('month'));
  const [sending,  setSending]  = useState<SendTarget | null>(null);

  const exportParams = () => ({
    activeMaccs: maccs,
    enabledMaccs,
    events,
    services,
    fromDate: fromDate?.format('YYYY-MM-DD') ?? dayjs().startOf('month').format('YYYY-MM-DD'),
    toDate:   toDate?.format('YYYY-MM-DD')   ?? dayjs().endOf('month').format('YYYY-MM-DD'),
  });

  const handleDownload = () => downloadSchedulePdf(exportParams());
  const handlePrint    = () => printSchedule(exportParams());

  const handleSend = async (target: SendTarget) => {
    if (!yearId) {
      toast.error('Aucune année académique sélectionnée.');
      return;
    }
    setSending(target);
    try {
      const params     = exportParams();
      const pdfBase64  = pdfToBase64(params);
      const maccIds    = maccs.filter((m) => enabledMaccs.has(m.id)).map((m) => Number(m.id));
      const { method, url } = calendarApi.sendScheduleByEmail();
      await axiosPrivate[method](url, {
        yearId,
        fromDate: params.fromDate,
        toDate:   params.toDate,
        maccIds,
        recipientType: target,
        pdfBase64,
      });

      const labels: Record<SendTarget, string> = {
        maccs:   'MACCs',
        manager: 'manager de l\'année',
        hr:      'RH de l\'hôpital',
      };
      toast.success(`Planning envoyé au ${labels[target]} par email.`);
    } catch {
      toast.error('Erreur lors de l\'envoi. Vérifiez les adresses email configurées.');
    } finally {
      setSending(null);
    }
  };

  const activeMaccsCount = maccs.filter((m) => enabledMaccs.has(m.id)).length;
  const dateValid = fromDate && toDate && fromDate.isBefore(toDate.add(1, 'day'));

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Exporter le planning</DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {activeMaccsCount} MACC{activeMaccsCount > 1 ? 's' : ''} sélectionné{activeMaccsCount > 1 ? 's' : ''}
          </Typography>

          <Stack spacing={2}>
            <DatePicker
              label="Du"
              value={fromDate}
              onChange={setFromDate}
              maxDate={toDate ?? undefined}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
            <DatePicker
              label="Au"
              value={toDate}
              onChange={setToDate}
              minDate={fromDate ?? undefined}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ flexDirection: 'column', gap: 1, p: 2, pt: 0 }}>

          {/* Télécharger / Imprimer */}
          <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
            <Button
              variant="contained"
              fullWidth
              disabled={!dateValid}
              onClick={handleDownload}
              startIcon={<span>↓</span>}
            >
              Télécharger PDF
            </Button>
            <Button
              variant="outlined"
              fullWidth
              disabled={!dateValid}
              onClick={handlePrint}
              startIcon={<span>⎙</span>}
            >
              Imprimer
            </Button>
          </Stack>

          <Divider sx={{ width: '100%', my: 0.5 }}>
            <Typography variant="caption" color="text.disabled">Envoyer par email</Typography>
          </Divider>

          {/* Envoi emails */}
          {(['maccs', 'manager', 'hr'] as SendTarget[]).map((target) => {
            const labels: Record<SendTarget, string> = {
              maccs:   'Aux MACCs sélectionnés',
              manager: 'Au manager de l\'année',
              hr:      'Au RH de l\'hôpital',
            };
            const icons: Record<SendTarget, string> = {
              maccs: '👥', manager: '👤', hr: '🏥',
            };
            const isLoading = sending === target;
            return (
              <Button
                key={target}
                variant="outlined"
                fullWidth
                disabled={!dateValid || sending !== null || (target === 'maccs' && activeMaccsCount === 0)}
                onClick={() => handleSend(target)}
                startIcon={isLoading ? <CircularProgress size={14} /> : <span>{icons[target]}</span>}
                sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
              >
                {labels[target]}
              </Button>
            );
          })}

          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
            <Button onClick={onClose} color="inherit">Fermer</Button>
          </Box>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
