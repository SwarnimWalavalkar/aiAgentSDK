/**
 * Transforms an agent name to ensure it matches the regex /^[a-zA-Z0-9_-]+$/
 *
 * @param name - The original agent name.
 * @returns A sanitized version of the agent name.
 */
export const sanitizeAgentName = (name: string): string =>
  name.replace(/[^a-zA-Z0-9_-]+/g, "_");
