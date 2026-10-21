/**
 * A validation failure caused by caller-supplied data.
 *
 * Models throw this instead of a plain `Error` so transports can answer with a
 * field-level error (GraphQL `BAD_USER_INPUT`, HTTP 400) rather than treating
 * bad input as a server failure. `fieldErrors` maps a field path to the message
 * a form should show next to it.
 */
export class ValidationError extends Error {
  /** Stable discriminator for consumers that cannot use `instanceof`. */
  readonly code = 'VALIDATION'
  /** Field path -> user-facing message. */
  readonly fieldErrors: Record<string, string>

  constructor(fieldErrors: Record<string, string>, message?: string) {
    const entries = Object.entries(fieldErrors)
    const fallback = entries[0]?.[1] ?? 'Validation failed'
    super(message ?? fallback)
    this.name = 'ValidationError'
    this.fieldErrors = fieldErrors
  }

  /**
   * Build an error from a message that already names its field, e.g.
   * `Field 'state' must be a string`. Used by the field setters, which do not
   * keep the field name separate from the message.
   */
  static fromMessage(message: string): ValidationError {
    const field = fieldNameFromMessage(message)
    return new ValidationError(
      { [field ?? '_form']: message },
      message
    )
  }
}

const FIELD_PATTERNS = [
  /^Field '([^']+)' /,
  /^Required property '([^']+)' is missing$/,
  /^Required field '([^']+)' is missing$/,
  /^Vector field '([^']+)' /,
]

function fieldNameFromMessage(message: string): string | null {
  for (const pattern of FIELD_PATTERNS) {
    const match = message.match(pattern)
    if (match) return match[1]
  }
  return null
}

/**
 * Throw a `ValidationError` for a message that names its field.
 * A field-less message is reported under `_form`.
 */
export function validationFail(message: string): never {
  throw ValidationError.fromMessage(message)
}
