import axios from "axios";
import { API_URL } from "../config";

export type ManagerSetupContext = {
  firstname: string;
  lastname: string;
  email: string;
  hospitalName: string | null;
  yearTitle: string | null;
};

export type ManagerSetupPayload = {
  password: string;
  sexe: "male" | "female";
  job: string;
};

const checkToken = (token: string): Promise<ManagerSetupContext> =>
  axios.get(`${API_URL}managers/setup/${token}`, { withCredentials: true }).then((r) => r.data);

const completeProfile = (
  token: string,
  data: ManagerSetupPayload,
  avatar?: Blob | null,
): Promise<{ message: string }> => {
  if (avatar) {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.append(k, v));
    fd.append("avatar", avatar, "avatar.jpg");
    return axios
      .post(`${API_URL}managers/setup/${token}`, fd, { withCredentials: true })
      .then((r) => r.data);
  }
  return axios
    .post(`${API_URL}managers/setup/${token}`, data, {
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    })
    .then((r) => r.data);
};

const managerSetupApi = { checkToken, completeProfile };
export default managerSetupApi;
