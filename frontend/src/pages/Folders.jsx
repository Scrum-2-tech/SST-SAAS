import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Folder,
  FolderPlus,
  Loader2,
  Pencil,
  Save,
  Sparkles,
  StickyNote,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import client from "../api/client.js";
import {
  createFolder,
  deleteFile,
  deleteFolder,
  downloadFileUrl,
  listFolderFiles,
  listFolderTree,
  updateFolder,
  uploadFile,
} from "../api/endpoints.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Button,
  Card,
  ErrorBanner,
  Input,
  parseApiError,
  Spinner,
  StatusBadge,
} from "../components/ui.jsx";
import { SST_FOLDER_TEMPLATE, countTemplateFolders } from "../data/sstTemplate.js";

function TreeNode({
  node,
  depth,
  canManage,
  onCreateChild,
  onDelete,
  onUpdate,
  onDownload,
  onDeleteFile,
  onFileUploaded,
}) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(node.name);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(node.notes || "");
  const [noteSaving, setNoteSaving] = useState(false);
  const [localError, setLocalError] = useState("");
  const [filesOpen, setFilesOpen] = useState(false);
  const [files, setFiles] = useState(null);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const fileInput = useRef(null);
  const hasChildren = node.children && node.children.length > 0;

  useEffect(() => {
    setDraftName(node.name);
    setNoteDraft(node.notes || "");
  }, [node.name, node.notes]);

  async function saveName(event) {
    event.preventDefault();
    const cleanName = draftName.trim();
    if (!cleanName) return;
    setLocalError("");
    try {
      await onUpdate(node, { name: cleanName });
      setEditing(false);
    } catch (err) {
      setLocalError(parseApiError(err));
    }
  }

  async function saveNote() {
    const value = noteDraft.trim();
    if (value) {
      try {
        JSON.parse(value);
      } catch {
        setLocalError("Escribe un JSON válido antes de guardar la nota.");
        return;
      }
    }
    setNoteSaving(true);
    setLocalError("");
    try {
      await onUpdate(node, { notes: value || null });
      setNoteOpen(false);
    } catch (err) {
      setLocalError(parseApiError(err));
    } finally {
      setNoteSaving(false);
    }
  }

  async function toggleFiles() {
    const shouldOpen = !filesOpen;
    setFilesOpen(shouldOpen);
    setLocalError("");
    if (shouldOpen && files === null) {
      setFilesLoading(true);
      try {
        setFiles(await listFolderFiles(node.id));
      } catch (err) {
        setLocalError(parseApiError(err));
      } finally {
        setFilesLoading(false);
      }
    }
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setLocalError("");
    setUploadProgress(0);
    try {
      const uploaded = await uploadFile({
        file,
        folderId: node.id,
        onUploadProgress: (progress) => {
          if (progress.total) {
            setUploadProgress(Math.round((progress.loaded / progress.total) * 100));
          }
        },
      });
      setFiles((current) => [uploaded, ...(current || [])]);
      await onFileUploaded();
    } catch (err) {
      setLocalError(parseApiError(err));
    } finally {
      setUploadProgress(null);
    }
  }

  async function removeFile(file) {
    const deleted = await onDeleteFile(file);
    if (deleted) {
      setFiles((current) =>
        current?.filter((item) => item.id !== file.id) || []
      );
    }
  }

  return (
    <div>
      <div
        className="group flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="text-slate-400"
              aria-label={open ? "Contraer carpeta" : "Expandir carpeta"}
            >
              {open ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="inline-block w-4" />
          )}
          <Folder className="h-4 w-4 shrink-0 text-brand-500" />
          {editing ? (
            <form onSubmit={saveName} className="flex min-w-0 flex-1 items-center gap-1">
              <input
                autoFocus
                required
                maxLength={255}
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none"
                aria-label="Nombre de la carpeta"
              />
              <button
                type="submit"
                className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                title="Guardar nombre"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftName(node.name);
                  setEditing(false);
                }}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
                title="Cancelar"
              >
                <X className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <span className="truncate text-sm text-slate-700">{node.name}</span>
          )}
          {node.audit_count > 0 && (
            <span
              className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700"
              title={`${node.audit_count} auditoría(s) asociada(s)`}
            >
              {node.audit_count} auditoría{node.audit_count === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={toggleFiles}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            title="Ver archivos"
          >
            <FileText className="h-4 w-4" />
            {node.file_count}
          </button>
          {canManage && (
            <>
              <button
                type="button"
                onClick={() => {
                  setDraftName(node.name);
                  setEditing(true);
                }}
                className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-slate-500 hover:bg-brand-50 hover:text-brand-600"
                title="Editar nombre"
                aria-label="Editar nombre"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </button>
              <button
                type="button"
                onClick={() => setNoteOpen((current) => !current)}
                className="rounded p-1 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                title="Editar nota JSON"
              >
                <StickyNote className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onCreateChild(node)}
                className="rounded p-1 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                title="Crear subcarpeta"
              >
                <FolderPlus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="rounded p-1 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                title="Subir archivo"
              >
                <Upload className="h-4 w-4" />
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
                onChange={handleUpload}
                className="hidden"
                aria-label={`Subir archivo a ${node.name}`}
              />
              <button
                type="button"
                onClick={() => onDelete(node)}
                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                title="Eliminar carpeta"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {localError && (
        <p
          className="px-3 py-1 text-xs text-red-600"
          style={{ marginLeft: `${depth * 16 + 24}px` }}
        >
          {localError}
        </p>
      )}

      {noteOpen && (
        <div
          className="mx-3 my-2 rounded-lg border border-amber-200 bg-amber-50 p-3"
          style={{ marginLeft: `${depth * 16 + 24}px` }}
        >
          {canManage ? (
            <>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Nota de la carpeta (JSON)
              </label>
              <textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                rows={4}
                spellCheck={false}
                placeholder={'{\n  "observacion": "Nota para el cliente"\n}'}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setNoteOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={saveNote} disabled={noteSaving}>
                  <Save className="h-4 w-4" />
                  {noteSaving ? "Guardando..." : "Guardar nota"}
                </Button>
              </div>
            </>
          ) : (
            <div className="whitespace-pre-wrap font-mono text-xs text-slate-700">
              {node.notes || "Esta carpeta no tiene notas."}
            </div>
          )}
        </div>
      )}

      {uploadProgress !== null && (
        <div
          className="mx-3 my-2"
          style={{ marginLeft: `${depth * 16 + 24}px` }}
        >
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>Subiendo archivo...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-brand-600 transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {filesOpen && (
        <div
          className="mx-3 my-2 rounded-lg border border-slate-200 bg-white p-3"
          style={{ marginLeft: `${depth * 16 + 24}px` }}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-600">
              Archivos ({files?.length ?? node.file_count})
            </p>
            {canManage && (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                <Upload className="h-3.5 w-3.5" />
                Subir archivo
              </button>
            )}
          </div>
          {filesLoading ? (
            <Spinner label="Cargando archivos..." />
          ) : !files?.length ? (
            <p className="text-xs text-slate-500">No hay archivos en esta carpeta.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {files.map((file) => (
                <li
                  key={file.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="truncate text-xs text-slate-700">{file.name}</span>
                    <StatusBadge status={file.status} />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onDownload(file)}
                      title="Descargar archivo"
                      className="rounded p-1 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => removeFile(file)}
                        title="Eliminar archivo"
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {open &&
        hasChildren &&
        node.children.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            canManage={canManage}
            onCreateChild={onCreateChild}
            onDelete={onDelete}
            onUpdate={onUpdate}
            onDownload={onDownload}
            onDeleteFile={onDeleteFile}
            onFileUploaded={onFileUploaded}
          />
        ))}
    </div>
  );
}

const TEMPLATE_TOTAL = countTemplateFolders();

export default function Folders() {
  const { companyId, activeCompany, canManage } = useAuth();
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [name, setName] = useState("");
  const [parent, setParent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState(0);
  const [generatedRoots, setGeneratedRoots] = useState([]);

  const load = useCallback(async () => {
    if (!companyId) {
      setTree([]);
      setLoading(false);
      return false;
    }
    setLoading(true);
    setError("");
    try {
      setTree(await listFolderTree());
      return true;
    } catch (err) {
      setError(parseApiError(err));
      return false;
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(event) {
    event.preventDefault();
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

  async function handleUpdate(node, changes) {
    setError("");
    setSuccess("");
    await updateFolder(node.id, changes);
    await load();
  }

  async function handleDelete(node) {
    if (
      !window.confirm(
        `¿Eliminar la carpeta "${node.name}" y todo su contenido? Esta acción no se puede deshacer.`
      )
    ) return;
    setError("");
    setSuccess("");
    try {
      await deleteFolder(node.id);
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  }

  async function handleDeleteFile(file) {
    if (!window.confirm(`¿Eliminar el archivo "${file.name}"?`)) return;
    setError("");
    try {
      await deleteFile(file.id);
      await load();
      return true;
    } catch (err) {
      setError(parseApiError(err));
      return false;
    }
  }

  async function handleDownload(file) {
    setError("");
    try {
      const response = await client.get(downloadFileUrl(file.id), {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(parseApiError(err));
    }
  }

  async function seedNodes(nodes, parentId, roots, onCreated) {
    for (const node of nodes) {
      const created = await createFolder({ name: node.name, parent_id: parentId });
      if (parentId === null) roots.push(created.id);
      onCreated();
      if (node.children?.length) {
        await seedNodes(node.children, created.id, roots, onCreated);
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
    ) return;
    setSeeding(true);
    setSeedProgress(0);
    setError("");
    setSuccess("");
    const roots = [];
    let count = 0;
    try {
      await seedNodes(SST_FOLDER_TEMPLATE, null, roots, () => {
        count += 1;
        setSeedProgress(count);
      });
      setGeneratedRoots(roots);
      if (await load()) {
        setSuccess(`Se generaron ${count} carpetas. Puedes deshacer esta generación durante esta sesión.`);
      } else {
        setError("La estructura se creó, pero no se pudo recargar el árbol. Puedes usar el rollback para deshacerla.");
      }
    } catch (err) {
      setGeneratedRoots(roots);
      setError(`No se pudo completar la estructura: ${parseApiError(err)}`);
    } finally {
      setSeeding(false);
    }
  }

  async function handleRollback() {
    if (!generatedRoots.length) return;
    if (
      !window.confirm(
        "¿Eliminar todas las carpetas generadas por la estructura guía? Esta acción no se puede deshacer."
      )
    ) return;
    setError("");
    setSuccess("");
    try {
      const remaining = [...generatedRoots];
      for (const rootId of generatedRoots) {
        try {
          await deleteFolder(rootId);
        } catch (err) {
          if (err?.response?.status !== 404) throw err;
        }
        remaining.shift();
        setGeneratedRoots([...remaining]);
      }
      if (await load()) {
        setSuccess("La estructura guía se eliminó correctamente.");
      } else {
        setError("Las carpetas se eliminaron, pero no se pudo recargar el árbol.");
      }
    } catch (err) {
      setError(`No se pudo completar el rollback: ${parseApiError(err)}`);
    }
  }

  const isEmpty = !loading && tree.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Carpetas</h1>
          <p className="text-sm text-slate-500">
            Organiza documentos y auditorías SST en una estructura jerárquica.
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            {generatedRoots.length > 0 && (
              <Button variant="danger" onClick={handleRollback} disabled={seeding}>
                Deshacer estructura guía
              </Button>
            )}
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
        )}
      </div>

      <ErrorBanner message={error} />
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {isEmpty && canManage && (
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
                Genera las {TEMPLATE_TOTAL} carpetas estándar del SG-SST según
                la Resolución 0312 de 2019.
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
        {canManage && (
          <div className="lg:col-span-1">
            <Card title="Nueva carpeta">
              <form onSubmit={handleCreate} className="space-y-4">
                <Input
                  label="Nombre"
                  required
                  maxLength={255}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
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
        )}

        <div className={canManage ? "lg:col-span-2" : "lg:col-span-3"}>
          <Card title="Árbol de carpetas">
            {loading ? (
              <Spinner label="Cargando carpetas..." />
            ) : tree.length === 0 ? (
              <p className="text-sm text-slate-500">
                {canManage
                  ? "No hay carpetas todavía. Crea la primera o usa la estructura guía."
                  : "No hay notas de carpetas para mostrar."}
              </p>
            ) : (
              <div className="space-y-0.5">
                {tree.map((node) => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    depth={0}
                    canManage={canManage}
                    onCreateChild={(folder) =>
                      setParent({ id: folder.id, name: folder.name })
                    }
                    onDelete={handleDelete}
                    onUpdate={handleUpdate}
                    onDownload={handleDownload}
                    onDeleteFile={handleDeleteFile}
                    onFileUploaded={load}
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
