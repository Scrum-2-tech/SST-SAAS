import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck,
  Plus,
  Trash2,
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Save,
} from "lucide-react";
import {
  listSstAudits,
  getSstAudit,
  createSstAudit,
  updateSstAudit,
  deleteSstAudit,
  createFinding,
  updateFinding,
  deleteFinding,
  listFolderTree,
  updateAuditChecklist,
} from "../api/endpoints.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Card,
  Button,
  Input,
  ErrorBanner,
  Spinner,
  parseApiError,
} from "../components/ui.jsx";

const AUDIT_STATUS = ["Planificada", "En Proceso", "Cerrada"];
const FINDING_TYPES = [
  "Conformidad",
  "No Conformidad Mayor",
  "No Conformidad Menor",
  "Observación",
  "Oportunidad de Mejora",
];
const FINDING_STATUS = ["Abierto", "En Progreso", "Cerrado"];
const AUDIT_CHECKLIST = [
  "¿Se cumple la Resolución 0312 de 2019?",
  "¿Se realizan y registran las capacitaciones del SG-SST?",
  "¿Los equipos de protección personal están disponibles y vigentes?",
  "¿La matriz de peligros y valoración de riesgos está actualizada?",
  "¿Se investigan los incidentes y accidentes de trabajo?",
  "¿Se ejecuta el plan anual de trabajo del SG-SST?",
];

function flattenFolders(tree, depth = 0, items = []) {
  for (const folder of tree) {
    items.push({ id: folder.id, name: folder.name, depth });
    flattenFolders(folder.children || [], depth + 1, items);
  }
  return items;
}

const auditStatusStyle = {
  Planificada: "bg-slate-100 text-slate-600",
  "En Proceso": "bg-amber-100 text-amber-700",
  Cerrada: "bg-emerald-100 text-emerald-700",
};

const findingTypeStyle = {
  Conformidad: "bg-emerald-100 text-emerald-700",
  "No Conformidad Mayor": "bg-red-100 text-red-700",
  "No Conformidad Menor": "bg-orange-100 text-orange-700",
  Observación: "bg-amber-100 text-amber-700",
  "Oportunidad de Mejora": "bg-brand-100 text-brand-600",
};

const findingStatusStyle = {
  Abierto: "bg-red-100 text-red-700",
  "En Progreso": "bg-amber-100 text-amber-700",
  Cerrado: "bg-emerald-100 text-emerald-700",
};

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-slate-600">
          {label}
        </span>
      )}
      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

// ---------- Vista de detalle de una auditoría (con hallazgos) ----------
function AuditDetail({ auditId, onBack, onChanged }) {
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form de nuevo hallazgo.
  const [desc, setDesc] = useState("");
  const [type, setType] = useState("Observación");
  const [plan, setPlan] = useState("");
  const [responsible, setResponsible] = useState("");
  const [due, setDue] = useState("");
  const [saving, setSaving] = useState(false);
  const [observations, setObservations] = useState("");
  const [savingObservations, setSavingObservations] = useState(false);
  const [savingChecklist, setSavingChecklist] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getSstAudit(auditId);
      setAudit(data);
      setObservations(data.observations || "");
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAddFinding(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createFinding(auditId, {
        description: desc,
        finding_type: type,
        action_plan: plan || null,
        responsible: responsible || null,
        due_date: due || null,
      });
      setDesc("");
      setType("Observación");
      setPlan("");
      setResponsible("");
      setDue("");
      await load();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleFindingStatus(finding, newStatus) {
    setError("");
    try {
      await updateFinding(auditId, finding.id, { status: newStatus });
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  }

  async function handleDeleteFinding(finding) {
    if (!window.confirm("¿Eliminar este hallazgo?")) return;
    setError("");
    try {
      await deleteFinding(auditId, finding.id);
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  }

  async function handleAuditStatus(newStatus) {
    setError("");
    try {
      await updateSstAudit(auditId, { status: newStatus });
      await load();
      onChanged?.();
    } catch (err) {
      setError(parseApiError(err));
    }
  }

  async function handleSaveObservations() {
    setSavingObservations(true);
    setError("");
    try {
      await updateSstAudit(auditId, { observations: observations || null });
      await load();
      onChanged?.();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSavingObservations(false);
    }
  }

  async function handleChecklistChange(index, completed) {
    setSavingChecklist(true);
    setError("");
    try {
      const items = audit.checklist_items.map((item, itemIndex) => ({
        label: item.label,
        completed: itemIndex === index ? completed : item.completed,
      }));
      await updateAuditChecklist(auditId, items);
      await load();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSavingChecklist(false);
    }
  }

  if (loading) return <Spinner label="Cargando auditoría..." />;
  if (!audit) return <ErrorBanner message={error || "No encontrada"} />;

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver a auditorías
      </button>

      <ErrorBanner message={error} />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{audit.title}</h2>
            {audit.scope && (
              <p className="mt-1 text-sm text-slate-500">{audit.scope}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
              <span>
                Auditor:{" "}
                <span className="text-slate-700">{audit.auditor || "—"}</span>
              </span>
              <span>
                Fecha:{" "}
                <span className="text-slate-700">
                  {audit.scheduled_date || "—"}
                </span>
              </span>
              <span>
                Seguimiento:{" "}
                <span className="text-slate-700">
                  {audit.follow_up_date || "—"}
                </span>
              </span>
            </div>
          </div>
          <Select
            label="Estado de la auditoría"
            value={audit.status}
            onChange={(e) => handleAuditStatus(e.target.value)}
            options={AUDIT_STATUS}
          />
        </div>
      </Card>

      <Card title="Checklist de auditoría SG-SST">
        {!audit.checklist_items?.length ? (
          <p className="text-sm text-slate-500">
            Esta auditoría no tiene puntos de checklist.
          </p>
        ) : (
          <div className="space-y-2">
            {audit.checklist_items.map((item, index) => (
              <label
                key={item.id}
                className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  disabled={savingChecklist}
                  onChange={(event) =>
                    handleChecklistChange(index, event.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                {item.label}
              </label>
            ))}
          </div>
        )}
      </Card>

      <Card title="Salvedad / observaciones">
        <label className="block">
          <span className="sr-only">Salvedad o notas aclaratorias</span>
          <textarea
            value={observations}
            onChange={(event) => setObservations(event.target.value)}
            rows={5}
            placeholder="Registra notas aclaratorias, limitaciones o salvedades de la auditoría."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {audit.observations_updated_at
              ? `Última actualización por ${audit.observations_author_email || "usuario"} · ${new Date(audit.observations_updated_at).toLocaleString()}`
              : "Aún no se ha registrado una salvedad."}
          </p>
          <Button
            onClick={handleSaveObservations}
            disabled={savingObservations}
          >
            <Save className="h-4 w-4" />
            {savingObservations ? "Guardando..." : "Guardar salvedad"}
          </Button>
        </div>
      </Card>

      <Card title="Registrar hallazgo">
        <form
          onSubmit={handleAddFinding}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-600">
              Descripción del hallazgo
            </span>
            <textarea
              required
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              placeholder="Ej: No se evidencia la matriz de identificación de peligros actualizada."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <Select
            label="Clasificación"
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={FINDING_TYPES}
          />
          <Input
            label="Responsable del plan de acción"
            value={responsible}
            onChange={(e) => setResponsible(e.target.value)}
            placeholder="Nombre del responsable"
          />
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-600">
              Plan de acción
            </span>
            <textarea
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              rows={2}
              placeholder="Acción correctiva/preventiva propuesta"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <Input
            label="Fecha límite de cierre"
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
          <div className="flex items-end">
            <Button type="submit" disabled={saving}>
              <Plus className="h-4 w-4" />
              {saving ? "Agregando..." : "Agregar hallazgo"}
            </Button>
          </div>
        </form>
      </Card>

      <Card title={`Hallazgos (${audit.findings.length})`}>
        {audit.findings.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aún no hay hallazgos registrados en esta auditoría.
          </p>
        ) : (
          <div className="space-y-3">
            {audit.findings.map((f) => (
              <div
                key={f.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          findingTypeStyle[f.finding_type]
                        }`}
                      >
                        {f.finding_type}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          findingStatusStyle[f.status]
                        }`}
                      >
                        {f.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{f.description}</p>
                    {f.action_plan && (
                      <p className="mt-1 text-xs text-slate-500">
                        <span className="font-medium">Plan:</span>{" "}
                        {f.action_plan}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-slate-400">
                      {f.responsible && <span>Responsable: {f.responsible}</span>}
                      {f.due_date && <span>Cierre: {f.due_date}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteFinding(f)}
                    className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    title="Eliminar hallazgo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-slate-400">Cambiar estado:</span>
                  {FINDING_STATUS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleFindingStatus(f, s)}
                      disabled={f.status === s}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        f.status === s
                          ? "bg-slate-800 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------- Vista de lista de auditorías ----------
export default function SstAudits() {
  const { companyId } = useAuth();
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null); // id de auditoría abierta

  // Form de nueva auditoría.
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState("");
  const [auditor, setAuditor] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("Planificada");
  const [followUpDate, setFollowUpDate] = useState("");
  const [folderId, setFolderId] = useState("");
  const [observations, setObservations] = useState("");
  const [checklistSelection, setChecklistSelection] = useState(AUDIT_CHECKLIST);
  const [folders, setFolders] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError("");
    try {
      const [data, tree] = await Promise.all([listSstAudits(), listFolderTree()]);
      setAudits(data);
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

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createSstAudit({
        title,
        scope: scope || null,
        auditor: auditor || null,
        scheduled_date: date || null,
        follow_up_date: followUpDate || null,
        folder_id: folderId || null,
        observations: observations || null,
        checklist_items: checklistSelection.map((label) => ({
          label,
          completed: false,
        })),
        status,
      });
      setTitle("");
      setScope("");
      setAuditor("");
      setDate("");
      setFollowUpDate("");
      setFolderId("");
      setObservations("");
      setChecklistSelection(AUDIT_CHECKLIST);
      setStatus("Planificada");
      await load();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(audit) {
    if (
      !window.confirm(
        `¿Eliminar la auditoría "${audit.title}" y todos sus hallazgos?`
      )
    )
      return;
    setError("");
    try {
      await deleteSstAudit(audit.id);
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  }

  const stats = useMemo(() => {
    return {
      total: audits.length,
      proceso: audits.filter((a) => a.status === "En Proceso").length,
      cerradas: audits.filter((a) => a.status === "Cerrada").length,
    };
  }, [audits]);

  if (selected) {
    return (
      <AuditDetail
        auditId={selected}
        onBack={() => {
          setSelected(null);
          load();
        }}
        onChanged={load}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Auditorías SST</h1>
        <p className="text-sm text-slate-500">
          Auditorías internas del SG-SST con sus hallazgos y planes de acción
          (Decreto 1072 de 2015 · Res. 0312 de 2019).
        </p>
      </div>

      <ErrorBanner message={error} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-6 w-6 text-brand-600" />
            <div>
              <p className="text-sm text-slate-500">Total auditorías</p>
              <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <div>
              <p className="text-sm text-slate-500">En proceso</p>
              <p className="text-2xl font-bold text-slate-800">
                {stats.proceso}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            <div>
              <p className="text-sm text-slate-500">Cerradas</p>
              <p className="text-2xl font-bold text-slate-800">
                {stats.cerradas}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card title="Nueva auditoría">
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Título"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Auditoría interna anual SG-SST 2026"
              />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-600">
                  Alcance
                </span>
                <textarea
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  rows={2}
                  placeholder="Procesos y áreas que cubre la auditoría"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>
              <Input
                label="Auditor responsable"
                value={auditor}
                onChange={(e) => setAuditor(e.target.value)}
                placeholder="Nombre del auditor"
              />
              <Input
                label="Fecha de realización"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <Input
                label="Fecha de seguimiento"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-600">
                  Carpeta asociada
                </span>
                <select
                  value={folderId}
                  onChange={(event) => setFolderId(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  <option value="">Sin carpeta</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {`${"— ".repeat(folder.depth)}${folder.name}`}
                    </option>
                  ))}
                </select>
              </label>
              <Select
                label="Estado"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={AUDIT_STATUS}
              />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-600">
                  Salvedad / observaciones
                </span>
                <textarea
                  value={observations}
                  onChange={(event) => setObservations(event.target.value)}
                  rows={3}
                  placeholder="Notas aclaratorias para esta auditoría"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>
              <fieldset className="space-y-2">
                <legend className="mb-1 text-sm font-medium text-slate-600">
                  Checklist inicial
                </legend>
                {AUDIT_CHECKLIST.map((item) => (
                  <label key={item} className="flex items-start gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={checklistSelection.includes(item)}
                      onChange={(event) =>
                        setChecklistSelection((current) =>
                          event.target.checked
                            ? [...current, item]
                            : current.filter((value) => value !== item)
                        )
                      }
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    {item}
                  </label>
                ))}
              </fieldset>
              <Button type="submit" disabled={saving} className="w-full">
                <Plus className="h-4 w-4" />
                {saving ? "Creando..." : "Crear auditoría"}
              </Button>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card title={`Auditorías (${audits.length})`}>
            {loading ? (
              <Spinner label="Cargando auditorías..." />
            ) : audits.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                <ClipboardCheck className="h-8 w-8" />
                <p className="text-sm">
                  No hay auditorías registradas. Crea la primera a la izquierda.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {audits.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-4 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
                  >
                    <button
                      onClick={() => setSelected(a.id)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">
                          {a.title}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            auditStatusStyle[a.status]
                          }`}
                        >
                          {a.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {a.auditor ? `Auditor: ${a.auditor} · ` : ""}
                        {a.scheduled_date
                          ? `Realización: ${a.scheduled_date}`
                          : "Sin fecha"}
                        {a.follow_up_date ? ` · Seguimiento: ${a.follow_up_date}` : ""}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {a.observations && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Tiene salvedad
                          </span>
                        )}
                        {a.folder_id && (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                            Asociada a carpeta
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => handleDelete(a)}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      title="Eliminar auditoría"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
