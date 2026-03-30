export function stripControlChars(value: string) {
  return value.replace(/[\u0000-\u001F\u007F]/g, "");
}

export function sanitizeCallsign(input: string) {
  const sanitized = stripControlChars(input).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
  if (!sanitized) {
    throw new Error("Callsign must contain at least one alphanumeric character.");
  }
  return sanitized;
}

export function sanitizeBranchRoot(input: string) {
  const normalized = stripControlChars(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || "branch";
}

export function sanitizePromptValue(input: string, maxLength = 50_000) {
  return stripControlChars(input).slice(0, maxLength);
}

export function renderTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "");
}

