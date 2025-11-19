#!/usr/bin/env node
// server/scripts/check_import_csv.js
// Usage: node check_import_csv.js ../middleware/your_uploaded_file.csv

const fs = require('fs');
const path = require('path');

function parseCSVLine(line) {
  const cols = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { // double-quote escape
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cols.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cols.push(cur);
  return cols.map(c => c === undefined ? '' : c.trim());
}

function normalizeHeader(h) {
  return h.trim().toLowerCase().replace(/\s+/g, '_');
}

if (process.argv.length < 3) {
  console.error('Usage: node check_import_csv.js <csv-file-path>');
  process.exit(2);
}

const filePath = path.resolve(process.argv[2]);
if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(2);
}

const raw = fs.readFileSync(filePath, 'utf8').replace(/\r/g, '');
const lines = raw.split('\n');
if (lines.length === 0) {
  console.error('Empty file');
  process.exit(1);
}

const headerCols = parseCSVLine(lines[0]).map(normalizeHeader);
const required = ['first_name', 'last_name', 'reason'];
const idx = {};
required.forEach(r => {
  idx[r] = headerCols.findIndex(h => h === r || h.replace(/\s+/g,'_') === r);
});

const instCol = headerCols.findIndex(h => h.startsWith('institution_1_name'));

console.log('Header columns found:', headerCols.join(', '));
console.log('Required column indexes:', idx);
if (instCol >= 0) console.log('Institution_1_name column index:', instCol);

const problems = [];
for (let i = 1; i < lines.length; i++) {
  const rawLine = lines[i];
  if (!rawLine || rawLine.trim() === '') {
    problems.push({ row: i+1, type: 'blank_row' });
    continue;
  }
  const cols = parseCSVLine(rawLine);
  const missing = [];
  required.forEach(r => {
    const pos = idx[r];
    const val = (pos >= 0 && cols[pos] !== undefined) ? cols[pos].trim() : '';
    if (!val) missing.push(r);
  });

  // detect rows that appear to be institution-only (no pip name, but institution present)
  const pipNameEmpty = ((idx['first_name'] < 0 || !cols[idx['first_name']] || cols[idx['first_name']].trim() === '')
                      && (idx['last_name'] < 0 || !cols[idx['last_name']] || cols[idx['last_name']].trim() === ''));
  const instPresent = (instCol >= 0 && cols[instCol] && cols[instCol].trim() !== '');

  if (missing.length > 0) {
    if (pipNameEmpty && instPresent) {
      problems.push({ row: i+1, type: 'institution_only', missing, sample: rawLine.slice(0,300) });
    } else {
      problems.push({ row: i+1, type: 'missing_required', missing, sample: rawLine.slice(0,300) });
    }
  }
}

const counts = problems.reduce((acc, p) => { acc[p.type] = (acc[p.type] || 0) + 1; return acc; }, {});
console.log('Checked rows:', lines.length - 1);
console.log('Problems found:', counts);

if (problems.length > 0) {
  console.log('\nFirst 50 problem rows:');
  problems.slice(0,50).forEach(p => {
    console.log(`${p.row}: ${p.type} ${p.missing ? '(' + p.missing.join(',') + ')' : ''}`);
    if (p.sample) console.log('  sample:', p.sample);
  });
  console.log('\nRecommendations:');
  console.log(' - Ensure header matches sample (first_name,middle_name,last_name,...).');
  console.log(' - Remove blank separator rows that contain only commas.');
  console.log(' - For rows that list institutions but no PIP name, move the institution columns to the PIP row or populate the PIP name/reason.');
  console.log(' - Fill `reason` for every PIP.');
  console.log(' - If national_id is optional, do not use placeholder text like `(No ID)`; leave it empty.');
  process.exit(1);
} else {
  console.log('No problems detected for required fields.');
  process.exit(0);
}
