import { Module } from '@nestjs/common';
import { TaskModule } from '../controller/TaskModule';

const modules = [TaskModule];

@Module({
  imports: [...modules],
})
export class AppModule {}
