import { useState } from "react";
import Box from "@mui/material/Box";
import { API_URL } from "../../config";

// ── URL builder ───────────────────────────────────────────────────────────────

/**
 * Construit l'URL publique d'une photo de profil depuis le chemin stocké en base.
 * Format stocké : "abc123.jpg" ou "uploads/avatars/abc123.jpg"
 * URL résultante : {API_URL}profile/avatar/abc123
 * Route Symfony : GET /api/profile/avatar/{token} — PUBLIC_ACCESS
 */
export function buildAvatarUrl(avatarPath: string | null | undefined): string | null {
  if (!avatarPath) return null;
  const filename = avatarPath.split("/").pop() ?? "";
  const token    = filename.replace(/\.[^.]+$/, ""); // supprime l'extension
  if (!token) return null;
  return `${API_URL}profile/avatar/${token}`;
}

// ── Composant ─────────────────────────────────────────────────────────────────

interface UserAvatarProps {
  /** Prénom pour les initiales de fallback */
  firstname: string;
  /** Nom pour les initiales de fallback */
  lastname: string;
  /** Chemin stocké en DB (avatarPath) — null = affiche les initiales */
  avatarPath?: string | null;
  /** Taille en px (défaut : 38) */
  size?: number;
  /** Couleur de fond pour les initiales (hexadécimal) */
  color: string;
  /** Taille de la police pour les initiales */
  fontSize?: number;
  /** data-testid optionnel */
  testId?: string;
}

export default function UserAvatar({
  firstname,
  lastname,
  avatarPath,
  size = 38,
  color,
  fontSize,
  testId,
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const url = buildAvatarUrl(avatarPath);
  const showPhoto = !!url && !imgError;

  const initials = ((firstname?.[0] ?? "") + (lastname?.[0] ?? "")).toUpperCase();
  const fontSz   = fontSize ?? Math.round(size * 0.37);

  return (
    <Box
      data-testid={testId}
      sx={{
        width:          size,
        height:         size,
        borderRadius:   "50%",
        flex:           "none",
        overflow:       "hidden",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        bgcolor:        showPhoto ? "transparent" : color,
        color:          "#fff",
        fontWeight:     700,
        fontSize:       fontSz,
        flexShrink:     0,
      }}
    >
      {showPhoto ? (
        <Box
          component="img"
          src={url}
          alt={`${firstname} ${lastname}`}
          onError={() => setImgError(true)}
          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        initials
      )}
    </Box>
  );
}
