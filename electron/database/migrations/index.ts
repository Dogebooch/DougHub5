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
};
