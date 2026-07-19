import middy from '@middy/core';
import { logContextStorage } from '../application/supports/LogContext';

type MiddyHandler = ReturnType<typeof middy>;
type MiddlewareFactory = () => Parameters<MiddyHandler['use']>[0];

export const sanitizeCircularPayload = (value: unknown): unknown => {
  const visited = new WeakSet();

  const visitNode = (node: unknown): unknown => {
    if (!node || typeof node !== 'object') {
      return node;
    }

    const reference = node as object;
    if (visited.has(reference)) {
      return '[Circular]';
    }

    visited.add(reference);

    if (Array.isArray(node)) {
      for (let index = 0; index < node.length; index += 1) {
        node[index] = visitNode(node[index]);
      }
    } else {
      const recordNode = node as Record<string, unknown>;
      for (const property of Object.keys(recordNode)) {
        recordNode[property] = visitNode(recordNode[property]);
      }
    }

    visited.delete(reference);

    return node;
  };

  return visitNode(value);
};

export const createInstrumentedWrapper = (
  handler: Parameters<typeof middy>[0],
  middlewareFactories: MiddlewareFactory[],
) => {
  const wrappedHandler = async (event: any, context: any) => {
    const requestId = context?.awsRequestId || event?.requestId || event?.payload?.requestId || 'NO_REQUEST_ID';
    return logContextStorage.run({ requestId }, () => (handler as any)(event, context));
  };

  const pipeline = middlewareFactories.reduce(
    (wrappedHandler, buildMiddleware) => wrappedHandler.use(buildMiddleware()),
    (middy as any)(wrappedHandler),
  );

  return pipeline;
};
