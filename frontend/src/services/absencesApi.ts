import type { ApiCall } from "./api.types";

const absencesApi = {
  create(): ApiCall {
    return {
      method: "post",
      url: "residents/absences/addRecord",
    };
  },

  getOwnData(): ApiCall {
    return {
      method: "get",
      url: "absences/getMyData",
    };
  },

  deleteAbsence(): ApiCall {
    return {
      method: "delete",
      url: "absences/delete/",
    };
  },

  // MANAGERS

  getResidentData(): ApiCall {
    return {
      method: "get",
      url: "managers/absences/getMoAbAsMan/",
    };
  },

  updateAbsenceValidationStatus(): ApiCall {
    return {
      method: "put",
      url: "managers/absences/ValidateSpecificAbsences",
    };
  },
};

export default absencesApi;
