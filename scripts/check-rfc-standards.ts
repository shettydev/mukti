#!/usr/bin/env bun

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const rfcsRoot = path.join(repoRoot, 'docs', 'rfcs');
const activeRoot = path.join(rfcsRoot, 'active');
const archiveRoot = path.join(rfcsRoot, 'archive');
const legacyRoot = path.join(archiveRoot, 'legacy');
const readmePath = path.join(rfcsRoot, 'README.md');

const errors: string[] = [];

const folderPattern = /^rfc-(\d{4})-[a-z0-9-]+$/;
const allowedStatuses = new Set([
  'Draft',
  'In Review',
  'Accepted',
  'Rejected',
  'Superseded',
  'Implemented',
]);
const activeStatuses = new Set(['Draft', 'In Review', 'Accepted']);

function fail(message: string) {
  errors.push(message);
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  return haystack.split(needle).length - 1;
}

function inferStatus(rawStatusCell: string): string | null {
  const ordered = ['In Review', 'Implemented', 'Superseded', 'Rejected', 'Accepted', 'Draft'];
  for (const candidate of ordered) {
    const re = new RegExp(`\\b${candidate}\\b`, 'i');
    if (re.test(rawStatusCell)) return candidate;
  }
  return null;
}

function readActiveRfcDirectories(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((entry) => {
    const fullPath = path.join(dir, entry);
    return statSync(fullPath).isDirectory();
  });
}

if (!existsSync(rfcsRoot)) {
  fail('Missing docs/rfcs directory.');
}
if (!existsSync(activeRoot)) {
  fail('Missing docs/rfcs/active directory.');
}
if (!existsSync(archiveRoot)) {
  fail('Missing docs/rfcs/archive directory.');
}
if (!existsSync(legacyRoot)) {
  fail('Missing docs/rfcs/archive/legacy directory.');
}
if (!existsSync(readmePath)) {
  fail('Missing docs/rfcs/README.md.');
}

const readme = existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : '';

const activeDirs = readActiveRfcDirectories(activeRoot);
const seenNumbers = new Map<string, string>();

for (const dirName of activeDirs) {
  const match = dirName.match(folderPattern);
  if (!match) {
    fail(`Active RFC folder name is invalid: ${dirName}`);
    continue;
  }

  const folderRfcNumber = match[1];
  const indexPath = path.join(activeRoot, dirName, 'index.md');
  if (!existsSync(indexPath)) {
    fail(`Missing canonical file: ${path.relative(repoRoot, indexPath)}`);
    continue;
  }

  const content = readFileSync(indexPath, 'utf8');

  const numberMatch = content.match(/\|\s*\*\*RFC Number\*\*\s*\|\s*([0-9]{4})\s*\|/i);
  if (!numberMatch) {
    fail(`Missing RFC Number metadata row in ${path.relative(repoRoot, indexPath)}`);
  } else if (numberMatch[1] !== folderRfcNumber) {
    fail(
      `RFC number mismatch in ${path.relative(repoRoot, indexPath)}: folder=${folderRfcNumber}, document=${numberMatch[1]}`
    );
  }

  if (seenNumbers.has(folderRfcNumber)) {
    fail(
      `Duplicate active RFC number ${folderRfcNumber} in folders ${seenNumbers.get(folderRfcNumber)} and ${dirName}`
    );
  } else {
    seenNumbers.set(folderRfcNumber, dirName);
  }

  const statusMatch = content.match(/\|\s*\*\*Status\*\*\s*\|\s*(.*?)\s*\|/i);
  if (!statusMatch) {
    fail(`Missing Status metadata row in ${path.relative(repoRoot, indexPath)}`);
    continue;
  }

  const normalizedStatus = inferStatus(statusMatch[1]);
  if (!normalizedStatus || !allowedStatuses.has(normalizedStatus)) {
    fail(`Unsupported status in ${path.relative(repoRoot, indexPath)}: ${statusMatch[1]}`);
    continue;
  }

  if (!activeStatuses.has(normalizedStatus)) {
    fail(
      `Active RFC ${path.relative(repoRoot, indexPath)} has non-active status \"${normalizedStatus}\" and should be moved to archive/`
    );
  }

  const readmeLink = `./active/${dirName}/index.md`;
  const occurrences = countOccurrences(readme, `(${readmeLink})`);
  if (occurrences !== 1) {
    fail(`README index must reference ${readmeLink} exactly once (found ${occurrences}).`);
  }
}

if (errors.length > 0) {
  console.error('\nRFC standards check failed:\n');
  for (const message of errors) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log(`RFC standards check passed (${activeDirs.length} active RFC folders validated).`);
