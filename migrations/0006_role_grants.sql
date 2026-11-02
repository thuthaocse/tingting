CREATE TABLE role_grants (
    email text PRIMARY KEY CHECK(email=lower(trim(email))),
    role text NOT NULL CHECK(role IN ('admin','creator')),
    granted_by uuid REFERENCES users(id),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE role_grant_events (
    id uuid PRIMARY KEY,
    email text NOT NULL,
    before_role text,
    after_role text,
    actor_user_id uuid NOT NULL REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now()
);
