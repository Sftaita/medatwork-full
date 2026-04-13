import axios from "axios";
import { API_URL } from "../config";
import type { ApiCall } from "./api.types";

/**
 * Create new Resident account (direct axios call — public endpoint)
 */
function create(resident: unknown) {
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
