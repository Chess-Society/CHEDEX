import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,writeFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import forge from 'node-forge';
import { appleConfiguration,applePassProperties,createAppleWallet } from '../server/apple-wallet.js';
import { defaults } from '../server/domain.js';

function user(){const profile=defaults('Ana');Object.assign(profile,{adultConfirmed:true,public:true,club:'Club público',contact:'oculto@example.org',fideStandard:1800});return {id:'test-uuid',publicId:'abcdefghijklmnop',profile,demo:false};}
test('Apple Wallet permanece pendiente sin certificados o HTTPS',()=>{
  assert.deepEqual(appleConfiguration({},'https://chedex.example'),{ready:false,reason:'certificates_missing'});
  const env={APPLE_PASS_TYPE_ID:'pass.org.chedex',APPLE_TEAM_ID:'TEAM12345F',APPLE_WWDR_CERT_PATH:'a',APPLE_SIGNER_CERT_PATH:'b',APPLE_SIGNER_KEY_PATH:'c'};
  assert.equal(appleConfiguration(env,'http://localhost:3000').reason,'https_required');
});
test('el pase solo incluye campos públicos esenciales y conserva el número de serie',()=>{
  const u=user(),props=applePassProperties(u,'https://chedex.example',{});
  assert.equal(props.serialNumber,u.id);assert.equal(props.barcodes[0].message,'https://chedex.example/p/'+u.publicId);assert.doesNotMatch(JSON.stringify(props),/oculto@example.org/);
  u.profile.visibility.information=false;assert.doesNotMatch(JSON.stringify(applePassProperties(u,'https://chedex.example',{})),/Club público|1800/);
  u.profile.public=false;assert.throws(()=>applePassProperties(u,'https://chedex.example',{}),/WALLET_PRIVATE/);
});
// Certificados sintéticos para probar el contenedor y la firma. No son certificados de Apple.
function certificate(keys,subject,issuer,signer,serial,ca=false){
  const c=forge.pki.createCertificate();c.publicKey=keys.publicKey;c.serialNumber=serial;c.validity.notBefore=new Date(Date.now()-60000);c.validity.notAfter=new Date(Date.now()+86400000);c.setSubject(subject);c.setIssuer(issuer);c.setExtensions([{name:'basicConstraints',cA:ca},{name:'keyUsage',digitalSignature:true,keyCertSign:ca}]);c.sign(signer,forge.md.sha256.create());return c;
}
function unzip(buffer){
  const files={};let offset=0;
  while(buffer.readUInt32LE(offset)===0x04034b50){const method=buffer.readUInt16LE(offset+8),size=buffer.readUInt32LE(offset+18),length=buffer.readUInt16LE(offset+26),extra=buffer.readUInt16LE(offset+28);const name=buffer.subarray(offset+30,offset+30+length).toString(),start=offset+30+length+extra,raw=buffer.subarray(start,start+size);files[name]=method===0?raw:inflateRawSync(raw);offset=start+size;}
  return files;
}
test('genera un pkpass firmado y rechaza certificados que no corresponden',async()=>{
  const folder=await mkdtemp(join(tmpdir(),'chedex-wallet-'));
  try{
    const root=forge.pki.rsa.generateKeyPair(2048),signer=forge.pki.rsa.generateKeyPair(2048),issuer=[{name:'commonName',value:'Test issuer'}],subject=[{name:'commonName',value:'Test Chedex'},{type:'0.9.2342.19200300.100.1.1',value:'pass.org.chedex'},{name:'organizationalUnitName',value:'TEAM12345F'}];
    const rootCert=certificate(root,issuer,issuer,root.privateKey,'01',true),signerCert=certificate(signer,subject,issuer,root.privateKey,'02');
    const env={APPLE_PASS_TYPE_ID:'pass.org.chedex',APPLE_TEAM_ID:'TEAM12345F',APPLE_WWDR_CERT_PATH:join(folder,'issuer.pem'),APPLE_SIGNER_CERT_PATH:join(folder,'signer.pem'),APPLE_SIGNER_KEY_PATH:join(folder,'key.pem')};
    await Promise.all([[env.APPLE_WWDR_CERT_PATH,forge.pki.certificateToPem(rootCert)],[env.APPLE_SIGNER_CERT_PATH,forge.pki.certificateToPem(signerCert)],[env.APPLE_SIGNER_KEY_PATH,forge.pki.privateKeyToPem(signer.privateKey)]].map(([path,value])=>writeFile(path,value)));
    const wallet=createAppleWallet(env,'https://chedex.example');assert.equal((await wallet.initialize()).ready,true);
    const files=unzip(wallet.issue(user()));assert.ok(files.signature.length>100);assert.ok(files['icon@3x.png']);
    const manifest=JSON.parse(files['manifest.json']);for(const [name,hash] of Object.entries(manifest))assert.equal(createHash('sha1').update(files[name]).digest('hex'),hash);
    const props=JSON.parse(files['pass.json']);assert.equal(props.generic.primaryFields[0].value,'Ana');assert.equal(props.barcodes[0].format,'PKBarcodeFormatQR');
    const bad=createAppleWallet({...env,APPLE_TEAM_ID:'OTHERTEAM1'},'https://chedex.example');assert.equal((await bad.initialize()).ready,false);assert.throws(()=>bad.issue(user()),/WALLET_UNAVAILABLE/);
    const workerEnv={APPLE_PASS_TYPE_ID:env.APPLE_PASS_TYPE_ID,APPLE_TEAM_ID:env.APPLE_TEAM_ID,APPLE_WWDR_CERT:forge.pki.certificateToPem(rootCert),APPLE_SIGNER_CERT:forge.pki.certificateToPem(signerCert),APPLE_SIGNER_KEY:forge.pki.privateKeyToPem(signer.privateKey)};
    const workerWallet=createAppleWallet(workerEnv,'https://chedex.example');assert.equal((await workerWallet.initialize()).ready,true);assert.ok(workerWallet.issue(user()).length>1000);
  }finally{await rm(folder,{recursive:true,force:true});}
});
