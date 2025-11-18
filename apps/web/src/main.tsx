import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import { Router } from "./routes/Router";

ReactDOM.createRoot(document.getElementById("root")!).render(<Router />);

// PWA: register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("ServiceWorker registered:", registration.scope);
      })
      .catch((error) => {
        console.error("ServiceWorker registration failed:", error);
      });
  });
}
