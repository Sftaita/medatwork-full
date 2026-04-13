import { useState } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import yearsApi from "../../../../services/yearsApi";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import { toast } from "react-toastify";

// Material UI
import Box from "@mui/material/Box";
import { Typography } from "@mui/material";
import { TextField } from "@mui/material";
import { InputAdornment } from "@mui/material";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid";
import { handleApiError } from "@/services/apiError";

const SearchBox = ({ handleSearch }) => {
  AOS.init();
  const axiosPrivate = useAxiosPrivate();
  const [search, setSearch] = useState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleClick = async () => {
    setError(null);
    setLoading(true);

    try {
      const { method, url } = yearsApi.getYearByToken();
      const request = await axiosPrivate[method](url, { token: search });

      handleSearch(request.data);
    } catch (error) {
      handleApiError(error);
      setError(error.response.data.message);
      toast.error(error.response.data.message, {
        position: "bottom-center",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
        progress: undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minHeight={300} data-aos="zoom-in">
      <Box>
        <Box marginBottom={4}>
          <Typography variant="h3" color="primary" gutterBottom>
            Possédez-vous un code d'identification?
          </Typography>
          <Typography variant="h6" component="p" color="text.primary">
            Le code d'identification année est unique et est fourni par votre maître de stage.
          </Typography>
        </Box>
        <Box>
          <form noValidate autoComplete="off">
            <Grid container spacing={4}>
              <Grid item xs={12} md={9}>
                <TextField
                  sx={{
                    height: 54,
                  }}
                  variant="outlined"
                  color="primary"
                  size="medium"
                  fullWidth
                  onChange={(e) => setSearch(e.target.value)}
                  disabled={loading ? true : false}
                  error={error ? true : false}
                  helperText={error && error}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Box
                          component={"svg"}
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          width={24}
                          height={24}
                          color={"primary.main"}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </Box>
                      </InputAdornment>
                    ),
                    endAdornment: loading && <CircularProgress size={30} />,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  sx={{ height: 54, whiteSpace: "nowrap" }}
                  variant="contained"
                  color="primary"
                  size="medium"
                  fullWidth
                  onClick={() => handleClick(search)}
                  disabled={loading || !search ? true : false}
                >
                  Rechercher
                </Button>
              </Grid>
            </Grid>
          </form>
        </Box>
      </Box>
    </Box>
  );
};

export default SearchBox;
