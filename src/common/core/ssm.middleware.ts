import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { MiddlewareObj } from '@middy/core';
import { Logger } from '../Logger';

interface SSMOptions {
  region?: string;
}

const logger: Logger = new Logger('ssmMiddleware');
process.env.SSM_IS_LOADED = 'NO';

const ssmMiddleware = (options: SSMOptions = {}): MiddlewareObj => {
  const ssmClient = new SSMClient({ region: options.region });

  const getSSMParameter = async (name: string): Promise<string> => {
    const command = new GetParameterCommand({
      Name: name,
      WithDecryption: true,
    });
    const response = await ssmClient.send(command);
    return response.Parameter?.Value ?? '';
  };

  return {
    before: async () => {
      logger.log('Obteniendo SSM desde variables de entorno');
      const envVars = process.env;

      logger.log(`¿SSM cargado desde AWS?: ${envVars.SSM_IS_LOADED}`);

      if (envVars.SSM_IS_LOADED === 'SI') {
        return;
      }

      const ssmPromises = Object.entries(envVars).map(async ([key, value]) => {
        if (typeof value === 'string' && value.startsWith('ssm:')) {
          logger.debug(`Se encontró el SSM "${key}" con valor "${value}" en variables de entorno.`);
          const ssmName = value.slice(4);
          const ssmValue = await getSSMParameter(ssmName);
          process.env[key] = ssmValue;
        }
      });

      const results = await Promise.allSettled(ssmPromises);

      for (const result of results) {
        if (result.status !== 'fulfilled') {
          logger.error(result.reason);
        }
      }

      if (results.some((result) => result.status !== 'fulfilled')) {
        process.env.SSM_IS_LOADED = 'NO';
        logger.log('No se pudieron cargar todos los SSM desde AWS.');
      } else {
        process.env.SSM_IS_LOADED = 'SI';
        logger.log('Se cargaron todos los SSM desde AWS.');
      }
    },
  };
};

export default ssmMiddleware;
