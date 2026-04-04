const RENDER_BACKEND_URL = "https://pennywise-backend.onrender.com";

const isRenderHosted =
  typeof window !== "undefined" &&
  typeof window.location?.hostname === "string" &&
  window.location.hostname.endsWith(".onrender.com");

export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (isRenderHosted ? RENDER_BACKEND_URL : "http://localhost:5001");
