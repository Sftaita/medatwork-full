import { useLocation, Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const RedirectRoute = () => {
  const { authentication } = useAuth();
  const location = useLocation();

  return authentication?.AccessToken && authentication.role === "resident" ? (
    <Outlet />
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
};

export default RedirectRoute;
