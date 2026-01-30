
import path from "path";
import process from "process";
import { initializeConnection, closeDatabase } from "../electron/database/db-connection";
import { cardQueries } from "../electron/database/cards";

async function main() {
  try {
    const appData = process.env.APPDATA || path.join(process.env.HOME || "", "AppData", "Roaming");
    const dbPath = path.join(appData, "doughub", "doughub.db");
    
    console.log(`[Script] Initializing database at: ${dbPath}`);
    initializeConnection(dbPath);

    console.log("[Script] Running getBrowserList...");
    const start = Date.now();
    
    // Test with basic filters (default view)
    const items = cardQueries.getBrowserList({
      // Imitate default empty filters
    }, {
      field: "dueDate",
      direction: "asc"
    });

    const duration = Date.now() - start;
    console.log(`[Script] Success! Query took ${duration}ms`);
    console.log(`[Script] Returned ${items.length} cards`);
    
    if (items.length > 0) {
      const first = items[0];
      console.log("[Script] First card sample:", {
        id: first.id,
        siblingCount: first.siblingCount,
        listSiblingCount: first.listSiblingCount,
        topicName: first.topicName
      });
    }

  } catch (error) {
    console.error("[Script] FAILED:", error);
  } finally {
    closeDatabase();
  }
}

main();
