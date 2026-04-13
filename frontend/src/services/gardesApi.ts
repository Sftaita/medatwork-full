import type { ApiCall } from "./api.types";

const gardesApi = {
  create(): ApiCall {
    return {
      method: "post",
      url: "residents/gardes/addRecord",
    };
  },

  deleteGarde(): ApiCall {
    return {
      method: "delete",
      url: "gardes/delete/",
    };
  },

  getOwnData(): ApiCall {
    return {
      method: "get",
      url: "gardes/getMyData",
    };
  },

  // MANAGERS

  getResidentData(): ApiCall {
    return {
      method: "get",
      url: "managers/gardes/getMoGaAsMan/",
    };
  },

  updateGardeValidationStatus(): ApiCall {
    return {
      method: "put",
      url: "managers/gardes/ValidateSpecificGardes",
    };
  },
};

export default gardesApi;
