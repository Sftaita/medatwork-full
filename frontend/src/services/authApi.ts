import axios from "axios";
import { API_URL, LOGGIN_API } from "../config";

/**
 * Requête HTTP d'authentification
 */
const authenticate = (credentials: unknown) => {
  return axios
    .post(LOGGIN_API, credentials, {
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    })
    .then((response) => response.data);
};

const logout = (): Promise<void> => {
  return axios
    .post(API_URL + "logout", null, { withCredentials: true })
    .then(() => undefined)
    .catch(() => undefined); // ignore errors — clear local session regardless
};

/**
 * Reset password with token
 */
const resetPassword = (info: unknown) => {
  return axios
    .post(API_URL + "passwordResetWithToken", info, {
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    })
    .then((response) => response.data);
};

const authApi = {
  authenticate,
  logout,
  resetPassword,
};

export default authApi;
