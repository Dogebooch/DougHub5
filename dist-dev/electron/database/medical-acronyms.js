"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.medicalAcronymQueries = void 0;
exports.getAcronymCache = getAcronymCache;
exports.invalidateAcronymCache = invalidateAcronymCache;
exports.seedMedicalAcronymsFromLocalFile = seedMedicalAcronymsFromLocalFile;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_connection_1 = require("./db-connection");
// __dirname removed
exports.medicalAcronymQueries = {
    getAll() {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM medical_acronyms");
        return stmt.all();
    },
    getByAcronym(acronym) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM medical_acronyms WHERE acronym = ?");
        return stmt.all(acronym.toUpperCase());
    },
    insert(entry) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      INSERT OR IGNORE INTO medical_acronyms (acronym, expansion, category)
      VALUES (?, ?, ?)
    `);
        stmt.run(entry.acronym.toUpperCase(), entry.expansion, entry.category || null);
        invalidateAcronymCache();
    },
    bulkInsert(entries) {
        const db = (0, db_connection_1.getDatabase)();
        const stmt = db.prepare(`
      INSERT OR IGNORE INTO medical_acronyms (acronym, expansion, category)
      VALUES (?, ?, ?)
    `);
        const insertMany = db.transaction((items) => {
            for (const item of items) {
                stmt.run(item.acronym.toUpperCase(), item.expansion, item.category || null);
            }
        });
        insertMany(entries);
        invalidateAcronymCache();
    },
    clear() {
        (0, db_connection_1.getDatabase)().exec("DELETE FROM medical_acronyms");
        invalidateAcronymCache();
    },
};
let acronymCache = null;
function getAcronymCache() {
    if (acronymCache)
        return acronymCache;
    const all = exports.medicalAcronymQueries.getAll();
    const cache = new Map();
    for (const entry of all) {
        const upper = entry.acronym.toUpperCase();
        if (!cache.has(upper)) {
            cache.set(upper, []);
        }
        cache.get(upper).push(entry.expansion);
    }
    acronymCache = cache;
    return cache;
}
function invalidateAcronymCache() {
    acronymCache = null;
}
function seedMedicalAcronymsFromLocalFile() {
    const db = (0, db_connection_1.getDatabase)();
    const count = db
        .prepare("SELECT COUNT(*) as count FROM medical_acronyms")
        .get();
    if (count.count > 0) {
        return;
    }
    console.log("[Database] Seeding medical acronyms...");
    let loadedAcronyms = [];
    const scriptDir = __dirname;
    try {
        const possiblePaths = [
            path_1.default.join(process.cwd(), "src", "data", "medical-acronyms.json"),
            path_1.default.join(scriptDir, "..", "src", "data", "medical-acronyms.json"),
            path_1.default.join(scriptDir, "assets", "medical-acronyms.json"),
        ];
        let foundPath = "";
        for (const p of possiblePaths) {
            if (fs_1.default.existsSync(p)) {
                foundPath = p;
                break;
            }
        }
        if (foundPath) {
            const content = fs_1.default.readFileSync(foundPath, "utf8");
            loadedAcronyms = JSON.parse(content);
            console.log(`[Database] Loaded ${loadedAcronyms.length} acronyms from ${foundPath}`);
        }
    }
    catch (error) {
        console.warn("[Database] Failed to load acronyms from file, using fallback list:", error);
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
    exports.medicalAcronymQueries.bulkInsert(loadedAcronyms);
    console.log(`[Database] Seeded ${loadedAcronyms.length} medical acronyms total`);
}
