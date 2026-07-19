import { MiddlewareObj } from '@middy/core';
import { Logger } from '../Logger';

const requestMiddleware = (): MiddlewareObj => {
  return {
    before: async (handler) => {
      const { context } = handler;
      const logger: Logger = new Logger('RequestMiddleware', context);
      logger.log('RequestMiddleware: loaded context');
    },
  };
};

export default requestMiddleware;
