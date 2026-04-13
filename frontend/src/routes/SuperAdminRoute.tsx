import { useLocation, Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const SuperAdminRoute = () => {
  const { authentication } = useAuth();
  const location = useLocation();

  return authentication?.AccessToken && authentication.role === "super_admin" ? (
    <Outlet />
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
};

export default SuperAdminRoute;
