import { getSchemaVersion } from "../db-connection";
import { migrateToV2 } from "./v2";
import { migrateToV3 } from "./v3";
import { migrateToV4 } from "./v4";
import { migrateToV5 } from "./v5";
import { migrateToV6 } from "./v6";
import { migrateToV7 } from "./v7";
import { migrateToV8 } from "./v8";
import { migrateToV9 } from "./v9";
import { migrateToV10 } from "./v10";
import { migrateToV11 } from "./v11";
import { migrateToV12 } from "./v12";
import { migrateToV13 } from "./v13";
import { migrateToV14 } from "./v14";
import { migrateToV15 } from "./v15";
import { migrateToV16 } from "./v16";
import { migrateToV17 } from "./v17";
import { migrateToV18 } from "./v18";
import { migrateToV19 } from "./v19";
import { migrateToV20 } from "./v20";
import { migrateToV21 } from "./v21";
import { migrateToV22 } from "./v22";
import { migrateToV23 } from "./v23";
import { migrateToV24 } from "./v24";
import { migrateToV25 } from "./v25";
import { migrateToV26 } from "./v26";
import { migrateToV27 } from "./v27";
import { migrateToV28 } from "./v28";

export function runMigrations(dbPath: string): void {
  // Apply migrations in order until the schema reaches the latest version.
  let currentVersion = getSchemaVersion();

  if (currentVersion < 2) {
    migrateToV2(dbPath);
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 3) {
    migrateToV3(dbPath);
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 4) {
    migrateToV4(dbPath);
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 5) {
    migrateToV5();
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 6) {
    migrateToV6();
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 7) {
    migrateToV7(dbPath);
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 8) {
    migrateToV8(dbPath);
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 9) {
    migrateToV9(dbPath);
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 10) {
    migrateToV10(dbPath);
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 11) {
    migrateToV11(dbPath);
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 12) {
    migrateToV12(dbPath);
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 13) {
    migrateToV13(dbPath);
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 14) {
    migrateToV14(dbPath);
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 15) {
    migrateToV15();
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 16) {
    migrateToV16();
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 17) {
    migrateToV17();
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 18) {
    migrateToV18();
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 19) {
    migrateToV19();
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 20) {
    migrateToV20();
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 21) {
    migrateToV21(dbPath);
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 22) {
    migrateToV22();
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 23) {
    migrateToV23();
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 24) {
    migrateToV24();
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 25) {
    migrateToV25();
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 26) {
    migrateToV26();
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 27) {
    migrateToV27();
    currentVersion = getSchemaVersion();
  }
  if (currentVersion < 28) {
    migrateToV28();
  }
}

export {
  migrateToV2,
  migrateToV3,
  migrateToV4,
  migrateToV5,
  migrateToV6,
  migrateToV7,
  migrateToV8,
  migrateToV9,
  migrateToV10,
  migrateToV11,
  migrateToV12,
  migrateToV13,
  migrateToV14,
  migrateToV15,
  migrateToV16,
  migrateToV17,
  migrateToV18,
  migrateToV19,
  migrateToV20,
  migrateToV21,
  migrateToV22,
  migrateToV23,
  migrateToV24,
  migrateToV25,
  migrateToV26,
  migrateToV27,
  migrateToV28,
};
