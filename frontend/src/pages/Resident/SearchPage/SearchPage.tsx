// Material UI
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import SearchBox from "./components/SearchBox";
import { useState } from "react";
import YearDisplay from "./components/YearDisplay";

const SearchPage = () => {
  const theme = useTheme();
  const [findedYear, setFindedYear] = useState(null);
  //const [loading, setLoading] = useState(false);

  const handleSearch = (year) => {
    setFindedYear(year);
  };

  return (
    <>
      <Box
        position={"relative"}
        minHeight={"calc(100vh - 247px)"}
        display={"flex"}
        alignItems={"center"}
        justifyContent={"center"}
      >
        <Box
          maxWidth={"100%"}
          paddingLeft={theme.spacing(2)}
          paddingRight={theme.spacing(2)}
          paddingTop={theme.spacing(2)}
        >
          {!findedYear && <SearchBox handleSearch={handleSearch} />}
          {findedYear && <YearDisplay year={findedYear} />}
        </Box>
      </Box>
    </>
  );
};

export default SearchPage;
