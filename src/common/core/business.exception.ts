import { AppException } from '../application/exception/AppException';

export class BusinessException extends AppException {
  constructor(code: string, message: string, exception?: Error) {
    super(message, exception, code);
    this.name = 'BusinessException';
  }
}
