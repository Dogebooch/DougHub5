"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchQueries = void 0;
const medical_acronyms_1 = require("./medical-acronyms");
const db_connection_1 = require("./db-connection");
exports.searchQueries = {
    search(query, filter = "all", limit = 50) {
        const startTime = performance.now();
        const db = (0, db_connection_1.getDatabase)();
        const cache = (0, medical_acronyms_1.getAcronymCache)();
        const searchTags = [];
        const textQuery = query
            .replace(/#(\w+)/g, (_, tag) => {
            searchTags.push(tag.toLowerCase());
            return "";
        })
            .trim();
        const terms = textQuery
            .replace(/['"]/g, "")
            .split(/\s+/)
            .filter(Boolean)
            .map((term) => {
            const upperTerm = term.toUpperCase();
            const expansions = cache.get(upperTerm);
            if (expansions && expansions.length > 0) {
                const orTerms = [
                    `"${term}"*`,
                    ...expansions.map((exp) => `"${exp}"`),
                ];
                return `(${orTerms.join(" OR ")})`;
            }
            return `"${term}"*`;
        });
        const tagTerms = searchTags.map((tag) => `tags:${tag}`);
        let ftsQuery = "";
        if (terms.length > 0 && tagTerms.length > 0) {
            ftsQuery = `(${terms.join(" AND ")}) AND ${tagTerms.join(" AND ")}`;
        }
        else if (terms.length > 0) {
            ftsQuery = terms.join(" AND ");
        }
        else if (tagTerms.length > 0) {
            ftsQuery = tagTerms.join(" AND ");
        }
        if (!ftsQuery) {
            return {
                results: [],
                counts: { all: 0, cards: 0, notes: 0, inbox: 0 },
                queryTimeMs: performance.now() - startTime,
            };
        }
        const results = [];
        if (filter === "all" || filter === "cards") {
            const cardsStmt = db.prepare(`
        SELECT
          c.id,
          c.createdAt,
          c.tags,
          snippet(cards_fts, 1, '<mark>', '</mark>', '...', 32) as s1,
          snippet(cards_fts, 2, '<mark>', '</mark>', '...', 32) as s2,
          snippet(cards_fts, 3, '<mark>', '</mark>', '...', 32) as s3
        FROM cards_fts
        JOIN cards c ON cards_fts.id = c.id
        WHERE cards_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `);
            const cardRows = cardsStmt.all(ftsQuery, limit);
            cardRows.forEach((row) => {
                const snippet = [row.s1, row.s2, row.s3].find((s) => s && s.includes("<mark>")) ||
                    row.s1 ||
                    "";
                results.push({
                    id: row.id,
                    type: "card",
                    title: row.s1 ? row.s1.replace(/<mark>|<\/mark>/g, "") : "",
                    snippet: snippet,
                    createdAt: row.createdAt,
                    tags: row.tags ? JSON.parse(row.tags) : [],
                });
            });
        }
        if (filter === "all" || filter === "notes") {
            const notesStmt = db.prepare(`
        SELECT
          n.id,
          n.title,
          n.createdAt,
          n.tags,
          snippet(notes_fts, 1, '<mark>', '</mark>', '...', 32) as s1,
          snippet(notes_fts, 2, '<mark>', '</mark>', '...', 32) as s2,
          snippet(notes_fts, 3, '<mark>', '</mark>', '...', 32) as s3
        FROM notes_fts
        JOIN notes n ON notes_fts.id = n.id
        WHERE notes_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `);
            const noteRows = notesStmt.all(ftsQuery, limit);
            noteRows.forEach((row) => {
                const snippet = [row.s2, row.s1, row.s3].find((s) => s && s.includes("<mark>")) ||
                    row.s2 ||
                    "";
                results.push({
                    id: row.id,
                    type: "note",
                    title: row.title,
                    snippet: snippet,
                    createdAt: row.createdAt,
                    tags: row.tags ? JSON.parse(row.tags) : [],
                });
            });
        }
        if (filter === "all" || filter === "inbox") {
            const sourceStmt = db.prepare(`
        SELECT
          s.id,
          s.title,
          s.createdAt,
          s.tags,
          snippet(source_items_fts, 1, '<mark>', '</mark>', '...', 32) as s1,
          snippet(source_items_fts, 2, '<mark>', '</mark>', '...', 32) as s2,
          snippet(source_items_fts, 4, '<mark>', '</mark>', '...', 32) as s3,
          snippet(source_items_fts, 5, '<mark>', '</mark>', '...', 32) as s4
        FROM source_items_fts
        JOIN source_items s ON source_items_fts.id = s.id
        WHERE source_items_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `);
            const sourceRows = sourceStmt.all(ftsQuery, limit);
            sourceRows.forEach((row) => {
                const snippet = [row.s2, row.s4, row.s1, row.s3].find((s) => s && s.includes("<mark>")) ||
                    row.s2 ||
                    "";
                results.push({
                    id: row.id,
                    type: "source_item",
                    title: row.title,
                    snippet: snippet,
                    createdAt: row.createdAt,
                    tags: row.tags ? JSON.parse(row.tags) : [],
                });
            });
        }
        const counts = { all: 0, cards: 0, notes: 0, inbox: 0 };
        try {
            counts.cards = db
                .prepare(`SELECT COUNT(*) as count FROM cards_fts WHERE cards_fts MATCH ?`)
                .get(ftsQuery).count;
        }
        catch {
            counts.cards = 0;
        }
        try {
            counts.notes = db
                .prepare(`SELECT COUNT(*) as count FROM notes_fts WHERE notes_fts MATCH ?`)
                .get(ftsQuery).count;
        }
        catch {
            counts.notes = 0;
        }
        try {
            counts.inbox = db
                .prepare(`SELECT COUNT(*) as count FROM source_items_fts WHERE source_items_fts MATCH ?`)
                .get(ftsQuery).count;
        }
        catch {
            counts.inbox = 0;
        }
        counts.all = counts.cards + counts.notes + counts.inbox;
        const queryTimeMs = performance.now() - startTime;
        if (queryTimeMs > 200) {
            console.warn(`[Search] Query took ${queryTimeMs.toFixed(1)}ms (>200ms threshold)`);
        }
        return {
            results,
            counts,
            queryTimeMs,
        };
    },
};
