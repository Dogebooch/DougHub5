
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const { randomUUID } = require('crypto');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'doughub', 'doughub.db');
console.log('Connecting to:', dbPath);

try {
    const db = new Database(dbPath);
    
    // Check tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
    console.log('Tables:', tables);

    if (!tables.includes('cards')) {
        console.error('Table "cards" not found!');
        process.exit(1);
    }
    
    const sourceTable = tables.includes('source_items') ? 'source_items' : (tables.includes('sourceItems') ? 'sourceItems' : null);
    
    if (!sourceTable) {
        console.warn('Could not find source_items table to pull from inbox. Will generate generic cards.');
    } else {
        console.log(`Found source table: ${sourceTable}`);
    }

    const cardCount = db.prepare('SELECT COUNT(*) as count FROM cards').get().count;
    console.log(`Current card count: ${cardCount}`);

    if (cardCount > 0) {
        console.log('Cards already exist. Continuing to add more for testing infinite loop...');
    }

    // Get inbox items to convert
    let inboxItems = [];
    if (sourceTable) {
        inboxItems = db.prepare(`SELECT * FROM ${sourceTable} WHERE status = 'inbox' LIMIT 5`).all();
        console.log(`Found ${inboxItems.length} inbox items to generate cards from.`);
    }

    // Generate Cards
    const insertCard = db.prepare(`
        INSERT INTO cards (
            id, front, back, noteId, tags, dueDate, createdAt, 
            cardType, parentListId, listPosition, notebookTopicPageId, sourceBlockId, aiTitle,
            stability, difficulty, elapsedDays, scheduledDays, reps, lapses, state, lastReview,
            activationStatus
        ) VALUES (
            @id, @front, @back, @noteId, @tags, @dueDate, @createdAt,
            @cardType, @parentListId, @listPosition, @notebookTopicPageId, @sourceBlockId, @aiTitle,
            @stability, @difficulty, @elapsedDays, @scheduledDays, @reps, @lapses, @state, @lastReview,
            @activationStatus
        )
    `);

    const now = new Date().toISOString();
    let cardsAdded = 0;

    const generateCard = (sourceItem) => {
        const id = randomUUID();
        // Create dummy content or use source item
        const front = sourceItem ? `Front: ${sourceItem.title}` : `Generated Card ${cardsAdded + 1}`;
        const back = sourceItem ? `Back: derived from ${sourceItem.sourceName}` : `Answer for generated card ${cardsAdded + 1}`;
        
        return {
            id,
            front,
            back,
            noteId: randomUUID(), // Dummy note ID
            tags: JSON.stringify(['generated', 'test']),
            dueDate: now, // Due now
            createdAt: now,
            cardType: 'standard',
            parentListId: null,
            listPosition: null,
            notebookTopicPageId: null,
            sourceBlockId: sourceItem ? randomUUID() : null, // Simulate linkage
            aiTitle: 'Generated Card',
            stability: 0,
            difficulty: 0,
            elapsedDays: 0,
            scheduledDays: 0,
            reps: 0,
            lapses: 0,
            state: 0, // New
            lastReview: null,
            activationStatus: 'active'
        };
    };

    const runTransaction = db.transaction(() => {
        // 1. Create cards from inbox items
        for (const item of inboxItems) {
            const card = generateCard(item);
            try {
                insertCard.run(card);
                console.log(`Added card ${card.id} from item ${item.id}`);
                cardsAdded++;
            } catch (err) {
                console.error(`Failed to add card from item ${item.id}:`, err.message);
            }
        }

        // 2. If valid inbox items were few, add generic cards up to 5 total
        while (cardsAdded < 5) {
            const card = generateCard(null);
             try {
                insertCard.run(card);
                console.log(`Added generic card ${card.id}`);
                cardsAdded++;
            } catch (err) {
                console.error(`Failed to add generic card:`, err.message);
                 if (err.message.includes('has no column')) {
                     // Check columns and adjust
                     console.error('Column mismatch. Please check schema.');
                     // Fail gracefully
                     throw err; 
                 }
            }
        }
    });

    runTransaction();
    console.log(`Successfully added ${cardsAdded} cards.`);
    db.close();

} catch (err) {
    console.error('Error during seeding:', err);
}
