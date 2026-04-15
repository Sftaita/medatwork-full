import { useRef, useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import DialogActions from "@mui/material/DialogActions";
import Slider from "@mui/material/Slider";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import CloseIcon from "@mui/icons-material/Close";
import { getCroppedImg } from "../pages/Profile/cropUtils";

interface Props {
  /** Called each time the user confirms a crop, or null when photo is removed */
  onChange: (blob: Blob | null) => void;
  /** Optional: label shown above the avatar */
  label?: string;
}

/**
 * Reusable inline avatar picker with crop dialog.
 * Drop into any form — call onChange to get the Blob to send with the form.
 */
const AvatarPickerField = ({ onChange, label = "Photo de profil (optionnel)" }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [rawSrc, setRawSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow re-selecting same file

    if (file.size > 2 * 1024 * 1024) {
      alert("Le fichier dépasse 2 Mo.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Format non supporté. Utilisez JPG, PNG ou WebP.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setRawSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirmCrop = async () => {
    if (!rawSrc || !croppedAreaPixels) return;
    const blob = await getCroppedImg(rawSrc, croppedAreaPixels);
    const url = URL.createObjectURL(blob);
    setPreview(url);
    setCropOpen(false);
    onChange(blob);
  };

  const handleRemove = () => {
    setPreview(null);
    setRawSrc(null);
    onChange(null);
  };

  return (
    <>
      <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
        <Typography variant="subtitle2" color="text.secondary">
          {label}
        </Typography>

        {/* Avatar with camera overlay */}
        <Box sx={{ position: "relative", display: "inline-block" }}>
          <Avatar
            src={preview ?? undefined}
            sx={{ width: 96, height: 96, fontSize: 36, bgcolor: "grey.200" }}
          />
          <IconButton
            size="small"
            onClick={() => inputRef.current?.click()}
            sx={{
              position: "absolute",
              bottom: 0,
              right: 0,
              bgcolor: "primary.main",
              color: "white",
              width: 28,
              height: 28,
              "&:hover": { bgcolor: "primary.dark" },
            }}
          >
            <CameraAltIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        {/* Remove button */}
        {preview && (
          <Button size="small" color="error" onClick={handleRemove} startIcon={<CloseIcon />}>
            Retirer
          </Button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={onFileChange}
        />
      </Box>

      {/* Crop dialog */}
      <Dialog open={cropOpen} onClose={() => setCropOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Recadrer la photo</DialogTitle>
        <DialogContent>
          <Box sx={{ position: "relative", height: 300, bgcolor: "#111" }}>
            {rawSrc && (
              <Cropper
                image={rawSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </Box>
          <Box px={2} pt={2}>
            <Typography variant="caption" color="text.secondary">
              Zoom
            </Typography>
            <Slider
              value={zoom}
              min={1}
              max={3}
              step={0.05}
              onChange={(_, v) => setZoom(v as number)}
              size="small"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCropOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleConfirmCrop}>
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AvatarPickerField;
