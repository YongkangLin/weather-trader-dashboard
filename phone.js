(()=>{
 const box=document.createElement('section');box.className='panel';box.style='margin:12px 0;padding:16px';
 const title=document.createElement('strong'), note=document.createElement('p'), button=document.createElement('button');
 button.textContent='Update trader';button.style='padding:10px 18px;cursor:pointer';box.append(title,note,button);
 (document.querySelector('.main-inner')||document.querySelector('main')||document.body).prepend(box);
 let state=null,busy=false,target=null,inFlight=false;
 async function refresh(){
  if(inFlight)return;
  if(window.WeatherDeskRemote?.requiresLogin){title.textContent='Sign in to check updates';button.disabled=true;return;}
  inFlight=true;const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
  const r=await fetch('/api/phone-update',{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error();state=await r.json();
  title.textContent=state.requestRunning?'Update requested':state.state==='AVAILABLE'?'A new release is ready':state.state==='APPLYING'?'Update is applying':state.state==='CURRENT'?'Latest release is running':'Trader updates';
  note.textContent=(state.releaseId||'')+' · '+(state.summary||state.state||'Waiting for release status');
  if(target&&['CURRENT','INSTALLED'].includes(state.state)&&state.releaseId===target){target=null;busy=false;}
  if(target&&(state.state==='ERROR'||(state.requestExit!=null&&state.requestExit!==0))){busy=false;target=null;title.textContent='Update failed · refresh and retry';}
  button.hidden=false;button.disabled=!state.canUpdate||busy||state.requestRunning;
  button.textContent=state.canUpdate?'Update trader':state.requestRunning||state.state==='APPLYING'?'Updating…':state.state==='CURRENT'?'Update trader · up to date':'Update trader';
 }catch{title.textContent=window.WeatherDeskRemote?.requiresLogin?'Sign in to check updates':'Connection interrupted · retrying';note.textContent=state?.releaseId?'Last checked: '+state.releaseId+' · checking the Mac again automatically.':'Waiting for your Mac. Retrying automatically.';button.disabled=true;}
 finally{clearTimeout(timeout);inFlight=false;}}
 button.onclick=async()=>{
  if(!state?.canUpdate||busy)return;
  if(!confirm('Apply '+state.releaseId+' using the usual trader start workflow? This can restart or start trading.'))return;
  busy=true;target=state.releaseId;button.disabled=true;
  try{const r=await fetch('/api/phone-update',{method:'POST',headers:{'Content-Type':'application/json','X-Weather-Trader-Control':state.csrf},body:JSON.stringify({updateToken:state.updateToken})});if(!r.ok)throw Error();title.textContent='Update requested · waiting for adoption';}
  catch{busy=false;target=null;title.textContent='Update request failed; refresh and retry';}await refresh();
 };
 refresh();setInterval(refresh,5000);window.addEventListener('weather-auth-changed',refresh);window.addEventListener('online',refresh);
})();
