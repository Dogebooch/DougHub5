import sqlite3
import os

template_db = os.path.join(os.environ['APPDATA'], 'doughub---template-react-ts', 'doughub.db')
print(f"Template Database: {template_db}")
print("=" * 60)

conn = sqlite3.connect(f"file:{template_db}?mode=ro", uri=True)
c = conn.cursor()

# Get all inbox items with full details
print("\n=== INBOX ITEMS (10 total) ===")
c.execute("""
    SELECT id, title, sourceType, sourceName, createdAt
    FROM source_items
    WHERE status = 'inbox'
    ORDER BY createdAt DESC
""")
for i, row in enumerate(c.fetchall(), 1):
    print(f"\n{i}. ID: {row[0]}")
    print(f"   Title: {row[1]}")
    print(f"   Type: {row[2]} / {row[3]}")
    print(f"   Created: {row[4]}")

# Get processed items
print("\n\n=== PROCESSED ITEMS (1 total) ===")
c.execute("""
    SELECT id, title, sourceType, createdAt
    FROM source_items
    WHERE status = 'processed'
""")
for row in c.fetchall():
    print(f"  {row[1][:50] if row[1] else '(no title)'}")
    print(f"    ID: {row[0]}, Type: {row[2]}")

# Get curated items
print("\n\n=== CURATED ITEMS (2 total) ===")
c.execute("""
    SELECT id, title, sourceType, createdAt
    FROM source_items
    WHERE status = 'curated'
""")
for row in c.fetchall():
    print(f"  {row[1][:50] if row[1] else '(no title)'}")
    print(f"    ID: {row[0]}, Type: {row[2]}")

# Check schema version
version = c.execute("PRAGMA user_version").fetchone()[0]
print(f"\n\nSchema version: {version}")

conn.close()
print("\n" + "=" * 60)
