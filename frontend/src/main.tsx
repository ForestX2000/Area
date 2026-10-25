
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

import "./index.css";
import ConfirmationProvider from "./components/ConfirmationProvider";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <ConfirmationProvider>
      <App />
    </ConfirmationProvider>
  </BrowserRouter>,
);
