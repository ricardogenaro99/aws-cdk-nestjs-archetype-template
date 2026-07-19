import { AsyncLocalStorage } from 'node:async_hooks';

export const logContextStorage = new AsyncLocalStorage<{ requestId: string }>();

// Save references to original console functions
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

/**
 * Formats a message for the console, injecting the Request ID from AsyncLocalStorage context or environment.
 */
const formatConsoleMessage = (level: string, args: any[]): string => {
  const store = logContextStorage.getStore();
  const requestId = store?.requestId || process.env.AWS_REQUEST_ID || 'NO_REQUEST_ID';
  const timestamp = new Date().toISOString();

  const message = args
    .map((arg) => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
    })
    .join(' ');

  return `${timestamp} ${requestId} ${level} - ${message}`;
};

// Override global console functions to inject the contextual Request ID
console.log = (...args: any[]) => {
  originalConsoleLog(formatConsoleMessage('INFO', args));
};
console.info = (...args: any[]) => {
  originalConsoleInfo(formatConsoleMessage('INFO', args));
};
console.warn = (...args: any[]) => {
  originalConsoleWarn(formatConsoleMessage('WARN', args));
};
console.error = (...args: any[]) => {
  originalConsoleError(formatConsoleMessage('ERROR', args));
};
