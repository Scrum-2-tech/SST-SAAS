import { useState } from "react";
import { Building2, Plus, CheckCircle2 } from "lucide-react";
import { createCompany } from "../api/endpoints.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Card, Button, Input, ErrorBanner, parseApiError } from "../components/ui.jsx";

export default function Companies() {
  const { companies, refreshCompanies, companyId, setCompanyId } = useAuth();
  const [name, setName] = useState("");
  const [nit, setNit] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const nueva = await createCompany({ name, nit });
      setName("");
      setNit("");
      await refreshCompanies();
      setCompanyId(nueva.id);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Empresas</h1>
        <p className="text-sm text-slate-500">
          Portafolio de empresas asesoradas. La empresa seleccionada define el
          tenant activo en todo el sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card title="Nueva empresa">
            <ErrorBanner message={error} />
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Razón social"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Constructora XYZ S.A.S."
              />
              <Input
                label="NIT"
                required
                value={nit}
                onChange={(e) => setNit(e.target.value)}
                placeholder="900.123.456-7"
              />
              <Button type="submit" disabled={saving} className="w-full">
                <Plus className="h-4 w-4" />
                {saving ? "Creando..." : "Crear empresa"}
              </Button>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card title={`Mis empresas (${companies.length})`}>
            {companies.length === 0 ? (
              <p className="text-sm text-slate-500">
                Aún no tienes empresas registradas.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr className="text-left text-xs font-medium uppercase text-slate-400">
                      <th className="px-3 py-2">Empresa</th>
                      <th className="px-3 py-2">NIT</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {companies.map((c) => (
                      <tr key={c.id} className="text-sm">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            <span className="font-medium text-slate-700">
                              {c.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-500">{c.nit}</td>
                        <td className="px-3 py-3">
                          {c.id === companyId ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" /> Activa
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {c.id !== companyId && (
                            <Button
                              variant="secondary"
                              onClick={() => setCompanyId(c.id)}
                            >
                              Seleccionar
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
