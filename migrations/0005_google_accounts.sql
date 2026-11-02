CREATE TABLE users (
    id uuid PRIMARY KEY,
    google_subject text NOT NULL UNIQUE,
    email text NOT NULL,
    name text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE user_sessions (
    token_hash text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL
);
CREATE TABLE oauth_login_attempts (
    state_hash text PRIMARY KEY,
    browser_hash text NOT NULL,
    nonce text NOT NULL,
    verifier text NOT NULL,
    return_to text NOT NULL,
    expires_at timestamptz NOT NULL
);
ALTER TABLE activity_events ADD COLUMN actor_user_id uuid REFERENCES users(id);
-- Password sessions no longer authorize access. Keep old admin rows for audit history.
DELETE FROM admin_sessions;
