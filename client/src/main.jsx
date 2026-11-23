import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import AdminPage from "./AdminPage.jsx";

const isAdminPage = window.location.pathname.replace(/\/$/, "") === "/admin";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {isAdminPage ? <AdminPage /> : <App />}
  </StrictMode>,
);
