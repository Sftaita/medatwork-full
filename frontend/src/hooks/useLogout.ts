import useAuth from "./useAuth";
import authApi from "@/services/authApi";
import type { AuthState } from "@/types/auth";

const EMPTY_AUTH: AuthState = {
  AccessToken: null,
  isAuthenticated: false,
  firstname: "",
  lastname: "",
  role: null,
  gender: "",
};

const useLogout = () => {
  const { setAuthentication } = useAuth();

  const logout = async (): Promise<void> => {
    await authApi.logout(); // revoke refresh token cookie on server
    setAuthentication(EMPTY_AUTH);
  };

  return logout;
};

export default useLogout;
