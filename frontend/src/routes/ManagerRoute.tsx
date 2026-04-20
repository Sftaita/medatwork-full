import { useLocation, Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const RedirectRoute = () => {
  const { authentication } = useAuth();
  const location = useLocation();

  const allowed =
    authentication?.AccessToken &&
    (authentication.role === "manager" || authentication.role === "hospital_admin");

  return allowed ? (
    <Outlet />
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
};

export default RedirectRoute;
