import axios from "axios";

const api = axios.create({
  baseURL:
  import.meta.env.VITE_API_URL ||
  "https://stocksmart-ai.onrender.com/",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token and handle FormData requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // For Excel/CSV uploads, let the browser
    // automatically set multipart Content-Type and boundary.
    if (
      typeof FormData !== "undefined" &&
      config.data instanceof FormData
    ) {
      if (typeof config.headers.delete === "function") {
        config.headers.delete("Content-Type");
      } else {
        delete config.headers["Content-Type"];
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle authentication errors
api.interceptors.response.use(
  (response) => response,

  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes("/auth/login")
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
