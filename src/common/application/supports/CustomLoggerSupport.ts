import { LoggerService } from '@nestjs/common';
import { logContextStorage } from './LogContext';

export class CustomLoggerSupport implements LoggerService {
  contextLog: string;
  contextRequest?: object;
  constructor(contextLog = '', contextRequest?: any) {
    if (!process.env.AWS_REQUEST_ID && contextRequest) {
      process.env.AWS_REQUEST_ID = contextRequest?.awsRequestId;
    }
    this.contextLog = contextLog;
    this.contextRequest = contextRequest;
  }
  log(message: string | object, ...optionalParams: any[]) {
    process.stdout.write(this.formatLog('INFO', message, this.contextLog, this.contextRequest, ...optionalParams));
  }
  info(message: string | object, ...optionalParams: any[]) {
    this.log(message, ...optionalParams);
  }
  fatal(message: string | object, ...optionalParams: any[]) {
    process.stderr.write(this.formatLog('FATAL', message, this.contextLog, this.contextRequest, ...optionalParams));
  }
  error(message: string | object, ...optionalParams: any[]) {
    process.stderr.write(this.formatLog('ERROR', message, this.contextLog, this.contextRequest, ...optionalParams));
  }
  warn(message: string | object, ...optionalParams: any[]) {
    process.stdout.write(this.formatLog('WARN', message, this.contextLog, this.contextRequest, ...optionalParams));
  }
  debug(message: string | object, ...optionalParams: any[]) {
    process.stdout.write(this.formatLog('DEBUG', message, this.contextLog, this.contextRequest, ...optionalParams));
  }
  verbose(message: string | object, ...optionalParams: any[]) {
    process.stdout.write(this.formatLog('VERBOSE', message, this.contextLog, this.contextRequest, ...optionalParams));
  }
  formatLog(
    level: string,
    message: string | object,
    context?: string,
    contextRequest?: any,
    ...optionalParams: any[]
  ): string {
    const timestamp = new Date().toISOString();
    context = context ? `[${context}] ` : '';

    // Recuperar el Request ID desde AsyncLocalStorage como prioridad
    const store = logContextStorage.getStore();
    const contextRequestId =
      contextRequest?.awsRequestId || store?.requestId || process.env.AWS_REQUEST_ID || 'NO_REQUEST_ID';

    const formattedMessage =
      typeof message === 'object' ? JSON.stringify(message) : message?.trim()?.replace(/\n/g, '\r');
    const traceLog = `${timestamp} ${contextRequestId} ${level} - ${context}`;

    return `${traceLog}${formattedMessage}\n`;
  }
}
