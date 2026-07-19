import '../src/common/supports/LogContext';
import * as dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import 'reflect-metadata';
import { logContextStorage } from '../src/common/supports/LogContext';

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

let appContext: any = null;
let isInitializing = false;

// Inicializar el contexto de NestJS para el modulo Task Manager
const initializeNestContext = async () => {
  if (appContext) {
    return appContext;
  }

  if (isInitializing) {
    while (isInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return appContext;
  }

  try {
    isInitializing = true;
    console.log('🔄 Inicializando NestJS (Task Manager)...');

    const { NestFactory } = require('@nestjs/core');
    const { AppModule } = require('../src/task-manager/infrastructure/bootstrap/AppModule');
    const { CustomLoggerSupport } = require('../src/common/application/supports/CustomLoggerSupport');

    appContext = await NestFactory.createApplicationContext(AppModule, {
      logger: new CustomLoggerSupport('TaskManager'),
    });

    console.log('✅ NestJS (Task Manager) inicializado correctamente');
    isInitializing = false;
    return appContext;
  } catch (error: any) {
    isInitializing = false;
    console.error('❌ Error inicializando NestJS:', error.message);
    throw error;
  }
};

// Route matching for POST /tasks
app.post('/tasks', async (req: Request, res: Response) => {
  try {
    const context = await initializeNestContext();
    const { TaskModule } = require('../src/task-manager/infrastructure/controller/TaskModule');
    const { TaskController } = require('../src/task-manager/infrastructure/controller/TaskController');

    const controller = context.select(TaskModule).get(TaskController);

    const result = await controller.initiateTask(req);
    res.status(201).json({ payload: result });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal local server error', error: error.message });
  }
});

// Route matching for GET /tasks
app.get('/tasks', async (req: Request, res: Response) => {
  try {
    const context = await initializeNestContext();
    const { TaskModule } = require('../src/task-manager/infrastructure/controller/TaskModule');
    const { TaskController } = require('../src/task-manager/infrastructure/controller/TaskController');

    const controller = context.select(TaskModule).get(TaskController);

    const result = await controller.getStatus(req);
    res.status(200).json({ payload: result });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal local server error', error: error.message });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  const bootstrapId = `REQ-${Date.now()}`;
  logContextStorage.run({ requestId: bootstrapId }, async () => {
    try {
      await initializeNestContext();

      app.listen(PORT, () => {
        console.log(`🚀 Local test server running on http://localhost:${PORT}`);
        console.log(`👉 Test GET:  curl http://localhost:${PORT}/tasks`);
        console.log(
          `👉 Test POST: curl -X POST http://localhost:${PORT}/tasks -H "Content-Type: application/json" -d '{"payload":"My local test payload"}'\n`,
        );
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
  if (appContext) {
    await appContext.close();
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
