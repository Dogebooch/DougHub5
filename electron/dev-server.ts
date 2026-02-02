import express from "express";
import cors from "cors";
import { app } from "electron";
import path from "path";
import {
  initDatabase,
  sourceItemQueries,
  cardQueries,
  noteQueries,
  reviewLogQueries,
  quickCaptureQueries,
  connectionQueries,
  canonicalTopicQueries,
  notebookTopicPageQueries,
  notebookBlockQueries,
  notebookLinkQueries,
  smartViewQueries,
  medicalAcronymQueries,
  referenceRangeQueries,
  searchQueries,
  settingsQueries,
  devSettingsQueries,
  intakeQuizQueries,
  topicQuizQueries,
  confusionPatternQueries,
  blockTopicAssignmentQueries,
  knowledgeEntityQueries,
  knowledgeEntityLinkQueries,
  practiceBankQueries,
  simulatorAttemptQueries,
} from "./database";

// Map IPC channel prefixes to their corresponding query modules
const domainMap: Record<string, any> = {
  sourceItems: sourceItemQueries,
  cards: cardQueries,
  notes: noteQueries,
  reviews: reviewLogQueries,
  quickCaptures: quickCaptureQueries,
  connections: connectionQueries,
  canonicalTopics: canonicalTopicQueries,
  notebookPages: notebookTopicPageQueries,
  notebookBlocks: notebookBlockQueries,
  notebookLinks: notebookLinkQueries,
  smartViews: smartViewQueries,
  medicalAcronyms: medicalAcronymQueries,
  "reference-ranges": referenceRangeQueries,
  search: searchQueries,
  settings: settingsQueries,
  dev: devSettingsQueries,
  intakeQuiz: intakeQuizQueries,
  topicQuiz: topicQuizQueries,
  confusionPatterns: confusionPatternQueries,
  blockTopicAssignment: blockTopicAssignmentQueries, // Corrected from blockTopicAssignmentQueries? No, domain name.
  // ipc-handlers uses blockTopicAssignments (plural) handle("blockTopicAssignments:...")
  blockTopicAssignments: blockTopicAssignmentQueries,
  "knowledge-entity": knowledgeEntityQueries,
  "knowledge-entity-link": knowledgeEntityLinkQueries,
  "practice-bank": practiceBankQueries,
  simulator: simulatorAttemptQueries,
  db: {
    status: () => ({ connected: true, path: "doughub.db", version: 28 }),
  },
};

const PORT = 3001;
const server = express();

server.use(
  cors({
    origin: "http://localhost:5173", // Only allow the Vite frontend
    methods: ["POST"], // Only allow POST requests
  }),
);
server.use(express.json({ limit: "50mb" }));

// Route definition
server.post("/api/ipc", async (req, res) => {
  const { channel, args } = req.body;

  if (!channel || typeof channel !== "string") {
    res.status(400).json({ success: false, error: "Invalid channel" });
    return;
  }

  const parts = channel.split(":");
  if (parts.length < 2) {
    res.status(400).json({ success: false, error: "Invalid channel format" });
    return;
  }

  const firstColonIndex = channel.indexOf(":");
  const domainCandidate = channel.substring(0, firstColonIndex);
  const methodCandidate = channel.substring(firstColonIndex + 1);

  const domain = domainCandidate;
  const method = methodCandidate;

  // Handle plural/singular mismatches or specific overrides
  if (!domainMap[domain]) {
    // Try some fallbacks if needed, or just fail
    // e.g. "notebookBlock" vs "notebookBlocks"
  }

  const queryModule = domainMap[domain];
  if (!queryModule) {
    console.warn(`[DevServer] Unknown domain for channel: ${channel}`);
    res
      .status(404)
      .json({ success: false, error: `Unknown domain: ${domain}` });
    return;
  }

  let targetMethod = queryModule[method];
  if (!targetMethod) {
    const camelMethod = method.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    targetMethod = queryModule[camelMethod];
  }

  if (!targetMethod || typeof targetMethod !== "function") {
    console.warn(`[DevServer] Method not found: ${domain}.${method}`);
    res
      .status(404)
      .json({ success: false, error: `Method not found: ${method}` });
    return;
  }

  try {
    console.log(`[DevServer] Invoke: ${channel}`);
    const result = await Promise.resolve(targetMethod(...(args || [])));
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error(`[DevServer] Error invoking ${channel}:`, error);
    res.json({ success: false, error: error.message || String(error) });
  }
});

// Initialize DB and Start Server
app.whenReady().then(() => {
  try {
    const userDataPath = app.getPath("userData");
    console.log(`[DevServer] User Data Path: ${userDataPath}`);

    const dbPath = path.join(userDataPath, "doughub.db");
    console.log("[DevServer] Initializing database at:", dbPath);

    initDatabase(dbPath);
    console.log("[DevServer] Database initialized successfully");

    server.listen(PORT, () => {
      console.log(`[DevServer] HTTP Bridge listening on port ${PORT}`);
      console.log(`[DevServer] Ready to accept IPC requests at /api/ipc`);
    });
  } catch (error) {
    console.error("[DevServer] Failed to initialize:", error);
    process.exit(1);
  }
});
