import type { ApiCall } from "./api.types";

const periodsApi = {
  fetchPeriod(): ApiCall {
    return {
      method: "get",
      url: "managers/validationList/",
    };
  },

  updatePeriod(): ApiCall {
    return {
      method: "post",
      url: "managers/validationStatus",
    };
  },

  getPeriodSummary(): ApiCall {
    return {
      method: "get",
      url: "managers/monthSummary/",
    };
  },

  getPeriodReport(): ApiCall {
    return {
      method: "get",
      url: "managers/periodReport/",
    };
  },

  fetchInWaitingPeriodValidation(): ApiCall {
    return {
      method: "get",
      url: "managers/validation/inWaitingList/",
    };
  },

  fetchValidatedPeriod(): ApiCall {
    return {
      method: "get",
      url: "managers/validation/residentValidatedList/",
    };
  },

  getComplianceReport(): ApiCall {
    return {
      method: "get",
      url: "managers/compliance/",
    };
  },
};

export default periodsApi;
