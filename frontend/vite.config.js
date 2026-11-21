import { defineConfig } from "vite"; // Import Vite's configuration helper.
export default defineConfig({ // Keep the development setup small.
  server: { host: "127.0.0.1", port: 5173, strictPort: true, proxy: { "/api": "http://127.0.0.1:8000" } }, // Forward API calls to FastAPI.
  preview: { proxy: { "/api": "http://127.0.0.1:8000" } }, // Let the built preview use the backend too.
}); // Finish the configuration.
