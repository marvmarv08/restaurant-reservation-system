import assert from 'node:assert/strict';
if (process.env.ACCOUNT_REQUEST_TEST !== 'disposable') throw new Error('Requires ACCOUNT_REQUEST_TEST=disposable and the dedicated port 18090 test app');
const base='http://127.0.0.1:18090';
let cookie='',csrf='',checks=0;
const suffix=Date.now().toString(36);
async function request(path,body,headers={}) {
 const response=await fetch(base+path,{redirect:'manual',method:body===undefined?'GET':'POST',headers:{Cookie:cookie,...(body===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':csrf}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
 for(const v of response.headers.getSetCookie()){const c=v.split(';',1)[0];if(c.startsWith('TABLEBOOK_STAFF='))cookie=c;}
 const text=await response.text();let data;try{data=JSON.parse(text);}catch{data={text};}return {status:response.status,data,text};
}
function check(name,ok){assert.ok(ok,name);checks++;console.log('PASS '+name);}
let r=await request('/api/auth/me');csrf=r.data.csrf_token;
check('Unauthenticated session has CSRF and no actor',!!csrf && r.data.user===null);
const input={email:`http.${suffix}@gmail.com`,full_name:'HTTP Request Test'};
r=await request('/api/auth/account-requests',input,{'X-CSRF-Token':''});check('Request requires session CSRF',r.status===403);
r=await request('/api/auth/account-requests',{...input,role:'admin'});check('Public requester cannot select a role',r.status===422);
r=await request('/api/auth/account-requests',{...input,password:'Should never be accepted'});check('Public requester cannot set a password',r.status===422);
r=await request('/api/auth/account-requests',{...input,email:'not-an-address'});check('Email is validated server-side',r.status===422);
r=await request('/api/auth/account-requests',input);check('Valid submission returns only generic acknowledgement',r.status===200 && r.data.ok===true && Object.keys(r.data).sort().join(',')==='message,ok');
const replay=await request('/api/auth/account-requests',{...input,full_name:'Untrusted replacement'});check('Duplicate submission reveals no account state',replay.text===r.text);
r=await request('/api/auth/me');check('Request never signs the browser in',r.data.user===null);
r=await request('/admin');check('Pending requester cannot open dashboard',r.status===303);
r=await request('/api/auth/account-requests');check('No public pending-request listing exists',[404,405].includes(r.status));
r=await request('/api/auth/account-requests',{...input,email:`http.second.${suffix}@gmail.com`});check('Second valid request is acknowledged',r.status===200);
r=await request('/api/auth/account-requests',{...input,email:`http.third.${suffix}@gmail.com`});check('Third valid request is acknowledged',r.status===200);
r=await request('/api/auth/account-requests',{...input,email:`http.fourth.${suffix}@gmail.com`});check('Fifth successful request is acknowledged',r.status===200);
r=await request('/api/auth/account-requests',{...input,email:`http.limited.${suffix}@gmail.com`});check('Sixth request from same IP is rate-limited',r.status===429);
console.log(`${checks} HTTP checks passed.`);
