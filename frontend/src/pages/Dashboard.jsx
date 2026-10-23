import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  FolderTree,
  Scale,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { listFiles, listFolderTree } from "../api/endpoints.js";
import { Card, Spinner, ErrorBanner, StatusBadge, parseApiError } from "../components/ui.jsx";
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

function countFolders(tree) {
  let total = 0;
  for (const node of tree) {
    total += 1 + countFolders(node.children || []);
  }
  return total;
}

export default function Dashboard() {
  const { activeCompany, companyId } = useAuth();
  const [files, setFiles] = useState([]);
  const [folderCount, setFolderCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!companyId) return;
      setLoading(true);
      setError("");
      try {
        const [filesData, tree] = await Promise.all([
          listFiles(),
          listFolderTree(),
        ]);
        if (cancelled) return;
        setFiles(filesData);
        setFolderCount(countFolders(tree));
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

  const stats = useMemo(() => {
    const vencidos = files.filter((f) => f.status === "Vencido").length;
    const porVencer = files.filter((f) => f.status === "Por Vencer").length;
    const vigentes = files.filter((f) => f.status === "Vigente").length;
    const criticos = files.filter((f) => f.is_critical).length;
    return { vencidos, porVencer, vigentes, criticos };
  }, [files]);

  const alertas = useMemo(
    () =>
      files
        .filter((f) => f.status === "Vencido" || f.status === "Por Vencer")
        .sort((a, b) => (a.expiration_date || "").localeCompare(b.expiration_date || "")),
    [files]
  );

  if (loading) return <Spinner label="Cargando métricas del portafolio..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {activeCompany ? activeCompany.name : "Dashboard"}
          </h1>
          <p className="text-sm text-slate-500">
            Resumen del estado documental de la empresa activa.
          </p>
        </div>
        <Link
          to="/guia"
          className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
        >
          <BookOpen className="h-4 w-4" />
          ¿Primera vez? Ver guía de inicio
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <ErrorBanner message={error} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={FileText}
          label="Total de documentos"
          value={files.length}
          accent="bg-brand-100 text-brand-600"
        />
        <Metric
          icon={CheckCircle2}
          label="Vigentes"
          value={stats.vigentes}
          accent="bg-emerald-100 text-emerald-600"
        />
        <Metric
          icon={AlertTriangle}
          label="Por vencer (30 días)"
          value={stats.porVencer}
          accent="bg-amber-100 text-amber-600"
        />
        <Metric
          icon={ShieldAlert}
          label="Vencidos"
          value={stats.vencidos}
          accent="bg-red-100 text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Alertas de vencimiento">
            {alertas.length === 0 ? (
              <p className="text-sm text-slate-500">
                No hay documentos vencidos ni próximos a vencer. Todo en orden.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {alertas.slice(0, 8).map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {f.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          Vence: {f.expiration_date || "—"}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={f.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Metric
            icon={FolderTree}
            label="Carpetas"
            value={folderCount}
            accent="bg-indigo-100 text-indigo-600"
          />
          <Metric
            icon={Scale}
            label="Exigidos por ley"
            value={stats.criticos}
            accent="bg-amber-100 text-amber-700"
          />
        </div>
      </div>
    </div>
  );
}
