import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { HistoryProvider } from "./context/HistoryContext";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <HistoryProvider>
        <App />
      </HistoryProvider>
    </BrowserRouter>
  </React.StrictMode>
);
