// capture-golden.ts — regenerates lib/test/golden/virginia.json.
//
// Run: npm run golden:capture
//
// This is a tool, not a test. The file it writes is the baseline golden-virginia.test.ts checks
// against, and it was first recorded from the engines BEFORE they were parameterised off the
// jurisdiction resolver — which is what makes it evidence that the refactor changed nothing.
//
// Regenerating it is how you ACCEPT a change to Virginia's findings. That is a deliberate act:
// if a diff appears during work that was supposed to be behaviour-preserving, the work is wrong,
// and re-running this to make the test green would destroy the only proof that it was.

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { buildGolden } from './golden-subjects';

const golden = buildGolden();

const dir = join(process.cwd(), 'lib', 'test', 'golden');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'virginia.json'), JSON.stringify(golden, null, 2) + '\n', 'utf8');

console.log(`Wrote lib/test/golden/virginia.json — ${Object.keys(golden).length} subjects.`);
