import { exerciseCatalog } from '../packages/domain/exerciseCatalog.js';
import { writeFileSync } from 'node:fs';
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
const rows=exerciseCatalog.map(row=>`INSERT INTO exercise (id,owner_id,created_at,updated_at,data) VALUES (${quote(row.catalogKey)},NULL,'2026-09-27T00:00:00Z','2026-09-27T00:00:00Z',${quote(JSON.stringify(row))}) ON CONFLICT(id) DO UPDATE SET data=excluded.data;`);
const sql=rows.join('\n')+'\n';
if(process.argv[2])writeFileSync(process.argv[2],sql);else process.stdout.write(sql);
