import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth";

// Guard ciblé sur /manager/years uniquement.
// Les hospital_admin ont leur propre dashboard — ils n'ont pas à passer par la liste des années manager.
const ManagerYearsRoute = () => {
  const { authentication } = useAuth();

  if (authentication?.role === "hospital_admin") {
    return <Navigate to="/hospital-admin/dashboard" replace />;
  }

  return <Outlet />;
};

export default ManagerYearsRoute;
