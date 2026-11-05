import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  FolderTree,
  Scale,
  ShieldAlert,
} from "lucide-react";
import { getPortfolioReport } from "../api/endpoints.js";
import {
  Card,
  ErrorBanner,
  Spinner,
  StatusBadge,
  parseApiError,
} from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function Metric({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-slate-800">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { activeCompany, companyId } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!companyId) {
        setReport(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const data = await getPortfolioReport();
        if (!cancelled) setReport(data);
      } catch (err) {
        if (!cancelled) setError(parseApiError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  if (loading) return <Spinner label="Cargando métricas del portafolio..." />;

  const documents = report?.documents;
  const audits = report?.audits;
  const expirations = report?.expirations || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {activeCompany ? activeCompany.name : "Dashboard"}
          </h1>
          <p className="text-sm text-slate-500">
            Resumen estadístico de documentos, vencimientos y auditorías.
          </p>
        </div>
        <Link
          to="/guia"
          className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
        >
          <BookOpen className="h-4 w-4" />
          Ver guía de inicio
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <ErrorBanner message={error} />

      {documents && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={FileText} label="Total de documentos" value={documents.total} accent="bg-brand-100 text-brand-600" />
            <Metric icon={CheckCircle2} label="Vigentes" value={documents.vigentes} accent="bg-emerald-100 text-emerald-600" />
            <Metric icon={AlertTriangle} label="Por vencer (30 días)" value={documents.por_vencer} accent="bg-amber-100 text-amber-600" />
            <Metric icon={ShieldAlert} label="Vencidos" value={documents.vencidos} accent="bg-red-100 text-red-600" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card title="Vencimientos próximos y vencidos">
                {expirations.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No hay documentos vencidos ni próximos a vencer.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {expirations.map((item, index) => (
                      <li
                        key={`${item.name}-${item.expiration_date}-${index}`}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <FileText className="h-5 w-5 shrink-0 text-slate-400" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-700">
                              {item.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              Vence: {item.expiration_date}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={item.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <div className="space-y-4">
              <Metric icon={FolderTree} label="Carpetas" value={report.folders} accent="bg-indigo-100 text-indigo-600" />
              <Metric icon={Scale} label="Exigidos por ley" value={documents.criticos} accent="bg-amber-100 text-amber-700" />
              <Card title="Auditorías SST">
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="h-6 w-6 text-brand-600" />
                  <div className="text-sm text-slate-600">
                    <p>{audits?.total || 0} realizadas o registradas</p>
                    <p>{audits?.proximas || 0} próximas · {audits?.vencidas || 0} vencidas</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
