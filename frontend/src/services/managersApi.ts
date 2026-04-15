import axios from "axios";
import { API_URL, MANAGERS_API } from "../config";
import type { ApiCall } from "./api.types";

/**
 * Create new Manager account (direct axios call — public endpoint).
 * If avatar blob is provided, sends as multipart/form-data; otherwise JSON.
 */
function create(manager: Record<string, unknown>, avatar?: Blob | null) {
  if (avatar) {
    const fd = new FormData();
    Object.entries(manager).forEach(([k, v]) => {
      if (v !== null && v !== undefined) fd.append(k, String(v));
    });
    fd.append("avatar", avatar, "avatar.jpg");
    return axios.post(API_URL + "create/newManager", fd, { withCredentials: true });
  }
  return axios.post(API_URL + "create/newManager", manager, {
    headers: { "Content-Type": "application/json" },
    withCredentials: true,
  });
}

function fetchManagers(): ApiCall {
  return {
    method: "get",
    url: "fetchManagers",
  };
}

function fetchHospitalManagers(yearId: number): ApiCall {
  return {
    method: "get",
    url: `managers/years/${yearId}/hospital-managers`,
  };
}

function fetchStaffPlannerList(): ApiCall {
  return {
    method: "get",
    url: MANAGERS_API + "/getSPRes/",
  };
}

function updateStaffPlannerList(): ApiCall {
  return {
    method: "put",
    url: MANAGERS_API + "/updateSPRes",
  };
}

function updateResidentValidationPeriod(): ApiCall {
  return {
    method: "put",
    url: MANAGERS_API + "/validation/",
  };
}

const managersApi = {
  create,
  fetchManagers,
  fetchHospitalManagers,
  fetchStaffPlannerList,
  updateStaffPlannerList,
  updateResidentValidationPeriod,
};

export default managersApi;
