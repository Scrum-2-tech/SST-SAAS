import { createContext, useContext, useEffect, useState } from "react";
import { TOKEN_KEY, COMPANY_KEY } from "../api/client.js";
import {
  getMe,
  listCompanies,
  login as apiLogin,
} from "../api/endpoints.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [companyId, setCompanyIdState] = useState(() =>
    localStorage.getItem(COMPANY_KEY)
  );
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [user, setUser] = useState(null); // { id, email, role, ... }
  const [loadingUser, setLoadingUser] = useState(Boolean(token));

  const isAuthenticated = Boolean(token);
  const role = user?.role || null;
  // Permiso de gestión: ver trazabilidad y gestionar auditorías SST.
  // Coincide con la regla del backend (Gestor y SuperAdmin, no Vista_Auditoria).
  const canManage = role === "Gestor" || role === "SuperAdmin";
  const isViewer = role === "Vista_Auditoria";

  // Al autenticarse, carga el portafolio de empresas y selecciona una
  // por defecto si aún no hay tenant activo.
  async function refreshCompanies(roleOverride) {
    if (!localStorage.getItem(TOKEN_KEY)) return [];
    setLoadingCompanies(true);
    try {
      const data = await listCompanies();
      setCompanies(data);
      const currentRole = roleOverride || user?.role;
      const currentCompanyId = localStorage.getItem(COMPANY_KEY);
      if (data.length === 0) {
        setCompanyId(null);
      } else if (currentRole === "Vista_Auditoria") {
        setCompanyId(data[0]?.id || null);
      } else if (
        data.length > 0 &&
        !data.some((company) => company.id === currentCompanyId)
      ) {
        setCompanyId(data[0].id);
      }
      return data;
    } finally {
      setLoadingCompanies(false);
    }
  }

  // Al tener token, carga la identidad (rol) del usuario.
  async function refreshUser() {
    if (!localStorage.getItem(TOKEN_KEY)) return null;
    try {
      const me = await getMe();
      setUser(me);
      return me;
    } catch {
      return null;
    } finally {
      setLoadingUser(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function loadSession() {
      if (!token) {
        setLoadingUser(false);
        return;
      }
      setLoadingUser(true);
      const currentUser = await refreshUser();
      if (active) await refreshCompanies(currentUser?.role);
    }
    loadSession();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function setCompanyId(id) {
    if (isViewer && id && id !== companies[0]?.id) return;
    if (id) {
      localStorage.setItem(COMPANY_KEY, id);
    } else {
      localStorage.removeItem(COMPANY_KEY);
    }
    setCompanyIdState(id || null);
  }

  async function login(email, password) {
    const { access_token } = await apiLogin(email, password);
    localStorage.setItem(TOKEN_KEY, access_token);
    setLoadingUser(true);
    setUser(null);
    setToken(access_token);
    return access_token;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(COMPANY_KEY);
    setToken(null);
    setCompanyIdState(null);
    setCompanies([]);
    setUser(null);
    setLoadingUser(false);
  }

  const activeCompany =
    companies.find((c) => c.id === companyId) || null;

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated,
        user,
        role,
        canManage,
        companies,
        companyId,
        activeCompany,
        loadingCompanies,
        loadingUser,
        isViewer,
        login,
        logout,
        setCompanyId,
        refreshCompanies,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
