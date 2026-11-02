CREATE SEQUENCE ledger_entry_order;
ALTER TABLE expenses ADD COLUMN created_order bigint;
ALTER TABLE settlements ADD COLUMN created_order bigint;

CREATE TEMP TABLE initial_entry_order ON COMMIT DROP AS
WITH originals AS (
 SELECT 'expense' AS kind,e.id,COALESCE(MIN(a.created_at),g.created_at) AS first_saved
 FROM expenses e JOIN groups g ON g.id=e.group_id
 LEFT JOIN activity_events a ON a.group_id=e.group_id AND a.entity_id=e.id::text AND a.action='save_expense'
 GROUP BY e.id,g.created_at
 UNION ALL
 SELECT 'settlement',s.id,COALESCE(MIN(a.created_at),g.created_at)
 FROM settlements s JOIN groups g ON g.id=s.group_id
 LEFT JOIN activity_events a ON a.group_id=s.group_id AND a.entity_id=s.id::text AND a.action='save_settlement'
 GROUP BY s.id,g.created_at
)
SELECT kind,id,row_number() OVER(ORDER BY first_saved,kind,id) AS entry_order FROM originals;

UPDATE expenses e SET created_order=i.entry_order FROM initial_entry_order i WHERE i.kind='expense' AND i.id=e.id;
UPDATE settlements s SET created_order=i.entry_order FROM initial_entry_order i WHERE i.kind='settlement' AND i.id=s.id;
SELECT setval('ledger_entry_order',COALESCE((SELECT MAX(entry_order) FROM initial_entry_order),0)+1,false);
ALTER TABLE expenses ALTER COLUMN created_order SET NOT NULL, ALTER COLUMN created_order SET DEFAULT nextval('ledger_entry_order');
ALTER TABLE settlements ALTER COLUMN created_order SET NOT NULL, ALTER COLUMN created_order SET DEFAULT nextval('ledger_entry_order');
CREATE INDEX expenses_activity_order_idx ON expenses(group_id,date DESC,created_order DESC);
CREATE INDEX settlements_activity_order_idx ON settlements(group_id,date DESC,created_order DESC);
