/**
 * Plantilla estándar de estructura documental SG-SST (Colombia).
 *
 * Basada en los Estándares Mínimos de la Resolución 0312 de 2019 y el ciclo
 * PHVA (Planear - Hacer - Verificar - Actuar) del Decreto 1072 de 2015.
 *
 * Esta estructura se precarga para facilitar el arranque a quien comienza en
 * SST: cada carpeta raíz es una fase/estándar y sus hijos son los documentos
 * típicos que exige la normativa.
 *
 * Formato: árbol serializable. Cada nodo tiene 'name' y opcionalmente 'children'.
 */
export const SST_FOLDER_TEMPLATE = [
  {
    name: "1. Recursos",
    children: [
      { name: "Responsable del SG-SST y asignación de recursos" },
      { name: "Afiliación a Seguridad Social (ARL, EPS, AFP)" },
      { name: "Conformación del COPASST / Vigía SST" },
      { name: "Comité de Convivencia Laboral" },
      { name: "Programa de Capacitación en SST" },
    ],
  },
  {
    name: "2. Gestión Integral del SG-SST",
    children: [
      { name: "Política y Objetivos de SST" },
      { name: "Plan Anual de Trabajo" },
      { name: "Matriz Legal" },
      { name: "Comunicación interna y externa" },
      { name: "Control de documentos y registros" },
    ],
  },
  {
    name: "3. Gestión de la Salud",
    children: [
      { name: "Evaluaciones médicas ocupacionales" },
      { name: "Perfil sociodemográfico y condiciones de salud" },
      { name: "Registro y análisis de ausentismo" },
      { name: "Reporte e investigación de incidentes y accidentes" },
      { name: "Primeros auxilios" },
    ],
  },
  {
    name: "4. Gestión de Peligros y Riesgos",
    children: [
      { name: "Matriz de Identificación de Peligros (IPEVR)" },
      { name: "Inspecciones de seguridad" },
      { name: "Elementos de Protección Personal (EPP)" },
      { name: "Mantenimiento de instalaciones y equipos" },
    ],
  },
  {
    name: "5. Gestión de Amenazas",
    children: [
      { name: "Plan de Prevención, Preparación y Respuesta ante Emergencias" },
      { name: "Conformación de Brigadas de Emergencia" },
      { name: "Simulacros" },
    ],
  },
  {
    name: "6. Verificación del SG-SST",
    children: [
      { name: "Auditoría interna" },
      { name: "Revisión por la Alta Dirección" },
      { name: "Indicadores de SST" },
    ],
  },
  {
    name: "7. Mejoramiento",
    children: [
      { name: "Acciones correctivas y preventivas" },
      { name: "Plan de mejoramiento" },
    ],
  },
];

// Cuenta el total de carpetas (raíces + hijos) para mostrar en la UI.
export function countTemplateFolders(nodes = SST_FOLDER_TEMPLATE) {
  return nodes.reduce(
    (total, node) => total + 1 + countTemplateFolders(node.children || []),
    0
  );
}
