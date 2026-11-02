import { InputError } from './domain.js';

export function sessionCookies(origin) {
  const secure=new URL(origin).protocol==='https:';
  const name=key=>`${secure?'__Host-':''}${key}`;
  return {
    name,
    serialize:(key,value,age)=>`${name(key)}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${secure?'; Secure':''}`
  };
}

export async function readJson(req) {
  if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))throw new InputError('Se requiere JSON.');
  const maximum=500000,chunks=[];
  let length=0;
  const tooLarge=()=>{const error=new InputError('El archivo es demasiado grande.');error.status=413;return error;};
  if(Number(req.headers['content-length'])>maximum)throw tooLarge();
  for await(const chunk of req){
    const bytes=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
    length+=bytes.length;if(length>maximum)throw tooLarge();
    chunks.push(bytes);
  }
  try {
    const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,length)));
    if(!value||Array.isArray(value)||typeof value!=='object')throw new Error();
    return value;
  } catch {throw new InputError('Datos no válidos.');}
}
