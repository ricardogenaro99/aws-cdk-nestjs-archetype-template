export interface Task {
  taskId: string;
  payload: string;
  shouldFail: boolean;
  status: 'PENDING' | 'SUCCESS' | 'FAILURE';
  createdAt: string;
}
