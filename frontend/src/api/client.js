import axios from "axios";

// Cliente HTTP central. El backend FastAPI corre en http://localhost:8000.
export const API_BASE_URL = "http://localhost:8000";

const client = axios.create({
  baseURL: API_BASE_URL,
});

// Claves de almacenamiento local.
export const TOKEN_KEY = "sst_token";
export const COMPANY_KEY = "sst_company_id";

// Interceptor de petición: adjunta el JWT (Bearer) y el tenant activo
// (header X-Company-Id) que el backend exige en folders/files/audit.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const companyId = localStorage.getItem(COMPANY_KEY);
  if (companyId) {
    config.headers["X-Company-Id"] = companyId;
  }
  return config;
});

// Interceptor de respuesta: si el token expira (401), limpia sesión y
// manda al login. Evita bucles cuando el 401 viene del propio login.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    if (status === 401 && !url.includes("/auth/login")) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(COMPANY_KEY);
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default client;
