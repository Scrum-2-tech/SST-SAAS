/**
 * Utilidad de evaluación de fortaleza de contraseña.
 * Reglas pensadas para pruebas: longitud, mayúscula, minúscula, número y símbolo.
 */
export const PASSWORD_RULES = [
  { key: "length", label: "Mínimo 8 caracteres", test: (p) => p.length >= 8 },
  { key: "upper", label: "Una letra mayúscula", test: (p) => /[A-Z]/.test(p) },
  { key: "lower", label: "Una letra minúscula", test: (p) => /[a-z]/.test(p) },
  { key: "number", label: "Un número", test: (p) => /\d/.test(p) },
  {
    key: "symbol",
    label: "Un símbolo (!@#$...)",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

// Devuelve { score 0-5, passed[], label, color } evaluando todas las reglas.
export function evaluatePassword(password = "") {
  const passed = PASSWORD_RULES.map((r) => ({
    ...r,
    ok: r.test(password),
  }));
  const score = passed.filter((r) => r.ok).length;

  const levels = [
    { label: "Muy débil", color: "bg-red-500", text: "text-red-600" },
    { label: "Débil", color: "bg-red-400", text: "text-red-500" },
    { label: "Regular", color: "bg-amber-400", text: "text-amber-600" },
    { label: "Buena", color: "bg-yellow-400", text: "text-yellow-600" },
    { label: "Fuerte", color: "bg-emerald-400", text: "text-emerald-600" },
    { label: "Muy fuerte", color: "bg-emerald-500", text: "text-emerald-600" },
  ];

  return { score, passed, ...levels[score] };
}

// La contraseña se considera válida para registro si cumple todas las reglas.
export function isPasswordValid(password = "") {
  return PASSWORD_RULES.every((r) => r.test(password));
}
