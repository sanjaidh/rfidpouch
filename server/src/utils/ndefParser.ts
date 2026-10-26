/**
 * NDEF Tag Payload Parser & Validator
 * Standard factory pouch payload format: POUCH:PCH-000123
 */

export interface ParsedTagResult {
  valid: boolean;
  serialNumber: string | null;
  rawPayload: string;
  recordType?: string;
  errorMessage?: string;
}

export function parseNdefPouchPayload(
  rawText: string,
  recordType: string = 'text'
): ParsedTagResult {
  if (!rawText || typeof rawText !== 'string') {
    return {
      valid: false,
      serialNumber: null,
      rawPayload: String(rawText || ''),
      recordType,
      errorMessage: 'Empty or invalid NDEF payload received.',
    };
  }

  const cleanPayload = rawText.trim();

  // Check if payload matches POUCH:<SERIAL> (case-insensitive prefix, trimmed)
  const pouchRegex = /^POUCH:\s*([A-Za-z0-9_\-]+)$/i;
  const match = cleanPayload.match(pouchRegex);

  if (match && match[1]) {
    const serialNumber = match[1].trim().toUpperCase();
    return {
      valid: true,
      serialNumber,
      rawPayload: cleanPayload,
      recordType,
    };
  }

  // If it's a URL or arbitrary text without POUCH: prefix
  if (cleanPayload.startsWith('http://') || cleanPayload.startsWith('https://')) {
    return {
      valid: false,
      serialNumber: null,
      rawPayload: cleanPayload,
      recordType: 'url',
      errorMessage:
        'Tag contains a URL instead of a factory pouch identifier. Expected format: POUCH:<SERIAL_NUMBER>',
    };
  }

  return {
    valid: false,
    serialNumber: null,
    rawPayload: cleanPayload,
    recordType,
    errorMessage:
      'Unregistered or invalid pouch tag. Register the pouch or write a valid pouch identifier to this tag.',
  };
}

/**
 * Format pouch serial number into standard NDEF payload
 */
export function formatPouchPayload(serialNumber: string): string {
  const cleanSerial = serialNumber.trim().toUpperCase();
  return `POUCH:${cleanSerial}`;
}
