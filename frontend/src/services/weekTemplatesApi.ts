import type { ApiCall } from "./api.types";

const weekTemplatesApi = {
  getWeekTemplatesList(): ApiCall {
    return {
      method: "get",
      url: "managers/allweekTemplates",
    };
  },

  CreateWeekTemplate(): ApiCall {
    return {
      method: "post",
      url: "managers/weekTemplate/create",
    };
  },

  UpdateWeekTemplate(id: string | number): ApiCall {
    return {
      method: "put",
      url: `managers/weekTemplate/${id}`,
    };
  },

  DeleteWeekTemplate(weekTemplateId: string | number): ApiCall {
    return {
      method: "delete",
      url: `managers/weekTemplate/${weekTemplateId}`,
    };
  },

  addTaskToWeekTemplate(_weekTemplateId?: string | number): ApiCall {
    return {
      method: "post",
      url: "managers/weekTask/create",
    };
  },

  updateWeekTask(weekTaskId: string | number): ApiCall {
    return {
      method: "put",
      url: `managers/weekTask/${weekTaskId}`,
    };
  },

  deleteWeekTask(weekTaskId: string | number): ApiCall {
    return {
      method: "delete",
      url: `managers/weekTask/${weekTaskId}`,
    };
  },

  linkWeekTemplateToYear(): ApiCall {
    return {
      method: "post",
      url: "managers/year/weektemplateLink",
    };
  },

  copyTemplate(id: string | number): ApiCall {
    return { method: "post", url: `managers/weekTemplate/${id}/copy` };
  },
};

export default weekTemplatesApi;
