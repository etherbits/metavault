import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { addNavigationListener } from "./lib/navigation";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <RouterApp />
  </StrictMode>
);

function RouterApp() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    return addNavigationListener(() => {
      setPathname(window.location.pathname);
    });
  }, []);

  return renderPageByRoute(pathname);
}

function renderPageByRoute(pathname: string) {
  const normalizedPath = pathname.toLowerCase();

  if (
    normalizedPath === "/" ||
    normalizedPath === "/register" ||
    normalizedPath === "/signup"
  ) {
    return <RegisterPage />;
  }

  if (normalizedPath === "/login" || normalizedPath === "/signin") {
    return <LoginPage />;
  }

  if (normalizedPath === "/app" || normalizedPath === "/home") {
    return <App />;
  }

  return <App />;
}
