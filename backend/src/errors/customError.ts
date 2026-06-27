export class CustomError extends Error {
  status = 500;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "CustomError";
  }
}
