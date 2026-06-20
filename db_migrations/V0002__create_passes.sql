CREATE TABLE t_p51500523_user_profile_pass_sy.passes (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  title TEXT NOT NULL,
  privilege TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  expires_at BIGINT
);