/* Public interface only. The password is sent over HTTPS to the Mac. */
(()=>{
 'use strict';
 const originalFetch=window.fetch.bind(window), storageKey='weather-desk-session:'+location.pathname;
 let token=null, endpoint=null, endpointAt=0, endpointPromise=null, loginBox=null;
 try{localStorage.removeItem('weather-desk-access:'+location.pathname);token=localStorage.getItem(storageKey);}catch{}
 if(new URLSearchParams(location.hash.slice(1)).has('access'))history.replaceState(null,'',location.pathname);
 window.EventSource=undefined;
 window.WeatherDeskRemote={requiresLogin:!token};
 async function discover(){
  if(endpoint&&Date.now()-endpointAt<30000)return endpoint;
  if(endpointPromise)return endpointPromise;
  endpointPromise=(async()=>{
   const r=await originalFetch('./endpoint.json?t='+Math.floor(Date.now()/30000),{cache:'no-store',signal:AbortSignal.timeout(8000)});
   if(!r.ok)throw Error('Mac connection unavailable');
   const value=await r.json();
   if(!/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(value.endpoint))throw Error('Mac connection unavailable');
   endpoint=value.endpoint;endpointAt=Date.now();return endpoint;
  })();
  try{return await endpointPromise;}finally{endpointPromise=null;}
 }
 function lock(){
  token=null;try{localStorage.removeItem(storageKey);}catch{}
  window.WeatherDeskRemote.requiresLogin=true;
  document.body.classList.add('remote-locked');if(loginBox)loginBox.hidden=false;
 }
 async function call(path,options={}){
  const base=await discover(),headers=new Headers(options.headers||{});
  if(token)headers.set('Authorization','Bearer '+token);
  try{
   const response=await originalFetch(base+path,{...options,headers,mode:'cors',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:options.signal||AbortSignal.timeout(12000)});
   if(response.status===401&&path!=='/api/login')lock();
   if(response.status>=500)endpointAt=0;
   return response;
  }catch(error){endpointAt=0;throw error;}
 }
 window.fetch=async(input,options={})=>{
  if(typeof input!=='string'||!input.startsWith('/api/'))return originalFetch(input,options);
  if(!token)throw Error('Sign in to connect');
  if(!['/api/status','/api/phone-update'].includes(input))throw Error('Control unavailable remotely');
  return call(input,options);
 };
 document.addEventListener('DOMContentLoaded',()=>{
  const style=document.createElement('style');style.textContent='.remote-locked main{display:none}#remote-login{max-width:390px;margin:12vh auto;padding:28px;background:#fff;border:1px solid #dfe6ee;border-radius:16px;box-shadow:0 10px 35px #1421380b}#remote-login h1{margin:0 0 8px}#remote-login p{color:#65778f}#remote-login label{display:block;margin:18px 0 6px;font-weight:600}#remote-login input{width:100%;padding:11px;border:1px solid #ccd6e5;border-radius:8px;font:inherit}#remote-login button{width:100%;margin-top:20px;padding:12px;border:0;border-radius:8px;color:white;background:#4263eb;font:inherit;cursor:pointer}#remote-login button:disabled{opacity:.55;cursor:wait}#login-message{min-height:22px;font-size:13px}';document.head.append(style);
  loginBox=document.createElement('section');loginBox.id='remote-login';
  loginBox.innerHTML='<h1>Weather Desk</h1><p>Sign in to view your trader and apply updates.</p><form><label for="remote-user">Username</label><input id="remote-user" name="username" autocomplete="username" required><label for="remote-password">Password</label><input id="remote-password" name="password" type="password" autocomplete="current-password" required><button type="submit">Sign in</button><p id="login-message" role="status"></p></form>';
  document.body.prepend(loginBox);loginBox.hidden=!!token;
  if(!token)document.body.classList.add('remote-locked');
  const form=loginBox.querySelector('form'),message=loginBox.querySelector('#login-message'),button=form.querySelector('button');
  form.addEventListener('submit',async event=>{
   event.preventDefault();if(button.disabled)return;button.disabled=true;message.textContent='Connecting to your Mac…';
   try{
    const data={username:form.username.value,password:form.password.value};
    const response=await call('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const result=await response.json();
    if(!response.ok)throw Error(result.error||'Unable to sign in');
    token=result.token;try{localStorage.setItem(storageKey,token);}catch{}
    form.password.value='';message.textContent='';loginBox.hidden=true;document.body.classList.remove('remote-locked');window.WeatherDeskRemote.requiresLogin=false;
    document.getElementById('refresh')?.click();window.dispatchEvent(new Event('weather-auth-changed'));
   }catch(error){message.textContent=error.message==='Failed to fetch'?'Mac connection interrupted. Please retry shortly.':error.message;}
   finally{button.disabled=false;}
  });
  const bar=document.createElement('p');bar.style='font-size:12px;color:#65778f;margin:8px 0 16px';
  bar.append('Remote connection · Your Mac must be awake and online. ');
  const logout=document.createElement('button');logout.textContent='Sign out';logout.style='border:0;background:none;color:#4263eb;cursor:pointer';
  logout.onclick=async()=>{try{await call('/api/logout',{method:'POST'});}finally{lock();window.dispatchEvent(new Event('weather-auth-changed'));}};
  bar.append(logout);document.querySelector('.main-inner').prepend(bar);
 });
})();
