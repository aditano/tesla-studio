import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Studio } from "./studio/Studio";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Studio />
  </StrictMode>,
);
