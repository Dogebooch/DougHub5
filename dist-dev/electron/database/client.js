"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockTopicAssignmentQueries = exports.confusionPatternQueries = exports.topicQuizQueries = exports.intakeQuizQueries = exports.tableExists = exports.columnExists = exports.setSchemaVersion = exports.getSchemaVersion = exports.getDbPath = exports.closeDatabase = exports.getDatabase = void 0;
exports.initDatabase = initDatabase;
const db_connection_1 = require("./db-connection");
const schema_1 = require("./schema");
const migrations_1 = require("./migrations");
const smart_views_1 = require("./smart-views");
const medical_acronyms_1 = require("./medical-acronyms");
const reference_ranges_1 = require("./reference-ranges");
function initDatabase(dbPath) {
    const db = (0, db_connection_1.initializeConnection)(dbPath);
    const version = (0, db_connection_1.getSchemaVersion)();
    if (version === 0) {
        (0, schema_1.createInitialSchema)((0, db_connection_1.getDatabase)(), db_connection_1.setSchemaVersion);
    }
    (0, migrations_1.runMigrations)(dbPath);
    const updatedVersion = (0, db_connection_1.getSchemaVersion)();
    if (updatedVersion >= 3) {
        (0, smart_views_1.seedSystemSmartViews)();
    }
    if (updatedVersion >= 5) {
        (0, medical_acronyms_1.seedMedicalAcronymsFromLocalFile)();
    }
    if (updatedVersion >= 15) {
        (0, reference_ranges_1.seedReferenceRangesFromLocalFile)();
    }
    // Optimize file size after initialization and seeding
    (0, db_connection_1.vacuumDatabase)();
    return db;
}
var db_connection_2 = require("./db-connection");
Object.defineProperty(exports, "getDatabase", { enumerable: true, get: function () { return db_connection_2.getDatabase; } });
Object.defineProperty(exports, "closeDatabase", { enumerable: true, get: function () { return db_connection_2.closeDatabase; } });
Object.defineProperty(exports, "getDbPath", { enumerable: true, get: function () { return db_connection_2.getDbPath; } });
Object.defineProperty(exports, "getSchemaVersion", { enumerable: true, get: function () { return db_connection_2.getSchemaVersion; } });
Object.defineProperty(exports, "setSchemaVersion", { enumerable: true, get: function () { return db_connection_2.setSchemaVersion; } });
Object.defineProperty(exports, "columnExists", { enumerable: true, get: function () { return db_connection_2.columnExists; } });
Object.defineProperty(exports, "tableExists", { enumerable: true, get: function () { return db_connection_2.tableExists; } });
// Notebook v2 query modules (v24)
var intake_quiz_1 = require("./intake-quiz");
Object.defineProperty(exports, "intakeQuizQueries", { enumerable: true, get: function () { return intake_quiz_1.intakeQuizQueries; } });
var topic_quiz_1 = require("./topic-quiz");
Object.defineProperty(exports, "topicQuizQueries", { enumerable: true, get: function () { return topic_quiz_1.topicQuizQueries; } });
var confusion_patterns_1 = require("./confusion-patterns");
Object.defineProperty(exports, "confusionPatternQueries", { enumerable: true, get: function () { return confusion_patterns_1.confusionPatternQueries; } });
var block_topic_assignments_1 = require("./block-topic-assignments");
Object.defineProperty(exports, "blockTopicAssignmentQueries", { enumerable: true, get: function () { return block_topic_assignments_1.blockTopicAssignmentQueries; } });
