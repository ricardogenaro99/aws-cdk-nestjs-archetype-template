import { Injectable } from '../../../common/Injectable';
import { ValidationException } from '../../../common/core/validation.exception';

@Injectable()
export class TaskValidation {
  public async validarInitiateTask(payload: any): Promise<void> {
    if (payload.shouldFail !== undefined && typeof payload.shouldFail !== 'boolean') {
      throw new ValidationException('V-001', 'shouldFail debe ser un booleano');
    }
  }
}
