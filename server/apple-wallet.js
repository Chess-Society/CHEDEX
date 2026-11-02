import { readFile } from 'node:fs/promises';
import { X509Certificate, createPrivateKey } from 'node:crypto';
import { PKPass } from 'passkit-generator';
import { PNG } from 'pngjs';
import { publicView } from './domain.js';

const required=['APPLE_PASS_TYPE_ID','APPLE_TEAM_ID'];
const material=['APPLE_WWDR_CERT','APPLE_SIGNER_CERT','APPLE_SIGNER_KEY'];
export function appleConfiguration(env=process.env,origin=env.APP_URL || '') {
  if(required.some(k=>!env[k]?.trim()) || material.some(k=>!env[k]?.trim()&&!env[`${k}_PATH`]?.trim()))return {ready:false,reason:'certificates_missing'};
  if(!origin.startsWith('https://'))return {ready:false,reason:'https_required'};
  return {ready:true,reason:null};
}
export function applePassProperties(user,origin,env=process.env) {
  const data=publicView(user,[]);
  if(!data)throw new Error('WALLET_PRIVATE');
  const p=data.profile;
  const colors={midnight:'rgb(24,37,61)',violet:'rgb(68,48,96)',forest:'rgb(32,78,68)'};
  const url=`${origin}/p/${user.publicId}`;
  return {
    formatVersion:1,passTypeIdentifier:env.APPLE_PASS_TYPE_ID,teamIdentifier:env.APPLE_TEAM_ID,
    serialNumber:user.id,organizationName:'Chedex · TopChess',description:`Tarjeta Chedex de ${p.name}`,logoText:'chedex.',
    backgroundColor:colors[p.theme]||colors.midnight,foregroundColor:'rgb(255,255,255)',labelColor:'rgb(198,202,221)',
    // El pase instalado es una instantánea. El QR consulta siempre la privacidad actual.
    sharingProhibited:true,
    generic:{primaryFields:[{key:'name',label:'TU PASAPORTE AJEDRECÍSTICO',value:p.name}],
      secondaryFields:[{key:'chedexId',label:'CHEDEX',value:`CX · ${user.id.slice(0,8).toUpperCase()}`},...(p.club?[{key:'club',label:'CLUB',value:p.club}]:[])],
      auxiliaryFields:[...(p.fideStandard?[{key:'elo',label:'ELO CLÁSICO · DECLARADO',value:String(p.fideStandard)}]:[]),...(p.title?[{key:'title',label:'TÍTULO · DECLARADO',value:p.title}]:[])],
      backFields:[{key:'profile',label:'TU PERFIL COMPLETO',value:url},{key:'privacy',label:'TU INFORMACIÓN',value:'Este pase conserva los datos públicos del momento de descarga. Para actualizarlos, vuelve a añadirlo desde Chedex. El enlace y el QR respetan siempre la privacidad actual de tu perfil.'},{key:'about',label:'CHEDEX',value:'Tu historia en el ajedrez, siempre contigo. Impulsado por TopChess.'}]},
    barcodes:[{format:'PKBarcodeFormatQR',message:url,messageEncoding:'iso-8859-1',altText:'Tu historia en Chedex'}]
  };
}
function icon(size) {
  const image=new PNG({width:size,height:size});
  const polygon=[[39,14],[21,20],[16,37],[31,37],[24,47],[47,47],[38,29],[43,21]];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const px=(x+.5)/size*64,py=(y+.5)/size*64;let inside=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {const [a,b]=polygon[i],[c,d]=polygon[j];if((b>py)!==(d>py) && px<(c-a)*(py-b)/(d-b)+a)inside=!inside;}
    const accent=px>=22&&px<=47&&py>=49&&py<=53;
    const color=inside?[255,255,255]:accent?[175,164,250]:[24,37,61],idx=(y*size+x)*4;
    image.data.set([...color,255],idx);
  }
  return PNG.sync.write(image);
}
const icons=Object.fromEntries([[29,'icon.png'],[58,'icon@2x.png'],[87,'icon@3x.png']].map(([s,name])=>[name,icon(s)]));
async function certificates(env) {
  const [wwdr,signerCert,signerKey]=await Promise.all(material.map(k=>env[k]?Buffer.from(env[k].replace(/\\n/g,'\n')):readFile(env[`${k}_PATH`])));
  const certificate=new X509Certificate(signerCert),issuer=new X509Certificate(wwdr);
  const key=createPrivateKey({key:signerKey,passphrase:env.APPLE_SIGNER_KEY_PASSPHRASE||undefined});
  const now=Date.now();
  for(const cert of [certificate,issuer])if(Date.parse(cert.validFrom)>now || Date.parse(cert.validTo)<=now)throw new Error('WALLET_CERT_EXPIRED');
  const subject=Object.fromEntries(certificate.subject.split('\n').map(s=>{const i=s.indexOf('=');return [s.slice(0,i),s.slice(i+1)];}));
  if(!certificate.checkPrivateKey(key) || !certificate.verify(issuer.publicKey) || subject.UID!==env.APPLE_PASS_TYPE_ID || subject.OU!==env.APPLE_TEAM_ID)throw new Error('WALLET_CERT_MISMATCH');
  return {wwdr,signerCert,signerKey,signerKeyPassphrase:env.APPLE_SIGNER_KEY_PASSPHRASE||undefined};
}
export function createAppleWallet(env=process.env,origin=env.APP_URL||'') {
  let status={...appleConfiguration(env,origin)},certs;
  return {
    async initialize(){if(status.ready)try{certs=await certificates(env);}catch{status={ready:false,reason:'certificates_invalid'};}return status;},
    status:()=>({...status}),
    issue(user){if(!status.ready||!certs)throw new Error('WALLET_UNAVAILABLE');for(const bytes of [certs.wwdr,certs.signerCert])if(Date.parse(new X509Certificate(bytes).validTo)<=Date.now())throw new Error('WALLET_CERT_EXPIRED');const props=applePassProperties(user,origin,env);const pass=new PKPass({...icons,'pass.json':Buffer.from(JSON.stringify(props))},certs);return pass.getAsBuffer();}
  };
}
