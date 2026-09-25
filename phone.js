(()=>{
 const box=document.createElement('section');box.className='update-control';
 const title=document.createElement('strong'), note=document.createElement('p'), button=document.createElement('button');
 button.textContent='Checking…';button.disabled=true;box.append(title,note,button);box.setAttribute('aria-label','Software updates');
 (document.querySelector('.top-right')||document.querySelector('main')).append(box);
 let state=null,busy=false,target=null,inFlight=false;
 async function refresh(){
  if(inFlight)return;
  if(window.WeatherDeskRemote?.requiresLogin){title.textContent='Sign in to check updates';button.disabled=true;return;}
  inFlight=true;const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
  const r=await fetch('/api/phone-update',{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error();state=await r.json();
  const version=String(state.releaseId||'').match(/-r(\d+)(?:-|$)/)?.[1];
  const installed=['CURRENT','INSTALLED'].includes(state.state);
  title.textContent=version?'r'+version:installed?'Latest version':'';
  note.textContent=state.state==='INSTALLED'?'Latest release installed. See trader status below.':state.summary||state.state||'Checking for updates';note.hidden=true;
  button.title=(state.releaseId?state.releaseId+' · ':'')+note.textContent;
  if(target&&['CURRENT','INSTALLED'].includes(state.state)&&state.releaseId===target){target=null;busy=false;}
  if(target&&(state.state==='ERROR'||(state.requestExit!=null&&state.requestExit!==0))){busy=false;target=null;title.textContent='Update failed · refresh and retry';}
  button.hidden=false;button.disabled=!state.canUpdate||busy||state.requestRunning;
  button.textContent=state.canUpdate?'Update available':state.requestRunning||state.state==='APPLYING'?'Updating…':installed?'Up to date':'Unavailable';
  box.dataset.state=state.canUpdate?'available':installed?'current':'waiting';
 }catch{title.textContent=window.WeatherDeskRemote?.requiresLogin?'Sign in required':'Reconnecting';button.textContent='Unavailable';note.textContent=state?.releaseId?'Last checked: '+state.releaseId+' · checking the Mac again automatically.':'Waiting for your Mac. Retrying automatically.';button.disabled=true;}
 finally{clearTimeout(timeout);inFlight=false;}}
 button.onclick=async()=>{
  if(!state?.canUpdate||busy)return;
  const version=String(state.releaseId||'').match(/-r(\d+)(?:-|$)/)?.[1];
  if(!confirm('Install '+(version?'update r'+version:'this update')+'?\n\n'+(state.summary||'A new release is ready.')+'\n\nThis may start or restart trading.'))return;
  busy=true;target=state.releaseId;button.disabled=true;
  try{const r=await fetch('/api/phone-update',{method:'POST',headers:{'Content-Type':'application/json','X-Weather-Trader-Control':state.csrf},body:JSON.stringify({updateToken:state.updateToken})});if(!r.ok)throw Error();title.textContent='Update requested · waiting for adoption';}
  catch{busy=false;target=null;title.textContent='Update request failed; refresh and retry';}await refresh();
 };
 refresh();setInterval(refresh,5000);window.addEventListener('weather-auth-changed',refresh);window.addEventListener('online',refresh);
})();
