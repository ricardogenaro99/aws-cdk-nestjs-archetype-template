export type HttpStructure = { code: number; message: string };
export type HttpConstant = Record<string, HttpStructure>;

export const HTTP_CONSTANT: HttpConstant = {
  OK_STATUS: { code: 200, message: 'OK' },
  CREATED_STATUS: { code: 201, message: 'CREATED' },
  NO_CONTENT_STATUS: { code: 204, message: 'NO CONTENT' },
  BAD_REQUEST_STATUS: { code: 400, message: 'BAD REQUEST' },
  UNAUTHORIZED_STATUS: { code: 401, message: 'UNAUTHORIZED' },
  FORBIDDEN_STATUS: { code: 403, message: 'FORBIDDEN' },
  NOT_FOUND_STATUS: { code: 404, message: 'NOT FOUND' },
  UNPROCESSABLE_ENTITY_STATUS: { code: 422, message: 'UNPROCESSABLE ENTITY' },
  INTERNAL_SERVER_ERROR_STATUS: { code: 500, message: 'INTERNAL SERVER ERROR' },
  BAD_GATEWAY_STATUS: { code: 502, message: 'BAD GATEWAY' },
  GATEWAY_TIMEOUT_STATUS: { code: 504, message: 'GATEWAY TIMEOUT' },
};
