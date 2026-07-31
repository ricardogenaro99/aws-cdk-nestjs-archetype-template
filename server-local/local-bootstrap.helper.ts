import { NestFactory } from '@nestjs/core';
import { CustomLoggerSupport } from '../src/common/application/supports/CustomLoggerSupport';

export const createLocalNestContext = (moduleName: string, appModule: any) => {
  let appContext: any = null;
  let isInitializing = false;

  const initializeContext = async () => {
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
      console.log(`🔄 Inicializando NestJS (${moduleName})...`);

      appContext = await NestFactory.createApplicationContext(appModule, {
        logger: new CustomLoggerSupport(moduleName.replace(/\s+/g, '')),
      });

      console.log(`✅ NestJS (${moduleName}) inicializado correctamente`);
      isInitializing = false;
      return appContext;
    } catch (error: any) {
      isInitializing = false;
      console.error(`❌ Error inicializando NestJS (${moduleName}):`, error.message);
      throw error;
    }
  };

  const closeContext = async () => {
    if (appContext) {
      await appContext.close();
    }
  };

  return {
    initialize: initializeContext,
    cleanup: closeContext,
  };
};
