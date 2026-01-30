
import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'doughub', 'database.sqlite');
console.log('Connecting to:', dbPath);

try {
    const db = new Database(dbPath, { readonly: true });
    
    // Check version
    const version = db.prepare('PRAGMA user_version').get();
    console.log('Schema Version:', version);

    // Check columns
    const columns = db.prepare('PRAGMA table_info(cards)').all();
    console.log('Cards Columns:', columns.map(c => c.name).join(', '));

    // Test Query Performance
    console.log('Testing optimized query...');
    const start = Date.now();
    try {
        const result = db.prepare(`
            WITH SiblingCounts AS (
              SELECT sourceBlockId, COUNT(*) as count
              FROM cards
              WHERE sourceBlockId IS NOT NULL
              GROUP BY sourceBlockId
            ),
            ListCounts AS (
              SELECT parentListId, COUNT(*) as count
              FROM cards
              WHERE parentListId IS NOT NULL
              GROUP BY parentListId
            )
            SELECT 
              c.id,
              COALESCE(sc.count, 0) as siblingCount,
              COALESCE(lc.count, 0) as listSiblingCount
            FROM cards c
            LEFT JOIN SiblingCounts sc ON c.sourceBlockId = sc.sourceBlockId
            LEFT JOIN ListCounts lc ON c.parentListId = lc.parentListId
            LIMIT 10
        `).all();
        console.log('Query successful. Rows sample counts:', result.length);
        console.log('Query time:', Date.now() - start, 'ms');
    } catch (e) {
        console.error('Query failed:', e.message);
    }

    db.close();
} catch (e) {
    console.error('Connection failed:', e.message);
}
