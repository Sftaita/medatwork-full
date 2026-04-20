import { useLocation, Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth";

/**
 * Protects routes that require the canCreateYear permission.
 * Redirects to /manager/years if the flag is not set.
 */
const CanCreateYearRoute = () => {
  const { authentication } = useAuth();
  const location = useLocation();

  // hospital_admin always has the right to create years
  if (authentication?.role === "hospital_admin") {
    return <Outlet />;
  }

  return authentication?.canCreateYear ? (
    <Outlet />
  ) : (
    <Navigate to="/manager/years" state={{ from: location }} replace />
  );
};

export default CanCreateYearRoute;
