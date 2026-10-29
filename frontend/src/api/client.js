import axios from "axios";

const apiClient = axios.create({
  baseURL: "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT access token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("medipulse_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified response handling
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      const currentPath = window.location.pathname;
      if (currentPath.includes("/dashboard") || currentPath.includes("/my-")) {
        localStorage.removeItem("medipulse_token");
        localStorage.removeItem("medipulse_user");
        window.location.href = "/login";
      }
    }
    const message =
      error.response?.data?.message ||
      error.message ||
      "An unexpected network error occurred";
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
