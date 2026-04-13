import axios from "axios";
import { TIMESHEET_API, MANAGER_API } from "../config";
import type { ApiCall } from "./api.types";

const yearsApi = {
  findAll(): ApiCall {
    return {
      method: "get",
      url: "managers/years/getManagersYears",
    };
  },

  create(): ApiCall {
    return {
      method: "post",
      url: "managers/years/create",
    };
  },

  update(): ApiCall {
    return {
      method: "put",
      url: "managers/years/update",
    };
  },

  getYearByToken(): ApiCall {
    return {
      method: "post",
      url: "residents/findByYearByToken",
    };
  },

  addYear(): ApiCall {
    return {
      method: "post",
      url: "residents/years/joinYear",
    };
  },

  findResidentYears(): ApiCall {
    return {
      method: "get",
      url: "years/getResidentYears",
    };
  },

  excel(id: string | number, callback: () => void) {
    return axios({
      url: TIMESHEET_API + "timesheets/ExcelGenerator/" + id,
      method: "GET",
      responseType: "blob",
      headers: {
        Accept: "application/vnd.ms-excel",
      },
    }).then((response) => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Horaire.xlsx");
      document.body.appendChild(link);
      link.click();
      callback();
    });
  },

  excelAsManager(
    yearId: string | number,
    residentId: string | number,
    residentName: string,
    callback: () => void
  ) {
    return axios({
      url: MANAGER_API + "/ExcelGenerator/" + yearId + "/" + residentId,
      method: "GET",
      responseType: "blob",
      headers: {
        Accept: "application/vnd.ms-excel",
      },
    }).then((response) => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Horaire-" + residentName + ".xlsx");
      document.body.appendChild(link);
      link.click();
      callback();
    });
  },

  inviteGuest(): ApiCall {
    return {
      method: "post",
      url: "managers/years/addManager",
    };
  },

  fetchYearManagers(): ApiCall {
    return {
      method: "get",
      url: "managers/getYearManagers/",
    };
  },

  UpdateYearResidentRelation(): ApiCall {
    return {
      method: "post",
      url: "managers/residentValidation",
    };
  },

  deleteYearResidentRelation(): ApiCall {
    return {
      method: "delete",
      url: "managers/residentValidation/",
    };
  },

  getYearById(): ApiCall {
    return {
      method: "get",
      url: "managers/getYearById/",
    };
  },

  updateYearResident(): ApiCall {
    return {
      method: "put",
      url: "managers/updateYearResidents/",
    };
  },

  getYearsWeekIntervals(): ApiCall {
    return {
      method: "get",
      url: "managers/years/yearsIntervalsAndWeekTemplatesSummary",
    };
  },

  updateManagerRigths(): ApiCall {
    return {
      method: "put",
      url: "managers/updateRights",
    };
  },

  deleteYear(): ApiCall {
    return {
      method: "delete",
      url: "managers/deleteYear/",
    };
  },
};

export default yearsApi;
