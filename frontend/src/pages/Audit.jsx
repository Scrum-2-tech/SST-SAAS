import { useCallback, useEffect, useState } from "react";
import { History, Clock } from "lucide-react";
import { listAuditLogs } from "../api/endpoints.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Card, Spinner, ErrorBanner, parseApiError } from "../components/ui.jsx";

const actionColors = {
  SUBIR: "bg-emerald-100 text-emerald-700",
  DESCARGAR: "bg-brand-100 text-brand-600",
  ELIMINAR_ARCHIVO: "bg-red-100 text-red-700",
  ELIMINAR_CARPETA: "bg-red-100 text-red-700",
};

export default function Audit() {
  const { companyId } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError("");
    try {
      const data = await listAuditLogs();
      setLogs(data);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Trazabilidad</h1>
        <p className="text-sm text-slate-500">
          Registro técnico de acciones (subidas, descargas, eliminaciones)
          realizadas sobre el portafolio de la empresa activa.
        </p>
      </div>

      <ErrorBanner message={error} />

      <Card title={`Historial (${logs.length})`}>
        {loading ? (
          <Spinner label="Cargando historial..." />
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
            <History className="h-8 w-8" />
            <p className="text-sm">No hay registros de auditoría todavía.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="text-left text-xs font-medium uppercase text-slate-400">
                  <th className="px-3 py-2">Acción</th>
                  <th className="px-3 py-2">Detalle</th>
                  <th className="px-3 py-2">IP</th>
                  <th className="px-3 py-2">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="text-sm">
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          actionColors[log.action] || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {log.details || "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-400">
                      {log.ip_address || "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-300" />
                        {new Date(log.timestamp).toLocaleString("es-CO")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
