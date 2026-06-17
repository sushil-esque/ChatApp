export class CustomError extends Error {
  status = 500;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "CustomError";
  }
}
