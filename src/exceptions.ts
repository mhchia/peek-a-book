// To workaround for the issue that "isinstance is borken when class extends `Error` type,
// we need to override `constructor` to set prototype for each error.
//  - https://github.com/Microsoft/TypeScript/issues/13965
//  - https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
class BasePeekABookError extends Error {
  constructor(m?: string) {
    super(m);
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, BasePeekABookError.prototype);
  }
}

class SMPPeerError extends BasePeekABookError {
  constructor(m?: string) {
    super(m);
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, SMPPeerError.prototype);
  }
}

class ServerUnconnected extends SMPPeerError {
  constructor(m?: string) {
    super(m);
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, ServerUnconnected.prototype);
  }
}

export { SMPPeerError, ServerUnconnected };
