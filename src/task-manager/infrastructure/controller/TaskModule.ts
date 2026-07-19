import { Module } from '@nestjs/common';
import { TaskController } from './TaskController';
import { TaskValidation } from '../../application/validation/TaskValidation';
import { TaskService } from '../../application/TaskService';
import { TaskDomainService } from '../../domain/service/TaskDomainService';
import { TaskAwsRepository } from '../repository/TaskAwsRepository';

@Module({
  controllers: [TaskController],
  providers: [
    TaskValidation,
    TaskService,
    TaskDomainService,
    {
      provide: 'TaskRepository',
      useClass: TaskAwsRepository,
    },
  ],
})
export class TaskModule {}
