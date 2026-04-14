import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-toastify";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";

import CameraAltIcon from "@mui/icons-material/CameraAlt";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import useAuth from "../../hooks/useAuth";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import Woman from "../../images/icons/Woman.png";
import Man from "../../images/icons/Man.png";

const MAX_SIZE_MB = 2;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ProfilePage = () => {
  const { authentication, setAuthentication } = useAuth();
  const axiosPrivate = useAxiosPrivate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const fallbackSrc = authentication.gender === "male" ? Man : Woman;
  const currentAvatar = preview ?? authentication.avatarUrl ?? fallbackSrc;

  // ── Upload mutation ─────────────────────────────────────────────────────────
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await axiosPrivate.post<{ avatarUrl: string }>("profile/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data.avatarUrl;
    },
    onSuccess: (avatarUrl) => {
      setAuthentication((prev) => ({ ...prev, avatarUrl }));
      setPreview(null);
      setPendingFile(null);
      toast.success("Photo de profil mise à jour.");
    },
    onError: () => {
      setPreview(null);
      setPendingFile(null);
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
      setPendingFile(null);
      toast.success("Photo supprimée.");
    },
    onError: () => toast.error("Impossible de supprimer la photo."),
  });

  // ── File selection ──────────────────────────────────────────────────────────
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
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setPendingFile(file);

    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const handleConfirmUpload = () => {
    if (pendingFile) uploadMutation.mutate(pendingFile);
  };

  const handleCancelPreview = () => {
    setPreview(null);
    setPendingFile(null);
  };

  const isBusy = uploadMutation.isPending || deleteMutation.isPending;

  return (
    <Box p={{ xs: 2, sm: 4 }} maxWidth={560} mx="auto">
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
            {/* Camera overlay button */}
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
                {uploadMutation.isPending ? <CircularProgress size={16} /> : "Enregistrer"}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleCancelPreview}
                disabled={isBusy}
              >
                Annuler
              </Button>
            </Box>
          )}

          {/* ── Delete button — only if a real avatar is stored ─────────────── */}
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

        {/* ── Info ────────────────────────────────────────────────────────────── */}
        <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
          Formats acceptés : JPG, PNG, WebP — max {MAX_SIZE_MB} Mo
        </Typography>
      </Paper>
    </Box>
  );
};

export default ProfilePage;
