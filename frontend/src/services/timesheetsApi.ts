import type { ApiCall } from "./api.types";

const timesheetsApi = {
  create(): ApiCall {
    return {
      method: "post",
      url: "residents/timesheets/addRecord",
    };
  },

  getResidentStats(): ApiCall {
    return {
      method: "get",
      url: "residents/timesheets/monthStatistics/",
    };
  },

  findResidentYears(): ApiCall {
    return {
      method: "get",
      url: "years/getResidentYears",
    };
  },

  getRealtime(): ApiCall {
    return {
      method: "get",
      url: "managers/statistics/",
    };
  },

  getFirstLoadStatistics(): ApiCall {
    return {
      method: "get",
      url: "managers/statisticsFirstload/",
    };
  },

  getStatistics(): ApiCall {
    return {
      method: "get",
      url: "managers/statistics/fetch/",
    };
  },

  getOwnData(): ApiCall {
    return {
      method: "get",
      url: "timesheets/getMyData",
    };
  },

  deleteTimesheet(): ApiCall {
    return {
      method: "delete",
      url: "timesheets/delete/",
    };
  },

  getResidentStatisticsAtFirstLoad(): ApiCall {
    return {
      method: "get",
      url: "residents/statisticsFirstload/",
    };
  },

  findTimesheetById(): ApiCall {
    return {
      method: "get",
      url: "residents/timesheets/find/",
    };
  },

  updateTimesheet(): ApiCall {
    return {
      method: "put",
      url: "residents/timesheets/update/",
    };
  },

  getResidentData(): ApiCall {
    return {
      method: "get",
      url: "managers/timesheets/getMonthTimesheets/",
    };
  },

  getResidentRealtimeByMonthAndYear(): ApiCall {
    return {
      method: "get",
      url: "residents/statistics/",
    };
  },

  updateTimesheetValidationStatus(): ApiCall {
    return {
      method: "put",
      url: "managers/timesheets/ValidateSpecificTimesheets",
    };
  },
};

export default timesheetsApi;
