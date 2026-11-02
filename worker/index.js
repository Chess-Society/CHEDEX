import { httpServerHandler } from 'cloudflare:node';
import { createApplication } from '../server/index.js';

let ready;
export default {
  async fetch(request,env,ctx) {
    if(!ready)ready=(async()=>{
      const server=await createApplication({clientAddress:req=>req.headers['cf-connecting-ip'],readAsset:async file=>{
        const response=await env.ASSETS.fetch(new Request(`https://assets.local/${file}`));
        if(!response.ok)throw new Error('ASSET_MISSING');
        return Buffer.from(await response.arrayBuffer());
      }});
      return httpServerHandler(server);
    })().catch(error=>{ready=undefined;throw error;});
    try{return await (await ready).fetch(request,env,ctx);}
    catch{return Response.json({error:'Chedex no está disponible temporalmente.'},{status:503,headers:{'Cache-Control':'no-store'}});}
  }
};
