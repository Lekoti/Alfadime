import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    root: "src/renderer",
    base: "./",
    plugins: [react()],
    css: {
        lightningcss: false
    },
    server: {
        host: "127.0.0.1",
        port: 5173,
        strictPort: true,
        origin: "http://127.0.0.1:5173"
    },
    build: {
        outDir: "../../dist/renderer",
        emptyOutDir: true
    }
});
