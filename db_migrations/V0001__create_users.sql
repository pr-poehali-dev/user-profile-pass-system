CREATE TABLE t_p51500523_user_profile_pass_sy.users (
  username TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  admin_granted_by TEXT,
  coins INTEGER NOT NULL DEFAULT 0
);