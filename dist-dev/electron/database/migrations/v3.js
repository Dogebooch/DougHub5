"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateToV3 = migrateToV3;
const backup_service_1 = require("../../backup-service");
const db_connection_1 = require("../db-connection");
function migrateToV3(dbPath) {
    console.log("[Migration] Starting migration to schema version 3...");
    const backupPath = (0, backup_service_1.createBackup)(dbPath);
    console.log(`[Migration] Backup created: ${backupPath}`);
    const database = (0, db_connection_1.getDatabase)();
    try {
        database.transaction(() => {
            if (!(0, db_connection_1.tableExists)("source_items")) {
                database.exec(`
          CREATE TABLE source_items (
            id TEXT PRIMARY KEY,
            sourceType TEXT NOT NULL,
            sourceName TEXT NOT NULL,
            sourceUrl TEXT,
            title TEXT NOT NULL,
            rawContent TEXT NOT NULL,
            mediaPath TEXT,
            transcription TEXT,
            canonicalTopicIds TEXT NOT NULL DEFAULT '[]',
            tags TEXT NOT NULL DEFAULT '[]',
            questionId TEXT,
            status TEXT NOT NULL DEFAULT 'inbox',
            createdAt TEXT NOT NULL,
            processedAt TEXT,
            updatedAt TEXT
          )
        `);
                console.log("[Migration] Created source_items table");
            }
            if (!(0, db_connection_1.tableExists)("canonical_topics")) {
                database.exec(`
          CREATE TABLE canonical_topics (
            id TEXT PRIMARY KEY,
            canonicalName TEXT NOT NULL UNIQUE,
            aliases TEXT NOT NULL DEFAULT '[]',
            domain TEXT NOT NULL,
            parentTopicId TEXT,
            createdAt TEXT NOT NULL,
            FOREIGN KEY (parentTopicId) REFERENCES canonical_topics(id) ON DELETE RESTRICT
          )
        `);
                console.log("[Migration] Created canonical_topics table");
            }
            if (!(0, db_connection_1.tableExists)("notebook_topic_pages")) {
                database.exec(`
          CREATE TABLE notebook_topic_pages (
            id TEXT PRIMARY KEY,
            canonicalTopicId TEXT NOT NULL,
            cardIds TEXT NOT NULL DEFAULT '[]',
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL,
            FOREIGN KEY (canonicalTopicId) REFERENCES canonical_topics(id) ON DELETE RESTRICT
          )
        `);
                console.log("[Migration] Created notebook_topic_pages table");
            }
            if (!(0, db_connection_1.tableExists)("notebook_blocks")) {
                database.exec(`
          CREATE TABLE notebook_blocks (
            id TEXT PRIMARY KEY,
            notebookTopicPageId TEXT NOT NULL,
            sourceItemId TEXT NOT NULL,
            content TEXT NOT NULL,
            annotations TEXT,
            mediaPath TEXT,
            position INTEGER NOT NULL,
            FOREIGN KEY (notebookTopicPageId) REFERENCES notebook_topic_pages(id) ON DELETE RESTRICT,
            FOREIGN KEY (sourceItemId) REFERENCES source_items(id) ON DELETE RESTRICT
          )
        `);
                console.log("[Migration] Created notebook_blocks table");
            }
            if (!(0, db_connection_1.tableExists)("smart_views")) {
                database.exec(`
          CREATE TABLE smart_views (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            icon TEXT NOT NULL,
            filter TEXT NOT NULL DEFAULT '{}',
            sortBy TEXT NOT NULL,
            isSystem INTEGER NOT NULL DEFAULT 0
          )
        `);
                console.log("[Migration] Created smart_views table");
            }
            if (!(0, db_connection_1.columnExists)("cards", "notebookTopicPageId")) {
                database.exec("ALTER TABLE cards ADD COLUMN notebookTopicPageId TEXT");
                console.log("[Migration] Added cards.notebookTopicPageId column");
            }
            if (!(0, db_connection_1.columnExists)("cards", "sourceBlockId")) {
                database.exec("ALTER TABLE cards ADD COLUMN sourceBlockId TEXT");
                console.log("[Migration] Added cards.sourceBlockId column");
            }
            database.exec(`CREATE INDEX IF NOT EXISTS idx_source_items_status ON source_items(status)`);
            database.exec(`CREATE INDEX IF NOT EXISTS idx_source_items_sourceType ON source_items(sourceType)`);
            database.exec(`CREATE INDEX IF NOT EXISTS idx_canonical_topics_domain ON canonical_topics(domain)`);
            database.exec(`CREATE INDEX IF NOT EXISTS idx_notebook_blocks_page ON notebook_blocks(notebookTopicPageId)`);
            database.exec(`CREATE INDEX IF NOT EXISTS idx_cards_notebook_page ON cards(notebookTopicPageId)`);
            if ((0, db_connection_1.tableExists)("quick_dumps")) {
                const quickDumps = database
                    .prepare("SELECT * FROM quick_dumps")
                    .all();
                if (quickDumps.length > 0) {
                    const insertStmt = database.prepare(`
            INSERT INTO source_items (
              id, sourceType, sourceName, title, rawContent, 
              canonicalTopicIds, tags, status, createdAt, processedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
                    for (const dump of quickDumps) {
                        let status;
                        if (dump.extractionStatus === "completed") {
                            status = "processed";
                        }
                        else {
                            status = "inbox";
                        }
                        const title = dump.content.substring(0, 50).trim() +
                            (dump.content.length > 50 ? "..." : "");
                        insertStmt.run(dump.id, "quickcapture", "Quick Capture", title, dump.content, "[]", "[]", status, dump.createdAt, dump.processedAt);
                    }
                    console.log(`[Migration] Migrated ${quickDumps.length} quick_dumps to source_items`);
                }
            }
            (0, db_connection_1.setSchemaVersion)(3);
        })();
        console.log("[Migration] Successfully migrated to schema version 3");
    }
    catch (error) {
        console.error("[Migration] Failed, restoring backup:", error);
        database.close();
        (0, backup_service_1.restoreBackup)(backupPath, dbPath);
        (0, db_connection_1.reopenConnection)(dbPath);
        throw error;
    }
}
