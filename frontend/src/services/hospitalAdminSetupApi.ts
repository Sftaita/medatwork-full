import axios from "axios";
import { API_URL } from "../config";

const checkToken = (token: string): Promise<{ email: string; hospitalName: string }> =>
  axios
    .get(`${API_URL}hospital-admin/setup/${token}`, { withCredentials: true })
    .then((r) => r.data);

const activate = (
  token: string,
  data: { password: string; firstname: string; lastname: string }
): Promise<{ message: string }> =>
  axios
    .post(`${API_URL}hospital-admin/setup/${token}`, data, {
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    })
    .then((r) => r.data);

const hospitalAdminSetupApi = { checkToken, activate };

export default hospitalAdminSetupApi;
