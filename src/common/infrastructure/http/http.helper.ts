import { Injectable } from '../../Injectable';
import { Logger } from '../../Logger';
import CustomException from '../../application/exception/CustomException';

export interface HttpRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
}

@Injectable()
export class HttpHelper {
  private readonly logger = new Logger(HttpHelper.name);

  public async get<T>(url: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('GET', url, undefined, options);
  }

  public async post<T>(url: string, body: any, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('POST', url, body, options);
  }

  public async put<T>(url: string, body: any, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('PUT', url, body, options);
  }

  public async delete<T>(url: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('DELETE', url, undefined, options);
  }

  private async request<T>(method: string, url: string, body?: any, options?: HttpRequestOptions): Promise<T> {
    this.logger.log(`HTTP Request: ${method} ${url}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options?.timeout ?? 10000);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`HTTP Request failed: ${response.status} - ${errorText}`);
        throw new CustomException({
          code: 'HTTP_ERROR',
          message: `HTTP Request to ${url} failed with status ${response.status}`,
          httpStatus: response.status,
        });
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return (await response.json()) as T;
      }
      return (await response.text()) as unknown as T;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        this.logger.error(`HTTP Request timeout: ${method} ${url}`);
        throw new CustomException({
          code: 'HTTP_TIMEOUT',
          message: `HTTP Request to ${url} timed out`,
          httpStatus: 408,
        });
      }
      throw error;
    }
  }
}
