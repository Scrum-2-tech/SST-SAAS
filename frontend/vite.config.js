import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// El backend (FastAPI) solo permite CORS desde http://localhost:4200,
// por eso forzamos el dev server de Vite a ese puerto.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4200,
    host: "localhost",
    strictPort: true,
  },
});
