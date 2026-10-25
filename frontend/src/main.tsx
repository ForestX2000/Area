
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

import "./index.css";
import { AuthProvider } from "./contexts/AuthContext";
import ConfirmationProvider from "./components/ConfirmationProvider";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <ConfirmationProvider>
        <App />
      </ConfirmationProvider>
    </AuthProvider>
  </BrowserRouter>,
);
