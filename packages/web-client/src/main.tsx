import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { VerifyPage } from "./pages/VerifyPage";
import { AUTH_STORAGE_KEY } from "./lib/authApi";

function ProtectedAppRoute() {
  const isAuthenticated = localStorage.getItem(AUTH_STORAGE_KEY) === "true";
  return isAuthenticated ? <App /> : <Navigate to="/login" replace />;
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/signup" element={<Navigate to="/register" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signin" element={<Navigate to="/login" replace />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/app" element={<ProtectedAppRoute />} />
        <Route path="/home" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
