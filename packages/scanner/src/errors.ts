export class RepositoryTooLargeError extends Error {
  constructor(message = "Repository exceeds the safety limits for static analysis.") {
    super(message);
    this.name = "RepositoryTooLargeError";
  }
}
