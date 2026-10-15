import sanitizeHtml from 'sanitize-html';

export function sanitizeText(input: string, maxLength = 5000): string {
  const cleaned = sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  });
  return cleaned.trim().slice(0, maxLength);
}

export function sanitizeMultiline(input: string, maxLength = 20000): string {
  const cleaned = sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  });
  return cleaned.trim().slice(0, maxLength);
}