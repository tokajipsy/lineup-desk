import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig(({ command }) => {
  return {
    base: command === "build" ? "./" : "/",
    plugins: [react()],
    server: { port: 3000, strictPort: true },
    build: { outDir: "dist" },
  };
});
