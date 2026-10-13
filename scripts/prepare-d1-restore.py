"""Prepare one Wrangler SQL snapshot for import into an empty database.

Only reorders complete statements. It never connects to or restores a database.
"""
import argparse
import os
import re
import sqlite3
from pathlib import Path


def prepare(source):
    statements = []
    start = 0
    for position, char in enumerate(source):
        if char == ";" and sqlite3.complete_statement(source[start:position + 1]):
            statements.append(source[start:position + 1].strip())
            start = position + 1
    if source[start:].strip():
        raise ValueError("Snapshot contains an incomplete SQL statement")
    schema, data = [], []
    pragma = None
    for statement in statements:
        if re.fullmatch(r"PRAGMA\s+defer_foreign_keys\s*=\s*(TRUE|ON|1)\s*;", statement, re.I):
            if pragma is not None:
                raise ValueError("Snapshot repeats its foreign-key deferral")
            pragma = statement
        elif re.match(r"CREATE\s+(TABLE|(?:UNIQUE\s+)?INDEX)\s", statement, re.I):
            schema.append(statement)
        elif re.match(r"INSERT\s+INTO\s", statement, re.I) or re.fullmatch(
            r"DELETE\s+FROM\s+sqlite_sequence\s*;", statement, re.I
        ):
            data.append(statement)
        else:
            raise ValueError("Snapshot contains an unsupported statement; review its format")
    if pragma is None or not schema:
        raise ValueError("Expected a complete Wrangler snapshot with schema and deferred foreign keys")
    return "\n".join([pragma, *schema, *data]) + "\n"


def write_snapshot(source, destination):
    prepared = prepare(Path(source).read_text())
    # Never overwrite the original backup or an existing destination/symlink.
    fd = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as output:
        output.write(prepared)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source")
    parser.add_argument("destination", help="New file; existing paths are rejected")
    args = parser.parse_args()
    write_snapshot(args.source, args.destination)
    print("Prepared schema-first snapshot. Import only into an empty isolated database.")
