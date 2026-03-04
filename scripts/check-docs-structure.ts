#!/usr/bin/env bun

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const errors: string[] = [];

function fail(message: string) {
  errors.push(message);
}

function walkFiles(dirPath: string, out: string[] = []): string[] {
  if (!existsSync(dirPath)) return out;

  for (const entry of readdirSync(dirPath)) {
    const fullPath = path.join(dirPath, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walkFiles(fullPath, out);
    } else {
      out.push(fullPath);
    }
  }
  return out;
}

function assertExists(relPath: string) {
  const fullPath = path.join(repoRoot, relPath);
  if (!existsSync(fullPath)) {
    fail(`Missing required file: ${relPath}`);
  }
}

function assertLink(fileRelPath: string, relLink: string) {
  const filePath = path.join(repoRoot, fileRelPath);
  if (!existsSync(filePath)) {
    fail(`Missing file for link check: ${fileRelPath}`);
    return;
  }

  const content = readFileSync(filePath, 'utf8');
  if (!content.includes(relLink)) {
    fail(`Expected link not found in ${fileRelPath}: ${relLink}`);
    return;
  }

  const targetPath = path.resolve(path.dirname(filePath), relLink);
  if (!existsSync(targetPath)) {
    fail(`Broken link target from ${fileRelPath}: ${relLink}`);
  }
}

const blockedDocsDir = path.join(repoRoot, 'packages', 'mukti-docs');
if (existsSync(blockedDocsDir)) {
  fail('packages/mukti-docs must not exist. Migrate docs to docs/reference/.');
}

const packagesRoot = path.join(repoRoot, 'packages');
if (existsSync(packagesRoot)) {
  for (const entry of readdirSync(packagesRoot)) {
    if (!entry.endsWith('-docs')) continue;
    const docsPackagePath = path.join(packagesRoot, entry);
    if (!statSync(docsPackagePath).isDirectory()) continue;

    const markdownFiles = walkFiles(docsPackagePath).filter((filePath) => filePath.endsWith('.md'));
    if (markdownFiles.length > 0) {
      const relFiles = markdownFiles.map((filePath) => path.relative(repoRoot, filePath));
      fail(
        `Markdown docs under packages/*-docs are not allowed (${entry}): ${relFiles.join(', ')}`
      );
    }
  }
}

const requiredFiles = [
  'docs/reference/architecture/overview.md',
  'docs/reference/architecture/images/mukti-architecture.png',
  'docs/reference/data/data-modelling.md',
  'docs/reference/data/images/mukti-data-modelling.png',
  'docs/reference/planning/unified-thinking-model.md',
  'docs/rfcs/active/rfc-0001-knowledge-gap-detection/index.md',
  'docs/rfcs/active/rfc-0002-adaptive-scaffolding-framework/index.md',
];

for (const relPath of requiredFiles) {
  assertExists(relPath);
}

assertLink(
  'packages/ARCHITECTURE.md',
  '../docs/reference/architecture/images/mukti-architecture.png'
);
assertLink('docs/reference/data/data-modelling.md', './images/mukti-data-modelling.png');
assertLink(
  'docs/rfcs/active/rfc-0001-knowledge-gap-detection/index.md',
  '../../../reference/planning/unified-thinking-model.md'
);
assertLink(
  'docs/rfcs/active/rfc-0002-adaptive-scaffolding-framework/index.md',
  '../../../reference/planning/unified-thinking-model.md'
);

if (errors.length > 0) {
  console.error('\nDocs structure check failed:\n');
  for (const message of errors) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log('Docs structure check passed.');
