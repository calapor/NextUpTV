CREATE TABLE IF NOT EXISTS usage_logs (
  id            BIGSERIAL PRIMARY KEY,
  ts            TIMESTAMPTZ NOT NULL,
  ip            TEXT NOT NULL,
  ua            TEXT NOT NULL,
  route         TEXT NOT NULL,
  status        TEXT NOT NULL,
  duration_ms   INTEGER NOT NULL,
  model         TEXT,
  input_tokens  INTEGER,
  output_tokens INTEGER,
  cost_usd      NUMERIC(10, 6),
  params        JSONB NOT NULL,
  geo           JSONB,
  input_text    TEXT,
  output_text   TEXT
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_ts ON usage_logs (ts DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_route ON usage_logs (route);
