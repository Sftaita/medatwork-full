import { useAuthStore } from "@/store/authStore";

const useAuth = () => {
  const { authentication, setAuthentication, selectedMenuItem, setSelectedMenuItem } =
    useAuthStore();
  return { authentication, setAuthentication, selectedMenuItem, setSelectedMenuItem };
};

export default useAuth;
