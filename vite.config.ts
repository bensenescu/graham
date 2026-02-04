import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

const demoModeLocalOnly = process.env.DEMO_MODE_LOCAL_ONLY === "true";

export default defineConfig({
  server: {
    port: 3001,
  },
  define: demoModeLocalOnly
    ? {
        "import.meta.env.VITE_DEMO_MODE_LOCAL_ONLY": JSON.stringify("true"),
        "import.meta.env.VITE_APP_ID": JSON.stringify("graham"),
      }
    : undefined,
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tsConfigPaths(),
    tanstackStart(),
    viteReact(),
    tailwindcss(),
  ],
});
