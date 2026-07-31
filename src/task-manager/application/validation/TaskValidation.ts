import { Injectable } from '../../../common/Injectable';
import { ValidationException } from '../../../common/core/validation.exception';

@Injectable()
export class TaskValidation {
  public async validateCreateTask(payload: any): Promise<void> {
    if (!payload.title || typeof payload.title !== 'string' || payload.title.trim() === '') {
      throw new ValidationException('V-001', 'El título es obligatorio y debe ser un texto válido.');
    }
  }
}
