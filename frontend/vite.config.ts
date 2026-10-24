import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
<<<<<<< Updated upstream
=======
  optimizeDeps: { include: ['pannellum'] },
  // В разработке API отдаёт FastAPI на :8000; в Docker тот же путь проксирует nginx.
  server: { proxy: { '/api': 'http://127.0.0.1:8000' } },
>>>>>>> Stashed changes
});
