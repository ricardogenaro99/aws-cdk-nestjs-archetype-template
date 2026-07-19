import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CustomLoggerSupport } from '../../../../common/application/supports';
import { AppModule } from '../AppModule';

let appContext: INestApplicationContext;

export const getAppContext = async (): Promise<INestApplicationContext> => {
  if (!appContext) {
    appContext = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });
    appContext.useLogger(new CustomLoggerSupport('task-manager-api'));
  }

  return appContext;
};

export const resetAppContext = (): void => {
  appContext = null as any;
};
