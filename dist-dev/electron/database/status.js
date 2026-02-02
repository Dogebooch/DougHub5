"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabaseStatus = getDatabaseStatus;
const db_connection_1 = require("./db-connection");
function getDatabaseStatus() {
    const db = (0, db_connection_1.getDatabase)();
    const version = (0, db_connection_1.getSchemaVersion)();
    const cardCount = db.prepare("SELECT COUNT(*) as count FROM cards").get().count;
    const noteCount = db.prepare("SELECT COUNT(*) as count FROM notes").get().count;
    const sourceItemCount = db.prepare("SELECT COUNT(*) as count FROM source_items").get().count;
    let quickCaptureCount = 0;
    try {
        if ((0, db_connection_1.tableExists)("quick_dumps")) {
            quickCaptureCount = db.prepare("SELECT COUNT(*) as count FROM quick_dumps").get().count;
        }
    }
    catch (error) {
        console.error("[Database] Failed to count quick_dumps:", error);
    }
    const inboxCount = db
        .prepare("SELECT COUNT(*) as count FROM source_items WHERE status = 'inbox'")
        .get().count;
    const queueCount = db
        .prepare("SELECT COUNT(*) as count FROM source_items WHERE status = 'inbox' AND sourceType = 'quickcapture'")
        .get().count;
    const notebookCount = db.prepare("SELECT COUNT(*) as count FROM notebook_topic_pages").get().count;
    const connectionCount = db.prepare("SELECT COUNT(*) as count FROM connections").get().count;
    const weakTopicsCount = db
        .prepare("SELECT COUNT(DISTINCT notebookTopicPageId) as count FROM cards WHERE difficulty > 7.0")
        .get().count;
    return {
        version,
        cardCount,
        noteCount,
        sourceItemCount,
        quickCaptureCount,
        inboxCount,
        queueCount,
        notebookCount,
        connectionCount,
        weakTopicsCount,
    };
}
