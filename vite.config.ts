import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { readFile } from "node:fs/promises";

// The Node API (server/) runs on :4000; the dev server forwards API and upload requests to it.
const apiProxy = {
  "/robots.txt": {
    target: "http://localhost:4000",
    rewrite: () => "/api/robots.txt",
  },
  "/sitemap.xml": {
    target: "http://localhost:4000",
    rewrite: () => "/api/sitemap.xml",
  },
  "/api": "http://localhost:4000",
  "/uploads": "http://localhost:4000",
};

export default defineConfig({
  plugins: [
    react(),
    {
      name: "storefront-html",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const path = req.url ?? "/";
          if (
            req.method !== "GET" ||
            !req.headers.accept?.includes("text/html") ||
            /^\/(api|src|@|node_modules|uploads|images|videos|assets)/.test(
              path,
            )
          )
            return next();
          try {
            if (path.split("?")[0] === "/product/imperium-2") {
              res.statusCode = 301;
              res.setHeader("Location", "/product/imperium");
              res.end();
              return;
            }
            const responses = await Promise.all([
              fetch("http://localhost:4000/api/products"),
              fetch("http://localhost:4000/api/store"),
            ]);
            if (responses.some((response) => !response.ok)) return next();
            const [{ products }, store] = await Promise.all(
              responses.map((response) => response.json()),
            );
            const module = await server.ssrLoadModule("/src/entry-server.tsx");
            const origin = `http://${req.headers.host}`;
            const rendered = await module.renderPage(
              path,
              products,
              store,
              origin,
            );
            let template = await readFile(
              new URL("./index.html", import.meta.url),
              "utf8",
            );
            template = await server.transformIndexHtml(path, template);
            res.statusCode = rendered.status;
            res.setHeader("Content-Type", "text/html");
            res.end(
              template
                .replace(/<title>[\s\S]*?<\/title>/, "")
                .replace(/<meta name="description"[^>]*\/>/, "")
                .replace("</head>", rendered.head + "</head>")
                .replace(
                  '<div id="root"></div>',
                  `<div id="root">${rendered.html}</div>${rendered.bootstrap}`,
                ),
            );
          } catch (error) {
            server.ssrFixStacktrace(error as Error);
            next(error);
          }
        });
      },
    },
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: apiProxy,
    // The API lives in server/ — don't watch it (uploads being written there crashed the watcher on Windows).
    watch: { ignored: ["**/server/**"] },
  },
  preview: { proxy: apiProxy },
});
