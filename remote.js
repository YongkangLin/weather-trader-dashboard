/* Only shipped in the Pages build. The LAN and native UI are unchanged. */
(()=>{
 'use strict';
 const originalFetch=window.fetch.bind(window), storageKey='weather-desk-access:'+location.pathname;
 const supplied=new URLSearchParams(location.hash.slice(1)).get('access');
 let key=null, endpoint=null, endpointAt=0, endpointPromise=null;
 try{
  if(supplied&&/^[A-Za-z0-9_-]{43}$/.test(supplied))localStorage.setItem(storageKey,supplied);
  key=localStorage.getItem(storageKey);
 }catch{key=supplied;}
 if(supplied)history.replaceState(null,'',location.pathname+location.search);
 // Quick Tunnel does not support SSE. Read the same saved-state projection.
 window.EventSource=undefined;
 async function discover(){
  if(endpoint&&Date.now()-endpointAt<30000)return endpoint;
  if(endpointPromise)return endpointPromise;
  endpointPromise=(async()=>{
   const response=await originalFetch('./endpoint.json?t='+Math.floor(Date.now()/30000),{cache:'no-store',signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw Error('Connection information unavailable');
   const value=await response.json();
   if(!/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(value.endpoint))throw Error('Invalid connection');
   endpoint=value.endpoint;endpointAt=Date.now();return endpoint;
  })();
  try{return await endpointPromise;}finally{endpointPromise=null;}
 }
 window.fetch=async(input,options={})=>{
  if(typeof input!=='string'||!input.startsWith('/api/'))return originalFetch(input,options);
  if(!key)throw Error('Open your private access link');
  if(!['/api/status','/api/phone-update'].includes(input))throw Error('Control unavailable remotely');
  const base=await discover(), headers=new Headers(options.headers||{});
  headers.set('Authorization','Bearer '+key);
  try{
   const response=await originalFetch(base+input,{...options,headers,mode:'cors',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:options.signal||AbortSignal.timeout(12000)});
   if(response.status===403)document.getElementById('remote-access-note').textContent='Access link expired. Open the latest private link from your Mac.';
   return response;
  }catch(error){endpointAt=0;throw error;}
 };
 document.addEventListener('DOMContentLoaded',()=>{
  const note=document.createElement('p');note.id='remote-access-note';note.style='font-size:12px;color:#65778f;margin:8px 0 16px';
  note.textContent=key?'Remote connection · Your Mac must be awake and online.':'Open the private access link to connect. No username or password is needed.';
  (document.querySelector('.main-inner')||document.body).prepend(note);
  if(!key){
   const banner=document.createElement('section');banner.className='panel';banner.style='padding:20px;margin-bottom:16px';
   banner.textContent='This is your private trading dashboard. Open the access link shared with you to view live data and use Update trader.';
   note.after(banner);
  }
 });
})();
