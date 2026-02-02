"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateToV28 = exports.migrateToV27 = exports.migrateToV26 = exports.migrateToV25 = exports.migrateToV24 = exports.migrateToV23 = exports.migrateToV22 = exports.migrateToV21 = exports.migrateToV20 = exports.migrateToV19 = exports.migrateToV18 = exports.migrateToV17 = exports.migrateToV16 = exports.migrateToV15 = exports.migrateToV14 = exports.migrateToV13 = exports.migrateToV12 = exports.migrateToV11 = exports.migrateToV10 = exports.migrateToV9 = exports.migrateToV8 = exports.migrateToV7 = exports.migrateToV6 = exports.migrateToV5 = exports.migrateToV4 = exports.migrateToV3 = exports.migrateToV2 = void 0;
exports.runMigrations = runMigrations;
const db_connection_1 = require("../db-connection");
const v2_1 = require("./v2");
Object.defineProperty(exports, "migrateToV2", { enumerable: true, get: function () { return v2_1.migrateToV2; } });
const v3_1 = require("./v3");
Object.defineProperty(exports, "migrateToV3", { enumerable: true, get: function () { return v3_1.migrateToV3; } });
const v4_1 = require("./v4");
Object.defineProperty(exports, "migrateToV4", { enumerable: true, get: function () { return v4_1.migrateToV4; } });
const v5_1 = require("./v5");
Object.defineProperty(exports, "migrateToV5", { enumerable: true, get: function () { return v5_1.migrateToV5; } });
const v6_1 = require("./v6");
Object.defineProperty(exports, "migrateToV6", { enumerable: true, get: function () { return v6_1.migrateToV6; } });
const v7_1 = require("./v7");
Object.defineProperty(exports, "migrateToV7", { enumerable: true, get: function () { return v7_1.migrateToV7; } });
const v8_1 = require("./v8");
Object.defineProperty(exports, "migrateToV8", { enumerable: true, get: function () { return v8_1.migrateToV8; } });
const v9_1 = require("./v9");
Object.defineProperty(exports, "migrateToV9", { enumerable: true, get: function () { return v9_1.migrateToV9; } });
const v10_1 = require("./v10");
Object.defineProperty(exports, "migrateToV10", { enumerable: true, get: function () { return v10_1.migrateToV10; } });
const v11_1 = require("./v11");
Object.defineProperty(exports, "migrateToV11", { enumerable: true, get: function () { return v11_1.migrateToV11; } });
const v12_1 = require("./v12");
Object.defineProperty(exports, "migrateToV12", { enumerable: true, get: function () { return v12_1.migrateToV12; } });
const v13_1 = require("./v13");
Object.defineProperty(exports, "migrateToV13", { enumerable: true, get: function () { return v13_1.migrateToV13; } });
const v14_1 = require("./v14");
Object.defineProperty(exports, "migrateToV14", { enumerable: true, get: function () { return v14_1.migrateToV14; } });
const v15_1 = require("./v15");
Object.defineProperty(exports, "migrateToV15", { enumerable: true, get: function () { return v15_1.migrateToV15; } });
const v16_1 = require("./v16");
Object.defineProperty(exports, "migrateToV16", { enumerable: true, get: function () { return v16_1.migrateToV16; } });
const v17_1 = require("./v17");
Object.defineProperty(exports, "migrateToV17", { enumerable: true, get: function () { return v17_1.migrateToV17; } });
const v18_1 = require("./v18");
Object.defineProperty(exports, "migrateToV18", { enumerable: true, get: function () { return v18_1.migrateToV18; } });
const v19_1 = require("./v19");
Object.defineProperty(exports, "migrateToV19", { enumerable: true, get: function () { return v19_1.migrateToV19; } });
const v20_1 = require("./v20");
Object.defineProperty(exports, "migrateToV20", { enumerable: true, get: function () { return v20_1.migrateToV20; } });
const v21_1 = require("./v21");
Object.defineProperty(exports, "migrateToV21", { enumerable: true, get: function () { return v21_1.migrateToV21; } });
const v22_1 = require("./v22");
Object.defineProperty(exports, "migrateToV22", { enumerable: true, get: function () { return v22_1.migrateToV22; } });
const v23_1 = require("./v23");
Object.defineProperty(exports, "migrateToV23", { enumerable: true, get: function () { return v23_1.migrateToV23; } });
const v24_1 = require("./v24");
Object.defineProperty(exports, "migrateToV24", { enumerable: true, get: function () { return v24_1.migrateToV24; } });
const v25_1 = require("./v25");
Object.defineProperty(exports, "migrateToV25", { enumerable: true, get: function () { return v25_1.migrateToV25; } });
const v26_1 = require("./v26");
Object.defineProperty(exports, "migrateToV26", { enumerable: true, get: function () { return v26_1.migrateToV26; } });
const v27_1 = require("./v27");
Object.defineProperty(exports, "migrateToV27", { enumerable: true, get: function () { return v27_1.migrateToV27; } });
const v28_1 = require("./v28");
Object.defineProperty(exports, "migrateToV28", { enumerable: true, get: function () { return v28_1.migrateToV28; } });
function runMigrations(dbPath) {
    // Apply migrations in order until the schema reaches the latest version.
    let currentVersion = (0, db_connection_1.getSchemaVersion)();
    if (currentVersion < 2) {
        (0, v2_1.migrateToV2)(dbPath);
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 3) {
        (0, v3_1.migrateToV3)(dbPath);
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 4) {
        (0, v4_1.migrateToV4)(dbPath);
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 5) {
        (0, v5_1.migrateToV5)();
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 6) {
        (0, v6_1.migrateToV6)();
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 7) {
        (0, v7_1.migrateToV7)(dbPath);
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 8) {
        (0, v8_1.migrateToV8)(dbPath);
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 9) {
        (0, v9_1.migrateToV9)(dbPath);
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 10) {
        (0, v10_1.migrateToV10)(dbPath);
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 11) {
        (0, v11_1.migrateToV11)(dbPath);
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 12) {
        (0, v12_1.migrateToV12)(dbPath);
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 13) {
        (0, v13_1.migrateToV13)(dbPath);
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 14) {
        (0, v14_1.migrateToV14)(dbPath);
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 15) {
        (0, v15_1.migrateToV15)();
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 16) {
        (0, v16_1.migrateToV16)();
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 17) {
        (0, v17_1.migrateToV17)();
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 18) {
        (0, v18_1.migrateToV18)();
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 19) {
        (0, v19_1.migrateToV19)();
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 20) {
        (0, v20_1.migrateToV20)();
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 21) {
        (0, v21_1.migrateToV21)(dbPath);
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 22) {
        (0, v22_1.migrateToV22)();
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 23) {
        (0, v23_1.migrateToV23)();
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 24) {
        (0, v24_1.migrateToV24)();
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 25) {
        (0, v25_1.migrateToV25)();
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 26) {
        (0, v26_1.migrateToV26)();
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 27) {
        (0, v27_1.migrateToV27)();
        currentVersion = (0, db_connection_1.getSchemaVersion)();
    }
    if (currentVersion < 28) {
        (0, v28_1.migrateToV28)();
    }
}
