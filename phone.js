(()=>{
 // Product controls live in the cards. A sealed account-owner release can carry
 // shared changes, so its impact is shown rather than implying separate installs.
 const names={weather:'Weather',btc:'Bitcoin'};
 let state=null,busy=false,target=null,inFlight=false,error='',reviewing=false;
 function render(){
  document.querySelectorAll('[data-update-product]').forEach(box=>{
   const id=box.dataset.updateProduct,button=box.querySelector('button'),note=box.querySelector('[data-update-note]');
   const product=state?.products?.[id],current=product||state;
   const installed=['CURRENT','INSTALLED'].includes(current?.state),version=String(current?.releaseId||'').match(/-r(\d+)(?:-|$)/)?.[1];
   const available=!!current?.canUpdate&&!error;
   const applying=busy||state?.requestRunning||state?.state==='APPLYING';
   button.disabled=!available||applying||reviewing;
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
 function releaseNotes(product){
  if(Array.isArray(product.releaseNotes)&&product.releaseNotes.every(x=>typeof x==='string'))return product.releaseNotes;
  return String(product.summary||'Install the prepared release.').replace(/([.!?])\s+([A-Z])/g,'$1\n$2').split(/\n+/).map(x=>x.trim().replace(/^[•-]\s*/, '')).filter(Boolean);
 }
 async function review(id,product){
  const version=String(product.releaseId||'').match(/-r(\d+)(?:-|$)/)?.[1];
  const title='Update '+names[id]+(version?' to r'+version:'')+'?';
  const notes=releaseNotes(product);
  const scope=product.activationScope==='SHARED_RELEASE'?'This package updates both traders and their shared runtime.':'';
  const modal=document.createElement('dialog');
  if(typeof modal.showModal!=='function')return confirm(title+'\n\n'+notes.map(x=>'• '+x).join('\n')+'\n\n'+scope+'\nThis may start or restart trading.');
  modal.className='release-review';modal.setAttribute('aria-labelledby','release-review-title');
  modal.innerHTML='<form method="dialog"><p class="release-review-kicker">Release review</p><h2 id="release-review-title"></h2><p class="release-review-version"></p><h3>What changes</h3><ul class="release-review-log"></ul><p class="release-review-scope"></p><p class="release-review-effect">Confirming may start or restart trading. Your saved entry switches remain in effect.</p><div class="release-review-actions"><button value="cancel" autofocus>Cancel</button><button value="confirm" class="confirm-update">Confirm update</button></div></form>';
  modal.querySelector('h2').textContent=title;
  modal.querySelector('.release-review-version').textContent=product.releaseId||'Prepared update';
  const list=modal.querySelector('ul');
  notes.forEach(note=>{const li=document.createElement('li');li.textContent=note;list.append(li);});
  const impact=modal.querySelector('.release-review-scope');impact.textContent=scope;impact.hidden=!scope;
  document.body.append(modal);modal.returnValue='cancel';
  return new Promise(resolve=>{
   modal.addEventListener('close',()=>{const approved=modal.returnValue==='confirm';modal.remove();resolve(approved);},{once:true});
   modal.showModal();
  });
 }
 document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-product-update]');if(!button)return;
  const id=button.dataset.productUpdate,product=state?.products?.[id]||state;
  if(!names[id]||!product?.canUpdate||busy||reviewing||error)return;
  // Bind the request to the exact release and CSRF value that the user reviewed.
  // Polling may discover a newer release while the dialog is open; it must not
  // silently become the requested update. The backend rejects stale tokens.
  const request={product:id,updateToken:product.updateToken||state.updateToken},csrf=state.csrf;
  reviewing=true;render();
  let approved=false;
  try{approved=await review(id,product);}finally{reviewing=false;render();}
  if(!approved){document.querySelector('[data-product-update="'+id+'"]').focus();return;}
  busy=true;target=product.releaseId;render();
  try{
   const response=await fetch('/api/phone-update',{method:'POST',headers:{'Content-Type':'application/json','X-Weather-Trader-Control':csrf},body:JSON.stringify(request)});
   if(!response.ok)throw Error();
  }catch{busy=false;target=null;error='Update could not be applied. Refresh and review the latest release again.';render();return;}
  await refresh();
 });
 window.addEventListener('product-cards-rendered',render);
 refresh();setInterval(refresh,5000);window.addEventListener('weather-auth-changed',refresh);window.addEventListener('online',refresh);
})();
