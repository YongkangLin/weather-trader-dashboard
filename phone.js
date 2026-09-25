(()=>{
 // Product controls live in the cards. A sealed account-owner release can carry
 // shared changes, so its impact is shown rather than implying separate installs.
 const names={weather:'Weather',btc:'Bitcoin'};
 let state=null,busy=false,target=null,inFlight=false,error='';
 function render(){
  document.querySelectorAll('[data-update-product]').forEach(box=>{
   const id=box.dataset.updateProduct,button=box.querySelector('button'),note=box.querySelector('[data-update-note]');
   const product=state?.products?.[id],current=product||state;
   const installed=['CURRENT','INSTALLED'].includes(current?.state),version=String(current?.releaseId||'').match(/-r(\d+)(?:-|$)/)?.[1];
   const available=!!current?.canUpdate&&!error;
   const applying=busy||state?.requestRunning||state?.state==='APPLYING';
   button.disabled=!available||applying;
   button.textContent=applying?'Updating…':available?'Update '+names[id]+(version?' · r'+version:''):installed?names[id]+' up to date':state?'Update unavailable':'Checking update…';
   button.title=current?.summary||'';
   box.dataset.state=available?'available':installed?'current':'waiting';
   note.textContent=error|| (available&&current?.activationScope==='SHARED_RELEASE'?'This package updates both traders and their shared runtime.':applying?'Waiting for the selected release to be adopted.':current?.state==='INSTALLED'?'Installed. See trader status above.':'');
  });
 }
 async function refresh(){
  if(inFlight)return;
  if(window.WeatherDeskRemote?.requiresLogin){state=null;error='Sign in to check updates.';render();return;}
  inFlight=true;const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch('/api/phone-update',{cache:'no-store',signal:controller.signal});
   if(!response.ok)throw Error();state=await response.json();error='';
   if(target&&['CURRENT','INSTALLED'].includes(state.state)&&state.releaseId===target){target=null;busy=false;}
   if(target&&(state.state==='ERROR'||(state.requestExit!=null&&state.requestExit!==0))){busy=false;target=null;error='Update failed. Refresh and retry.';}
  }catch{error=window.WeatherDeskRemote?.requiresLogin?'Sign in to check updates.':'Reconnecting to your Mac for update status…';}
  finally{clearTimeout(timeout);inFlight=false;render();}
 }
 document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-product-update]');if(!button)return;
  const id=button.dataset.productUpdate,product=state?.products?.[id]||state;
  if(!names[id]||!product?.canUpdate||busy||error)return;
  const version=String(product.releaseId||'').match(/-r(\d+)(?:-|$)/)?.[1];
  const scope=product.activationScope==='SHARED_RELEASE'?'\n\nThis release also updates the other trader and shared runtime. Both cards will show the installed version.':'';
  if(!confirm('Update '+names[id]+(version?' to r'+version:'')+'?\n\n'+(product.summary||'A new release is ready.')+scope+'\n\nThis may start or restart trading.'))return;
  busy=true;target=product.releaseId;render();
  try{
   const response=await fetch('/api/phone-update',{method:'POST',headers:{'Content-Type':'application/json','X-Weather-Trader-Control':state.csrf},body:JSON.stringify({product:id,updateToken:product.updateToken||state.updateToken})});
   if(!response.ok)throw Error();
  }catch{busy=false;target=null;error='Update request failed. Refresh and retry.';render();return;}
  await refresh();
 });
 window.addEventListener('product-cards-rendered',render);
 refresh();setInterval(refresh,5000);window.addEventListener('weather-auth-changed',refresh);window.addEventListener('online',refresh);
})();
