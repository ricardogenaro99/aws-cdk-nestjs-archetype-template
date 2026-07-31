import { Request, Response, Router } from 'express';
import { TaskController } from '../../src/task-manager/infrastructure/controller/TaskController';
import { TaskModule } from '../../src/task-manager/infrastructure/controller/TaskModule';
import { AppModule } from '../../src/task-manager/infrastructure/bootstrap/AppModule';
import { createLocalNestContext } from '../local-bootstrap.helper';

const contextManager = createLocalNestContext('Task Manager', AppModule);

export const initialize = contextManager.initialize;
export const cleanup = contextManager.cleanup;

const taskManagerRouter = (): Router => {
  const router = Router();

  const getController = async (context: any): Promise<any> => {
    return context.select(TaskModule).get(TaskController);
  };

  // POST /tasks
  router.post('/', async (req: Request, res: Response) => {
    try {
      const context = await initialize();
      const controller = await getController(context);
      const result = await controller.createTask(req);
      res.status(201).json({ payload: result });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal local server error', error: error.message });
    }
  });

  // GET /tasks
  router.get('/', async (req: Request, res: Response) => {
    try {
      const context = await initialize();
      const controller = await getController(context);
      const result = await controller.getTasks(req);
      res.status(200).json({ payload: result });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal local server error', error: error.message });
    }
  });

  // GET /tasks/:id
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const context = await initialize();
      const controller = await getController(context);
      const result = await controller.getTask(req);
      res.status(200).json({ payload: result });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal local server error', error: error.message });
    }
  });

  // PUT /tasks/:id
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const context = await initialize();
      const controller = await getController(context);
      const result = await controller.updateTask(req);
      res.status(200).json({ payload: result });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal local server error', error: error.message });
    }
  });

  // DELETE /tasks/:id
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const context = await initialize();
      const controller = await getController(context);
      const result = await controller.deleteTask(req);
      res.status(200).json({ payload: result });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal local server error', error: error.message });
    }
  });

  return router;
};

export const path = '/tasks';
export const router = taskManagerRouter();

export const printHelp = (port: number | string): void => {
  console.log(`👉 Test GET (All):    curl http://localhost:${port}/tasks`);
  console.log(`👉 Test GET (One):    curl http://localhost:${port}/tasks/task-1`);
  console.log(
    `👉 Test POST (Create): curl -X POST http://localhost:${port}/tasks -H "Content-Type: application/json" -d '{"title":"Clean Hexagonal Task","description":"Follow best practices"}'`,
  );
  console.log(
    `👉 Test PUT (Update):  curl -X PUT http://localhost:${port}/tasks/task-1 -H "Content-Type: application/json" -d '{"title":"Refactored title","status":"COMPLETED"}'`,
  );
  console.log(`👉 Test DELETE:       curl -X DELETE http://localhost:${port}/tasks/task-1\n`);
};
