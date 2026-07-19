import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eventSourceMiddleware, requestMiddleware, ssmMiddleware } from '../../../common/core';
import { createInstrumentedWrapper, sanitizeCircularPayload } from '../../../common/core/lambda-bootstrap.helper';
import handleRequest from './HandlerCore';
import { getAppContext } from './helpers/AppContextHelper';

const bootstrap = async (
  event: APIGatewayProxyEvent & { source: string; payload: unknown; action?: string },
  _context: unknown,
): Promise<APIGatewayProxyResult> => {
  const contextRef = await getAppContext();

  const action = event.action || '';
  sanitizeCircularPayload(event.payload);

  return handleRequest(contextRef, action) as any;
};

const wrapper = createInstrumentedWrapper(bootstrap, [requestMiddleware, ssmMiddleware, eventSourceMiddleware]);

export const handler = wrapper;
