import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";
import { getDatabase } from "./db-connection";
import type { DbMedicalAcronym } from "./types";

// __dirname removed

export const medicalAcronymQueries = {
  getAll(): DbMedicalAcronym[] {
    const stmt = getDatabase().prepare("SELECT * FROM medical_acronyms");
    return stmt.all() as DbMedicalAcronym[];
  },

  getByAcronym(acronym: string): DbMedicalAcronym[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM medical_acronyms WHERE acronym = ?",
    );
    return stmt.all(acronym.toUpperCase()) as DbMedicalAcronym[];
  },

  insert(entry: DbMedicalAcronym): void {
    const stmt = getDatabase().prepare(`
      INSERT OR IGNORE INTO medical_acronyms (acronym, expansion, category)
      VALUES (?, ?, ?)
    `);
    stmt.run(
      entry.acronym.toUpperCase(),
      entry.expansion,
      entry.category || null,
    );
    invalidateAcronymCache();
  },

  bulkInsert(entries: DbMedicalAcronym[]): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO medical_acronyms (acronym, expansion, category)
      VALUES (?, ?, ?)
    `);
    const insertMany = db.transaction((items: DbMedicalAcronym[]) => {
      for (const item of items) {
        stmt.run(
          item.acronym.toUpperCase(),
          item.expansion,
          item.category || null,
        );
      }
    });
    insertMany(entries);
    invalidateAcronymCache();
  },

  clear(): void {
    getDatabase().exec("DELETE FROM medical_acronyms");
    invalidateAcronymCache();
  },
};

let acronymCache: Map<string, string[]> | null = null;

export function getAcronymCache(): Map<string, string[]> {
  if (acronymCache) return acronymCache;

  const all = medicalAcronymQueries.getAll();
  const cache = new Map<string, string[]>();
  for (const entry of all) {
    const upper = entry.acronym.toUpperCase();
    if (!cache.has(upper)) {
      cache.set(upper, []);
    }
    cache.get(upper)!.push(entry.expansion);
  }
  acronymCache = cache;
  return cache;
}

export function invalidateAcronymCache(): void {
  acronymCache = null;
}

export function seedMedicalAcronymsFromLocalFile(): void {
  const db = getDatabase();
  const count = db
    .prepare("SELECT COUNT(*) as count FROM medical_acronyms")
    .get() as { count: number };

  if (count.count > 0) {
    return;
  }

  console.log("[Database] Seeding medical acronyms...");

  let loadedAcronyms: {
    acronym: string;
    expansion: string;
    category?: string;
  }[] = [];

  const scriptDir = __dirname;

  try {
    const possiblePaths = [
      path.join(process.cwd(), "src", "data", "medical-acronyms.json"),
      path.join(scriptDir, "..", "src", "data", "medical-acronyms.json"),
      path.join(scriptDir, "assets", "medical-acronyms.json"),
    ];

    let foundPath = "";
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (foundPath) {
      const content = fs.readFileSync(foundPath, "utf8");
      loadedAcronyms = JSON.parse(content);
      console.log(
        `[Database] Loaded ${loadedAcronyms.length} acronyms from ${foundPath}`,
      );
    }
  } catch (error) {
    console.warn(
      "[Database] Failed to load acronyms from file, using fallback list:",
      error,
    );
  }

  if (loadedAcronyms.length === 0) {
    loadedAcronyms = [
      { acronym: "HOCM", expansion: "Hypertrophic Obstructive Cardiomyopathy" },
      { acronym: "ADHF", expansion: "Acute Decompensated Heart Failure" },
      { acronym: "PUD", expansion: "Peptic Ulcer Disease" },
      { acronym: "DKA", expansion: "Diabetic Ketoacidosis" },
      { acronym: "CKD", expansion: "Chronic Kidney Disease" },
      { acronym: "ESRD", expansion: "End Stage Renal Disease" },
      { acronym: "COPD", expansion: "Chronic Obstructive Pulmonary Disease" },
      { acronym: "SLE", expansion: "Systemic Lupus Erythematosus" },
      { acronym: "GERD", expansion: "Gastroesophageal Reflux Disease" },
      {
        acronym: "NSTEMI",
        expansion: "Non-ST Elevation Myocardial Infarction",
      },
      { acronym: "STEMI", expansion: "ST Elevation Myocardial Infarction" },
      {
        acronym: "SIADH",
        expansion: "Syndrome of Inappropriate Antidiuretic Hormone",
      },
      {
        acronym: "TIPS",
        expansion: "Transjugular Intrahepatic Portosystemic Shunt",
      },
      { acronym: "DIC", expansion: "Disseminated Intravascular Coagulation" },
      {
        acronym: "HELLP",
        expansion: "Hemolysis, Elevated Liver enzymes, Low Platelets",
      },
      { acronym: "MODS", expansion: "Multiple Organ Dysfunction Syndrome" },
      { acronym: "SIRS", expansion: "Systemic Inflammatory Response Syndrome" },
      { acronym: "ARDS", expansion: "Acute Respiratory Distress Syndrome" },
      { acronym: "TACE", expansion: "Transarterial Chemoembolization" },
      { acronym: "WPW", expansion: "Wolff-Parkinson-White syndrome" },
      { acronym: "PT", expansion: "Prothrombin Time", category: "Labs" },
      { acronym: "PT", expansion: "Physical Therapy", category: "Rehab" },
      { acronym: "PE", expansion: "Pulmonary Embolism", category: "Pulmonary" },
      {
        acronym: "PE",
        expansion: "Physical Examination",
        category: "Clinical",
      },
    ];
  }

  medicalAcronymQueries.bulkInsert(loadedAcronyms);
  console.log(
    `[Database] Seeded ${loadedAcronyms.length} medical acronyms total`,
  );
}
