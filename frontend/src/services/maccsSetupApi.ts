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

const completeProfile = (token: string, data: MaccsSetupPayload): Promise<{ message: string }> =>
  axios
    .post(`${API_URL}maccs/setup/${token}`, data, {
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    })
    .then((r) => r.data);

const maccsSetupApi = { checkToken, completeProfile };

export default maccsSetupApi;
