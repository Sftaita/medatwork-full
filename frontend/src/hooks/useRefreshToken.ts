import axios from "axios";
import { API_URL } from "../config";
import useAuth from "./useAuth";
import type { RefreshTokenResponse } from "@/types/auth";

const useRefreshToken = () => {
  const { setAuthentication } = useAuth();

  const refresh = async (): Promise<string> => {
    const response = await axios.post<RefreshTokenResponse>(`${API_URL}token/refresh`, null, {
      withCredentials: true,
    });
    const { token, firstname, lastname, role, gender, hospitalId, hospitalName, avatarUrl, canCreateYear } = response.data;
    setAuthentication((prev) => ({
      ...prev,
      isAuthenticated: true,
      AccessToken: token,
      firstname,
      lastname,
      role,
      gender,
      hospitalId: hospitalId ?? null,
      hospitalName: hospitalName ?? null,
      avatarUrl: avatarUrl ?? null,
      canCreateYear: canCreateYear ?? false,
    }));
    return token;
  };

  return refresh;
};

export default useRefreshToken;
