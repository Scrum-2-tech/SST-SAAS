import { Link } from "react-router-dom";
import {
  Building2,
  FolderTree,
  FileText,
  History,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
} from "lucide-react";
import { Card } from "../components/ui.jsx";

const steps = [
  {
    icon: Building2,
    color: "bg-brand-100 text-brand-600",
    title: "1. Crea tu empresa",
    desc: "Registra la empresa que vas a asesorar (razón social y NIT). Puedes manejar varias desde una sola cuenta; la empresa activa se elige arriba a la derecha.",
    to: "/empresas",
    cta: "Ir a Empresas",
  },
  {
    icon: FolderTree,
    color: "bg-indigo-100 text-indigo-600",
    title: "2. Arma tu estructura documental",
    desc: "Usa la plantilla guía del SG-SST (Res. 0312 de 2019) para crear de un clic todas las carpetas típicas, o crea las tuyas propias con subcarpetas ilimitadas.",
    to: "/carpetas",
    cta: "Ir a Carpetas",
  },
  {
    icon: FileText,
    color: "bg-emerald-100 text-emerald-600",
    title: "3. Sube tus documentos",
    desc: "Carga PDF, imágenes, Word o Excel. Define fecha de vencimiento y marca los documentos exigidos por ley para no perderlos de vista.",
    to: "/archivos",
    cta: "Ir a Archivos",
  },
  {
    icon: LayoutDashboard,
    color: "bg-amber-100 text-amber-600",
    title: "4. Monitorea en el Dashboard",
    desc: "Revisa el semáforo de vencimientos, cuántos documentos están vigentes, por vencer o vencidos, y atiende las alertas a tiempo.",
    to: "/",
    cta: "Ir al Dashboard",
  },
  {
    icon: ClipboardCheck,
    color: "bg-rose-100 text-rose-600",
    title: "5. Gestiona tus auditorías SST",
    desc: "Registra las auditorías internas del SG-SST, documenta hallazgos (conformidades y no conformidades) y haz seguimiento a los planes de acción.",
    to: "/auditorias-sst",
    cta: "Ir a Auditorías SST",
  },
  {
    icon: History,
    color: "bg-slate-200 text-slate-700",
    title: "6. Revisa la trazabilidad",
    desc: "Toda subida, descarga o eliminación queda registrada con usuario, fecha e IP. Ideal para demostrar control ante una visita de inspección.",
    to: "/trazabilidad",
    cta: "Ir a Trazabilidad",
  },
];

const statusGuide = [
  {
    icon: CheckCircle2,
    color: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
    label: "Vigente",
    desc: "El documento está al día. Faltan más de 30 días para su vencimiento.",
  },
  {
    icon: AlertTriangle,
    color: "text-amber-600",
    badge: "bg-amber-100 text-amber-700",
    label: "Por Vencer",
    desc: "Vence dentro de los próximos 30 días. Renuévalo cuanto antes.",
  },
  {
    icon: AlertTriangle,
    color: "text-red-600",
    badge: "bg-red-100 text-red-700",
    label: "Vencido",
    desc: "Ya pasó su fecha de vencimiento. Requiere acción inmediata.",
  },
  {
    icon: FileText,
    color: "text-slate-500",
    badge: "bg-slate-100 text-slate-600",
    label: "Sin Vencimiento",
    desc: "Documento sin fecha de caducidad (ej. políticas, manuales).",
  },
];

export default function Guide() {
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-600 p-8 text-white">
        <div className="flex items-center gap-2 text-sm text-brand-100">
          <Sparkles className="h-4 w-4" />
          Guía de inicio
        </div>
        <h1 className="mt-2 text-2xl font-bold">
          Bienvenido a tu plataforma de gestión SST
        </h1>
        <p className="mt-2 max-w-2xl text-brand-50">
          Aquí te explicamos, paso a paso, qué hace cada sección para que
          organices el portafolio documental de tus empresas sin perderte.
          Sigue el orden sugerido la primera vez.
        </p>
      </div>

      {/* Pasos */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-800">
          <BookOpen className="h-5 w-5 text-brand-600" />
          ¿Por dónde empiezo?
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.title}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div
                className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${step.color}`}
              >
                <step.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-slate-800">{step.title}</h3>
              <p className="mt-1 flex-1 text-sm text-slate-500">{step.desc}</p>
              <Link
                to={step.to}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                {step.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Semáforo de estados */}
      <Card title="Cómo leer el estado de los documentos">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {statusGuide.map((s) => (
            <div
              key={s.label}
              className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4"
            >
              <s.icon className={`h-5 w-5 shrink-0 ${s.color}`} />
              <div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.badge}`}
                >
                  {s.label}
                </span>
                <p className="mt-1 text-sm text-slate-600">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-brand-100 bg-brand-50 p-4 text-sm text-brand-700">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            <span className="font-semibold">Consejo de experto:</span> marca
            como <span className="font-semibold">“Exigido por ley”</span> los
            documentos obligatorios del SG-SST (política, matriz de riesgos,
            plan de emergencias, etc.). Así el sistema los resalta y evitas
            hallazgos en una inspección del Ministerio de Trabajo.
          </p>
        </div>
      </Card>
    </div>
  );
}
