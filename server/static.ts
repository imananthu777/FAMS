import express, { type Express, type Request, type Response, type NextFunction } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Create static middleware but don't apply it globally
  const staticMiddleware = express.static(distPath);

  // Only serve static files for non-API routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Skip static middleware entirely for API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }
    // For all other routes, use static middleware
    staticMiddleware(req, res, next);
  });

  // SPA fallback - serve index.html for non-API routes that don't match files
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Skip for API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }
    // Serve index.html for all other routes
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
