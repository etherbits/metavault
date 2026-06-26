import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import "./index.css";
import { AppProviders } from "./app/AppProviders";
import { useAuthSession } from "./features/auth/hooks";

const App = lazy(() => import("./App"));
const DetailPage = lazy(() =>
  import("./pages/app/DetailPage").then((module) => ({
    default: module.DetailPage,
  }))
);
const HomePage = lazy(() =>
  import("./pages/app/HomePage").then((module) => ({
    default: module.HomePage,
  }))
);
const IntegrationsPage = lazy(() =>
  import("./pages/app/IntegrationsPage").then((module) => ({
    default: module.IntegrationsPage,
  }))
);
const QueryPage = lazy(() =>
  import("./pages/app/QueryPage").then((module) => ({
    default: module.QueryPage,
  }))
);
const ResetPasswordPage = lazy(() =>
  import("./pages/app/ResetPasswordPage").then((module) => ({
    default: module.ResetPasswordPage,
  }))
);
const SettingsPage = lazy(() =>
  import("./pages/app/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  }))
);
const ForgotPasswordPage = lazy(() =>
  import("./pages/ForgotPasswordPage").then((module) => ({
    default: module.ForgotPasswordPage,
  }))
);
const LandingPage = lazy(() =>
  import("./pages/LandingPage").then((module) => ({
    default: module.LandingPage,
  }))
);
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((module) => ({ default: module.LoginPage }))
);
const RegisterPage = lazy(() =>
  import("./pages/RegisterPage").then((module) => ({
    default: module.RegisterPage,
  }))
);
const VerifyPage = lazy(() =>
  import("./pages/VerifyPage").then((module) => ({
    default: module.VerifyPage,
  }))
);

function PublicRootRoute() {
  const session = useAuthSession();

  if (session.isLoading) {
    return <AuthLoadingScreen />;
  }

  if (session.data) {
    return <Navigate to="/app" replace />;
  }

  return <LandingPage />;
}

function ProtectedAppRoute() {
  const session = useAuthSession();

  if (session.isLoading) {
    return <AuthLoadingScreen />;
  }

  if (session.data) {
    return <App />;
  }

  return <Navigate to="/login" replace />;
}

function AuthLoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#18181B] px-4 text-[#D4D4D8]">
      <div className="flex items-center gap-3 rounded-[8px] border border-[#3F3F46] bg-[#27272A] px-4 py-3 shadow-[0_18px_32px_rgba(0,0,0,0.24)]">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#3F3F46] border-t-[#FACC16]" />
        <span className="text-sm font-medium">Checking session...</span>
      </div>
    </main>
  );
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <BrowserRouter>
        <Suspense fallback={<AuthLoadingScreen />}>
          <Routes>
            <Route path="/" element={<PublicRootRoute />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/signup"
              element={<Navigate to="/register" replace />}
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signin" element={<Navigate to="/login" replace />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/home" element={<Navigate to="/app" replace />} />
            <Route path="/app" element={<ProtectedAppRoute />}>
              <Route index element={<Navigate to="home" replace />} />
              <Route path="home" element={<HomePage />} />
              <Route path="query" element={<QueryPage />} />
              <Route path="detail/:itemId" element={<DetailPage />} />
              <Route path="integrations" element={<IntegrationsPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProviders>
  </StrictMode>
);
