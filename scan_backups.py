import sqlite3
import os
import glob

backups_dir = os.path.join(os.environ['APPDATA'], 'doughub', 'backups')
print(f"Backups directory: {backups_dir}")
print(f"Exists: {os.path.exists(backups_dir)}")
print("=" * 60)

# Find all .db files (not .db-shm or .db-wal)
backup_files = sorted(glob.glob(os.path.join(backups_dir, "*.db")))
# Filter out journal files
backup_files = [f for f in backup_files if not (f.endswith('.db-wal') or f.endswith('.db-shm'))]

print(f"Found {len(backup_files)} backup database files\n")

for db_file in backup_files:
    filename = os.path.basename(db_file)
    size_kb = os.path.getsize(db_file) / 1024
    print(f"--- {filename} ({size_kb:.1f} KB) ---")

    try:
        conn = sqlite3.connect(f"file:{db_file}?mode=ro", uri=True)
        c = conn.cursor()

        # Check if source_items table exists
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='source_items'")
        if not c.fetchone():
            print("  (source_items table not found)")
            conn.close()
            continue

        # Count by status
        c.execute("SELECT status, COUNT(*) FROM source_items GROUP BY status")
        status_counts = c.fetchall()

        if not status_counts:
            print("  Status counts: (empty table)")
        else:
            counts_str = ", ".join([f"{row[0]}:{row[1]}" for row in status_counts])
            print(f"  Status counts: {counts_str}")

        # Get total items
        total = c.execute("SELECT COUNT(*) FROM source_items").fetchone()[0]
        print(f"  Total items: {total}")

        # Get inbox items details if any
        c.execute("""
            SELECT title, sourceType, createdAt
            FROM source_items
            WHERE status = 'inbox'
            ORDER BY createdAt DESC
            LIMIT 5
        """)
        inbox_items = c.fetchall()
        if inbox_items:
            print("  Inbox items:")
            for item in inbox_items:
                title = (item[0][:40] + "...") if item[0] and len(item[0]) > 40 else item[0] or "(no title)"
                print(f"    - [{item[1]}] {title}")

        conn.close()
    except Exception as e:
        print(f"  Error: {e}")

    print()

# Also check the template directory
template_dir = os.path.join(os.environ['APPDATA'], 'doughub---template-react-ts')
template_db = os.path.join(template_dir, 'doughub.db')
if os.path.exists(template_db):
    print("\n" + "=" * 60)
    print(f"Found template database: {template_db}")
    print(f"Size: {os.path.getsize(template_db) / 1024:.1f} KB")
    try:
        conn = sqlite3.connect(f"file:{template_db}?mode=ro", uri=True)
        c = conn.cursor()
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='source_items'")
        if c.fetchone():
            total = c.execute("SELECT COUNT(*) FROM source_items").fetchone()[0]
            c.execute("SELECT status, COUNT(*) FROM source_items GROUP BY status")
            counts = c.fetchall()
            print(f"  Total items: {total}")
            if counts:
                print(f"  By status: {dict(counts)}")
        else:
            print("  (source_items table not found)")
        conn.close()
    except Exception as e:
        print(f"  Error: {e}")

print("\n" + "=" * 60)
print("Backup scan complete.")
