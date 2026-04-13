import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

/**
 * Generic page-level skeleton shown while a lazy page is loading.
 * Mimics the structure of a typical content page (title + cards).
 */
const PageSkeleton = () => (
  <Box minHeight="calc(100vh - 247px)" paddingX={3} paddingTop={4}>
    <Skeleton variant="text" width={240} height={48} sx={{ mb: 3 }} />
    <Stack spacing={2}>
      <Skeleton variant="rounded" height={120} />
      <Skeleton variant="rounded" height={120} />
      <Skeleton variant="rounded" height={80} />
    </Stack>
  </Box>
);

export default PageSkeleton;
