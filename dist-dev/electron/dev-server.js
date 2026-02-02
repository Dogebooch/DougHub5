"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const database_1 = require("./database");
// Map IPC channel prefixes to their corresponding query modules
const domainMap = {
    sourceItems: database_1.sourceItemQueries,
    cards: database_1.cardQueries,
    notes: database_1.noteQueries,
    reviews: database_1.reviewLogQueries,
    quickCaptures: database_1.quickCaptureQueries,
    connections: database_1.connectionQueries,
    canonicalTopics: database_1.canonicalTopicQueries,
    notebookPages: database_1.notebookTopicPageQueries,
    notebookBlocks: database_1.notebookBlockQueries,
    notebookLinks: database_1.notebookLinkQueries,
    smartViews: database_1.smartViewQueries,
    medicalAcronyms: database_1.medicalAcronymQueries,
    "reference-ranges": database_1.referenceRangeQueries,
    search: database_1.searchQueries,
    settings: database_1.settingsQueries,
    dev: database_1.devSettingsQueries,
    intakeQuiz: database_1.intakeQuizQueries,
    topicQuiz: database_1.topicQuizQueries,
    confusionPatterns: database_1.confusionPatternQueries,
    blockTopicAssignment: database_1.blockTopicAssignmentQueries, // Corrected from blockTopicAssignmentQueries? No, domain name.
    // ipc-handlers uses blockTopicAssignments (plural) handle("blockTopicAssignments:...")
    blockTopicAssignments: database_1.blockTopicAssignmentQueries,
    "knowledge-entity": database_1.knowledgeEntityQueries,
    "knowledge-entity-link": database_1.knowledgeEntityLinkQueries,
    "practice-bank": database_1.practiceBankQueries,
    simulator: database_1.simulatorAttemptQueries,
    db: {
        status: () => ({ connected: true, path: "doughub.db", version: 28 }),
    },
};
const PORT = 3001;
const server = (0, express_1.default)();
server.use((0, cors_1.default)({
    origin: "http://localhost:5173", // Only allow the Vite frontend
    methods: ["POST"], // Only allow POST requests
}));
server.use(express_1.default.json({ limit: "50mb" }));
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
    }
    catch (error) {
        console.error(`[DevServer] Error invoking ${channel}:`, error);
        res.json({ success: false, error: error.message || String(error) });
    }
});
// Initialize DB and Start Server
electron_1.app.whenReady().then(() => {
    try {
        const userDataPath = electron_1.app.getPath("userData");
        console.log(`[DevServer] User Data Path: ${userDataPath}`);
        const dbPath = path_1.default.join(userDataPath, "doughub.db");
        console.log("[DevServer] Initializing database at:", dbPath);
        (0, database_1.initDatabase)(dbPath);
        console.log("[DevServer] Database initialized successfully");
        server.listen(PORT, () => {
            console.log(`[DevServer] HTTP Bridge listening on port ${PORT}`);
            console.log(`[DevServer] Ready to accept IPC requests at /api/ipc`);
        });
    }
    catch (error) {
        console.error("[DevServer] Failed to initialize:", error);
        process.exit(1);
    }
});
