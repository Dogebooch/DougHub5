# Test Fixtures

This directory contains test data and database schemas for testing DougHub.

## Files

### `sample-data.json`
Sample medical flashcards and notes based on the production sampleData.ts. Used for integration testing and realistic data scenarios.

### `medical-content.json`
Medical education content for testing AI workflows:
- **medicalLists**: Lists that should be converted to clinical vignettes (differential diagnoses, etc.)
- **clinicalScenarios**: Realistic bedside presentations for vignette card testing
- **overlappingCloze**: Procedural knowledge that uses overlapping cloze format

### `v1-schema.sql`
Complete v1 database schema with sample data for migration testing. This represents the database structure before the v1→v2 migration that added:
- `cardType`, `parentListId`, `listPosition` columns to `cards`
- `responseTimeMs`, `partialCreditScore` columns to `review_logs`
- `quick_dumps` table
- `connections` table
- All v2 indexes

## Usage

```typescript
import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'

// Load v1 schema for migration testing
const v1Schema = fs.readFileSync(path.join(__dirname, 'v1-schema.sql'), 'utf-8')
const db = new Database(':memory:')
db.exec(v1Schema)

// Load sample data for integration tests
const sampleData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'sample-data.json'), 'utf-8')
)

// Load medical content for AI workflow tests
const medicalContent = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'medical-content.json'), 'utf-8')
)
```
