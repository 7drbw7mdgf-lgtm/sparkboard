'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const MAX_PACKAGE=24*1024*1024,MAX_FILES=12*1024*1024;
const REQUIRED=['index.html','app.js','board-model.js','style.css'];
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const validVersion=v=>typeof v==='string'&&/^(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})$/.test(v);
function compareVersions(a,b){if(!validVersion(a)||!validVersion(b))throw Error('Unsupported release version.');let aa=a.split('.').map(Number),bb=b.split('.').map(Number);for(let i=0;i<3;i++)if(aa[i]!==bb[i])return aa[i]>bb[i]?1:-1;return 0}
function repoName(value){const input=String(value||'').trim();let repo=input;if(input.startsWith('https://')){const u=new URL(input);if(u.hostname!=='github.com'||u.username||u.password||u.search||u.hash)throw Error('Use a github.com repository URL.');repo=u.pathname.replace(/^\/|\/$/g,'').replace(/\.git$/,'')}if(!/^[a-z\d](?:[a-z\d-]{0,38})\/[a-z\d_.-]{1,100}$/i.test(repo)||repo.split('/')[1]==='..')throw Error('Enter a GitHub repository as owner/name.');return repo}
function safeFile(name){return typeof name==='string'&&name.length<180&&!name.includes('..')&&!name.includes('\\')&&!name.startsWith('/')&&(REQUIRED.includes(name)||/^assets\/[a-z\d_/-]+\.(?:png|jpe?g|webp|gif|svg|woff2?)$/i.test(name))}
function base64(value){if(typeof value!=='string'||!value.length||value.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(value))throw Error('Invalid package encoding.');return Buffer.from(value,'base64')}
function signPackage(manifest,key){const payload=Buffer.from(JSON.stringify(manifest));return Buffer.from(JSON.stringify({format:'sparkboard-signed-release-v1',payload:payload.toString('base64'),signature:crypto.sign(null,payload,key).toString('base64')}))}
function verifyPackage(bytes,publicKey,expectedVersion){
  if(!Buffer.isBuffer(bytes))bytes=Buffer.from(bytes);if(bytes.length>MAX_PACKAGE)throw Error('The update package is too large.');
  let envelope;try{envelope=JSON.parse(bytes.toString('utf8'))}catch{throw Error('The release is not a valid update package.')}
  if(envelope.format!=='sparkboard-signed-release-v1')throw Error('This is not a signed Sparkboard release.');
  const payload=base64(envelope.payload),signature=base64(envelope.signature);if(signature.length!==64||!crypto.verify(null,payload,publicKey,signature))throw Error('The publisher signature could not be verified.');
  const manifest=JSON.parse(payload.toString('utf8'));
  if(manifest.appId!=='sparkboard'||!validVersion(manifest.version)||manifest.version!==expectedVersion||manifest.minUpdaterVersion!==1)throw Error('This update is not compatible with Sparkboard.');
  if(!Array.isArray(manifest.files)||manifest.files.length<4||manifest.files.length>100)throw Error('The update has an invalid file list.');
  let total=0;const seen=new Set(),files=[];
  for(const file of manifest.files){if(!safeFile(file.path)||seen.has(file.path))throw Error('The update contains an unsupported file path.');seen.add(file.path);const content=base64(file.content);total+=content.length;if(total>MAX_FILES||!/^([a-f0-9]{64})$/.test(file.sha256)||hash(content)!==file.sha256)throw Error('An update file failed its checksum check.');files.push({path:file.path,content,sha256:file.sha256})}
  if(!REQUIRED.every(name=>seen.has(name)))throw Error('The update is missing required app files.');
  return{version:manifest.version,notes:String(manifest.notes||'').slice(0,10000),files};
}
function atomicJSON(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.'+crypto.randomUUID()+'.tmp';const fd=fs.openSync(temp,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(value,null,2));fs.fsyncSync(fd)}finally{fs.closeSync(fd)}try{fs.renameSync(temp,file)}catch(error){fs.rmSync(temp,{force:true});throw error}}
function readJSON(file,fallback){try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return fallback}}
function permittedURL(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||!['api.github.com','github.com','objects.githubusercontent.com','release-assets.githubusercontent.com'].includes(u.hostname))throw Error('The update download must come from GitHub.');return u}
async function fetchBytes(url,{signal,max=MAX_PACKAGE,onProgress=()=>{}}={}){
  let current=permittedURL(url);
  for(let redirects=0;redirects<=5;redirects++){
    const response=await fetch(current,{signal,redirect:'manual',headers:{'User-Agent':'Sparkboard-Updater','Accept':current.hostname==='api.github.com'?'application/vnd.github+json':'application/octet-stream'}});
    if([301,302,303,307,308].includes(response.status)){await response.body?.cancel();current=permittedURL(new URL(response.headers.get('location'),current).href);continue}
    if(!response.ok){await response.body?.cancel();throw Error(response.status===404?'No public release was found at this repository.':`GitHub could not provide the release (HTTP ${response.status}).`)}
    const total=Number(response.headers.get('content-length'))||null;if(total&&total>max){await response.body?.cancel();throw Error('The GitHub response is too large.')}
    let downloaded=0;const chunks=[];for await(const chunk of response.body){downloaded+=chunk.length;if(downloaded>max)throw Error('The GitHub response exceeded the size limit.');chunks.push(Buffer.from(chunk));onProgress(downloaded,total)}return Buffer.concat(chunks);
  }throw Error('GitHub returned too many redirects.');
}
class Updater{
  constructor(root,{fetcher=fetchBytes,dataDir}={}){
    this.root=root;this.dir=dataDir||path.join(root,'.sparkboard');this.file=path.join(this.dir,'update-state.json');this.baseVersion=JSON.parse(fs.readFileSync(path.join(root,'package.json'))).version;this.fetcher=fetcher;
    this.settings={source:'sandbox',repository:'',active:null,previous:null,hasRollback:false,lastChecked:null,...readJSON(this.file,{})};
    if(!['sandbox','github'].includes(this.settings.source))this.settings.source='sandbox';
    this.candidate=null;this.staged=null;this.phase='idle';this.error=null;this.progress={downloaded:0,total:null};this.busy=false;this.controller=null;
    this.recover();
  }
  persist(){atomicJSON(this.file,this.settings)}
  releaseRoot(id){if(typeof id!=='string'||!/^release-[a-f0-9-]{36}$/.test(id))throw Error('Invalid installed release.');return path.join(this.dir,'versions',id)}
  recover(){if(this.settings.active){try{this.verifyInstalled(this.settings.active)}catch{this.settings.active=null;this.settings.previous=null;this.settings.hasRollback=false;this.persist();this.error='The installed update was incomplete. Sparkboard restored the bundled version.'}}}
  verifyInstalled(id){const dir=this.releaseRoot(id),meta=readJSON(path.join(dir,'release.json'),null);if(!meta||!validVersion(meta.version)||!Array.isArray(meta.files)||!REQUIRED.every(f=>meta.files.some(x=>x.path===f)))throw Error('The installed update is incomplete.');for(const f of meta.files){if(!safeFile(f.path)||hash(fs.readFileSync(path.join(dir,f.path)))!==f.sha256)throw Error('The staged files changed after verification.')}return meta}
  currentVersion(){return this.settings.active?this.verifyInstalled(this.settings.active).version:this.baseVersion}
  publicRoot(){return this.settings.active?this.releaseRoot(this.settings.active):this.root}
  info(){let current=this.currentVersion();return{currentVersion:current,baseVersion:this.baseVersion,source:this.settings.source,repository:this.settings.repository,phase:this.phase,error:this.error,progress:this.progress,busy:this.busy,lastChecked:this.settings.lastChecked,available:this.candidate?{version:this.candidate.version,notes:this.candidate.notes,size:this.candidate.size,url:this.candidate.pageURL}:null,ready:!!this.staged,hasRollback:this.settings.hasRollback,rollbackVersion:this.settings.hasRollback?(this.settings.previous?this.verifyInstalled(this.settings.previous).version:this.baseVersion):null,sandboxReady:fs.existsSync(path.join(this.dir,'sandbox','sparkboard-update.json'))}}
  configure({source,repository}){if(this.busy)throw Error('An update is already in progress.');if(!['sandbox','github'].includes(source))throw Error('Choose Sandbox or GitHub.');const next={...this.settings,source,repository:source==='github'?repoName(repository):this.settings.repository},old=this.settings;this.settings=next;try{this.persist()}catch(error){this.settings=old;throw error}this.candidate=null;this.staged=null;this.phase='idle';this.error=null;return this.info()}
  async operation(phase,fn){if(this.busy)throw Error('An update is already in progress.');this.busy=true;this.phase=phase;this.error=null;this.controller=new AbortController();let timeout=setTimeout(()=>this.controller?.abort(),30000);try{const result=await fn(this.controller.signal);return result}catch(error){this.phase='error';this.error=error.name==='AbortError'?'Update cancelled or timed out. Please try again.':error.message;throw Error(this.error)}finally{clearTimeout(timeout);this.busy=false;this.controller=null}}
  async check(){await this.operation('checking',async signal=>{
    this.candidate=null;this.staged=null;this.progress={downloaded:0,total:null};let candidate;
    if(this.settings.source==='sandbox'){
      const file=path.join(this.dir,'sandbox','sparkboard-update.json');if(!fs.existsSync(file))throw Error('The sandbox release has not been prepared. Run npm run sandbox:prepare.');
      const bytes=fs.readFileSync(file),envelope=JSON.parse(bytes),raw=JSON.parse(base64(envelope.payload));if(!validVersion(raw.version))throw Error('Invalid sandbox version.');const parsed=verifyPackage(bytes,fs.readFileSync(path.join(this.root,'update-public-key.pem')),raw.version);candidate={version:parsed.version,notes:parsed.notes,size:bytes.length,file,source:'sandbox'};
    }else{
      const repo=repoName(this.settings.repository);const bytes=await this.fetcher(`https://api.github.com/repos/${repo}/releases/latest`,{signal,max:1024*1024});let release=JSON.parse(bytes);const version=String(release.tag_name||'').replace(/^v/,'');if(!validVersion(version)||release.draft||release.prerelease)throw Error('No supported stable Sparkboard release was found.');const asset=release.assets?.find(a=>a.name==='sparkboard-update.json'&&a.state==='uploaded');if(!asset)throw Error('This release has no sparkboard-update.json asset.');const url=permittedURL(asset.browser_download_url);if(url.hostname!=='github.com'||url.pathname!==`/${repo}/releases/download/${release.tag_name}/sparkboard-update.json`||url.search||url.hash)throw Error('The release asset does not belong to the configured repository.');if(asset.size>MAX_PACKAGE)throw Error('The release package is too large.');candidate={version,notes:String(release.body||'').slice(0,10000),size:asset.size,url:url.href,pageURL:`https://github.com/${repo}/releases/tag/${release.tag_name}`,digest:asset.digest,source:'github'};
    }
    if(compareVersions(candidate.version,this.currentVersion())>0)this.candidate=candidate;this.settings.lastChecked=new Date().toISOString();this.persist();this.phase=this.candidate?'available':'current';
  });return this.info()}
  async download(){if(!this.candidate)throw Error('Check for an update first.');await this.operation('downloading',async signal=>{
    const candidate=this.candidate;let bytes;
    const progress=(downloaded,total)=>{this.progress={downloaded,total}};
    if(candidate.source==='sandbox'){bytes=fs.readFileSync(candidate.file);progress(bytes.length,bytes.length)}else bytes=await this.fetcher(candidate.url,{signal,onProgress:progress});
    if(signal.aborted)throw new DOMException('Cancelled','AbortError');if(candidate.digest&&candidate.digest!==`sha256:${hash(bytes)}`)throw Error('The release package failed GitHub’s checksum check.');
    this.phase='verifying';const verified=verifyPackage(bytes,fs.readFileSync(path.join(this.root,'update-public-key.pem')),candidate.version),id='release-'+crypto.randomUUID(),dir=this.releaseRoot(id);fs.mkdirSync(dir,{recursive:true,mode:0o700});
    try{for(const file of verified.files){const output=path.join(dir,file.path);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,file.content,{flag:'wx',mode:0o600})}atomicJSON(path.join(dir,'release.json'),{version:verified.version,files:verified.files.map(f=>({path:f.path,sha256:f.sha256})),verified:true});this.verifyInstalled(id);this.staged={id,version:verified.version};this.phase='ready'}catch(error){fs.rmSync(dir,{recursive:true,force:true});throw error}
  });return this.info()}
  install(){if(this.busy)throw Error('Wait for the current operation to finish.');if(!this.staged)throw Error('Download and verify an update first.');this.verifyInstalled(this.staged.id);if(compareVersions(this.staged.version,this.currentVersion())<=0)throw Error('This update is no longer newer than the installed version.');const previous={...this.settings};try{this.settings.previous=this.settings.active;this.settings.active=this.staged.id;this.settings.hasRollback=true;this.persist()}catch(error){this.settings=previous;throw error}this.staged=null;this.candidate=null;this.phase='installed';this.error=null;return this.info()}
  rollback(){if(this.busy)throw Error('Wait for the current operation to finish.');if(!this.settings.hasRollback)throw Error('There is no previous version to restore.');if(this.settings.previous)this.verifyInstalled(this.settings.previous);const original={...this.settings};try{[this.settings.active,this.settings.previous]=[this.settings.previous,this.settings.active];this.persist()}catch(error){this.settings=original;throw error}this.staged=null;this.candidate=null;this.phase='restored';this.error=null;return this.info()}
  resetSandbox(){if(this.settings.source!=='sandbox'||this.busy)throw Error('Reset is available only in an idle sandbox.');const old={...this.settings};try{Object.assign(this.settings,{active:null,previous:null,hasRollback:false,lastChecked:null});this.persist()}catch(error){this.settings=old;throw error}this.staged=null;this.candidate=null;this.phase='idle';this.error=null;return this.info()}
  cancel(){this.controller?.abort();return {cancelled:true}}
}
module.exports={Updater,compareVersions,repoName,safeFile,signPackage,verifyPackage,hash,atomicJSON,fetchBytes,REQUIRED,MAX_PACKAGE};
