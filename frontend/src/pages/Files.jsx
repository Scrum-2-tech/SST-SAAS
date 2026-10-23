import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Upload,
  Download,
  Trash2,
  FileText,
  Scale,
  Search,
  Filter,
} from "lucide-react";
import client from "../api/client.js";
import {
  deleteFile,
  downloadFileUrl,
  listFiles,
  listFolderTree,
  uploadFile,
} from "../api/endpoints.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Card,
  Button,
  Input,
  ErrorBanner,
  Spinner,
  StatusBadge,
  parseApiError,
} from "../components/ui.jsx";

// Aplana el árbol de carpetas a una lista con nombres indentados para el select.
function flattenFolders(tree, depth = 0, acc = []) {
  for (const node of tree) {
    acc.push({ id: node.id, label: `${"— ".repeat(depth)}${node.name}` });
    if (node.children) flattenFolders(node.children, depth + 1, acc);
  }
  return acc;
}

// Calcula los días restantes hasta el vencimiento (negativo si ya venció).
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function ExpirationCell({ file }) {
  const days = daysUntil(file.expiration_date);
  if (!file.expiration_date) {
    return <span className="text-slate-400">Sin fecha</span>;
  }
  let hint = "";
  let color = "text-slate-500";
  if (days < 0) {
    hint = `Venció hace ${Math.abs(days)} día(s)`;
    color = "text-red-600";
  } else if (days === 0) {
    hint = "Vence hoy";
    color = "text-red-600";
  } else if (days <= 30) {
    hint = `Vence en ${days} día(s)`;
    color = "text-amber-600";
  } else {
    hint = `${days} días restantes`;
    color = "text-slate-500";
  }
  return (
    <div>
      <p className="text-slate-700">{file.expiration_date}</p>
      <p className={`text-xs ${color}`}>{hint}</p>
    </div>
  );
}

const STATUS_FILTERS = [
  { key: "ALL", label: "Todos" },
  { key: "Vencido", label: "Vencidos" },
  { key: "Por Vencer", label: "Por vencer" },
  { key: "Vigente", label: "Vigentes" },
  { key: "LEY", label: "Exigidos por ley" },
];

export default function Files() {
  const { companyId } = useAuth();
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtros y búsqueda.
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [query, setQuery] = useState("");

  // Formulario de subida.
  const [file, setFile] = useState(null);
  const [folderId, setFolderId] = useState("");
  const [isCritical, setIsCritical] = useState(false);
  const [expiration, setExpiration] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError("");
    try {
      const [filesData, tree] = await Promise.all([
        listFiles(),
        listFolderTree(),
      ]);
      setFiles(filesData);
      setFolders(flattenFolders(tree));
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
      setError("Selecciona un archivo primero.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      await uploadFile({
        file,
        folderId: folderId || null,
        isCritical,
        expirationDate: expiration || null,
      });
      setFile(null);
      setFolderId("");
      setIsCritical(false);
      setExpiration("");
      e.target.reset?.();
      await load();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(f) {
    try {
      const resp = await client.get(downloadFileUrl(f.id), {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", f.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(parseApiError(err));
    }
  }

  async function handleDelete(f) {
    if (!window.confirm(`¿Eliminar el archivo "${f.name}"?`)) return;
    setError("");
    try {
      await deleteFile(f.id);
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  }

  // Conteos para los chips de filtro.
  const counts = useMemo(() => {
    return {
      ALL: files.length,
      Vencido: files.filter((f) => f.status === "Vencido").length,
      "Por Vencer": files.filter((f) => f.status === "Por Vencer").length,
      Vigente: files.filter((f) => f.status === "Vigente").length,
      LEY: files.filter((f) => f.is_critical).length,
    };
  }, [files]);

  const filtered = useMemo(() => {
    let list = files;
    if (statusFilter === "LEY") {
      list = list.filter((f) => f.is_critical);
    } else if (statusFilter !== "ALL") {
      list = list.filter((f) => f.status === statusFilter);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q));
    }
    return list;
  }, [files, statusFilter, query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Archivos</h1>
        <p className="text-sm text-slate-500">
          Documentos del portafolio con control de vencimiento y cumplimiento
          legal.
        </p>
      </div>

      <ErrorBanner message={error} />

      <Card title="Subir documento">
        <form
          onSubmit={handleUpload}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 items-end"
        >
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-600">
              Archivo (PDF, PNG, JPG, DOCX, XLSX)
            </span>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">
              Carpeta destino
            </span>
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Raíz (sin carpeta)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          <Input
            label="Fecha de vencimiento"
            type="date"
            value={expiration}
            onChange={(e) => setExpiration(e.target.value)}
          />

          <label className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              checked={isCritical}
              onChange={(e) => setIsCritical(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="flex items-center gap-1 text-sm text-slate-600">
              <Scale className="h-4 w-4 text-amber-500" />
              Documento exigido por ley (obligatorio en el SG-SST)
            </span>
          </label>

          <div className="md:col-span-2 lg:col-span-2 flex justify-end">
            <Button type="submit" disabled={uploading}>
              <Upload className="h-4 w-4" />
              {uploading ? "Subiendo..." : "Subir documento"}
            </Button>
          </div>
        </form>
      </Card>

      <Card
        title={`Documentos (${filtered.length}${
          filtered.length !== files.length ? ` de ${files.length}` : ""
        })`}
      >
        {/* Barra de filtros */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-slate-400">
            <Filter className="h-4 w-4" />
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === f.key
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.key === "LEY" && <Scale className="h-3.5 w-3.5" />}
                {f.label}
                <span
                  className={`rounded-full px-1.5 ${
                    statusFilter === f.key
                      ? "bg-white/20"
                      : "bg-white text-slate-500"
                  }`}
                >
                  {counts[f.key] ?? 0}
                </span>
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar documento..."
              className="rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>

        {loading ? (
          <Spinner label="Cargando archivos..." />
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {files.length === 0
              ? "No hay documentos en esta empresa todavía."
              : "Ningún documento coincide con el filtro."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="text-left text-xs font-medium uppercase text-slate-400">
                  <th className="px-3 py-2">Documento</th>
                  <th className="px-3 py-2">Vencimiento</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Legal</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((f) => (
                  <tr key={f.id} className="text-sm">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-slate-700">
                          {f.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <ExpirationCell file={f} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="px-3 py-3">
                      {f.is_critical ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          <Scale className="h-3 w-3" />
                          Exigido por ley
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleDownload(f)}
                          className="rounded p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                          title="Descargar"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(f)}
                          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
