export const MAX_DOCUMENT_NAME_LENGTH = 128;

export interface NameValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a document name against the Document API's constraints
 * (non-empty after trimming, at most MAX_DOCUMENT_NAME_LENGTH characters).
 */
export function validateDocumentName(
  name: string,
  maxLength: number = MAX_DOCUMENT_NAME_LENGTH
): NameValidationResult {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, error: "Name cannot be empty" };
  }

  if (trimmed.length > maxLength) {
    return {
      valid: false,
      error: `Name must be ${maxLength} characters or fewer (got ${trimmed.length})`,
    };
  }

  return { valid: true };
}
