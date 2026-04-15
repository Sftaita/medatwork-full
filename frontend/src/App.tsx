import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import ManagerRoute from "./routes/ManagerRoute";
import ResidentRoute from "./routes/ResidentRoute";
import SuperAdminRoute from "./routes/SuperAdminRoute";
import HospitalAdminRoute from "./routes/HospitalAdminRoute";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PersistLogin from "./services/PersistLogin";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import queryClient from "./lib/queryClient";

// Layout — always needed, not lazy
import WithFixedSidebar from "./components/layout/WithFixedSidebar";
import SentryErrorBoundary from "./components/SentryErrorBoundary";
import PageSkeleton from "./components/big/PageSkeleton";
import { usePwaUpdate } from "./hooks/usePwaUpdate";

// The 404 page is kept static: it's tiny and must always be available
import ErrorPage from "./pages/ErrorPage/ErrorPage";

// ── Public pages ──────────────────────────────────────────────────────────────
const Homepage = lazy(() => import("./pages/HomePage/HomePage"));
const ConnectingPage = lazy(() => import("./pages/ConnectingPage/ConnectingPage"));
const Loginpage = lazy(() => import("./pages/LoginPage/LoginPage"));
const ManagerSignupPage = lazy(
  () => import("./pages/SignupPage/ManagerSignupPage/ManagerSignupPage")
);
const ResidentSignupPage = lazy(
  () => import("./pages/SignupPage/ResidentSignupPage/ResidentSignupPage")
);
const SuccessRegsiterPage = lazy(() => import("./pages/SuccessRegisterPage/SuccessRegisterPage"));
const DescriptionPage = lazy(() => import("./pages/DescriptionPage/DescriptionPage"));
const DetailledDesriptionPage = lazy(
  () => import("./pages/DetailledDescriptionPage/DetailledDesriptionPage")
);
const PasswordReset = lazy(() => import("./pages/PasswordReset/PasswordReset"));
const PasswordUpdatePage = lazy(() => import("./pages/PassordUpdatePage/PasswordUpdatePage"));
const TermsPage = lazy(() => import("./pages/TermsPage/TermsPage"));
const ContactPage = lazy(() => import("./pages/ContactPage/ContactPage"));
const TokenExpiredPage = lazy(() => import("./pages/TokenExpiredPage/TokenExpiredPage"));

// ── Admin / HospitalAdmin pages ───────────────────────────────────────────────
const AdminDashboardPage = lazy(() => import("./pages/Admin/AdminDashboardPage"));
const AdminHospitalDetailPage = lazy(() => import("./pages/Admin/AdminHospitalDetailPage"));
const AdminManagersPage = lazy(() => import("./pages/Admin/AdminManagersPage"));
const AdminResidentsPage = lazy(() => import("./pages/Admin/AdminResidentsPage"));
const AdminYearsPage = lazy(() => import("./pages/Admin/AdminYearsPage"));
const AdminHospitalAdminsPage = lazy(() => import("./pages/Admin/AdminHospitalAdminsPage"));
const AdminLogsPage = lazy(() => import("./pages/Admin/AdminLogsPage"));
const AdminCommunicationPage = lazy(() => import("./pages/Admin/AdminCommunicationPage"));
const MaccsSetupPage = lazy(() => import("./pages/MaccsSetup/MaccsSetupPage"));
const ManagerSetupPage = lazy(() => import("./pages/ManagerSetup/ManagerSetupPage"));
const HospitalAdminSetupPage = lazy(
  () => import("./pages/HospitalAdminSetup/HospitalAdminSetupPage")
);
const HospitalAdminDashboardPage = lazy(
  () => import("./pages/HospitalAdmin/HospitalAdminDashboardPage")
);
const HospitalAdminYearResidentsPage = lazy(
  () => import("./pages/HospitalAdmin/HospitalAdminYearResidentsPage")
);
const HospitalAdminResidentsPage = lazy(
  () => import("./pages/HospitalAdmin/HospitalAdminResidentsPage")
);
const HospitalAdminManagersPage = lazy(
  () => import("./pages/HospitalAdmin/HospitalAdminManagersPage")
);
const HospitalAdminNotificationsPage = lazy(
  () => import("./pages/HospitalAdmin/HospitalAdminNotificationsPage")
);
const HospitalAdminCommunicationPage = lazy(
  () => import("./pages/HospitalAdmin/HospitalAdminCommunicationPage")
);
const HospitalAdminAuditLogPage = lazy(
  () => import("./pages/HospitalAdmin/HospitalAdminAuditLogPage")
);
const ProfilePage = lazy(() => import("./pages/Profile/ProfilePage"));

// ── Manager pages ─────────────────────────────────────────────────────────────
const ManagerYears = lazy(() => import("./pages/Management/YearsPage/ManagerYears"));
const YearPage = lazy(() => import("./pages/Management/YearPage/YearPage"));
const YearDetailPage = lazy(() => import("./pages/Management/YearDetailPage/YearDetailPage"));
const YearParameters = lazy(() => import("./pages/Management/YearParameters/YearParameters"));
const RealTimePage = lazy(() => import("./pages/Management/RealtimePage/RealtimePage"));
const DataTracking = lazy(() => import("./pages/Management/DataTracking/DataTracking"));
const ValidationStoryPage = lazy(
  () => import("./pages/Management/ValidationStoryPage/ValidationStoryPage")
);
const ManagerNotificationPage = lazy(
  () => import("./pages/Management/NotificationsPage/ManagerNotificationPage")
);
const TimePlannerPage = lazy(() => import("./pages/Management/WeekCreatorPage/TimePlannerPage"));
const ManagerCalendar = lazy(
  () => import("./pages/Management/Agenda/Calendar/ManagerCalendarPage")
);
const WeekDispatcherPage = lazy(
  () => import("./pages/Management/Agenda/WeekDispatcher/WeekDispatcherPage")
);
const WeekCreatorPage = lazy(() => import("./pages/Management/Agenda/WeekCreator/WeekCreatorPage"));

// ── Resident pages ────────────────────────────────────────────────────────────
const TimerPage = lazy(() => import("./pages/Resident/TimerPage/TimerPage"));
const SearchPage = lazy(() => import("./pages/Resident/SearchPage/SearchPage"));
const YearsResidentPage = lazy(() => import("./pages/Resident/YearsResident/YearsResidentPage"));
const DataManagement = lazy(() => import("./pages/Resident/DataManagement/DataManagement"));
const ResidentStatisticsPage = lazy(() => import("./pages/Resident/Statistics/Statistics"));
const ParametersPage = lazy(() => import("./pages/Resident/Parameters/ParametersPage"));
const ResidentNotificationPage = lazy(
  () => import("./pages/Resident/NotificationsPage/ResidentNotificationPage")
);

function App() {
  usePwaUpdate();
  return (
    <div className="App">
      <QueryClientProvider client={queryClient}>
        <SentryErrorBoundary>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <WithFixedSidebar>
              <Routes>
                {/* Public routes */}
                <Route
                  path="/"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <Homepage />
                    </Suspense>
                  }
                />
                <Route
                  path="/description"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <DescriptionPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/jobDetail/:id"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <DetailledDesriptionPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/connecting"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <ConnectingPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/managerSignup"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <ManagerSignupPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/residentSignup"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <ResidentSignupPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/success"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <SuccessRegsiterPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/login"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <Loginpage />
                    </Suspense>
                  }
                />
                <Route
                  path="/passwordReset"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <PasswordReset />
                    </Suspense>
                  }
                />
                <Route
                  path="/passwordUpdatePage/:token"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <PasswordUpdatePage />
                    </Suspense>
                  }
                />
                <Route
                  path="/terms"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <TermsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/contactUs"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <ContactPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/token-expired"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <TokenExpiredPage />
                    </Suspense>
                  }
                />
                <Route path="/404" element={<ErrorPage />} />
                <Route
                  path="/hospital-admin/setup/:token"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <HospitalAdminSetupPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/maccs-setup/:token"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <MaccsSetupPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/manager-setup/:token"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <ManagerSetupPage />
                    </Suspense>
                  }
                />

                <Route element={<PersistLogin />}>
                  {/* Super admin routes */}
                  <Route element={<SuperAdminRoute />}>
                    <Route
                      path="/admin"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <AdminDashboardPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/admin/hospitals/:id"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <AdminHospitalDetailPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/admin/managers"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <AdminManagersPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/admin/residents"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <AdminResidentsPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/admin/years"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <AdminYearsPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/admin/hospital-admins"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <AdminHospitalAdminsPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/admin/logs"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <AdminLogsPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/admin/communication"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <AdminCommunicationPage />
                        </Suspense>
                      }
                    />
                  </Route>
                  {/* Hospital admin routes */}
                  <Route element={<HospitalAdminRoute />}>
                    <Route
                      path="/hospital-admin/dashboard"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <HospitalAdminDashboardPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/hospital-admin/years/:yearId/residents"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <HospitalAdminYearResidentsPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/hospital-admin/residents"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <HospitalAdminResidentsPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/hospital-admin/managers"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <HospitalAdminManagersPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/hospital-admin/notifications"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <HospitalAdminNotificationsPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/hospital-admin/communication"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <HospitalAdminCommunicationPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/hospital-admin/audit-log"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <HospitalAdminAuditLogPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/manager/year-detail"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <YearDetailPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/manager/realtime"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <RealTimePage />
                        </Suspense>
                      }
                    />
                  </Route>

                  {/* Manager routes */}
                  <Route element={<ManagerRoute />}>
                    <Route
                      path="/manager/years"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <ManagerYears />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/manager/year-detail"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <YearDetailPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/manager/year"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <YearPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/manager/year-parameters"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <YearParameters />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/manager/realtime"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <RealTimePage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/manager/data-tracking"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <DataTracking />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/manager/validation-story"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <ValidationStoryPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/manager/notifications"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <ManagerNotificationPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/manager/time-planner"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <TimePlannerPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/manager/calendar"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <ManagerCalendar />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/manager/week-dispatcher"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <WeekDispatcherPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/manager/week-creator"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <WeekCreatorPage />
                        </Suspense>
                      }
                    />
                  </Route>

                  {/* Profile — accessible to all authenticated users */}
                  <Route
                    path="/profile"
                    element={
                      <Suspense fallback={<PageSkeleton />}>
                        <ProfilePage />
                      </Suspense>
                    }
                  />

                  {/* Resident routes */}
                  <Route element={<ResidentRoute />}>
                    <Route
                      path="/maccs/timer/:id?/:type?"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <TimerPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/maccs/search"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <SearchPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/maccs/years"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <YearsResidentPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/maccs/data-management"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <DataManagement />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/maccs/statistics"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <ResidentStatisticsPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/maccs/parameters"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <ParametersPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/maccs/notifications"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <ResidentNotificationPage />
                        </Suspense>
                      }
                    />
                  </Route>
                </Route>
              </Routes>
            </WithFixedSidebar>
            <ToastContainer />
          </BrowserRouter>
        </SentryErrorBoundary>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </div>
  );
}

export default App;
