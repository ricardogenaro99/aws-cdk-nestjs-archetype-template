export class RequestDto {
  payload: object;
  query: object;
  path: object;
  user: User | null;
  trace: object;
  body: object;
}

interface User {
  username: string;
}
