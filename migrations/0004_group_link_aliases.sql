CREATE TABLE group_link_aliases (
 token text PRIMARY KEY,
 group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE
);
CREATE INDEX group_link_aliases_group_idx ON group_link_aliases(group_id);
