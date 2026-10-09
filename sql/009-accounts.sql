CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY,
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  email text NOT NULL DEFAULT '',
  role text NOT NULL CHECK (role IN ('super_admin','supervisor')),
  active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS auth_settings (
  id integer PRIMARY KEY CHECK (id=1),
  jwt_secret text NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  user_version integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_session_user ON auth_sessions(user_id);
CREATE TABLE IF NOT EXISTS auth_login_attempts (
  key text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS account_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor text NOT NULL,
  action text NOT NULL,
  username text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
