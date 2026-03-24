import React from "react";
import ReactDOM from "react-dom/client";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import "./index.css";
import App from "./app/App";

dayjs.locale("vi");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
