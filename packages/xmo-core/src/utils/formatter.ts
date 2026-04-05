import type { Entity } from '../types/index.js';

export interface MemoryBlockOptions {
  maxEntities?: number;
  maxContentLength?: number;
}

/**
 * Format a single entity as a brief one-line summary
 */
export function formatEntityBrief(entity: Entity): string {
  const name =
    (entity.properties.name as string | undefined) ??
    (entity.properties.title as string | undefined) ??
    '(unnamed)';

  const meta: string[] = [];
  if (entity.occurrences && entity.occurrences > 1) {
    meta.push(`×${entity.occurrences}`);
  }
  if (entity.lastSeenAt) {
    const daysAgo = Math.floor(
      (Date.now() - new Date(entity.lastSeenAt).getTime()) / 86400000
    );
    if (daysAgo === 0) {
      meta.push('today');
    } else if (daysAgo === 1) {
      meta.push('yesterday');
    } else {
      meta.push(`${daysAgo}d ago`);
    }
  }

  const metaStr = meta.length > 0 ? ` [${meta.join(', ')}]` : '';
  return `[${entity.type}] ${name}${metaStr}`;
}

/**
 * Format a single entity as a detailed block
 */
export function formatEntityDetail(entity: Entity): string {
  const name =
    (entity.properties.name as string | undefined) ??
    (entity.properties.title as string | undefined) ??
    '(unnamed)';

  const lines: string[] = [
    `**${name}** (${entity.type})`,
    ``,
  ];

  if (entity.properties.content) {
    const content = entity.properties.content as string;
    lines.push(content);
    lines.push('');
  }

  if (entity.tags.length > 0) {
    lines.push(`Tags: ${entity.tags.join(', ')}`);
  }

  if (entity.occurrences && entity.occurrences > 1) {
    lines.push(`Seen ${entity.occurrences} times`);
  }

  if (entity.lastSeenAt) {
    lines.push(`Last seen: ${entity.lastSeenAt.slice(0, 10)}`);
  }

  return lines.join('\n');
}

/**
 * Format entities as a memory block suitable for injection into context
 */
export function formatMemoryBlock(
  entities: Entity[],
  projectName: string,
  options: MemoryBlockOptions = {}
): string {
  const { maxEntities = 20, maxContentLength = 200 } = options;

  if (entities.length === 0) {
    return '';
  }

  const header = [
    `## Memory: ${projectName}`,
    '',
    `Found ${entities.length} relevant memory entries:`,
    '',
  ].join('\n');

  const entityLines = entities.slice(0, maxEntities).map((entity, idx) => {
    const name =
      (entity.properties.name as string | undefined) ??
      (entity.properties.title as string | undefined) ??
      '(unnamed)';

    const meta: string[] = [`${entity.type}`];
    if (entity.occurrences && entity.occurrences > 1) {
      meta.push(`×${entity.occurrences}`);
    }
    if (entity.lastSeenAt) {
      const daysAgo = Math.floor(
        (Date.now() - new Date(entity.lastSeenAt).getTime()) / 86400000
      );
      if (daysAgo <= 7) {
        meta.push(`${daysAgo}d ago`);
      } else {
        meta.push(entity.lastSeenAt.slice(0, 10));
      }
    }

    const content = entity.properties.content as string | undefined;
    let contentStr = '';
    if (content) {
      contentStr = content.length > maxContentLength
        ? content.slice(0, maxContentLength) + '...'
        : content;
      contentStr = `\n  ${contentStr}`;
    }

    return `${idx + 1}. [${meta.join(' | ')}] ${name}${contentStr}`;
  });

  const footer = [
    '',
    '---',
    `End of memory block. ${entities.length > maxEntities ? `(showing ${maxEntities} of ${entities.length})` : ''}`,
  ].join('\n');

  return [header, entityLines.join('\n'), footer].join('\n');
}
