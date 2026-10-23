import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  Check,
  X,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { register as apiRegister } from "../api/endpoints.js";
import { Button, Input, ErrorBanner, parseApiError } from "../components/ui.jsx";
import {
  evaluatePassword,
  isPasswordValid,
} from "../utils/password.js";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = evaluatePassword(password);
  const passwordOk = isPasswordValid(password);
  const confirmOk = confirm.length > 0 && confirm === password;

  const canSubmitRegister =
    email.length > 0 && passwordOk && confirmOk && acceptedTerms;

  function resetSecondaryFields() {
    setConfirm("");
    setAcceptedTerms(false);
    setShowPass(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (mode === "register") {
      if (!passwordOk) {
        setError("La contraseña no cumple los requisitos de seguridad.");
        return;
      }
      if (!confirmOk) {
        setError("Las contraseñas no coinciden.");
        return;
      }
      if (!acceptedTerms) {
        setError("Debes aceptar los términos y condiciones.");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "register") {
        await apiRegister(email, password);
        setInfo("Cuenta creada con éxito. Ahora puedes iniciar sesión.");
        setMode("login");
        setPassword("");
        resetSecondaryFields();
      } else {
        await login(email, password);
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(parseApiError(err, "No se pudo completar la operación."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Panel lateral informativo */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-brand-700 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <span className="text-lg font-semibold">SST SaaS</span>
        </div>

        <div className="space-y-6">
          <h2 className="text-3xl font-bold leading-tight">
            Gestión documental de Seguridad y Salud en el Trabajo
          </h2>
          <p className="text-slate-300">
            Centraliza el portafolio de tus empresas, controla vencimientos y
            cumple con los Estándares Mínimos (Res. 0312 de 2019) en un solo
            lugar.
          </p>
          <ul className="space-y-3 text-sm text-slate-200">
            {[
              "Estructura documental guía lista para usar",
              "Alertas de vencimiento y documentos críticos",
              "Trazabilidad y auditoría de cada acción",
              "Multi-empresa desde una sola cuenta",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} SST SaaS · Plataforma en desarrollo
        </p>
      </div>

      {/* Panel de formulario */}
      <div className="flex w-full items-center justify-center bg-slate-50 p-4 lg:w-1/2">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">SST SaaS</h1>
          </div>

          <h1 className="mb-1 text-2xl font-bold text-slate-800">
            {mode === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta"}
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            {mode === "login"
              ? "Ingresa tus credenciales para acceder a tu portafolio."
              : "Regístrate como Gestor SST para administrar tus empresas."}
          </p>

          <ErrorBanner message={error} />
          {info && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Correo electrónico"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gestor@empresa.com"
            />

            {/* Contraseña con botón de ver/ocultar */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    mode === "register"
                      ? "Crea una contraseña segura"
                      : "Tu contraseña"
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Medidor de fortaleza (solo en registro) */}
              {mode === "register" && password.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-1.5 rounded-full transition-all ${strength.color}`}
                        style={{ width: `${(strength.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${strength.text}`}>
                      {strength.label}
                    </span>
                  </div>
                  <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {strength.passed.map((rule) => (
                      <li
                        key={rule.key}
                        className={`flex items-center gap-1.5 text-xs ${
                          rule.ok ? "text-emerald-600" : "text-slate-400"
                        }`}
                      >
                        {rule.ok ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                        {rule.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Confirmar contraseña + términos (solo registro) */}
            {mode === "register" && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">
                    Confirmar contraseña
                  </label>
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repite la contraseña"
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      confirm.length === 0
                        ? "border-slate-300 focus:border-brand-500 focus:ring-brand-100"
                        : confirmOk
                        ? "border-emerald-400 focus:ring-emerald-100"
                        : "border-red-400 focus:ring-red-100"
                    }`}
                  />
                  {confirm.length > 0 && !confirmOk && (
                    <p className="mt-1 text-xs text-red-500">
                      Las contraseñas no coinciden.
                    </p>
                  )}
                </div>

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-xs text-slate-500">
                    Acepto los{" "}
                    <span className="font-medium text-brand-600">
                      términos y condiciones
                    </span>{" "}
                    y el tratamiento de mis datos personales conforme a la Ley
                    1581 de 2012.
                  </span>
                </label>
              </>
            )}

            <Button
              type="submit"
              disabled={
                loading || (mode === "register" && !canSubmitRegister)
              }
              className="w-full"
            >
              {mode === "login" ? (
                <>
                  <LogIn className="h-4 w-4" />
                  {loading ? "Ingresando..." : "Iniciar sesión"}
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  {loading ? "Creando..." : "Crear cuenta de Gestor"}
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
                setInfo("");
                setPassword("");
                resetSecondaryFields();
              }}
              className="font-semibold text-brand-600 hover:text-brand-700"
            >
              {mode === "login" ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
