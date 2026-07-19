export class AppException extends Error {
  private readonly code: string;
  constructor(message: string, exception?: Error, code: string = '0000') {
    super();
    if (!code || !message) {
      throw new Error('AppException - Code and message are required');
    }

    this.code = code;
    this.message = message;
    this.name = 'AppException';
  }

  throw(condition: any) {
    const appException = this;
    if (typeof condition === 'undefined') {
      throw appException;
    }
    if (condition instanceof Function) {
      if (condition()) {
        throw appException;
      }
    }
    if (condition) {
      throw appException;
    }
  }
}
