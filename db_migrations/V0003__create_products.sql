CREATE TABLE t_p51500523_user_profile_pass_sy.products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  privilege TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  duration_ms BIGINT
);