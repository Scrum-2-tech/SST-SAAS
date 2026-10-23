import { useCallback, useEffect, useState } from "react";
import {
  Folder,
  FolderPlus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  createFolder,
  deleteFolder,
  listFolderTree,
} from "../api/endpoints.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Card, Button, Input, ErrorBanner, Spinner, parseApiError } from "../components/ui.jsx";
import { SST_FOLDER_TEMPLATE, countTemplateFolders } from "../data/sstTemplate.js";

function TreeNode({ node, depth, onCreateChild, onDelete }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className="group flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <div className="flex items-center gap-1.5">
          {hasChildren ? (
            <button onClick={() => setOpen(!open)} className="text-slate-400">
              {open ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="inline-block w-4" />
          )}
          <Folder className="h-4 w-4 text-brand-500" />
          <span className="text-sm text-slate-700">{node.name}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          <button
            onClick={() => onCreateChild(node)}
            className="rounded p-1 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
            title="Crear subcarpeta"
          >
            <FolderPlus className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(node)}
            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
            title="Eliminar carpeta"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {open &&
        hasChildren &&
        node.children.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            onCreateChild={onCreateChild}
            onDelete={onDelete}
          />
        ))}
    </div>
  );
}

const TEMPLATE_TOTAL = countTemplateFolders();

export default function Folders() {
  const { companyId, activeCompany } = useAuth();
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [parent, setParent] = useState(null); // { id, name } o null para raíz
  const [saving, setSaving] = useState(false);

  // Estado de la generación de la plantilla guía.
  const [seeding, setSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState(0);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError("");
    try {
      const data = await listFolderTree();
      setTree(data);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createFolder({ name, parent_id: parent ? parent.id : null });
      setName("");
      setParent(null);
      await load();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(node) {
    if (
      !window.confirm(
        `¿Eliminar la carpeta "${node.name}" y todo su contenido? Esta acción no se puede deshacer.`
      )
    )
      return;
    setError("");
    try {
      await deleteFolder(node.id);
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  }

  // Crea recursivamente el árbol de plantilla respetando la jerarquía:
  // primero el padre (para obtener su id) y luego sus hijos con parent_id.
  async function seedNodes(nodes, parentId, onCreated) {
    for (const node of nodes) {
      const created = await createFolder({ name: node.name, parent_id: parentId });
      onCreated();
      if (node.children && node.children.length > 0) {
        await seedNodes(node.children, created.id, onCreated);
      }
    }
  }

  async function handleSeedTemplate() {
    if (
      !window.confirm(
        `Se crearán ${TEMPLATE_TOTAL} carpetas con la estructura guía del SG-SST (Res. 0312 de 2019) en "${
          activeCompany?.name || "la empresa activa"
        }". ¿Continuar?`
      )
    )
      return;
    setSeeding(true);
    setSeedProgress(0);
    setError("");
    let count = 0;
    try {
      await seedNodes(SST_FOLDER_TEMPLATE, null, () => {
        count += 1;
        setSeedProgress(count);
      });
      await load();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSeeding(false);
    }
  }

  const isEmpty = !loading && tree.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Carpetas</h1>
          <p className="text-sm text-slate-500">
            Estructura documental jerárquica del portafolio (subcarpetas
            ilimitadas).
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={handleSeedTemplate}
          disabled={seeding || !companyId}
        >
          {seeding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 text-brand-600" />
          )}
          {seeding
            ? `Creando ${seedProgress}/${TEMPLATE_TOTAL}...`
            : "Crear estructura guía SST"}
        </Button>
      </div>

      {/* Banner promocional de la plantilla cuando no hay carpetas */}
      {isEmpty && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-brand-100 bg-brand-50 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">
                ¿Recién empiezas? Usa la estructura guía
              </h3>
              <p className="text-sm text-slate-600">
                Genera de un clic las {TEMPLATE_TOTAL} carpetas estándar del
                SG-SST según la Resolución 0312 de 2019. Luego solo subes tus
                documentos a cada una.
              </p>
            </div>
          </div>
          <Button onClick={handleSeedTemplate} disabled={seeding}>
            <Sparkles className="h-4 w-4" />
            Crear ahora
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card title="Nueva carpeta">
            <ErrorBanner message={error} />
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Nombre"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Matriz de riesgos"
              />
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Ubicación:{" "}
                <span className="font-medium text-slate-800">
                  {parent ? parent.name : "Raíz del portafolio"}
                </span>
                {parent && (
                  <button
                    type="button"
                    onClick={() => setParent(null)}
                    className="ml-2 text-xs text-brand-600 hover:underline"
                  >
                    (usar raíz)
                  </button>
                )}
              </div>
              <Button type="submit" disabled={saving} className="w-full">
                <FolderPlus className="h-4 w-4" />
                {saving ? "Creando..." : "Crear carpeta"}
              </Button>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card title="Árbol de carpetas">
            {loading ? (
              <Spinner label="Cargando carpetas..." />
            ) : tree.length === 0 ? (
              <p className="text-sm text-slate-500">
                No hay carpetas todavía. Crea la primera a la izquierda o usa la
                estructura guía.
              </p>
            ) : (
              <div className="space-y-0.5">
                {tree.map((node) => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    depth={0}
                    onCreateChild={(n) => setParent({ id: n.id, name: n.name })}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
