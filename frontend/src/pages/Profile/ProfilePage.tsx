import { useCallback, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Slider from "@mui/material/Slider";

import CameraAltIcon from "@mui/icons-material/CameraAlt";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import useAuth from "../../hooks/useAuth";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import Woman from "../../images/icons/Woman.png";
import Man from "../../images/icons/Man.png";
import { getCroppedImg } from "./cropUtils";

const MAX_SIZE_MB = 2;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ProfilePage = () => {
  const { authentication, setAuthentication } = useAuth();
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview after crop confirmation
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);

  // Crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [cropLoading, setCropLoading] = useState(false);

  const fallbackSrc = authentication.gender === "male" ? Man : Woman;
  const currentAvatar = preview ?? (authentication.avatarUrl as string | undefined) ?? fallbackSrc;

  // ── Upload mutation ─────────────────────────────────────────────────────────
  const uploadMutation = useMutation({
    mutationFn: async (blob: Blob) => {
      const formData = new FormData();
      formData.append("avatar", blob, "avatar.jpg");
      const res = await axiosPrivate.post<{ avatarUrl: string }>("profile/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data.avatarUrl;
    },
    onSuccess: (avatarUrl) => {
      setAuthentication((prev) => ({ ...prev, avatarUrl }));
      setPreview(null);
      setPendingBlob(null);
      toast.success("Photo de profil mise à jour !");
    },
    onError: () => {
      toast.error("Impossible d'enregistrer la photo.");
    },
  });

  // ── Delete mutation ─────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await axiosPrivate.delete("profile/avatar");
    },
    onSuccess: () => {
      setAuthentication((prev) => ({ ...prev, avatarUrl: null }));
      setPreview(null);
      setPendingBlob(null);
      toast.success("Photo supprimée.");
    },
    onError: () => toast.error("Impossible de supprimer la photo."),
  });

  // ── File selection → open crop dialog ──────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Format non supporté. Utilisez JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Le fichier dépasse ${MAX_SIZE_MB} Mo.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawImageSrc(ev.target?.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset so same file can be re-selected
    e.target.value = "";
  };

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  // ── Confirm crop → produce preview blob ────────────────────────────────────
  const handleCropConfirm = async () => {
    if (!rawImageSrc || !croppedAreaPixels) return;
    setCropLoading(true);
    try {
      const blob = await getCroppedImg(rawImageSrc, croppedAreaPixels);
      const previewUrl = URL.createObjectURL(blob);
      setPreview(previewUrl);
      setPendingBlob(blob);
      setCropDialogOpen(false);
      setRawImageSrc(null);
    } catch {
      toast.error("Erreur lors du recadrage.");
    } finally {
      setCropLoading(false);
    }
  };

  const handleCropCancel = () => {
    setCropDialogOpen(false);
    setRawImageSrc(null);
  };

  const handleCancelPreview = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPendingBlob(null);
  };

  const handleConfirmUpload = () => {
    if (pendingBlob) uploadMutation.mutate(pendingBlob);
  };

  const isBusy = uploadMutation.isPending || deleteMutation.isPending;

  return (
    <Box p={{ xs: 2, sm: 4 }} maxWidth={560} mx="auto">
      {/* ── Back button ─────────────────────────────────────────────────────── */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2, textTransform: "none" }}
        color="inherit"
      >
        Retour
      </Button>

      <Typography variant="h5" fontWeight={700} mb={3}>
        Mon profil
      </Typography>

      <Paper variant="outlined" sx={{ p: 4 }}>
        {/* ── Avatar zone ───────────────────────────────────────────────────── */}
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <Box position="relative">
            <Avatar
              src={currentAvatar as string}
              alt={`${authentication.firstname} ${authentication.lastname}`}
              sx={{ width: 120, height: 120, fontSize: "2.5rem" }}
            />
            <Tooltip title="Changer la photo">
              <IconButton
                size="small"
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
                sx={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  bgcolor: "primary.main",
                  color: "white",
                  width: 32,
                  height: 32,
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                {isBusy ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <CameraAltIcon sx={{ fontSize: 16 }} />
                )}
              </IconButton>
            </Tooltip>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </Box>

          <Box textAlign="center">
            <Typography variant="h6" fontWeight={600}>
              {authentication.firstname} {authentication.lastname}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {authentication.role === "hospital_admin"
                ? "Administrateur d'hôpital"
                : authentication.role === "manager"
                ? "Manager"
                : "MACCS"}
              {authentication.hospitalName ? ` — ${authentication.hospitalName}` : ""}
            </Typography>
          </Box>

          {/* ── Preview actions ─────────────────────────────────────────────── */}
          {preview && (
            <Box display="flex" gap={1} mt={1}>
              <Button
                variant="contained"
                size="small"
                onClick={handleConfirmUpload}
                disabled={isBusy}
              >
                {uploadMutation.isPending ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  "Enregistrer"
                )}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
              >
                Recadrer à nouveau
              </Button>
              <Button
                variant="text"
                size="small"
                onClick={handleCancelPreview}
                disabled={isBusy}
              >
                Annuler
              </Button>
            </Box>
          )}

          {/* ── Delete button ────────────────────────────────────────────────── */}
          {!preview && authentication.avatarUrl && (
            <Button
              size="small"
              color="error"
              variant="outlined"
              startIcon={
                deleteMutation.isPending ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <DeleteOutlineIcon />
                )
              }
              onClick={() => deleteMutation.mutate()}
              disabled={isBusy}
            >
              Supprimer la photo
            </Button>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
          Formats acceptés : JPG, PNG, WebP — max {MAX_SIZE_MB} Mo
        </Typography>
      </Paper>

      {/* ── Crop dialog ────────────────────────────────────────────────────── */}
      <Dialog
        open={cropDialogOpen}
        onClose={handleCropCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>Recadrer la photo</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {rawImageSrc && (
            <>
              {/* Crop area */}
              <Box position="relative" width="100%" height={340} bgcolor="black">
                <Cropper
                  image={rawImageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </Box>

              {/* Zoom slider */}
              <Box px={4} pt={3} pb={1}>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  Zoom
                </Typography>
                <Slider
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.05}
                  onChange={(_, v) => setZoom(v as number)}
                  aria-label="Zoom"
                  size="small"
                />
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCropCancel} color="inherit">
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handleCropConfirm}
            disabled={cropLoading || !croppedAreaPixels}
          >
            {cropLoading ? <CircularProgress size={18} color="inherit" /> : "Recadrer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilePage;
