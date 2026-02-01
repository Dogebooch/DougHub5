import sqlite3
import os

db_path = os.path.join(os.environ['APPDATA'], 'doughub', 'doughub.db')
print(f"Database: {db_path}")
print(f"Exists: {os.path.exists(db_path)}")
print("=" * 60)

conn = sqlite3.connect(db_path)
c = conn.cursor()

# Status counts
print("\n=== STATUS COUNTS ===")
c.execute("SELECT status, COUNT(*) FROM source_items GROUP BY status")
for row in c.fetchall():
    print(f"  {row[0]}: {row[1]}")

total = c.execute("SELECT COUNT(*) FROM source_items").fetchone()[0]
print(f"  TOTAL: {total}")

# Current inbox items
print("\n=== CURRENT INBOX ITEMS ===")
c.execute("""
    SELECT id, title, sourceType, createdAt
    FROM source_items
    WHERE status = 'inbox'
    ORDER BY createdAt DESC
    LIMIT 15
""")
inbox_items = c.fetchall()
if not inbox_items:
    print("  (No inbox items found)")
else:
    for i, row in enumerate(inbox_items, 1):
        title = (row[1][:50] + "...") if row[1] and len(row[1]) > 50 else row[1] or "(no title)"
        print(f"  {i}. [{row[2]}] {title}")
        print(f"     Created: {row[3]}")

# Recent curated items (where inbox items may have moved to)
print("\n=== RECENTLY CURATED (may have been inbox) ===")
c.execute("""
    SELECT title, sourceType, createdAt, updatedAt
    FROM source_items
    WHERE status = 'curated'
    ORDER BY updatedAt DESC
    LIMIT 10
""")
curated_items = c.fetchall()
if not curated_items:
    print("  (No curated items)")
else:
    for i, row in enumerate(curated_items, 1):
        title = (row[0][:40] + "...") if row[0] and len(row[0]) > 40 else row[0] or "(no title)"
        print(f"  {i}. [{row[1]}] {title}")
        print(f"     Created: {row[2]}, Updated: {row[3] or 'N/A'}")

# Items from last 2 weeks
print("\n=== ITEMS CREATED LAST 14 DAYS (by status) ===")
c.execute("""
    SELECT status, COUNT(*)
    FROM source_items
    WHERE createdAt >= datetime('now', '-14 days')
    GROUP BY status
""")
recent = c.fetchall()
if not recent:
    print("  (No items in last 14 days)")
else:
    for row in recent:
        print(f"  {row[0]}: {row[1]}")

# Today's items
print("\n=== ITEMS CREATED TODAY ===")
c.execute("""
    SELECT title, status, sourceType, createdAt
    FROM source_items
    WHERE date(createdAt) = date('now')
    ORDER BY createdAt DESC
""")
today_items = c.fetchall()
if not today_items:
    print("  (No items created today)")
else:
    for i, row in enumerate(today_items, 1):
        title = (row[0][:35] + "...") if row[0] and len(row[0]) > 35 else row[0] or "(no title)"
        print(f"  {i}. [{row[1]}][{row[2]}] {title}")

conn.close()
print("\n" + "=" * 60)
print("Diagnostic complete.")
