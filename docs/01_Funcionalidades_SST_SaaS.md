# 🚀 Funcionalidades del SaaS de SST (Estructura del Producto)

## 1. Módulo Core: Arquitectura Multi-Tenant (Segmentación por Cliente)
- **Aislamiento de Portafolios:** El Gestor/Independiente maneja múltiples empresas, pero los datos, carpetas y archivos de la "Empresa A" jamás se pueden mezclar ni visualizar desde el espacio de la "Empresa B".
- **Estructura de Roles de Operación:**
  - `SuperAdmin` (Tú/El Dueño del Software): Controla quién tiene acceso a la plataforma, activa los accesos de los gestores y monitorea el espacio total en disco del servidor.
  - `Gestor SST / Profesional Independiente` (El cliente principal de tu app): Es el usuario encargado de crear los portafolios de las empresas que asesora. Tiene control total para crear subcarpetas, subir fotos de evidencias y organizar los archivos de SST de sus clientes.
  - `Empresa Cliente (Vista de Auditoría)`: Un acceso opcional de "Solo Lectura" para que el dueño de la empresa asesorada entre a revisar su portafolio, descargue sus certificados y verifique que el Gestor SST tiene todo al día ante una inspección legal.

## 2. Sistema de Archivos y Portafolio Dinámico (Document Cloud SST)
- **Carpetas Raíz Fijas:** El sistema genera automáticamente las carpetas obligatorias por ley de SST al registrar la empresa (ej. *Matriz de Riesgos*, *Exámenes Médicos*, *Capacitaciones*).
- **Subcarpetas Infinitas:** Capacidad de crear subdirectorios dentro de las carpetas raíz (`Carpeta > Subcarpeta > Archivo`).
- **Gestión de Archivos:** Soporte para PDF, imágenes (PNG, JPG) y documentos (DOCX, XLSX).
- **Visualizador Integrado:** Previsualización de PDFs y fotos directamente en la interfaz de Angular sin necesidad de descargar el archivo.

## 3. Seguridad y Trazabilidad
- **Autenticación Segura:** Login mediante tokens JWT con expiración automática.
- **Historial de Auditoría:** Registro de qué usuario subió, eliminó o descargó un documento específico, guardando fecha, hora e IP.
