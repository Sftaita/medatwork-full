import axios from "axios";
import { API_URL } from "../config";

export type MaccsSetupContext = {
  firstname: string;
  lastname: string;
  email: string;
  hospitalName: string | null;
};

export type MaccsSetupPayload = {
  password: string;
  sexe: "male" | "female";
  dateOfMaster: string; // Y-m-d
  dateOfBirth: string; // Y-m-d
  speciality: string;
  university: string;
};

const checkToken = (token: string): Promise<MaccsSetupContext> =>
  axios.get(`${API_URL}maccs/setup/${token}`, { withCredentials: true }).then((r) => r.data);

const completeProfile = (
  token: string,
  data: MaccsSetupPayload,
  avatar?: Blob | null,
): Promise<{ message: string }> => {
  if (avatar) {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.append(k, v));
    fd.append("avatar", avatar, "avatar.jpg");
    return axios
      .post(`${API_URL}maccs/setup/${token}`, fd, { withCredentials: true })
      .then((r) => r.data);
  }
  return axios
    .post(`${API_URL}maccs/setup/${token}`, data, {
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    })
    .then((r) => r.data);
};

const maccsSetupApi = { checkToken, completeProfile };

export default maccsSetupApi;
