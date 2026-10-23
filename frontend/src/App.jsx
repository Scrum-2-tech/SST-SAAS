import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Companies from "./pages/Companies.jsx";
import Files from "./pages/Files.jsx";
import Folders from "./pages/Folders.jsx";
import Audit from "./pages/Audit.jsx";
import Guide from "./pages/Guide.jsx";
import SstAudits from "./pages/SstAudits.jsx";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

// Protege rutas de gestión: si el usuario no tiene permiso (Vista_Auditoria),
// lo redirige al dashboard. Es defensa en profundidad además del menú oculto.
function ManageRoute({ children }) {
  const { canManage, user } = useAuth();
  // Mientras aún no se conoce el rol (user null), no bloquea para evitar
  // parpadeos; el backend igual rechaza con 403 si no hay permiso.
  if (user && !canManage) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="guia" element={<Guide />} />
        <Route path="empresas" element={<Companies />} />
        <Route path="carpetas" element={<Folders />} />
        <Route path="archivos" element={<Files />} />
        <Route
          path="auditorias-sst"
          element={
            <ManageRoute>
              <SstAudits />
            </ManageRoute>
          }
        />
        <Route
          path="trazabilidad"
          element={
            <ManageRoute>
              <Audit />
            </ManageRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
