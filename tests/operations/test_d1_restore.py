import importlib.util
import sqlite3
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "prepare_restore", Path(__file__).resolve().parents[2] / "scripts/prepare-d1-restore.py"
)
restore = importlib.util.module_from_spec(spec)
spec.loader.exec_module(restore)


class RestoreSnapshotTests(unittest.TestCase):
    def test_parent_schema_exists_before_child_rows_and_values_are_unchanged(self):
        source = '''PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE child (id TEXT PRIMARY KEY, parent TEXT REFERENCES parent(id), note TEXT);
INSERT INTO child VALUES ('c','p','semicolon; and ''quoted'' text');
CREATE TABLE parent (id TEXT PRIMARY KEY);
INSERT INTO parent VALUES ('p');
CREATE UNIQUE INDEX one_child ON child(parent);
'''
        db = sqlite3.connect(":memory:")
        db.execute("PRAGMA foreign_keys=ON")
        db.executescript("BEGIN;\n" + restore.prepare(source) + "COMMIT;")
        self.assertEqual(db.execute("SELECT note FROM child").fetchone()[0], "semicolon; and 'quoted' text")
        self.assertEqual(db.execute("PRAGMA foreign_key_check").fetchall(), [])
        with self.assertRaises(sqlite3.IntegrityError):
            db.execute("INSERT INTO child VALUES ('other','missing','invalid')")
        db.close()

    def test_same_line_statements_and_sequence_reset_keep_data_order(self):
        source = "PRAGMA defer_foreign_keys=1;CREATE TABLE example (id INTEGER PRIMARY KEY AUTOINCREMENT);INSERT INTO example VALUES (4);DELETE FROM sqlite_sequence;INSERT INTO sqlite_sequence VALUES ('example',9);"
        db = sqlite3.connect(":memory:")
        db.executescript(restore.prepare(source))
        db.execute("INSERT INTO example DEFAULT VALUES")
        self.assertEqual(db.execute("SELECT MAX(id) FROM example").fetchone()[0], 10)
        db.close()

    def test_rejects_incomplete_or_unexpected_mutations_and_disabled_checks(self):
        valid = "PRAGMA defer_foreign_keys=TRUE;CREATE TABLE example(id TEXT);"
        for source in [valid + "INSERT INTO example VALUES ('open", valid + "DELETE FROM example;", valid + "DROP TABLE example;", valid + "PRAGMA foreign_keys=OFF;", valid + "PRAGMA defer_foreign_keys=TRUE;", "CREATE TABLE example(id TEXT);"]:
            with self.subTest(source=source), self.assertRaises(ValueError):
                restore.prepare(source)

    def test_output_is_private_and_never_overwrites_existing_files(self):
        with tempfile.TemporaryDirectory() as directory:
            source, output = Path(directory) / "backup.sql", Path(directory) / "prepared.sql"
            source.write_text("PRAGMA defer_foreign_keys=TRUE;CREATE TABLE example(id TEXT);")
            restore.write_snapshot(source, output)
            self.assertEqual(output.stat().st_mode & 0o777, 0o600)
            original = source.read_text()
            with self.assertRaises(FileExistsError):
                restore.write_snapshot(source, source)
            with self.assertRaises(FileExistsError):
                restore.write_snapshot(source, output)
            self.assertEqual(source.read_text(), original)


if __name__ == "__main__":
    unittest.main()
