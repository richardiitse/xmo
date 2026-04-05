import { describe, it, expect, beforeEach } from 'vitest'
import { generateSearchKeywords, scanProject } from './project.js'
import type { ProjectMetadata } from './project.js'
import { mkdir, writeFile } from 'fs/promises'
import { resolve } from 'path'

describe('project utilities', () => {
  describe('generateSearchKeywords', () => {
    it('includes project name', () => {
      const metadata: ProjectMetadata = {
        name: 'my-project',
        techStack: [],
        dependencies: [],
        keywords: [],
      }
      const keywords = generateSearchKeywords(metadata)
      expect(keywords).toContain('my-project')
    })

    it('includes tech stack', () => {
      const metadata: ProjectMetadata = {
        name: 'test',
        techStack: ['typescript', 'react'],
        dependencies: [],
        keywords: [],
      }
      const keywords = generateSearchKeywords(metadata)
      expect(keywords).toContain('typescript')
      expect(keywords).toContain('react')
    })

    it('deduplicates keywords', () => {
      const metadata: ProjectMetadata = {
        name: 'typescript-project',
        techStack: ['typescript'],
        dependencies: ['typescript'],
        keywords: ['typescript'],
      }
      const keywords = generateSearchKeywords(metadata)
      const typescriptCount = keywords.filter(k => k === 'typescript').length
      expect(typescriptCount).toBe(1)
    })

    it('filters out @types and babel packages', () => {
      const metadata: ProjectMetadata = {
        name: 'test',
        techStack: [],
        dependencies: ['@types/node', '@babel/core', 'my-package'],
        keywords: [],
      }
      const keywords = generateSearchKeywords(metadata)
      expect(keywords).not.toContain('@types/node')
      expect(keywords).not.toContain('@babel/core')
      expect(keywords).toContain('my-package')
    })

    it('limits dependencies to 10', () => {
      const metadata: ProjectMetadata = {
        name: 'test',
        techStack: [],
        dependencies: ['dep1', 'dep2', 'dep3', 'dep4', 'dep5', 'dep6', 'dep7', 'dep8', 'dep9', 'dep10', 'dep11'],
        keywords: [],
      }
      const keywords = generateSearchKeywords(metadata)
      const depKeywords = keywords.filter(k => k.startsWith('dep'))
      expect(depKeywords.length).toBeLessThanOrEqual(10)
    })

    it('filters out eslint-plugin packages', () => {
      const metadata: ProjectMetadata = {
        name: 'test',
        techStack: [],
        dependencies: ['eslint-plugin-prettier', 'my-package'],
        keywords: [],
      }
      const keywords = generateSearchKeywords(metadata)
      expect(keywords).not.toContain('eslint-plugin-prettier')
      expect(keywords).toContain('my-package')
    })

    it('filters out ts- packages', () => {
      const metadata: ProjectMetadata = {
        name: 'test',
        techStack: [],
        dependencies: ['ts-node', 'ts-jest', 'my-package'],
        keywords: [],
      }
      const keywords = generateSearchKeywords(metadata)
      expect(keywords).not.toContain('ts-node')
      expect(keywords).not.toContain('ts-jest')
      expect(keywords).toContain('my-package')
    })
  })

  describe('scanProject', () => {
    const testDir = resolve('/tmp', 'xmo-project-test-' + Date.now())

    beforeEach(async () => {
      await mkdir(resolve(testDir, 'subdir'), { recursive: true })
    })

    it('returns null when no package.json found', async () => {
      const result = await scanProject(testDir)
      expect(result).toBeNull()
    })

    it('returns project metadata when package.json exists', async () => {
      const pkg = {
        name: 'my-test-project',
        version: '1.0.0',
        dependencies: { react: '^18.0.0' },
        devDependencies: { vitest: '^1.0.0' },
        keywords: ['test', 'example'],
      }
      await writeFile(resolve(testDir, 'package.json'), JSON.stringify(pkg))

      const result = await scanProject(testDir)

      expect(result).not.toBeNull()
      expect(result!.name).toBe('my-test-project')
      expect(result!.techStack).toContain('react')
      expect(result!.techStack).toContain('vitest')
      expect(result!.dependencies).toContain('react')
      expect(result!.dependencies).toContain('vitest')
    })

    it('returns null for malformed package.json', async () => {
      await writeFile(resolve(testDir, 'package.json'), 'not json')

      const result = await scanProject(testDir)
      expect(result).toBeNull()
    })

    it('finds package.json in subdirectory', async () => {
      const pkg = {
        name: 'nested-project',
        dependencies: {},
      }
      await writeFile(resolve(testDir, 'package.json'), JSON.stringify(pkg))

      const result = await scanProject(resolve(testDir, 'subdir'))
      expect(result).not.toBeNull()
      expect(result!.name).toBe('nested-project')
    })

    it('handles package.json with missing fields', async () => {
      await writeFile(resolve(testDir, 'package.json'), JSON.stringify({}))

      const result = await scanProject(testDir)
      expect(result).not.toBeNull()
      expect(result!.name).toBe('unknown')
      expect(result!.techStack).toEqual([])
      expect(result!.dependencies).toEqual([])
    })

    it('infers tech stack from common dependencies', async () => {
      const pkg = {
        name: 'tech-detect',
        dependencies: {
          express: '^4.0.0',
          'react-dom': '^18.0.0',
          typescript: '^5.0.0',
        },
      }
      await writeFile(resolve(testDir, 'package.json'), JSON.stringify(pkg))

      const result = await scanProject(testDir)
      expect(result!.techStack).toContain('express')
      expect(result!.techStack).toContain('react')
      expect(result!.techStack).toContain('typescript')
    })
  })
})
