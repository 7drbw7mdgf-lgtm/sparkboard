'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {hash,signPackage,REQUIRED}=require('../updater.cjs');
const root=path.resolve(__dirname,'..'),keyDir=path.join(root,'.sparkboard','keys'),privateFile=path.join(keyDir,'release-private.pem'),publicFile=path.join(root,'update-public-key.pem');
function ensureKeys(){
  fs.mkdirSync(keyDir,{recursive:true,mode:0o700});
  if(!fs.existsSync(privateFile)){if(fs.existsSync(publicFile))throw Error('The public key already exists. Restore its matching private key before signing releases.');const keys=crypto.generateKeyPairSync('ed25519');fs.writeFileSync(privateFile,keys.privateKey.export({type:'pkcs8',format:'pem'}),{flag:'wx',mode:0o600});fs.writeFileSync(publicFile,keys.publicKey.export({type:'spki',format:'pem'}),{flag:'wx',mode:0o644})}
  const derived=crypto.createPublicKey(fs.readFileSync(privateFile)).export({type:'spki',format:'pem'}).toString();if(fs.readFileSync(publicFile,'utf8')!==derived)throw Error('The release signing key does not match the pinned public key.');
}
function build({version,notes,sandbox=false}){
  ensureKeys();if(!/^(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})$/.test(version))throw Error('Use a numeric version such as 1.1.1.');
  const files=REQUIRED.map(file=>{let content=fs.readFileSync(path.join(root,file));if(sandbox&&file==='index.html')content=Buffer.from(content.toString().replace('</head>',`<meta name="sparkboard-build" content="sandbox-${version}"></head>`));return{path:file,sha256:hash(content),content:content.toString('base64')}});
  const bytes=signPackage({appId:'sparkboard',version,minUpdaterVersion:1,notes,files},fs.readFileSync(privateFile));const directory=path.join(root,'.sparkboard',sandbox?'sandbox':`releases/${version}`);fs.mkdirSync(directory,{recursive:true});const output=path.join(directory,'sparkboard-update.json');fs.writeFileSync(output,bytes,{mode:0o600});console.log(`${sandbox?'Sandbox':'Signed'} release ${version} prepared (${bytes.length} bytes).`);console.log(output);return output;
}
if(require.main===module){try{const args=process.argv.slice(2);if(args.includes('--keygen')){ensureKeys();console.log('Release signing keys are ready. Keep .sparkboard/keys private.')}else{const sandbox=args.includes('--sandbox'),base=require('../package.json').version.split('.').map(Number),version=args.includes('--version')?args[args.indexOf('--version')+1]:`${base[0]}.${base[1]}.${base[2]+1}`;const notes=args.includes('--notes')?fs.readFileSync(args[args.indexOf('--notes')+1],'utf8'):sandbox?'A local rehearsal of the complete update flow.\n\n• Downloads a signed Sparkboard web-app bundle\n• Verifies the publisher signature and every file\n• Activates the staged version without touching your boards\n• Keeps the previous version available for rollback\n\nSandbox build only. No GitHub repository is contacted.':'Sparkboard app update.';build({version,notes,sandbox})}}catch(error){console.error(error.message);process.exitCode=1}}
module.exports={build,ensureKeys};
