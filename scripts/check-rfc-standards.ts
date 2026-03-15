#!/usr/bin/env bun

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

type RfcLocation = 'active' | 'archive';
type ReadmeSectionName = 'Active RFCs' | 'Implemented RFCs' | 'Archive';
type RfcStatus = 'Draft' | 'In Review' | 'Accepted' | 'Implemented' | 'Rejected' | 'Superseded';

interface RfcDirectoryRecord {
  readmeLink: string;
  status: RfcStatus;
}

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

const allStatuses: RfcStatus[] = [
  'Draft',
  'In Review',
  'Accepted',
  'Implemented',
  'Rejected',
  'Superseded',
];

const activeAllowedStatuses: RfcStatus[] = ['Draft', 'In Review', 'Accepted', 'Implemented'];
const archiveAllowedStatuses: RfcStatus[] = ['Rejected', 'Superseded'];

const allowedStatuses = new Set<RfcStatus>(allStatuses);
const allowedActiveStatuses = new Set<RfcStatus>(activeAllowedStatuses);
const allowedArchiveStatuses = new Set<RfcStatus>(archiveAllowedStatuses);

const allowedStatusList = allStatuses.join(', ');
const activeStatusList = activeAllowedStatuses.join(', ');
const archiveStatusList = archiveAllowedStatuses.join(', ');

const statusToReadmeSection = new Map<RfcStatus, ReadmeSectionName>([
  ['Draft', 'Active RFCs'],
  ['In Review', 'Active RFCs'],
  ['Accepted', 'Active RFCs'],
  ['Implemented', 'Implemented RFCs'],
  ['Rejected', 'Archive'],
  ['Superseded', 'Archive'],
]);

const readmeSections: ReadmeSectionName[] = ['Active RFCs', 'Implemented RFCs', 'Archive'];

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

function inferStatus(rawStatusCell: string): RfcStatus | null {
  const ordered: RfcStatus[] = [
    'In Review',
    'Implemented',
    'Superseded',
    'Rejected',
    'Accepted',
    'Draft',
  ];

  for (const candidate of ordered) {
    const re = new RegExp(`\\b${candidate}\\b`, 'i');
    if (re.test(rawStatusCell)) return candidate;
  }

  return null;
}

function readRfcDirectories(dir: string): string[] {
  if (!existsSync(dir)) return [];
  if (!statSync(dir).isDirectory()) return [];

  return readdirSync(dir).filter((entry) => {
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
  const [, value] = match;
  if (value === undefined) return null;

  return value.trim();
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

function validateRfcDirectory(
  baseDir: string,
  dirName: string,
  location: RfcLocation,
  seenNumbers: Map<string, string>
): RfcDirectoryRecord | null {
  const match = dirName.match(folderPattern);
  if (!match) {
    fail(`RFC folder name is invalid under ${location}/: ${dirName}`);
    return null;
  }

  const [, folderRfcNumber] = match;
  if (folderRfcNumber === undefined) {
    fail(`Unable to determine RFC number from folder name under ${location}/: ${dirName}`);
    return null;
  }

  const indexPath = path.join(baseDir, dirName, 'index.md');
  const relIndexPath = path.relative(repoRoot, indexPath);

  if (!existsSync(indexPath)) {
    fail(`Missing canonical file: ${relIndexPath}`);
    return null;
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
      `Duplicate RFC number ${folderRfcNumber} in ${seenNumbers.get(folderRfcNumber)} and ${path.join(location, dirName)}`
    );
  } else {
    seenNumbers.set(folderRfcNumber, path.join(location, dirName));
  }

  const statusCell = metadata.get('Status');
  if (!statusCell) return null;

  const normalizedStatus = inferStatus(statusCell);
  if (!normalizedStatus || !allowedStatuses.has(normalizedStatus)) {
    fail(
      `Unsupported status in ${relIndexPath}: ${statusCell}. Allowed values: ${allowedStatusList}.`
    );
    return null;
  }

  if (location === 'active' && !allowedActiveStatuses.has(normalizedStatus)) {
    fail(
      `Active RFC ${relIndexPath} has status "${normalizedStatus}". Allowed values in active/: ${activeStatusList}.`
    );
  }

  if (location === 'archive' && !allowedArchiveStatuses.has(normalizedStatus)) {
    fail(
      `Archived RFC ${relIndexPath} has status "${normalizedStatus}". Allowed values in archive/: ${archiveStatusList}.`
    );
  }

  return {
    readmeLink: `./${location}/${dirName}/index.md`,
    status: normalizedStatus,
  };
}

function extractReadmeSection(readme: string, section: ReadmeSectionName): string | null {
  const headingRegex = new RegExp(`^###\\s+${escapeRegExp(section)}\\s*$`, 'm');
  const headingMatch = headingRegex.exec(readme);

  if (!headingMatch) {
    fail(`Missing README section heading: ${section}`);
    return null;
  }

  const sectionStart = headingMatch.index + headingMatch[0].length;
  const remainder = readme.slice(sectionStart);
  const nextHeadingMatch = /^###\s+.+$/m.exec(remainder);
  const sectionEnd = nextHeadingMatch ? sectionStart + nextHeadingMatch.index : readme.length;

  return readme.slice(sectionStart, sectionEnd);
}

function validateReadmePlacement(readme: string, records: RfcDirectoryRecord[]) {
  const sectionContent: Record<ReadmeSectionName, string> = {
    'Active RFCs': '',
    'Implemented RFCs': '',
    Archive: '',
  };

  for (const section of readmeSections) {
    const content = extractReadmeSection(readme, section);
    if (content !== null) {
      sectionContent[section] = content;
    }
  }

  for (const record of records) {
    const expectedSection = statusToReadmeSection.get(record.status);
    if (!expectedSection) continue;

    const needle = `(${record.readmeLink})`;
    const globalOccurrences = countOccurrences(readme, needle);

    if (globalOccurrences !== 1) {
      fail(
        `README index must reference ${record.readmeLink} exactly once (found ${globalOccurrences}).`
      );
    }

    for (const section of readmeSections) {
      const occurrences = countOccurrences(sectionContent[section], needle);
      if (section === expectedSection && occurrences !== 1) {
        fail(
          `${record.readmeLink} (status: ${record.status}) must appear exactly once in README section "${expectedSection}" (found ${occurrences}).`
        );
      }

      if (section !== expectedSection && occurrences !== 0) {
        fail(
          `${record.readmeLink} (status: ${record.status}) must not appear in README section "${section}" (found ${occurrences}).`
        );
      }
    }
  }
}

if (!existsSync(rfcsRoot)) {
  fail('Missing docs/rfcs directory.');
}

if (!existsSync(activeRoot)) {
  fail('Missing docs/rfcs/active directory.');
} else if (!statSync(activeRoot).isDirectory()) {
  fail('docs/rfcs/active must be a directory.');
}

const archiveExists = existsSync(archiveRoot);
if (archiveExists && !statSync(archiveRoot).isDirectory()) {
  fail('docs/rfcs/archive must be a directory when present.');
}

if (!existsSync(readmePath)) {
  fail('Missing docs/rfcs/README.md.');
}

const readme = existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : '';

const activeDirs = readRfcDirectories(activeRoot);
const archiveDirs = archiveExists ? readRfcDirectories(archiveRoot) : [];
const seenNumbers = new Map<string, string>();
const records: RfcDirectoryRecord[] = [];

for (const dirName of activeDirs) {
  const record = validateRfcDirectory(activeRoot, dirName, 'active', seenNumbers);
  if (record) {
    records.push(record);
  }
}

for (const dirName of archiveDirs) {
  const record = validateRfcDirectory(archiveRoot, dirName, 'archive', seenNumbers);
  if (record) {
    records.push(record);
  }
}

if (existsSync(readmePath)) {
  validateReadmePlacement(readme, records);
}

if (errors.length > 0) {
  console.error('\nRFC standards check failed:\n');
  for (const message of errors) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log(
  `RFC standards check passed (${activeDirs.length} active RFC folders validated, ${archiveDirs.length} archived RFC folders validated).`
);
