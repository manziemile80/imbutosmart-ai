import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, type PluginOption } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Standard TanStack Start setup. `nitro` is build-only: on Vercel it emits the
// Build Output API (`.vercel/output`) via the `vercel` preset, everywhere else a
// portable Node server bundle (`node-server`, `.output`). `NITRO_PRESET`
// overrides the automatic choice to target any other host.
export default defineConfig(async ({ command }) => {
  const plugins: PluginOption[] = [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    tanstackStart({ server: { entry: "server" } }),
  ];

  if (command === "build") {
    const { nitro } = await import("nitro/vite");
    const preset = process.env["NITRO_PRESET"] ?? (process.env["VERCEL"] ? "vercel" : "node-server");
    plugins.push(nitro({ preset }));
  }

  plugins.push(viteReact());

  return {
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    plugins,
  };
});
