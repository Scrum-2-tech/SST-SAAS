import client from "./client.js";

// --- Autenticación ---
// El login usa OAuth2PasswordRequestForm: form-data con 'username' y 'password'.
export async function login(email, password) {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  const { data } = await client.post("/auth/login", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data; // { access_token, token_type }
}

export async function register(email, password) {
  const { data } = await client.post("/auth/register", { email, password });
  return data;
}

// Devuelve el usuario autenticado (incluye el rol). Lo usa el AuthContext
// para decidir qué secciones mostrar según permisos.
export async function getMe() {
  const { data } = await client.get("/auth/me");
  return data;
}

// --- Empresas (tenants) ---
export async function listCompanies() {
  const { data } = await client.get("/companies");
  return data;
}

export async function createCompany(payload) {
  const { data } = await client.post("/companies", payload);
  return data;
}

// --- Carpetas ---
export async function listFolderTree() {
  const { data } = await client.get("/folders");
  return data;
}

export async function createFolder(payload) {
  const { data } = await client.post("/folders", payload);
  return data;
}

export async function deleteFolder(folderId) {
  await client.delete(`/folders/${folderId}`);
}

// --- Archivos ---
export async function listFiles() {
  const { data } = await client.get("/files");
  return data;
}

export async function uploadFile({ file, folderId, isCritical, expirationDate }) {
  const form = new FormData();
  form.append("file", file);
  if (folderId) form.append("folder_id", folderId);
  form.append("is_critical", isCritical ? "true" : "false");
  if (expirationDate) form.append("expiration_date", expirationDate);
  const { data } = await client.post("/files/upload", form);
  return data;
}

export function downloadFileUrl(fileId) {
  return `/files/${fileId}/download`;
}

export async function deleteFile(fileId) {
  await client.delete(`/files/${fileId}`);
}

// --- Trazabilidad (log técnico) ---
export async function listAuditLogs() {
  const { data } = await client.get("/audit-logs");
  return data;
}

// --- Auditorías internas del SG-SST (negocio de SST) ---
export async function listSstAudits() {
  const { data } = await client.get("/sst-audits");
  return data;
}

export async function getSstAudit(auditId) {
  const { data } = await client.get(`/sst-audits/${auditId}`);
  return data;
}

export async function createSstAudit(payload) {
  const { data } = await client.post("/sst-audits", payload);
  return data;
}

export async function updateSstAudit(auditId, payload) {
  const { data } = await client.patch(`/sst-audits/${auditId}`, payload);
  return data;
}

export async function deleteSstAudit(auditId) {
  await client.delete(`/sst-audits/${auditId}`);
}

export async function createFinding(auditId, payload) {
  const { data } = await client.post(
    `/sst-audits/${auditId}/findings`,
    payload
  );
  return data;
}

export async function updateFinding(auditId, findingId, payload) {
  const { data } = await client.patch(
    `/sst-audits/${auditId}/findings/${findingId}`,
    payload
  );
  return data;
}

export async function deleteFinding(auditId, findingId) {
  await client.delete(`/sst-audits/${auditId}/findings/${findingId}`);
}
