import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { createHash } from 'node:crypto';

type Obj = Record<string, any>;
type Repo = {owner:string;name:string;description:string;private:boolean;default_branch:string;files:Map<string,{content:string;sha:string}>;issues:Obj[];pulls:Obj[];labels:Set<string>;branches:Map<string,string>;commits:Obj[]; deleted:boolean};
const repos = new Map<string,Repo>();
const token = process.env.MAKEFUN_SHOP_TOKEN ?? '';
const login = (token.split(':')[0] || token.split('.')[0] || 'dandelionz3').replace(/[^A-Za-z0-9-]/g,'') || 'dandelionz3';
let idCounter=1;
const hash=(s:string)=>createHash('sha1').update(s).digest('hex');
const JSON_TYPE='application/json; charset=utf-8';
function json(res:ServerResponse,status:number,body:unknown,headers:Obj={}){const data=JSON.stringify(body);res.writeHead(status,{'content-type':JSON_TYPE,'content-length':Buffer.byteLength(data),'x-github-request-id':hash(`${status}:${data}`).slice(0,16),...headers});res.end(data)}
function pathOf(req:IncomingMessage){try{return new URL(req.url??'/','http://x')}catch{return new URL('http://x/')}}
async function body(req:IncomingMessage):Promise<any>{const chunks=[];for await(const c of req)chunks.push(c);const s=Buffer.concat(chunks).toString();if(!s)return {};try{return JSON.parse(s)}catch{throw new Error('BAD_JSON')}}
function mkRepo(owner:string,name:string,b:any={}):Repo{return {owner,name,description:b.description??'',private:b.private??false,default_branch:b.default_branch||'main',files:new Map(),issues:[],pulls:[],labels:new Set(),branches:new Map(),commits:[],deleted:false}}
function getRepo(owner:string,name:string){const r=repos.get(`${owner}/${name}`);return r&&!r.deleted?r:null}
function commit(r:Repo,message:string){const sha=hash(`${r.owner}/${r.name}:${message}:${[...r.files].map(([p,v])=>p+v.sha).join('|')}:${r.commits.length}`);r.commits.unshift({sha,commit:{message},files:[...r.files].map(([filename])=>({filename,status:'modified',additions:1,deletions:0,changes:1,patch:''}))});if(!r.branches.has(r.default_branch))r.branches.set(r.default_branch,sha);return sha}
function repoJson(r:Repo){return {id:hash(r.owner+'/'+r.name).slice(0,12),name:r.name,full_name:r.owner+'/'+r.name,owner:{login:r.owner},private:r.private,description:r.description,default_branch:r.default_branch,has_issues:true,html_url:`http://localhost/${r.owner}/${r.name}`}}
function issueJson(r:Repo,x:Obj){return {...x,repository_url:`/api/v3/repos/${r.owner}/${r.name}`,url:`/api/v3/repos/${r.owner}/${r.name}/issues/${x.number}`}}
const tools=[
 {name:'create_repo',description:'Create a repository',inputSchema:{type:'object',properties:{name:{type:'string'},description:{type:'string'},private:{type:'boolean'}},required:['name']}},
 {name:'get_repo',description:'Get a repository',inputSchema:{type:'object',properties:{owner:{type:'string'},repo:{type:'string'},full_name:{type:'string'}},required:['owner','repo']}},
 {name:'create_issue',description:'Create an issue',inputSchema:{type:'object',properties:{owner:{type:'string'},repo:{type:'string'},full_name:{type:'string'},title:{type:'string'},body:{type:'string'}},required:['owner','repo','title']}},
 {name:'list_issues',description:'List issues',inputSchema:{type:'object',properties:{owner:{type:'string'},repo:{type:'string'},full_name:{type:'string'},state:{type:'string'}},required:['owner','repo']}},
 {name:'create_pull_request',description:'Create a pull request',inputSchema:{type:'object',properties:{owner:{type:'string'},repo:{type:'string'},full_name:{type:'string'},title:{type:'string'},head:{type:'string'},base:{type:'string'}},required:['owner','repo','title','head','base']}},
 {name:'merge_pull_request',description:'Merge a pull request',inputSchema:{type:'object',properties:{owner:{type:'string'},repo:{type:'string'},full_name:{type:'string'},pull_number:{type:'number'}},required:['owner','repo','pull_number']}},
];
function makeIssue(r:Repo,b:Obj){const issue={id:idCounter++,number:r.issues.length+1,title:b.title??'',body:b.body??'',state:'open',labels:(b.labels??[]).map((x:any)=>typeof x==='string'?{name:x}:x),user:{login},comments:0,created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z'};r.issues.push(issue);return issueJson(r,issue)}
function makePull(r:Repo,b:Obj){const pr={id:idCounter++,number:r.pulls.length+1,title:b.title??'',body:b.body??'',state:'open',head:b.head??'',base:b.base??r.default_branch,headRefName:String(b.head??'').split(':').pop(),baseRefName:String(b.base??r.default_branch).split(':').pop(),merged:false,mergeable:true,files:[]};r.pulls.push(pr);return pr}
function auth(req:IncomingMessage,res:ServerResponse){if(!token||req.headers.authorization!==`Bearer ${token}`){json(res,401,{message:'Bad credentials'});return false}return true}
export function createApp():Server{return createServer(async(req,res)=>{
 const u=pathOf(req),p=decodeURIComponent(u.pathname),method=req.method??'GET';
 if(method==='GET'&&p==='/healthz'){json(res,200,{ok:true});return}
 if(p.startsWith('/api/')||p==='/api/graphql'||p==='/mcp'||p.endsWith('.git/info/refs')||p.endsWith('.git/git-upload-pack')||p.endsWith('.git/git-receive-pack'))if(!auth(req,res))return;
 let b:Obj={}; if(['POST','PUT','PATCH','DELETE'].includes(method)){try{b=await body(req)}catch{json(res,400,{message:'Invalid JSON'});return}}
 if(p==='/api/v3'||p==='/api/v3/') {if(method==='GET')json(res,200,{current_user_url:'/api/v3/user',rate_limit_url:'/api/v3/rate_limit'},{'x-oauth-scopes':'repo, read:org'});else json(res,404,{message:'Not Found'});return}
 if(p==='/api/v3/meta'&&method==='GET'){json(res,200,{installed_version:'3.0.0'});return}
 if(p==='/api/v3/user'&&method==='GET'){json(res,200,{login,id:1});return}
 if(p==='/api/v3/user/repos'){
   if(method==='GET'){const arr=[...repos.values()].filter(r=>!r.deleted&&r.owner===login);const per=Math.max(1,Number(u.searchParams.get('per_page')||30)),page=Math.max(1,Number(u.searchParams.get('page')||1));json(res,200,arr.slice((page-1)*per,page*per).map(repoJson),page*per<arr.length?{link:`<${u.origin}${p}?per_page=${per}&page=${page+1}>; rel="next"`}:{});return}
   if(method==='POST'){const r=mkRepo(login,String(b.name||''),b);repos.set(`${login}/${r.name}`,r);json(res,201,repoJson(r));return}
 }
 if(p==='/mcp'&&method==='POST'){
   let rpc;try{rpc=JSON.parse(Buffer.isBuffer(b)?b.toString():JSON.stringify(b))}catch{json(res,400,{jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}});return}
   // JSON-RPC body is parsed before route dispatch, re-read raw form when possible.
   const id=rpc.id??null,m=rpc.method;
   if(m==='server/discover'){json(res,200,{jsonrpc:'2.0',id,result:{serverInfo:{name:'github-forge',version:'1.0.0'},capabilities:{tools:{}},supportedVersions:['2026-07-28','2025-11-25']}});return}
   if(m==='initialize'){json(res,200,{jsonrpc:'2.0',id,result:{protocolVersion:'2025-11-25',serverInfo:{name:'github-forge',version:'1.0.0'},capabilities:{tools:{}}}});return}
   if(m==='notifications/initialized'){res.writeHead(202);res.end();return}
   if(m==='tools/list'){json(res,200,{jsonrpc:'2.0',id,result:{tools}});return}
   if(m==='tools/call'){const name=String(rpc.params?.name??'').toLowerCase().split('__').pop(),a=rpc.params?.arguments??{};let out:any;
     if(name==='create_repo'){const r=mkRepo(login,String(a.name||''),a);repos.set(`${login}/${r.name}`,r);out=repoJson(r)}
     else {const full=String(a.full_name||`${a.owner||login}/${a.repo||''}`).split('/'),r=getRepo(full[0]||login,full[1]||'');if(!r){json(res,200,{jsonrpc:'2.0',id,error:{code:-32602,message:'Repository not found'}});return}
       if(name==='get_repo')out=repoJson(r);else if(name==='create_issue')out=makeIssue(r,a);else if(name==='list_issues')out=r.issues.filter(x=>!a.state||x.state===a.state);else if(name==='create_pull_request')out=makePull(r,a);else if(name==='merge_pull_request'){const pr=r.pulls.find(x=>x.number===Number(a.pull_number));if(!pr){json(res,200,{jsonrpc:'2.0',id,error:{code:-32602,message:'Pull request not found'}});return}pr.state='closed';pr.merged=true;out={sha:commit(r,'Merge pull request #'+pr.number),merged:true,message:'Pull request successfully merged'}}else{json(res,200,{jsonrpc:'2.0',id,error:{code:-32601,message:'Unknown tool'}});return}}
     json(res,200,{jsonrpc:'2.0',id,result:{content:[{type:'text',text:JSON.stringify(out)}],structuredContent:out}});return}
   if(m==='resources/list'){json(res,200,{jsonrpc:'2.0',id,result:{resources:[]}});return}
   json(res,200,{jsonrpc:'2.0',id,error:{code:-32601,message:'Method not found'}});return
 }
 if(p==='/api/graphql'&&method==='POST'){const q=String(b.query||''),vars=b.variables||{};if(/__type/.test(q)){const type=String(q.match(/__type\s*\(\s*name\s*:\s*"([^"]+)/)?.[1]||'');const fields:Record<string,string[]>={Issue:['id','number','title','state','body'],PullRequest:['id','number','headRefName','baseRefName','mergeable','state','merged','files'],Repository:['id','databaseId','name','nameWithOwner','owner','defaultBranchRef','viewerPermission','hasIssuesEnabled','issue','issues','pullRequests','pullRequest']};json(res,200,{data:{__type:{name:type,fields:(fields[type]||[]).map(name=>({name})),enumValues:type==='SearchType'?[{name:'ISSUE'}]:null}}});return}
   const rn=String(vars.name||vars.repo||q.match(/repository\s*\(\s*owner\s*:\s*"[^"]+"\s*,\s*name\s*:\s*"([^"]+)/)?.[1]||'');const own=String(vars.owner||login),r=getRepo(own,rn);if(!r){json(res,200,{data:{repository:null}});return}
   if(/createPullRequest/.test(q)){const pr=makePull(r,{title:vars.title,head:vars.headRefName||vars.head,base:vars.baseRefName||vars.base});json(res,200,{data:{createPullRequest:{pullRequest:{id:String(pr.id),number:pr.number,title:pr.title,state:'OPEN',headRefName:pr.headRefName,baseRefName:pr.baseRefName,merged:false}}}});return}
   const data:any={repository:{id:hash(own+'/'+rn).slice(0,12),databaseId:1,name:rn,nameWithOwner:own+'/'+rn,owner:{login:own},defaultBranchRef:{name:r.default_branch},viewerPermission:'ADMIN',hasIssuesEnabled:true,issues:{nodes:[...r.issues].reverse().map(x=>({...x,state:x.state.toUpperCase()}))},pullRequests:{nodes:r.pulls.map(x=>({...x,state:x.state.toUpperCase()}))}}};json(res,200,{data});return}
 if(p.startsWith('/api/v3/repos/')){
   const seg=p.slice('/api/v3/repos/'.length).split('/'),owner=seg[0],name=seg[1],r=getRepo(owner,name);if(!r){json(res,404,{message:'Not Found'});return}const tail=seg.slice(2).join('/');
   if(!tail){if(method==='GET'){json(res,200,repoJson(r));return}if(method==='PATCH'){r.description=b.description??r.description;json(res,200,repoJson(r));return}if(method==='DELETE'){r.deleted=true;res.writeHead(204,{'x-github-request-id':hash(p)});res.end();return}}
   if(tail==='labels'&&method==='POST'){const n=String(b.name||'');r.labels.add(n);json(res,201,{id:idCounter++,name:n,color:b.color||'ededed'});return}
   if(tail==='issues'){
    if(method==='POST'){const labels=(b.labels||[]).map((x:any)=>typeof x==='string'?x:x.name);if(labels.some((x:string)=>!r.labels.has(x))){json(res,422,{message:'Validation Failed'});return}json(res,201,makeIssue(r,b));return}
    if(method==='GET'){const state=u.searchParams.get('state');let xs=[...r.issues];if(state&&state!=='all')xs=xs.filter(x=>x.state===state);const dir=u.searchParams.get('direction')||'desc';if(dir==='asc')xs.reverse();json(res,200,xs.map(x=>issueJson(r,x)));return}}
   const im=tail.match(/^issues\/(\d+)(?:\/(comments))?$/);if(im){const it=r.issues.find(x=>x.number===Number(im[1]));if(!it){json(res,404,{message:'Not Found'});return}if(im[2]==='comments'){if(method==='POST'){const c={id:idCounter++,body:b.body||'',user:{login}};it._comments??=[];it._comments.push(c);json(res,201,c);return}json(res,200,it._comments||[]);return}if(method==='GET'){json(res,200,issueJson(r,it));return}if(method==='PATCH'){it.state=b.state||it.state;json(res,200,issueJson(r,it));return}}
   if(tail==='pulls'&&method==='POST'){json(res,201,makePull(r,b));return}if(tail==='pulls'&&method==='GET'){json(res,200,r.pulls);return}
   const pm=tail.match(/^pulls\/(\d+)(?:\/(merge|files))?$/);if(pm){const pr=r.pulls.find(x=>x.number===Number(pm[1]));if(!pr){json(res,404,{message:'Not Found'});return}if(pm[2]==='files'){json(res,200,pr.files);return}if(pm[2]==='merge'&&method==='PUT'){pr.state='closed';pr.merged=true;const sha=commit(r,'Squash pull request #'+pr.number);json(res,200,{sha,merged:true,message:'Pull request successfully merged'});return}if(method==='GET'){json(res,200,pr);return}}
   if(tail==='branches'&&method==='GET'){json(res,200,[...r.branches].map(([name,sha])=>({name,commit:{sha}})));return}
   if(tail==='commits'&&method==='GET'){const br=u.searchParams.get('sha');json(res,200,br?r.commits.filter(c=>r.branches.get(br)===c.sha):r.commits);return}
   if(tail==='git/refs'&&method==='POST'){const ref=String(b.ref||'').replace(/^refs\/heads\//,'');r.branches.set(ref,b.sha||b.object?.sha||r.branches.get(r.default_branch)||'');json(res,201,{ref:'refs/heads/'+ref,object:{sha:r.branches.get(ref)}});return}
   if(tail.startsWith('contents/')){const file=tail.slice(9);if(method==='GET'){const f=r.files.get(file);if(f){json(res,200,{name:file.split('/').pop(),path:file,sha:f.sha,size:Buffer.byteLength(f.content),type:'file',encoding:'base64',content:Buffer.from(f.content).toString('base64')});return}const prefix=file.replace(/\/$/,'')+'/';const children=[...r.files].filter(([k])=>k.startsWith(prefix)).map(([k,v])=>({name:k.slice(prefix.length).split('/')[0],path:prefix+k.slice(prefix.length).split('/')[0],sha:v.sha,size:Buffer.byteLength(v.content),type:k.slice(prefix.length).includes('/')?'dir':'file',encoding:'base64',content:Buffer.from(v.content).toString('base64')}));if(children.length){json(res,200,children);return}json(res,404,{message:'Not Found'});return}
     if(method==='PUT'){const old=r.files.get(file);if(old&&b.sha!==old.sha){json(res,409,{message:'sha does not match'});return}const content=Buffer.from(String(b.content||''),'base64').toString();const sha=hash(content);r.files.set(file,{content,sha});const csha=commit(r,b.message||'Update '+file);json(res,old?200:201,{content:{name:file.split('/').pop(),path:file,sha,size:Buffer.byteLength(content)},commit:{sha:csha}});return}
     if(method==='DELETE'){if(!r.files.has(file)){json(res,404,{message:'Not Found'});return}r.files.delete(file);json(res,200,{commit:{sha:commit(r,b.message||'Delete '+file)}});return}}
 }
 // Smart HTTP: minimal protocol v2 advertisement; unknown repositories remain proper 404s.
 const gm=p.match(/^\/([^/]+)\/([^/]+)\.git\/(info\/refs|git-upload-pack|git-receive-pack)$/);if(gm){const r=getRepo(gm[1],gm[2]);if(!r){json(res,404,{message:'Not Found'});return}if(gm[3]==='info/refs'){const svc=u.searchParams.get('service')||'';res.writeHead(200,{'content-type':'application/x-'+svc+'-advertisement'});if(req.headers['git-protocol']==='version=2'&&svc==='git-upload-pack')res.end('000eversion 2\n0015agent=git/2.0.0\n0000');else res.end(`001e# service=${svc}\n0000`);return}res.writeHead(200,{'content-type':'application/x-'+gm[3]+'-result'});res.end('0000');return}
 json(res,404,{message:'Not Found'});
});}
