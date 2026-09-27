import {readFileSync} from 'node:fs';
import Ajv from 'ajv';
const ajv=new Ajv({allErrors:true,strict:false,allowUnionTypes:true});
const schema=JSON.parse(readFileSync('node_modules/wrangler/config-schema.json','utf8'));
const validate=ajv.compile(schema);
if(!validate(JSON.parse(readFileSync('wrangler.jsonc','utf8')))){console.error(validate.errors);process.exit(1);}
console.log('Wrangler configuration matches the installed current schema.');
