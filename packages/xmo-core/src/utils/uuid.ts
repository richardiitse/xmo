import { randomUUID } from 'crypto';

// Generate a prefixed UUID
export function generateId(prefix: string): string {
  const uuid = randomUUID();
  return `${prefix}_${uuid}`;
}

// Generate an entity ID with type prefix
export function generateEntityId(type: string): string {
  // Capitalize first letter for consistent formatting
  const normalizedType = type.charAt(0).toUpperCase() + type.slice(1);
  return generateId(normalizedType);
}
