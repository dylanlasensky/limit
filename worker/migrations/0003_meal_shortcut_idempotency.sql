CREATE UNIQUE INDEX meal_shortcut_create_operation ON meal_shortcut(owner_id, json_extract(data, '$.createOperationId')) WHERE json_extract(data, '$.createOperationId') IS NOT NULL;
