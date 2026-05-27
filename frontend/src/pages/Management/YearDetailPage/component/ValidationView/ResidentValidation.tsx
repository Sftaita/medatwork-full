import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import useAxiosPrivate from "../../../../../hooks/useAxiosPrivate";
import managersApi from "../../../../../services/managersApi";
import useValidationContext from "../../../../../hooks/useValidationContext";
import { toast } from "react-toastify";

//Material UI
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";

// General components
import Row from "./Row";
import { LoadingButton } from "@mui/lab";
import { toastSuccess, toastError } from "../../../../../doc/ToastParams";
import { handleApiError } from "@/services/apiError";

export default function ResidentValidation({ periodReport }) {
  const { t } = useTranslation();
  const axiosPrivate = useAxiosPrivate();
  const [openRowId, setOpenRowId] = React.useState(-1);
  const [saveLoading, setSaveLoading] = useState(false);
  const { periodId, residentValidationData, setResidentValidationData } = useValidationContext();

  useEffect(() => {
    const validationData = periodReport.map((resident) => ({
      residentId: resident.residentId,
      status: resident.validationInformation.validated ? "validate" : "invalidate",
      managerComment: "", // Add appropriate manager comment
      residentNotification: "", // Add appropriate resident notification
    }));
    setResidentValidationData(validationData);
  }, [periodReport, setResidentValidationData]);

  const saveValidations = async () => {
    setSaveLoading(true);
    try {
      const { method, url } = managersApi.updateResidentValidationPeriod();
      await axiosPrivate[method](url + periodId, residentValidationData);
      toast.success(t("yearDetail.validation.saved"), toastSuccess);
    } catch (error) {
      handleApiError(error);
      if (error?.response?.data?.message) {
        toast.error(error?.response?.data?.message, toastError);
      } else {
        toast.error(t("yearDetail.validation.saveError"), toastError);
      }
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <TableContainer component={Paper}>
      {periodReport?.length !== 0 && (
        <Table aria-label="collapsible table">
          <TableHead>
            <TableRow>
              <TableCell width={10} />
              <TableCell align="left">{t("yearDetail.validation.colName")}</TableCell>
              <TableCell align="right">
                <LoadingButton variant="outlined" onClick={saveValidations} loading={saveLoading}>
                  {t("yearDetail.validation.save")}
                </LoadingButton>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {periodReport?.map((residentReport, index) => (
              <Row
                residentReport={residentReport}
                key={residentReport.index}
                index={index}
                openRowId={openRowId}
                setOpenRowId={setOpenRowId}
              />
            ))}
          </TableBody>
        </Table>
      )}
      {periodReport?.length === 0 && (
        <Alert severity="info">
          {t("yearDetail.validation.empty")}
        </Alert>
      )}
    </TableContainer>
  );
}
