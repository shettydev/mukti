#!/usr/bin/env bun

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const rfcsRoot = path.join(repoRoot, 'docs', 'rfcs');
const activeRoot = path.join(rfcsRoot, 'active');
const archiveRoot = path.join(rfcsRoot, 'archive');
const readmePath = path.join(rfcsRoot, 'README.md');

const errors: string[] = [];

const folderPattern = /^rfc-(\d{4})-[a-z0-9-]+$/;
const requiredMetadataRows = [
  'RFC Number',
  'Title',
  'Status',
  'Author(s)',
  'Created',
  'Last Updated',
];
const allowedStatuses = new Set([
  'Draft',
  'In Review',
  'Accepted',
  'Rejected',
  'Superseded',
  'Implemented',
]);
const activeStatuses = new Set(['Draft', 'In Review', 'Accepted']);
const archivedStatuses = new Set(['Rejected', 'Superseded', 'Implemented']);

function fail(message: string) {
  errors.push(message);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function readRfcDirectories(dir: string, skip = new Set<string>()): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((entry) => !skip.has(entry))
    .filter((entry) => {
      const fullPath = path.join(dir, entry);
      return statSync(fullPath).isDirectory();
    });
}

function extractMetadataValue(content: string, field: string): string | null {
  const fieldRegex = new RegExp(
    `\\|\\s*\\*\\*${escapeRegExp(field)}\\*\\*\\s*\\|\\s*(.*?)\\s*\\|`,
    'i'
  );
  const match = content.match(fieldRegex);
  if (!match) return null;
  return match[1].trim();
}

function validateRequiredMetadata(content: string, indexPath: string): Map<string, string> {
  const values = new Map<string, string>();
  const relPath = path.relative(repoRoot, indexPath);

  for (const row of requiredMetadataRows) {
    const value = extractMetadataValue(content, row);
    if (value === null) {
      fail(`Missing ${row} metadata row in ${relPath}`);
      continue;
    }

    if (value.length === 0) {
      fail(`Empty ${row} metadata value in ${relPath}`);
      continue;
    }

    values.set(row, value);
  }

  const created = values.get('Created');
  if (created && !/^\d{4}-\d{2}-\d{2}$/.test(created)) {
    fail(`Created must be YYYY-MM-DD in ${relPath} (found: ${created})`);
  }

  const lastUpdated = values.get('Last Updated');
  if (lastUpdated && !/^\d{4}-\d{2}-\d{2}$/.test(lastUpdated)) {
    fail(`Last Updated must be YYYY-MM-DD in ${relPath} (found: ${lastUpdated})`);
  }

  return values;
}

type Lifecycle = 'active' | 'archive';

function validateRfcDirectory(
  baseDir: string,
  dirName: string,
  lifecycle: Lifecycle,
  readme: string,
  seenNumbers: Map<string, string>
): void {
  const match = dirName.match(folderPattern);
  if (!match) {
    fail(`${lifecycle} RFC folder name is invalid: ${dirName}`);
    return;
  }

  const folderRfcNumber = match[1];
  const indexPath = path.join(baseDir, dirName, 'index.md');
  const relIndexPath = path.relative(repoRoot, indexPath);

  if (!existsSync(indexPath)) {
    fail(`Missing canonical file: ${relIndexPath}`);
    return;
  }

  const content = readFileSync(indexPath, 'utf8');
  const metadata = validateRequiredMetadata(content, indexPath);

  const rfcNumber = metadata.get('RFC Number');
  if (rfcNumber && !/^\d{4}$/.test(rfcNumber)) {
    fail(`RFC Number must be 4 digits in ${relIndexPath} (found: ${rfcNumber})`);
  }
  if (rfcNumber && rfcNumber !== folderRfcNumber) {
    fail(
      `RFC number mismatch in ${relIndexPath}: folder=${folderRfcNumber}, document=${rfcNumber}`
    );
  }

  if (seenNumbers.has(folderRfcNumber)) {
    fail(
      `Duplicate RFC number ${folderRfcNumber} in ${seenNumbers.get(folderRfcNumber)} and ${path.join(lifecycle, dirName)}`
    );
  } else {
    seenNumbers.set(folderRfcNumber, path.join(lifecycle, dirName));
  }

  const statusCell = metadata.get('Status');
  if (!statusCell) return;

  const normalizedStatus = inferStatus(statusCell);
  if (!normalizedStatus || !allowedStatuses.has(normalizedStatus)) {
    fail(`Unsupported status in ${relIndexPath}: ${statusCell}`);
    return;
  }

  if (lifecycle === 'active' && !activeStatuses.has(normalizedStatus)) {
    fail(
      `Active RFC ${relIndexPath} has non-active status "${normalizedStatus}" and should be moved to archive/`
    );
  }

  if (lifecycle === 'archive' && !archivedStatuses.has(normalizedStatus)) {
    fail(
      `Archived RFC ${relIndexPath} has status "${normalizedStatus}" and should live under active/`
    );
  }

  if (lifecycle === 'active') {
    const readmeLink = `./active/${dirName}/index.md`;
    const occurrences = countOccurrences(readme, `(${readmeLink})`);
    if (occurrences !== 1) {
      fail(`README index must reference ${readmeLink} exactly once (found ${occurrences}).`);
    }
  }
}

if (!existsSync(rfcsRoot)) {
  fail('Missing docs/rfcs directory.');
}
if (!existsSync(activeRoot)) {
  fail('Missing docs/rfcs/active directory.');
}
if (!existsSync(readmePath)) {
  fail('Missing docs/rfcs/README.md.');
}

const readme = existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : '';

const activeDirs = readRfcDirectories(activeRoot);
const archiveDirs = existsSync(archiveRoot)
  ? readRfcDirectories(archiveRoot, new Set(['legacy']))
  : [];
const seenNumbers = new Map<string, string>();

for (const dirName of activeDirs) {
  validateRfcDirectory(activeRoot, dirName, 'active', readme, seenNumbers);
}

for (const dirName of archiveDirs) {
  validateRfcDirectory(archiveRoot, dirName, 'archive', readme, seenNumbers);
}

if (errors.length > 0) {
  console.error('\nRFC standards check failed:\n');
  for (const message of errors) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log(`RFC standards check passed (${activeDirs.length} active RFC folders validated).`);
