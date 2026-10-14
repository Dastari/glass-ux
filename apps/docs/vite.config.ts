import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { glassUx } from "glass-ux/vite";
export default defineConfig({
  base: process.env.GLASS_UX_BASE ?? "/",
  publicDir: "../../public",
  plugins: [react(), tailwind(), glassUx()],
  server: { host: "127.0.0.1", port: 4220, strictPort: true },
});
