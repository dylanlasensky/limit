CREATE TABLE operational_error_count (
  day TEXT NOT NULL,
  stage TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, stage)
);
