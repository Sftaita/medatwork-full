import { useLocation, Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const HospitalAdminRoute = () => {
  const { authentication } = useAuth();
  const location = useLocation();

  const isHospitalAdmin =
    authentication?.AccessToken &&
    (authentication.role === "hospital_admin" ||
      (authentication.role === "manager" && !!authentication.hospitalName));

  return isHospitalAdmin ? (
    <Outlet />
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
};

export default HospitalAdminRoute;
