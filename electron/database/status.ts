import { getDatabase, getSchemaVersion, tableExists } from "./db-connection";
import type { DbStatus } from "./types";

export function getDatabaseStatus(): DbStatus {
  const db = getDatabase();
  const version = getSchemaVersion();
  const cardCount = (
    db.prepare("SELECT COUNT(*) as count FROM cards").get() as { count: number }
  ).count;
  const noteCount = (
    db.prepare("SELECT COUNT(*) as count FROM notes").get() as { count: number }
  ).count;
  const sourceItemCount = (
    db.prepare("SELECT COUNT(*) as count FROM source_items").get() as {
      count: number;
    }
  ).count;

  let quickCaptureCount = 0;
  try {
    if (tableExists("quick_dumps")) {
      quickCaptureCount = (
        db.prepare("SELECT COUNT(*) as count FROM quick_dumps").get() as {
          count: number;
        }
      ).count;
    }
  } catch (error) {
    console.error("[Database] Failed to count quick_dumps:", error);
  }

  const inboxCount = (
    db
      .prepare(
        "SELECT COUNT(*) as count FROM source_items WHERE status = 'inbox'"
      )
      .get() as {
      count: number;
    }
  ).count;

  const queueCount = (
    db
      .prepare(
        "SELECT COUNT(*) as count FROM source_items WHERE status = 'inbox' AND sourceType = 'quickcapture'"
      )
      .get() as {
      count: number;
    }
  ).count;

  const notebookCount = (
    db.prepare("SELECT COUNT(*) as count FROM notebook_topic_pages").get() as {
      count: number;
    }
  ).count;

  const connectionCount = (
    db.prepare("SELECT COUNT(*) as count FROM connections").get() as {
      count: number;
    }
  ).count;

  const weakTopicsCount = (
    db
      .prepare(
        "SELECT COUNT(DISTINCT notebookTopicPageId) as count FROM cards WHERE difficulty > 7.0"
      )
      .get() as { count: number }
  ).count;

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
