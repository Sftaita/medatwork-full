import axios from "axios";
import { API_URL } from "../config";

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

/**
 * Send email of user that try to recover password
 */
const sendEmailForResetPassword = (email: string) => {
  return axios
    .post(
      API_URL + "passwordReset",
      { email },
      {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      }
    )
    .then((response) => response.data);
};

/**
 * Send contact message
 */
const contactUs = (info: unknown) => {
  return axios
    .post(API_URL + "contactUs", info, {
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    })
    .then((response) => response.data);
};

const resendActivation = (email: string) => {
  return axios
    .post(
      API_URL + "resend-activation",
      { email },
      { headers: { "Content-Type": "application/json" }, withCredentials: true }
    )
    .then((response) => response.data);
};

/** POST — consumes the activation token (not subject to email pre-fetching) */
const activateAccount = (type: "manager" | "resident", token: string) => {
  return axios
    .post(
      API_URL + (type === "manager" ? "ManagerActivation" : "ResidentActivation") + "/" + token,
      null,
      { withCredentials: true }
    )
    .then((response) => response.data);
};

const publicApi = {
  resetPassword,
  sendEmailForResetPassword,
  contactUs,
  resendActivation,
  activateAccount,
};

export default publicApi;
