import { MiddlewareObj } from '@middy/core';
import { APIGatewayProxyEvent, EventBridgeEvent, S3Event, SNSEvent, SQSEvent } from 'aws-lambda';

import { Logger } from '../Logger';
import { inspect } from 'node:util';
import { BusinessException } from './business.exception';
import { EXCEPTION_CONSTANT } from './exceptions.constant';
import { HTTP_CONSTANT } from './http.constant';
import { TYPES } from './types.util';
import { ValidationException } from './validation.exception';

enum EVENT_SOURCE {
  API_GATEWAY = 'API Gateway',
  S3 = 'S3',
  SNS = 'SNS',
  SQS = 'SQS',
  EVENT_BRIDGE = 'EventBridge',
  STEP_FUNCTIONS = 'Step Functions',
  LAMBDA = 'Lambda',
}

type EventSourceMiddlewareOptions = {
  region?: string;
  source?: EVENT_SOURCE;
  passthrough?: boolean;
};

type APIGatewayPayload = {
  body: any;
  pathParameters: Record<string, any> | null;
  query: Record<string, any> | null;
  headers: Record<string, any>;
  path: string;
  method: string;
  action: string;
};
type S3Payload = Array<{ bucket: string; key: string; eventName: string }>;
type SNSPayload = Array<{
  message: string;
  messageAttributes: Record<string, any>;
}>;
type SQSPayload = Array<{
  messageId: string;
  body: string;
  attributes: Record<string, any>;
}>;
type EventBridgePayload = Record<string, any>;
type StepFunctionsPayload = Record<string, any>;
type LambdaPayload = Record<string, any>;

type TPayload =
  APIGatewayPayload | S3Payload | SNSPayload | SQSPayload | EventBridgePayload | StepFunctionsPayload | LambdaPayload;

const logger: Logger = new Logger('EventSourceMiddleware');

const eventSourceMiddleware = (options: EventSourceMiddlewareOptions = {}): MiddlewareObj => {
  const isApiGatewayRestWrapper = (event: any) => event?.origin === 'API_GATEWAY_REST_EVENT';
  const isApiGatewayAdapter = (event: any) => Boolean(event?.action && event?.body !== undefined);
  const isApiGatewayProxy = (event: any) => Boolean(event?.httpMethod);

  const isS3Event = (event: any) => event?.Records?.[0]?.eventSource === 'aws:s3';
  const isSnsEvent = (event: any) => event?.Records?.[0]?.EventSource === 'aws:sns';
  const isSqsEvent = (event: any) => event?.Records?.[0]?.eventSource === 'aws:sqs';

  const isEventBridgeEvent = (event: any) => Boolean(event?.['detail-type']);
  const isLambdaEvent = (event: any) => Boolean(event?.action);

  const identifyEventSource = (event: any): EVENT_SOURCE => {
    if (isApiGatewayRestWrapper(event) || isApiGatewayAdapter(event) || isApiGatewayProxy(event)) {
      return EVENT_SOURCE.API_GATEWAY;
    }
    if (isS3Event(event)) {
      return EVENT_SOURCE.S3;
    }
    if (isSnsEvent(event)) {
      return EVENT_SOURCE.SNS;
    }
    if (isSqsEvent(event)) {
      return EVENT_SOURCE.SQS;
    }
    if (isEventBridgeEvent(event)) {
      return EVENT_SOURCE.EVENT_BRIDGE;
    }
    if (isLambdaEvent(event)) {
      return EVENT_SOURCE.LAMBDA;
    }
    return EVENT_SOURCE.STEP_FUNCTIONS;
  };

  const extractPayload = (event: any): TPayload => {
    const source = identifyEventSource(event);
    switch (source) {
      case EVENT_SOURCE.API_GATEWAY:
        return {
          body:
            (event as any).body ?? ((event as APIGatewayProxyEvent).body ? (event as APIGatewayProxyEvent).body : {}),
          pathParameters: (event as APIGatewayProxyEvent).pathParameters,
          query: (event as any).query ?? (event as APIGatewayProxyEvent).queryStringParameters,
          headers: (event as APIGatewayProxyEvent).headers,
          path: (event as APIGatewayProxyEvent).path,
          method: (event as APIGatewayProxyEvent).httpMethod,
          action: (event as any).action,
        };
      case EVENT_SOURCE.S3:
        return (event as S3Event).Records.map((record) => ({
          bucket: record.s3.bucket.name,
          key: record.s3.object.key,
          eventName: record.eventName,
        }));
      case EVENT_SOURCE.SNS:
        return (event as SNSEvent).Records.map((record) => ({
          message: record.Sns.Message,
          messageAttributes: record.Sns.MessageAttributes,
        }));
      case EVENT_SOURCE.SQS:
        return (event as SQSEvent).Records.map((record) => ({
          messageId: record.messageId,
          body: record.body,
          attributes: record.attributes,
        }));
      case EVENT_SOURCE.EVENT_BRIDGE:
        return (event as EventBridgeEvent<any, any>).detail;
      case EVENT_SOURCE.STEP_FUNCTIONS:
      case EVENT_SOURCE.LAMBDA:
        return { action: event.action, payload: event.payload };
      default:
        return event;
    }
  };

  return {
    before: async (handler: { event: any }) => {
      const event = handler.event;
      const source = options.source || identifyEventSource(event);
      const payload = extractPayload(event);

      if (!event.payload) {
        handler.event.source = source;
        handler.event.payload = payload;
      }
    },
    after: async (handler: any) => {
      if (handler.event.source === EVENT_SOURCE.API_GATEWAY) {
        const action = handler.event.action ?? handler.event.payload?.action;
        const payload: any = {};

        const normalized = handler.event.payload ?? handler.event;

        payload.headers = normalized.headers ?? handler.event.headers;
        payload.path = normalized.path ?? handler.event.path;
        const bodyCandidate = (normalized as any).body ?? normalized;
        payload.body = bodyCandidate?.payload ?? bodyCandidate;
        payload.query = normalized.query ?? handler.event.query;
        payload.httpMethod = normalized.method ?? handler.event.httpMethod;

        const exception = new ValidationException(
          EXCEPTION_CONSTANT.REQUEST_HANDLER_EXCEPTION.code,
          EXCEPTION_CONSTANT.REQUEST_HANDLER_EXCEPTION.message,
        );

        exception.throw(!action);
        const functionToExecute = handler.response[action];
        exception.throw(!functionToExecute);

        const data = await handler.response[action](payload);
        handler.response = JSON.stringify({ payload: data });
      }
    },
    onError: async (handler: any) => {
      if (handler.event.source === EVENT_SOURCE.API_GATEWAY) {
        logger.error('ApiGatewayEvent - Error Response');

        try {
          logger.debug({ msg: 'onError - error type', type: typeof handler.error });
          logger.debug({
            msg: 'onError - error inspect',
            errorInspect: inspect(handler.error, { showHidden: true, depth: null }),
          });
        } catch (e) {
          logger.debug('onError - error inspect failed');
        }

        logger.error(handler.error);

        try {
          if (handler.error instanceof Error) {
            logger.error({ msg: 'onError - error.message', message: handler.error.message });
            logger.error({ msg: 'onError - error.stack', stack: handler.error.stack });
          } else if (handler.error && typeof handler.error === 'object') {
            const ownProps = Object.getOwnPropertyNames(handler.error || {});
            logger.debug({ msg: 'onError - error own properties', ownProps });
          } else {
            logger.debug({ msg: 'onError - unhandled error type', type: typeof handler.error });
          }
        } catch (e) {
          logger.debug('onError - additional error inspection failed');
        }

        const error = {
          ...handler.error,
        };
        delete error.name;
        if (handler.error instanceof BusinessException) {
          error.httpStatus = HTTP_CONSTANT.UNPROCESSABLE_ENTITY_STATUS.code;
        } else if (handler.error instanceof ValidationException) {
          error.httpStatus = HTTP_CONSTANT.BAD_REQUEST_STATUS.code;
        } else if (TYPES.isEmpty(error.httpStatus)) {
          error.httpStatus = HTTP_CONSTANT.INTERNAL_SERVER_ERROR_STATUS.code;
        }

        handler.error = JSON.stringify({ error });
        return Promise.resolve();
      }
    },
  };
};

export default eventSourceMiddleware;
export { EVENT_SOURCE, TPayload };
