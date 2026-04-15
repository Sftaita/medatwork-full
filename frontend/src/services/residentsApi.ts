import axios from "axios";
import { API_URL } from "../config";
import type { ApiCall } from "./api.types";

/**
 * Create new Resident account (direct axios call — public endpoint).
 * If avatar blob is provided, sends as multipart/form-data; otherwise JSON.
 */
function create(resident: Record<string, unknown>, avatar?: Blob | null) {
  if (avatar) {
    const fd = new FormData();
    Object.entries(resident).forEach(([k, v]) => {
      if (v !== null && v !== undefined) fd.append(k, String(v));
    });
    fd.append("avatar", avatar, "avatar.jpg");
    return axios.post(API_URL + "create/newResident", fd);
  }
  return axios.post(API_URL + "create/newResident", resident);
}

function update(): ApiCall {
  return {
    method: "put",
    url: "residents/update",
  };
}

function fetchResidents(): ApiCall {
  return {
    method: "get",
    url: "managers/GetYearResidents/",
  };
}

function fetchResidentInfo(): ApiCall {
  return {
    method: "get",
    url: "residents/userInfo",
  };
}

function fetchResidentScheduler(): ApiCall {
  return {
    method: "get",
    url: "residents/fetchSchedulerData",
  };
}

const residentsApi = {
  create,
  update,
  fetchResidents,
  fetchResidentInfo,
  fetchResidentScheduler,
};

export default residentsApi;
