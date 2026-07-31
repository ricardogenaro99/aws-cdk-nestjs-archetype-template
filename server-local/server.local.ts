/* eslint-disable @typescript-eslint/no-require-imports */
import '../src/common/supports/LogContext';
import * as dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import 'reflect-metadata';
import { logContextStorage } from '../src/common/supports/LogContext';
import * as fs from 'fs';
import * as path from 'path';

const app = express();
app.use(express.json());

// Middleware to assign a unique request ID to each HTTP request
app.use((req: Request, res: Response, next) => {
  const requestId =
    (req.headers['x-request-id'] as string) ||
    `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  logContextStorage.run({ requestId }, next);
});

console.log('⏳ Preparando servidor...');

// Define local module interface structure
interface LocalModule {
  path: string;
  router: any;
  initialize: () => Promise<any>;
  cleanup: () => Promise<void>;
  printHelp: (port: number | string) => void;
  fileName: string;
}

const loadedModules: LocalModule[] = [];

// Scan and load modules dynamically
const modulesDir = path.join(__dirname, 'modules');
if (fs.existsSync(modulesDir)) {
  const files = fs.readdirSync(modulesDir);
  for (const file of files) {
    if (file.endsWith('.local.ts') || file.endsWith('.local.js')) {
      try {
        const modulePath = path.join(modulesDir, file);
        const module = require(modulePath);

        if (module.path && module.router && module.initialize && module.cleanup && module.printHelp) {
          app.use(module.path, module.router);
          loadedModules.push({
            path: module.path,
            router: module.router,
            initialize: module.initialize,
            cleanup: module.cleanup,
            printHelp: module.printHelp,
            fileName: file,
          });
          console.log(`📦 Módulo cargado dinámicamente: ${file} en ${module.path}`);
        } else {
          console.warn(`⚠️ Archivo ${file} no exporta la interfaz completa del módulo local.`);
        }
      } catch (err: any) {
        console.error(`❌ Error cargando módulo local ${file}:`, err.message);
      }
    }
  }
} else {
  console.warn(`⚠️ Directorio de módulos no encontrado en: ${modulesDir}`);
}

// Start Server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  const bootstrapId = `REQ-${Date.now()}`;
  logContextStorage.run({ requestId: bootstrapId }, async () => {
    try {
      // Pre-initialize all loaded modules
      for (const module of loadedModules) {
        await module.initialize();
      }

      app.listen(PORT, () => {
        console.log(`\n🚀 Local test server running on http://localhost:${PORT}`);
        // Print help instructions for all loaded modules
        for (const module of loadedModules) {
          console.log(`--- [Módulo: ${module.fileName}] ---`);
          module.printHelp(PORT);
        }
      });
    } catch (error: any) {
      console.error('❌ Error fatal al iniciar:', error.message);
      process.exit(1);
    }
  });
};

// Graceful shutdown
const shutdown = async () => {
  console.log('\n⏳ Cerrando servidor...');
  for (const module of loadedModules) {
    try {
      await module.cleanup();
    } catch (err: any) {
      console.error(`❌ Error en cleanup de ${module.fileName}:`, err.message);
    }
  }
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Iniciar
startServer().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
