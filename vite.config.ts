import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// lovable-tagger removed to avoid unwanted branding/injection

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "127.0.0.1",
    port: 8080,
    // Prevent the dev server from serving a default favicon when none is present
    middlewareMode: false,
    fs: {
      // Allow the public folder and the project root so vite can serve index.html and other files.
      allow: [path.resolve(__dirname, "public"), path.resolve(__dirname)]
    },
    // Proxy /api requests to the backend server during development
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    },
    // Custom middleware to intercept favicon requests and return 204
    setup: (app: any) => {
      app.use((req: any, res: any, next: any) => {
        if (req.url === '/favicon.ico') {
          res.statusCode = 204;
          return res.end();
        }
        next();
      });
    },
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
