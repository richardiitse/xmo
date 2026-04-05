import { resolve, dirname } from 'path';
import { readFile, access, readdir } from 'fs/promises';

export interface ProjectMetadata {
  name: string;
  techStack: string[];
  dependencies: string[];
  keywords: string[];
}

/**
 * Find the nearest project file by searching upward from cwd
 */
async function findUp(
  cwd: string,
  filenames: string[]
): Promise<string | null> {
  let dir = cwd;
  const root = '/';

  while (dir !== root) {
    for (const filename of filenames) {
      const filePath = resolve(dir, filename);
      try {
        await access(filePath);
        return filePath;
      } catch {
        // Not found in this dir
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Parse package.json to extract project metadata
 */
async function parsePackageJson(filePath: string): Promise<ProjectMetadata | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const pkg = JSON.parse(content);

    const deps = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ];

    // Infer tech stack from dependencies
    const techStack = inferTechStack(deps);

    // Project keywords from package.json
    const keywords: string[] = [
      ...(pkg.keywords ?? []),
      ...techStack,
    ].filter((k, i, arr) => arr.indexOf(k) === i); // dedupe

    return {
      name: pkg.name ?? 'unknown',
      techStack,
      dependencies: deps.slice(0, 20), // limit for search
      keywords,
    };
  } catch {
    return null;
  }
}

/**
 * Infer tech stack from dependency names
 */
function inferTechStack(deps: string[]): string[] {
  const techMap: Record<string, string[]> = {
    typescript: ['typescript'],
    react: ['react', 'react-dom'],
    vue: ['vue'],
    svelte: ['svelte'],
    next: ['next'],
    nuxt: ['nuxt'],
    vite: ['vite'],
    webpack: ['webpack'],
    express: ['express'],
    fastify: ['fastify'],
    koa: ['koa'],
    nestjs: ['@nestjs/core'],
    redux: ['redux', 'react-redux'],
    mobx: ['mobx', 'mobx-react'],
    prisma: ['prisma', '@prisma/client'],
    drizzle: ['drizzle-orm'],
    sequelize: ['sequelize'],
    typeorm: ['typeorm'],
    vitest: ['vitest'],
    jest: ['jest'],
    mocha: ['mocha'],
    playwright: ['playwright'],
    cypress: ['cypress'],
    eslint: ['eslint'],
    prettier: ['prettier'],
    tailwind: ['tailwindcss'],
    graphql: ['graphql', '@apollo/client'],
    docker: ['docker-compose'],
    kubernetes: ['kubernetes-client'],
    aws: ['@aws-sdk/client-s3', '@aws-sdk/client-ec2'],
  };

  const found: string[] = [];
  for (const [tech, packages] of Object.entries(techMap)) {
    if (packages.some(pkg => deps.includes(pkg))) {
      found.push(tech);
    }
  }
  return found;
}

/**
 * Scan a project directory to extract metadata
 * Uses findUp to locate the nearest package.json
 */
export async function scanProject(cwd: string): Promise<ProjectMetadata | null> {
  const pkgFile = await findUp(cwd, ['package.json']);

  if (!pkgFile) {
    return null;
  }

  return parsePackageJson(pkgFile);
}

/**
 * Generate search keywords from project metadata for KG queries
 */
export function generateSearchKeywords(metadata: ProjectMetadata): string[] {
  const keywords: string[] = [metadata.name];

  // Add tech stack
  keywords.push(...metadata.techStack);

  // Add significant dependencies (top-level tools)
  const toolDeps = metadata.dependencies.filter(dep =>
    !dep.startsWith('@types/') &&
    !dep.startsWith('@babel/') &&
    !dep.startsWith('eslint-plugin') &&
    !dep.startsWith('ts-')
  );

  keywords.push(...toolDeps.slice(0, 10));

  return [...new Set(keywords)];
}
