import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import PropTypes from "prop-types";
import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Input from "@mui/material/Input";
import Stack from "@mui/material/Stack";
import SvgIcon from "@mui/material/SvgIcon";
import Typography from "@mui/material/Typography";

import { MultiSelect } from "../../../../components/medium/MultiSelect";
import { useUpdateEffect } from "../../../../hooks/useUpdateEffect";

const monthArray = [
  { label: "Janvier", value: "1" },
  { label: "Février", value: "2" },
  { label: "Mars", value: "3" },
  { label: "Avril", value: "4" },
  { label: "Mai", value: "5" },
  { label: "Juin", value: "6" },
  { label: "Juillet", value: "7" },
  { label: "Août", value: "8" },
  { label: "Septembre", value: "9" },
  { label: "Octobre", value: "10" },
  { label: "Novembre", value: "11" },
  { label: "Décembre", value: "12" },
];

export const ValidationSearchFilter = (props) => {
  const [years, setYears] = useState([]);
  const [speciality, setSpeciality] = useState([]);

  useEffect(() => {
    setYears(props.years);
    setSpeciality(props.speciality);
  }, [props.years, props.speciality]);

  const { onFiltersChange, ...other } = props;
  const queryRef = useRef(null);
  const [chips, setChips] = useState([]);


  const handleChipsUpdate = useCallback(() => {
    const filters = {
      name: undefined,
      years: [],
      month: [],
      speciality: [],
    };

    chips.forEach((chip) => {
      switch (chip.field) {
        case "name":
          // There will (or should) be only one chips with field "name"
          // so we can set up it directly
          filters.name = chip.value;
          break;
        case "years":
          filters.years.push(chip.value);
          break;
        case "month":
          filters.month.push(chip.value);
          break;
        case "speciality":
          filters.speciality.push(chip.value);
          break;
        default:
          break;
      }
    });

    onFiltersChange?.(filters);
  }, [chips, onFiltersChange]);

  useUpdateEffect(() => {
    handleChipsUpdate();
  }, [chips, handleChipsUpdate]);

  const handleChipDelete = useCallback((deletedChip) => {
    setChips((prevChips) => {
      return prevChips.filter((chip) => {
        // There can exist multiple chips for the same field.
        // Filter them by value.

        return !(deletedChip.field === chip.field && deletedChip.value === chip.value);
      });
    });
  }, []);

  const handleQueryChange = useCallback((event) => {
    event.preventDefault();

    const value = queryRef.current?.value || "";

    setChips((prevChips) => {
      const found = prevChips.find((chip) => chip.field === "name");

      if (found && value) {
        return prevChips.map((chip) => {
          if (chip.field === "name") {
            return {
              ...chip,
              value: queryRef.current?.value || "",
            };
          }

          return chip;
        });
      }

      if (found && !value) {
        return prevChips.filter((chip) => chip.field !== "name");
      }

      if (!found && value) {
        const chip = {
          label: "Name",
          field: "name",
          value,
        };

        return [...prevChips, chip];
      }

      return prevChips;
    });

    if (queryRef.current) {
      queryRef.current.value = "";
    }
  }, []);

  const handleYearsChange = useCallback(
    (values) => {
      setChips((prevChips) => {
        const valuesFound = [];

        // First cleanup the previous chips
        const newChips = prevChips.filter((chip) => {
          if (chip.field !== "years") {
            return true;
          }

          const found = values.includes(chip.value);

          if (found) {
            valuesFound.push(chip.value);
          }

          return found;
        });

        // Nothing changed
        if (values.length === valuesFound.length) {
          return newChips;
        }

        values.forEach((value) => {
          if (!valuesFound.includes(value)) {
            const option = years.find((option) => String(option.value) === String(value));

            newChips.push({
              label: "Année",
              field: "years",
              value: parseInt(value, 10),
              displayValue: option.label,
            });
          }
        });

        return newChips;
      });
    },
    [years]
  );

  const handleMonthChange = useCallback((values) => {
    // convert values to string
    const stringValues = values.map((value) => String(value));

    setChips((prevChips) => {
      const valuesFound = [];

      // First cleanup the previous chips
      const newChips = prevChips.filter((chip) => {
        if (chip.field !== "month") {
          return true;
        }

        const found = stringValues.includes(String(chip.value));

        if (found) {
          valuesFound.push(String(chip.value));
        }
        return found;
      });

      // Nothing changed
      if (stringValues.length === valuesFound.length) {
        return newChips;
      }

      stringValues.forEach((value) => {
        if (!valuesFound.includes(value)) {
          const option = monthArray.find((option) => String(option.value) === value);

          newChips.push({
            label: "Mois",
            field: "month",
            value: String(value),
            displayValue: option.label,
          });
        }
      });

      return newChips;
    });
  }, []);

  const handleSpecialityChange = useCallback(
    (values) => {
      setChips((prevChips) => {
        const valuesFound = [];

        // First cleanup the previous chips
        const newChips = prevChips.filter((chip) => {
          if (chip.field !== "speciality") {
            return true;
          }

          const found = values.includes(chip.value);

          if (found) {
            valuesFound.push(chip.value);
          }

          return found;
        });

        // Nothing changed
        if (values.length === valuesFound.length) {
          return newChips;
        }

        values.forEach((value) => {
          if (!valuesFound.includes(value)) {
            speciality.find((_option) => _option.value === value);
            newChips.push({
              label: "Spécialité",
              field: "speciality",
              value,
              //displayValue: option.label,
            });
          }
        });

        return newChips;
      });
    },
    [speciality]
  );

  // We memoize this part to prevent re-render issues
  const yearsValues = useMemo(
    () => chips.filter((chip) => chip.field === "years").map((chip) => chip.value),
    [chips]
  );

  const monthValues = useMemo(
    () => chips.filter((chip) => chip.field === "month").map((chip) => chip.value),
    [chips]
  );

  const specialityValues = useMemo(
    () => chips.filter((chip) => chip.field === "speciality").map((chip) => chip.value),
    [chips]
  );

  const showChips = chips.length > 0;

  const { setFilters } = props;
  useEffect(() => {
    setFilters([...chips]);
  }, [chips, setFilters]);

  return (
    <div {...other}>
      <Stack
        alignItems="center"
        component="form"
        direction="row"
        onSubmit={handleQueryChange}
        spacing={2}
        sx={{ p: 2 }}
      >
        <SvgIcon>
          <SearchIcon />
        </SvgIcon>
        <Input
          defaultValue=""
          disableUnderline
          fullWidth
          value={props.query}
          onChange={(event) => props.setQuery(event.target.value)}
          placeholder="Rechercher par MACCS, maître de stage ou date annuelle"
          sx={{ flexGrow: 1 }}
        />
      </Stack>
      <Divider />
      {showChips ? (
        <Stack alignItems="center" direction="row" flexWrap="wrap" gap={1} sx={{ p: 2 }}>
          {chips.map((chip, index) => (
            <Chip
              key={index}
              label={
                <Box
                  sx={{
                    alignItems: "center",
                    display: "flex",
                    "& span": {
                      fontWeight: 600,
                    },
                  }}
                >
                  <>
                    <span>{chip.label}</span>: {chip.displayValue || chip.value}
                  </>
                </Box>
              }
              onDelete={() => handleChipDelete(chip)}
              variant="outlined"
            />
          ))}
        </Stack>
      ) : (
        <Box sx={{ p: 2.5 }}>
          <Typography color="text.secondary" variant="subtitle2">
            Aucun filtre appliqué
          </Typography>
        </Box>
      )}
      <Divider />
      <Stack alignItems="center" direction="row" flexWrap="wrap" spacing={1} sx={{ p: 1 }}>
        <Typography>({props.nbOfPeriods})</Typography>
        <MultiSelect
          label="Année"
          onChange={handleYearsChange}
          options={years}
          value={yearsValues}
        />
        <MultiSelect
          label="Période"
          onChange={handleMonthChange}
          options={monthArray}
          value={monthValues}
        />
        <MultiSelect
          label="Spécialité"
          onChange={handleSpecialityChange}
          options={speciality}
          value={specialityValues}
        />
      </Stack>
    </div>
  );
};

ValidationSearchFilter.propTypes = {
  onFiltersChange: PropTypes.func,
};
