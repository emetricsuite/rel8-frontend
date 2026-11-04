import fs from "node:fs";
import path from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
// ----- client packs: see src/clients/types.ts -----
const clientKey = process.env.VITE_CLIENT || loadEnv(process.env.NODE_ENV === "production" ? "production" : "development", process.cwd(), "VITE_").VITE_CLIENT || "rel8";
const clientDir = path.resolve(__dirname, "src/clients", clientKey);
if (!fs.existsSync(clientDir)) throw new Error(`Unknown VITE_CLIENT "${clientKey}"`);
const clientPack = JSON.parse(fs.readFileSync(path.join(clientDir, "client.json"), "utf8"));
const clientPublic = path.join(clientDir, "public");

// Rel8's purple is written literally across the source, so a pack swaps it at build time.
const REL8_SCALE: Record<string, string> = {"50":"#F8E6FB","500":"#B44FD0","700":"#7F02A2"};
const colourSwaps = clientPack.palette
  ? Object.entries(REL8_SCALE).map(([step, hex]) => [new RegExp(hex, "gi"), clientPack.palette[step]] as const)
  : [];

const clientPlugin = (): Plugin => ({
  name: "client-pack",
  // On the finished output, not the source: Tailwind reads classes like bg-[#7F02A2] from the
  // files on disk, so changing them earlier would leave the new class with no CSS behind it.
  // Here the class name, its selector and its value all change together. Builds only, so
  // `vite dev` still shows the Rel8 purple; use a build and `vite preview` to see a pack's colours.
  generateBundle(_options, bundle) {
    if (!colourSwaps.length) return;
    const swap = (text: string) => colourSwaps.reduce((out, [from, to]) => out.replace(from, to), text);
    for (const file of Object.values(bundle)) {
      if (file.type === "chunk") file.code = swap(file.code);
      else if (file.fileName.endsWith(".css") && typeof file.source === "string") file.source = swap(file.source);
    }
  },
  transformIndexHtml(html) {
    if (!clientPack.standalone) return html;
    return html.replace(/<title>.*<\/title>/, `<title>${clientPack.name}</title>`);
  },
});

export default defineConfig({
  plugins: [clientPlugin(), react()],
  publicDir: fs.existsSync(clientPublic) ? clientPublic : "public",
  resolve: {
    alias: { "@client": path.join(clientDir, "index.ts") },
  },
  server: {
    host: "0.0.0.0",
    port: 4000,
  },
});
