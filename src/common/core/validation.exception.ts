import { Logger } from '../Logger';

export class ValidationException extends Error {
  private readonly logger: Logger = new Logger(ValidationException.name);
  code: string;
  messages: string[];

  constructor(code: string, message: string | string[], exception: any = null) {
    super();
    this.code = code;
    this.messages = Array.isArray(message) ? message : [message];
    this.name = 'ValidationException';
    if (exception) {
      this.logger.error(exception);
    }
  }

  throw(condition?: any) {
    if (typeof condition === 'undefined') {
      throw this;
    }
    if (condition instanceof Function) {
      if (condition()) {
        throw this;
      }
    }
    if (condition) {
      throw this;
    }
  }
}
