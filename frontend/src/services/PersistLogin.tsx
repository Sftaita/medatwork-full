import { Outlet } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import useRefreshToken from "../hooks/useRefreshToken";
import useAuth from "../hooks/useAuth";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import communicationsApi from "./communicationsApi";

// components
import Loading from "../components/big/Loading";
import CommunicationModalQueue from "../components/communication/CommunicationModalQueue";
import type { CommNotification } from "../types/entities";

const PersistLogin = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [pendingModals, setPendingModals] = useState<CommNotification[]>([]);
  const modalsFetchedRef = useRef(false);
  const refresh = useRefreshToken();
  const { authentication } = useAuth();
  const axiosPrivate = useAxiosPrivate();

  useEffect(() => {
    const verifyRefreshToken = async () => {
      try {
        await refresh();
      } catch {
        // token refresh failed — user must log in again
      } finally {
        setIsLoading(false);
      }
    };

    !authentication?.AccessToken ? verifyRefreshToken() : setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentional: verify refresh token once on app boot

  // After auth is confirmed, fetch pending modals once
  useEffect(() => {
    if (isLoading || modalsFetchedRef.current || !authentication?.isAuthenticated || authentication?.role === 'super_admin') return;
    modalsFetchedRef.current = true;

    const fetchModals = async () => {
      try {
        const { method, url } = communicationsApi.getPendingModals();
        const res = await axiosPrivate[method](url);
        const data: CommNotification[] = res?.data ?? [];
        if (data.length > 0) {
          setPendingModals(data);
        }
      } catch {
        // Silent — don't block the app if this fails
      }
    };

    fetchModals();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, authentication?.isAuthenticated]); // run once after auth resolves

  if (isLoading) return <Loading />;

  return (
    <>
      {pendingModals.length > 0 && (
        <CommunicationModalQueue
          modals={pendingModals}
          onAllDone={() => setPendingModals([])}
        />
      )}
      <Outlet />
    </>
  );
};

export default PersistLogin;
