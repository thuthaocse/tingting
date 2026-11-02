BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT json_build_object('format','tingting-postgres-v1',
'groups', (SELECT coalesce(json_agg(t),'[]'::json) FROM groups t),
'members', (SELECT coalesce(json_agg(t),'[]'::json) FROM members t),
'expenses', (SELECT coalesce(json_agg(t),'[]'::json) FROM expenses t),
'expense_shares', (SELECT coalesce(json_agg(t),'[]'::json) FROM expense_shares t),
'settlements', (SELECT coalesce(json_agg(t),'[]'::json) FROM settlements t),
'activity_events', (SELECT coalesce(json_agg(t),'[]'::json) FROM activity_events t),
'group_link_aliases', (SELECT coalesce(json_agg(t),'[]'::json) FROM group_link_aliases t),
'users', (SELECT coalesce(json_agg(t),'[]'::json) FROM users t),
'user_sessions', (SELECT coalesce(json_agg(t),'[]'::json) FROM user_sessions t),
'role_grants', (SELECT coalesce(json_agg(t),'[]'::json) FROM role_grants t),
'role_grant_events', (SELECT coalesce(json_agg(t),'[]'::json) FROM role_grant_events t),
'admins', (SELECT coalesce(json_agg(t),'[]'::json) FROM admins t));
COMMIT;
