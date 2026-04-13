import type { ApiCall } from "./api.types";

const staffPlannerApi = {
  checkResidentResource(): ApiCall {
    return {
      method: "post",
      url: "managers/SPCheckV2",
    };
  },
};

export default staffPlannerApi;
