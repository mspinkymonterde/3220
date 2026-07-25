export class UserFacingError extends Error {
  public readonly ephemeral: boolean;

  public constructor(message: string, ephemeral = true) {
    super(message);
    this.name = 'UserFacingError';
    this.ephemeral = ephemeral;
  }
}
