import { RequestDto } from '../../../common/application/dto/RequestDto';
import { InitiateTaskRequest } from '../dto/request/InitiateTaskRequest';

export const buildInitiateTaskPayload = (request: RequestDto): InitiateTaskRequest => {
  const body = request.body as any;
  return {
    payload: body?.payload ?? 'Default Template Archetype Payload',
    shouldFail: !!body?.shouldFail,
  };
};
