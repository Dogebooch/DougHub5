import Database from 'better-sqlite3';
import path from 'path';
import { homedir } from 'os';

const dbPath = path.join(homedir(), 'AppData', 'Roaming', 'doughub---template-react-ts', 'doughub.db');
const db = new Database(dbPath);

const indexes = db.prepare("SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY tbl_name, name").all();

console.log('Current indexes:');
console.log('================');
indexes.forEach(idx => {
  console.log(`${idx.name} (table: ${idx.tbl_name})`);
});

const needed = ['idx_quick_dumps_status', 'idx_cards_cardType', 'idx_cards_parentListId', 'idx_connections_sourceNoteId', 'idx_connections_targetNoteId'];
console.log('\nRequired indexes verification:');
console.log('================');
needed.forEach(name => {
  const exists = indexes.some(idx => idx.name === name);
  console.log(`${exists ? '✓' : '✗'} ${name}`);
});

db.close();
