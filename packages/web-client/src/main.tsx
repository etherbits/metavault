import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import "./index.css";
import App from "./App.tsx";
import { AppProviders } from "./app/AppProviders";
import { useAuthSession } from "./features/auth/hooks";
import { DetailPage } from "./pages/app/DetailPage";
import { HomePage } from "./pages/app/HomePage";
import { IntegrationsPage } from "./pages/app/IntegrationsPage";
import { QueryPage } from "./pages/app/QueryPage";
import { SettingsPage } from "./pages/app/SettingsPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { VerifyPage } from "./pages/VerifyPage";

function ProtectedAppRoute() {
  const session = useAuthSession();

  if (session.data) {
    return <App />;
  }

  if (session.isLoading || session.isFetching) {
    return <AuthLoadingScreen />;
  }

  return <Navigate to="/login" replace />;
}

function AuthLoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#18181B] px-4 text-[#D4D4D8]">
      <div className="flex items-center gap-3 rounded-[8px] border border-[#3F3F46] bg-[#27272A] px-4 py-3 shadow-[0_18px_32px_rgba(0,0,0,0.24)]">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#3F3F46] border-t-[#FACC15]" />
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
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/signup" element={<Navigate to="/register" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signin" element={<Navigate to="/login" replace />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/home" element={<Navigate to="/app" replace />} />
          <Route path="/app" element={<ProtectedAppRoute />}>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<HomePage />} />
            <Route path="query" element={<QueryPage />} />
            <Route path="detail/:itemId" element={<DetailPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProviders>
  </StrictMode>
);
