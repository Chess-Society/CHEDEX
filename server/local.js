import { mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createApplication } from './index.js';

const localFactory=()=>{
  mkdirSync('data',{recursive:true});
  const db=new DatabaseSync(process.env.LOCAL_DATABASE||'data/chedex.db');
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
  return {execute:async(sql,args=[])=>db.prepare(sql).all(...args),
    transaction:async statements=>{db.exec('BEGIN IMMEDIATE');try{for(const [sql,args=[]] of statements)db.prepare(sql).run(...args);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}
  };
};
const port=Number(process.env.PORT||3000),origin=process.env.APP_URL||`http://127.0.0.1:${port}`;
const server=await createApplication({localFactory});
server.listen(port,process.env.NODE_ENV==='production'?'0.0.0.0':'127.0.0.1',()=>console.log(`Chedex disponible en ${origin}`));
