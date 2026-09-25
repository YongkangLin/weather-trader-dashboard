const inputLabels={NEW_CYCLE_RETRY:'New cycle retrying',RETAINED_INPUT:'Earlier cycle retained',UNAVAILABLE:'Unavailable at source',LIMITED_COVERAGE:'Routine reports only',AVAILABLE_WITH_LIMITATIONS:'Source limitations',READY:'Ready',RECEIVED:'Received',PARTIAL:'Some gaps',GAP:'Missing',WAITING:'Waiting',STALE:'Stale',STOPPED:'Stopped',UNKNOWN:'Unconfirmed',RECONNECTING:'Reconnecting',NOT_CONFIGURED:'Not in this release',TARGET_DAY_ONLY:'Target day only',COLLECTING:'Collecting',SCHEDULED:'Scheduled',UNLISTED:'Not listed',MISSED_CUTOFF:'Cutoff missed'};
function inputBadge(status){return `<span class="input-badge ${['READY','RECEIVED'].includes(status)?'good':['GAP','STALE','RECONNECTING','MISSED_CUTOFF'].includes(status)?'bad':['PARTIAL','WAITING','COLLECTING','NEW_CYCLE_RETRY','RETAINED_INPUT'].includes(status)?'warn':''}">${escapeHTML(inputLabels[status]||'Unconfirmed')}</span>`}
function renderInputStatus(value){
 const d=value||{},cells=d.cells||[];
 // Display source availability separately from the trader's retained inputs.
 // Never upgrade trading readiness using a collector timestamp.
 const supplemental=(d.inputs||[]).find(r=>r.id==='highFrequency');
 const inputs=(d.inputs||[]).map(r=>{
  if(r.id!=='observations')return r;
  return {...r,items:(r.items||[]).map(i=>{
   const station=(supplemental?.items||[]).find(s=>s.station===i.station);
   const options=station?.sourceDisagreement?[]:(station?.sources||[]).filter(s=>
    ['RECEIVED','LIMITED_COVERAGE'].includes(s.status)&&!s.reason&&
    Number.isFinite(s.temperatureF)&&s.observedNs>0&&s.observedNs<=s.receivedNs&&
    recordFresh(s.checkedNs,300)&&recordFresh(s.observedNs,5400));
   const latest=options.sort((a,b)=>b.observedNs-a.observedNs)[0];
   return latest&&latest.observedNs>(i.observedNs||0)?{...i,newerAvailable:latest}:i;
  })};
 });
 const usage=r=>r.id==='highFrequency'?
  (r.usedByTradingAlgorithm?'Trading use: verified literal reports; '+(r.entryGuardActive?'five-minute/CLI entry safeguards active.':'five-minute safeguard not active.')+' Probability-model use varies by source and city; this status does not prove ingestion of every sample.':'Trading integration not confirmed for the running release.'):
  r.id==='regionalAlternatives'?'Collection only — not used in live probabilities.':
  ['NBM','GFS','NAM','LAV','HRRR','WN2'].includes(r.id)?'Received cycles are not necessarily the newest provider cycle or the cycle selected by each model.':'';
 const opened=new Set(Array.from($('inputs-list').querySelectorAll('details[open]')).map(e=>e.dataset.inputId));
 const group=r=>['READY','RECEIVED','LIMITED_COVERAGE','AVAILABLE_WITH_LIMITATIONS'].includes(r.status)?'available':['SCHEDULED','UNAVAILABLE','NOT_REQUIRED','NOT_CONFIGURED','TARGET_DAY_ONLY','UNLISTED'].includes(r.status)?'excluded':['NEW_CYCLE_RETRY','RETAINED_INPUT'].includes(r.status)?'pending':'issue';
 const good=r=>['available','excluded'].includes(group(r));
 const counts=k=>inputs.filter(r=>group(r)===k).length;
 $('inputs-all').setAttribute('aria-pressed',String(!inputAttentionOnly));$('inputs-attention').setAttribute('aria-pressed',String(inputAttentionOnly));
 $('inputs-count').textContent=!d.running?'Trader stopped':!d.live?'Updates delayed':`${counts("available")} available · ${counts("pending")} pending · ${counts("issue")} need attention · ${counts("excluded")} not expected`;
 $('inputs-overview').innerHTML=escapeHTML(!d.running?'Trader stopped. Saved records are shown below.':!d.live?'Trader heartbeat delayed. Current readiness is unconfirmed.':d.note||'Checking inputs.')+`<div class="input-release">${escapeHTML(d.running?'Running: '+(d.runningRelease||'unknown'):'Last run: '+(d.lastRunRelease||'none'))} · Selected: ${escapeHTML(d.selectedRelease||'unknown')}${d.snapshotRelease!==d.selectedRelease?'<br>Saved records belong to the previous release.':''}</div>`;
 const detail=i=>`<div class="input-detail-line"><strong>${escapeHTML([i.city,i.station,i.targetDate].filter(Boolean).join(' · '))}</strong> · ${escapeHTML(inputLabels[i.status]||'Unconfirmed')}<br>Received ${escapeHTML(ageText(i.receivedNs))}${i.observedNs?'<br>Recorded observation '+escapeHTML(ageText(i.observedNs)):''}${i.newerAvailable?'<br><strong>Newer collector reading: '+escapeHTML(ageText(i.newerAvailable.observedNs))+'</strong> · '+escapeHTML(i.newerAvailable.source)+'<br>Availability only; trader consumption is not confirmed by this panel.':''}${Number.isFinite(i.temperatureF)?'<br>Temperature '+escapeHTML(i.temperatureF.toFixed(1))+'°F':''}${i.source?'<br>Source '+escapeHTML(i.source):''}${i.sources?'<br>'+i.sources.map(s=>escapeHTML(s.source)+': '+escapeHTML(inputLabels[s.status]||s.status)+(s.observedNs?' · observed '+escapeHTML(ageText(s.observedNs)):'')+(s.reason?' · '+escapeHTML(plainReason(s.reason)):'')).join('<br>'):''}${i.cadence?'<br>'+escapeHTML(i.cadence==='FIVE_MINUTE_REPORTS_OBSERVED'?'Five-minute reports observed':i.cadence==='PUBLIC_FIVE_MINUTE_UNAVAILABLE'?'Five-minute data unavailable on verified public routes':'Five-minute cadence not confirmed'):''}${i.checkedNs?'<br>Checked '+escapeHTML(ageText(i.checkedNs)):''}${i.issuedNs?'<br>Model issue '+escapeHTML(dateText(i.issuedNs,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'})):''}${i.retryIssueNs?'<br>Retrying model issue '+escapeHTML(dateText(i.retryIssueNs,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'})):''}${i.nextAttemptNs?'<br>Next scheduled attempt '+escapeHTML(dateText(i.nextAttemptNs,{hour:'numeric',minute:'2-digit',timeZoneName:'short'})):''}${present(i.markets)?'<br>'+escapeHTML(i.freshBooks)+' / '+escapeHTML(i.markets)+' books fresh':''}${present(i.jobs)?'<br>'+escapeHTML(i.completedJobs)+' cycles received in current schedule; '+escapeHTML(i.failedJobs)+' cycles retrying; '+escapeHTML(i.futureJobs||0)+' future cycles':''}${i.reason?'<br>'+escapeHTML(plainReason(i.reason)):''}</div>`;
 const card=r=>`<details class="input-item" data-input-id="${escapeHTML(r.id)}" ${opened.has(r.id)?'open':''}><summary>${inputBadge(r.status)}<strong>${escapeHTML(r.name)}</strong><small>Receipt ${escapeHTML(ageText(r.receivedNs))} · details ↓</small>${r.summary?'<p class="input-why">'+escapeHTML(r.summary)+'</p>':''}</summary><p>${escapeHTML(r.detail)}</p>${usage(r)?'<p><strong>'+escapeHTML(usage(r))+'</strong></p>':''}${(r.items||[]).map(detail).join('')}</details>`;
 const groups=[['Trading connections',['account','private','books','metadata']],['Station observations',['observations','highFrequency','cliHigh','reportedHigh','nearby','regionalAlternatives']],['Forecast models',['NBM','GFS','NAM','LAV','HRRR','WN2','calibration','observationModels']]];
 $('inputs-list').innerHTML=groups.map(([name,ids])=>{const selected=inputs.filter(r=>ids.includes(r.id)&&(!inputAttentionOnly||!good(r)));return selected.length?`<section class="input-group"><h3>${name}</h3><div class="input-group-rows">${selected.map(card).join('')}</div></section>`:''}).join('')||'<p class="input-empty">No inputs currently need attention.</p>';
 $('inputs-matrix').innerHTML=Object.keys(names).map(city=>`<article class="input-cell"><h3>${escapeHTML(names[city])}</h3>${cells.filter(c=>c.city===city).map(c=>`<p><strong>${c.horizon?'Next day':'Same day'} · ${escapeHTML(c.targetDate)}</strong><br>${inputBadge(c.status)}<br>Forecast: ${escapeHTML(inputLabels[c.forecastStatus]||'Unconfirmed')}<br>Market: ${escapeHTML(inputLabels[c.metadataStatus]||'Unconfirmed')}<br>Depth: ${escapeHTML(inputLabels[c.bookStatus]||'Unconfirmed')}<br>Observation-NO: ${escapeHTML(inputLabels[c.observationStatus]||'Unconfirmed')}${c.nextDecisionNs?'<small>'+(c.forecastStatus==='RECEIVED'?'Next richer model update ':'Observation model window ')+escapeHTML(dateText(c.nextDecisionNs,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}))+'</small>':''}${c.reason?'<small>'+escapeHTML(({CONTINUOUS_PRIOR_READY:'Forecast-only calibration is available now; no daytime entry window. Richer observation updates are used when ready.',LATE_RECEIPT_PROFILE_READY:'Forecast recovered from the exact required cycles. Available from its real arrival time; original forecast age is preserved.',FORECAST_READY:'Calibrated probabilities are available. Entries still require value after costs and executable depth.',WAITING_EXACT_SOURCE_RECOVERY:'Retrying the exact required forecast cycles. The original cutoff remains recorded as missed.',EARLIER_FORECAST_REQUIRED_FOR_REVISION:'This update requires an earlier forecast that was not captured. New downloads cannot recreate that receipt history.',WAITING_FITTED_CUTOFF:'Collecting the forecast and observation window this calibration requires.',NO_RETAINED_PROFILE_FOR_DATE:'No saved forecast for this date. Collecting for the next eligible cutoff.',REQUIRED_NATIVE_INPUT_GAP:'Required inputs did not arrive before this cutoff.'})[c.reason]||plainReason(c.reason))+'</small>':''}<small>Settlement ${escapeHTML(c.settlementStation||city)} · ${escapeHTML(c.settlementProduct||'unconfirmed')}</small></p>`).join('')}</article>`).join('');
}
let inputAttentionOnly=false;
let dailyHighOffset=0;
function renderDailyHighs(highs,generatedAtNs,settlementHighs,hourlyHighs){
 const stations=[['KMIA','Miami','America/New_York',-5],['KLAX','Los Angeles','America/Los_Angeles',-8],['KSFO','San Francisco','America/Los_Angeles',-8],['KMDW','Chicago','America/Chicago',-6],['KNYC','New York','America/New_York',-5]];
 const now=Date.now()*1e6,rows=Array.isArray(highs)?highs:[],official=Array.isArray(settlementHighs)?settlementHighs:[];
 const opened=new Set(Array.from($('daily-highs-grid').querySelectorAll('details[open]')).map(e=>e.dataset.city));
 $('highs-current').setAttribute('aria-pressed',String(dailyHighOffset===0));$('highs-previous').setAttribute('aria-pressed',String(dailyHighOffset===-1));
 let shown=0;
 $('daily-highs-grid').innerHTML=stations.map(([city,name,zone,standardOffset])=>{
  const target=new Date(Date.now()+standardOffset*3600000+dailyHighOffset*86400000).toISOString().slice(0,10);
  const row=rows.find(r=>r.city===city&&r.station===city&&r.targetDate===target);
  const hourly=(hourlyHighs||[]).find(r=>r.city===city&&r.targetDate===target);
  const report=official.find(r=>r.city===city&&r.station===city&&r.targetDate===target);
  const available=report?.status==='REPORT_AVAILABLE'&&Number.isInteger(report.highF)&&report.issuedNs<=now&&report.receivedNs<=now;
  const observed=row&&row.status!=='CONFLICT'&&present(row.highF)&&Number.isFinite(Number(row.highF))&&Number(row.highObservedNs)>=Number(row.windowStartNs)&&Number(row.highObservedNs)<=Number(row.latestObservationNs)&&Number(row.latestObservationNs)<=now;
  const fresh=observed&&row.status==='AVAILABLE'&&recordFresh(row.checkedNs,300)&&recordFresh(generatedAtNs,90);
  const completed=available&&report.reportStatus==='DAILY_REPORT';
  if(observed)shown++;
  const when=ns=>dateText(ns,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:zone,timeZoneName:'short'});
  const source=({NWS_OBSERVATIONS_API:'NWS station observations',NOAA_MADIS_PUBLIC_HFMETAR:'NOAA MADIS station observations'})[row?.highSource]||'NOAA station METAR';
  const href=report?.sourceUrl&&/^https:\/\/api\.weather\.gov\/products\/[0-9a-f-]{36}$/.test(report.sourceUrl)?report.sourceUrl:null;
  return `<article class="daily-high-card" data-city="${city}"><div class="daily-high-city"><div class="daily-high-identity"><h3>${name}</h3><span class="station-code">${city}</span></div><p class="daily-high-date">${escapeHTML(new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(target+'T12:00:00Z')))}</p></div><div class="daily-high-pair"><div><p class="daily-high-label">Observed high</p><div class="daily-high-value">${observed?escapeHTML(Number(row.highF).toFixed(2).replace(/\.?0+$/,''))+'<span>°F</span>':'—'}</div><span class="daily-high-status ${observed&&!fresh&&dailyHighOffset===0?'delayed':''}">${observed?(!fresh&&dailyHighOffset===0?'Updates delayed':'Observed so far'):'Waiting for readings'}</span></div><div><p class="daily-high-label">${available&&!completed?'NWS high':'Settled high'}</p><div class="daily-high-value">${available?escapeHTML(String(report.highF))+'<span>°F</span>':'—'}</div><span class="daily-high-status ${available&&!completed?'preliminary':''}">${available?(completed?(report.corrected?'Corrected daily report':'Daily report'):'Preliminary'):'Awaiting report'}</span></div></div><details class="daily-high-details" data-city="${city}" ${opened.has(city)?'open':''}><summary>Source details</summary><p>${observed?(row.highKind==='SIX_HOUR_MAXIMUM'?'Six-hour maximum reported ':'Observed peak ')+escapeHTML(when(row.highObservedNs))+' · '+escapeHTML(source):'No usable reading for this day.'}</p>${row?.highLiteralMetar?'<p><code>'+escapeHTML(row.highLiteralMetar)+'</code></p>':''}<p>Hourly-only high: ${Number.isFinite(hourly?.highF)?escapeHTML(hourly.highF.toFixed(2))+'°F':'Waiting'} · ${escapeHTML(hourly?.reportCount||0)} reports${hourly?.status==='PARTIAL'?' · some hours missing':''}</p>${available&&!completed?'<p>Preliminary NWS report: '+escapeHTML(String(report.highF))+'°F · may change</p>':''}<a class="daily-high-source" target="_blank" rel="noopener noreferrer" href="https://www.weather.gov/wrh/timeseries?site=${city.toLowerCase()}">NWS station observations ↗</a>${href?'<br><a class="daily-high-source" target="_blank" rel="noopener noreferrer" href="'+escapeHTML(href)+'">NWS settlement report ↗</a>':''}</details></article>`;
 }).join('');
 $('daily-highs-count').textContent=shown===5?'All cities reporting':`${shown} of 5 reporting`;
}
function renderDeskStrategies(data){
 const map=data.performance?.configuredStrategyMap||[],running=data.process?.running===true;
 const groups=[
  {name:'Observation · NO',ids:['OBSERVATION_EXCLUSION_NO_V1'],horizon:'Same-day markets',text:'Exclude brackets that two valid station observations have already passed.'},
  {name:'Calibrated forecast',ids:['NATIVE_MULTISOURCE_PROBABILITY_VALUE_V1','NBM_PROBABILITY_VALUE_V1'],horizon:'Same-day + next-day markets',text:'Compare city-specific bracket probabilities with market prices after costs.'},
  {name:'Historical Miami',ids:['MIAMI294_KELLY_STRONG_AND_FALLBACK'],horizon:'Original decision schedule',text:'Strong entry + conditional zero-fill fallback.'},
  {name:'Historical Los Angeles',ids:['LA594_KELLY_MAKER','LA594_KELLY_STRONG_WITH_600_SUBSTITUTION'],horizon:'Original decision schedule',text:'Maker + hedge; strong entry + substitution and fallback.'}
 ];
 const rows=groups.map(g=>({...g,configured:map.filter(r=>g.ids.includes(r.strategyId))})).filter(g=>g.configured.length);
 $('strategies-count').textContent=running?`${rows.length} enabled strategy groups`:'Trader stopped';
 const forecast=(data.inputStatus?.inputs||[]).find(r=>r.id==='calibration');
 $('strategy-roster').innerHTML=`<div class="strategy-roster">${rows.map(g=>{const cities=[...new Set(g.configured.map(r=>r.city))];const f=g.name==='Calibrated forecast';return `<article class="strategy-tile"><div><h3>${escapeHTML(g.name)}</h3><span class="input-badge ${running?'good':''}">${running?'Enabled':'Configured · stopped'}</span></div><p class="strategy-cities">${escapeHTML(cities.length===5?'All five cities':cities.map(c=>names[c]||c).join(', '))}</p><p>${escapeHTML(g.text)}</p><small>${escapeHTML(g.horizon)}${f&&forecast?' · '+escapeHTML(inputLabels[forecast.status]||'Waiting for inputs'):''}</small></article>`}).join('')}</div>${map.some(r=>r.strategyId==='MIAMI317_HELD_MISSING_FIRST_LEG_PROBABILITY')?'<p class="strategy-held"><strong>Held:</strong> Historical Miami maker — missing first-leg probability for Kelly sizing. Miami’s strong/fallback strategy remains enabled.</p>':''}<p class="strategy-footnote">Forecast entries react to available forecasts and prices at any time. Historical strategies retain their own schedules; all entries require fresh inputs and shared account checks.</p>`;
}

document.addEventListener('DOMContentLoaded',()=>{
 const form=document.getElementById('reserve-form'),input=document.getElementById('reserve-amount'),button=document.getElementById('reserve-save'),note=document.getElementById('reserve-status');
 if(!form)return;let state=null,editRevision=null,dirty=false,busy=false,fetching=false;
 input.addEventListener('input',()=>{if(!dirty)editRevision=state?.revision;dirty=true;});
 async function refresh(){
  if(fetching)return;fetching=true;
  try{
   const response=await fetch('/api/protected-balance',{cache:'no-store',signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw Error('Protected balance unavailable');state=await response.json();
   input.disabled=!state.supported||busy;button.disabled=!state.supported||busy||!!state.error;
   if(!dirty)input.value=state.protectedReserveUSD??'';
   note.textContent=state.error||(!state.supported?'Update trader to enable this control.':state.applied?'Applied · $'+state.protectedReserveUSD+' protected':!state.running?'Saved · applies when the trader starts.':'Saved · awaiting trader acknowledgement.');
   if(dirty&&editRevision!==state.revision)note.textContent='Changed elsewhere. Your edit is kept; refresh the page before saving.';
  }catch{button.disabled=true;note.textContent='Connection unavailable · saved setting is unchanged.';}
  finally{fetching=false;}
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!state?.supported||busy||!form.reportValidity())return;
  const value=input.value.trim(),revision=dirty?editRevision:state.revision;
  if(!/^(0|[1-9][0-9]{0,8})(\.[0-9]{1,2})?$/.test(value)){note.textContent='Enter dollars with at most two decimal places.';return;}
  busy=true;button.disabled=true;input.disabled=true;note.textContent='Saving…';
  try{
   const response=await fetch('/api/protected-balance',{method:'POST',headers:{'Content-Type':'application/json','X-Weather-Trader-Control':state.csrf},body:JSON.stringify({revision,protectedReserveUSD:value}),signal:AbortSignal.timeout(10000)});
   const result=await response.json();if(!response.ok)throw Error(result.error||'Save not confirmed');
   dirty=false;editRevision=null;input.value=result.protectedReserveUSD;note.textContent='Saved · awaiting trader acknowledgement.';window.dispatchEvent(new Event('capital-setting-saved'));
  }catch(error){note.textContent=error.message||'Save not confirmed. Refresh before retrying.';busy=false;input.disabled=false;return;}
  busy=false;await refresh();
 });
 refresh();setInterval(refresh,5000);window.addEventListener('weather-auth-changed',refresh);
});

function renderCapital(c){
 const el=document.getElementById('capital-content'),status=document.getElementById('capital-status');if(!el)return;
 if(!c){status.textContent='Waiting for account records';return;}
 status.textContent=c.fresh?'Current account check':'Last recorded · awaiting refresh';
 const fact=(label,value)=>`<div><dt>${escapeHTML(label)}</dt><dd>${value==null?'—':escapeHTML(money(value))}</dd></div>`;
 const dd=c.drawdown||{},pct=v=>v==null?'—':(Number(v)*100).toFixed(1)+'%';
 el.innerHTML=`<dl class="capital-grid">${fact('Withdrawable cash',c.withdrawableCashUSD)}${fact('Bonus credit · separate',c.bonusUSD)}${fact('Protected amount',c.protectedUSD)}${fact('Held position cost',c.heldCostUSD)}${fact('Pending commitments',c.committedUSD)}${fact('Conservative position value',c.markedClaimsUSD)}${fact('Trading bankroll',c.bankrollUSD)}${fact('Remaining capacity · upper bound',c.remainingCapacityUSD)}</dl><p class="capital-note">${c.active?'Quarter Kelly · limits apply within each trader allocation after the split update. Unquoted position quantity has zero risk value.':'Conservative risk update is not active. Figures follow the running policy; activate the update to enable quarter Kelly and the tighter limits.'}</p>${!c.available?'<p class="capital-alert">'+escapeHTML(c.reason||'Risk inputs unavailable')+'</p>':''}${Number(c.reserveShortfallUSD)>0?'<p class="capital-alert">Withdrawable cash is '+escapeHTML(money(c.reserveShortfallUSD))+' below your protected amount. Bonus is not protected cash.</p>':''}${c.reserveDiffersFromAccount?'<p class="capital-note">Limits reflect your saved reserve; trader acknowledgement is pending.</p>':''}${c.active&&!c.independentProducts?'<p class="capital-note">Daily drawdown '+pct(dd.dailyDrawdownFraction)+' · peak drawdown '+pct(dd.peakDrawdownFraction)+'. '+(dd.dailyLatched?'Daily brake stays on until the next account day. ':'')+(dd.peakLatched?'Peak brake requires review before new risk. ':'')+'Account day: Los Angeles time.</p>':''}${c.newRiskHoldReason?'<p class="capital-alert">New risk paused: '+escapeHTML(String(c.newRiskHoldReason).replaceAll('_',' ').toLowerCase())+'. Closing and reconciliation remain available.</p>':''}${c.breaches?.length?'<details class="capital-breaches"><summary>'+c.breaches.length+' existing limit breaches</summary><ul>'+c.breaches.map(b=>'<li>'+escapeHTML(b.scope+' · '+b.identity)+': '+escapeHTML(money(b.exposureUSD))+' / '+escapeHTML(money(b.limitUSD))+'</li>').join('')+'</ul><p>Additions to breached exposures are blocked. Existing positions are not forcibly sold.</p></details>':''}<p class="capital-note">Each trader has separate exposure and drawdown limits. The shared wallet only constrains available cash. This panel is not profit or liquidation proceeds.</p>`;
}
let productControlState=null, traderServiceState=null, productBusy=false, productLatest=null;
function renderProductDesk(data){
 productLatest=data;
 const el=document.getElementById('product-cards');if(!el)return;
 const controls=productControlState||data.productControls||{},accounting=data.productAccounting?.products||{};
 const supported=controls.runtimeSupportsControls,applied=supported&&controls.appliedRevision===controls.revision;
 const process=data.process||{},btc=data.btc||{},live=recordFresh(process.heartbeatNs,90)&&process.running;
 const opened=new Set(Array.from(el.querySelectorAll('details[open]')).map(x=>x.dataset.product));
 el.innerHTML=['weather','btc'].map(id=>{
  const enabled=controls.products?.[id],a=accounting[id],isBTC=id==='btc';
  const title=isBTC?'Bitcoin':'Weather';
  let state=!supported?'Update required':!applied?'Applying setting':enabled?'Entries enabled':'Entries paused';
  if(!live&&supported)state='Service stopped · '+(enabled?'enabled when started':'paused');
  const reason=isBTC?(recordFresh(btc.atNs,30)?({USER_PAUSED_BTC:'New BTC entries are paused.',OUTSIDE_LAST_FIVE_MINUTES:'Waiting for the final five-minute entry window.',BTC_METADATA_PENDING:'Waiting for the next BTC contract.'}[btc.reason]||String(btc.reason||btc.status||'Watching').replaceAll('_',' ').toLowerCase()):'Waiting for BTC runtime'):
    enabled?'Five city forecasts · current weather strategy':'New entries paused; existing positions stay monitored';
  const stat=(label,value)=>`<div><dt>${escapeHTML(label)}</dt><dd>${value==null?'—':escapeHTML(money(value))}</dd></div>`;
  const risk=data.productRisk?.products?.[id];
  const riskText=risk?`<dl class="product-metrics">${stat('Capital · 50% after reserve',risk.allocationUSD)}${stat('Own total exposure cap',risk.limits?.totalUSD)}${stat('Available cash capacity',risk.cashCapacityUSD)}</dl><p class="product-risk">Own drawdown · daily ${(Number(risk.dailyDrawdownFraction||0)*100).toFixed(1)}% / 5% · peak ${(Number(risk.peakDrawdownFraction||0)*100).toFixed(1)}% / 10%${risk.reason?' · '+escapeHTML(risk.reason.replaceAll('_',' ').toLowerCase()):''}</p>`:'<p class="product-risk">50% of capital after reserve · separate exposure limits and drawdown brake. Awaiting updated runtime.</p>';
  const confirmed=Number(a?.confirmedMarkets||0),partial=a&&(a.pendingMarkets>0||a.accountingStatus!=='READY');
  const pnl=confirmed>0?(a?.realizedPnlUSD??a?.knownRealizedPnlUSD):null;
  const pnlLabel=confirmed>0?(partial?'Realized P&L · partial':'Realized P&L'):a?.pnlStatus==='NO_FILLS'?'Realized P&L · no fills':'P&L · pending reconciliation';
  const metrics=`<dl class="product-metrics">${stat(pnlLabel,pnl)}${stat(a?.feeStatus==='KNOWN_ONLY'?'Known fees / rebates':'Fees / rebates',a?.feesUSD)}${stat('Open exposure',a?.openExposureUSD)}</dl>`;
  const pnlNote=a?`${confirmed} confirmed market${confirmed===1?'':'s'} · ${a.openMarkets||0} open · ${a.settlementPendingMarkets||0} awaiting settlement reconciliation. Fees are included in confirmed results; open positions are excluded.`:'Accounting records unavailable.';
  const date=ns=>new Date(Number(ns)/1e6).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  const windowText=isBTC&&recordFresh(btc.atNs,30)&&btc.endNs?`Entry ${date(btc.entryStartsNs)}–${date(btc.endNs)} · original target ${money(btc.priceToBeat)} · BRTI ${money(btc.probability?.latestPrice)}`:isBTC?'PMUS 15-minute contracts · entries in final 5 minutes':'Miami · Los Angeles · San Francisco · Chicago · New York';
  const positions=(a?.positions||[]).map(p=>`<li><span title="${escapeHTML(p.marketSlug)}">${escapeHTML(p.marketSlug)}</span><strong>${escapeHTML(p.side)} · ${escapeHTML(p.quantity)} · ${money(p.costUSD)}</strong></li>`).join('');
  const orders=(a?.orders||[]).slice(-10).reverse().map(o=>`<li><span title="${escapeHTML(o.marketSlug)}">${escapeHTML(o.marketSlug)}</span><strong>${escapeHTML(o.status||'Unknown')}</strong></li>`).join('');
  const w=data.weatherStatus||{};
  const statusBlock=isBTC?`<p class="product-reason">${escapeHTML(reason)}</p>`:`<section class="product-weather-status" data-tone="${escapeHTML(w.tone||'waiting')}" aria-label="Weather status"><span class="status-kicker"><span class="status-dot"></span>Weather status</span><h4>${escapeHTML(w.title||'Checking trader…')}</h4><p>${escapeHTML(w.reason||reason)}</p>${w.next?`<p class="weather-status-next">${escapeHTML(w.next)}</p>`:''}</section>`;
  return `<article class="product-card" data-product="${id}"><div class="product-card-head"><div><span class="product-symbol">${isBTC?'₿':'☀'}</span><h3>${title}</h3></div><span class="product-pill ${enabled&&applied&&live?'on':''}">${escapeHTML(state)}</span></div><p class="product-scope">${escapeHTML(windowText)}</p>${metrics}<p class="product-pnl-note">${escapeHTML(pnlNote)}</p>${riskText}${statusBlock}<button type="button" class="product-toggle ${enabled?'pause':'enable'}" data-product="${id}" ${!supported||productBusy?'disabled':''}>${enabled?'Pause '+title+' entries':'Enable '+title+' entries'}</button><div class="product-update" data-update-product="${id}" role="region" aria-label="${title} software update"><button type="button" data-product-update="${id}" disabled>Checking update…</button><p data-update-note></p></div><details data-product="${id}" ${opened.has(id)?'open':''}><summary>${a?.orderCount??'—'} orders · ${a?.positions?.length??'—'} open positions${partial?' · '+a.pendingMarkets+' P&L pending':''}</summary><h4>Positions</h4><ul>${positions||'<li>No recorded open positions</li>'}</ul><h4>Recent orders</h4><ul>${orders||'<li>No recorded orders</li>'}</ul><p>${a?.accountingStatus==='INCOMPLETE_HISTORY'?'Some historical fills lack complete evidence. Only known amounts are shown.':'P&L uses owned fills, actual fees and matched settlement receipts.'}</p></details></article>`;
 }).join('');
 window.dispatchEvent(new Event('product-cards-rendered'));
 el.querySelectorAll('.product-toggle').forEach(button=>button.addEventListener('click',()=>setProduct(button.dataset.product)));
 const message=document.getElementById('product-message');
 if(!productBusy)message.textContent=!supported?'Install the available update to control both traders. BTC starts paused.':'Enabling permits real trades after account, source and risk checks. Pausing stops new submissions; resting quotes can fill until expiry. Positions continue to reconcile.';
 const service=document.getElementById('trader-service');
 if(traderServiceState){service.disabled=productBusy;service.textContent=traderServiceState.running?'Stop service':'Start service';}
}
async function refreshProductControls(){
 if(window.WeatherDeskRemote?.requiresLogin)return;
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{const responses=await Promise.all(['/api/products','/api/trader'].map(url=>fetch(url,{cache:'no-store',signal:controller.signal})));
   if(responses.some(r=>!r.ok))throw Error('Control connection unavailable');
   [productControlState,traderServiceState]=await Promise.all(responses.map(r=>r.json()));
  }finally{clearTimeout(timer);}
  if(productLatest)renderProductDesk(productLatest);
 }catch{const message=document.getElementById('product-message');if(message&&!productBusy)message.textContent='Controls reconnecting to your Mac…';}
}
async function setProduct(product){
 if(productBusy||!productControlState?.runtimeSupportsControls)return;
 productBusy=true;if(productLatest)renderProductDesk(productLatest);
 const message=document.getElementById('product-message');
 try{
  const r=await fetch('/api/products',{method:'POST',headers:{'Content-Type':'application/json','X-Weather-Trader-Control':productControlState.csrf},body:JSON.stringify({product,enabled:!productControlState.products[product],revision:productControlState.revision})});
  if(!r.ok)throw Error('Setting changed or connection interrupted. Refresh and retry.');
  message.textContent='Saved · waiting for trader acknowledgement';
 }catch(e){message.textContent=e.message;}
 finally{productBusy=false;await refreshProductControls();}
}
function initializeProductControls(){
 document.getElementById('trader-service')?.addEventListener('click',async()=>{
  if(productBusy||!traderServiceState)return;
  const action=traderServiceState.running?'stop':'start';
  if(!confirm(action==='start'?'Start the installed release? Enabled traders may place real-money orders.':'Stop the trading service? Open positions stay in your account.'))return;
  productBusy=true;if(productLatest)renderProductDesk(productLatest);
  try{
   const r=await fetch('/api/trader',{method:'POST',headers:{'Content-Type':'application/json','X-Weather-Trader-Control':traderServiceState.csrf},body:JSON.stringify({action,manifestSha256:traderServiceState.manifestSha256})});
   if(!r.ok)throw Error();document.getElementById('product-message').textContent='Service change requested';
  }catch{document.getElementById('product-message').textContent='Service request failed. Refresh and retry.';}
  finally{productBusy=false;await refreshProductControls();}
 });
 refreshProductControls();setInterval(refreshProductControls,5000);window.addEventListener('weather-auth-changed',refreshProductControls);
}
document.addEventListener('DOMContentLoaded',initializeProductControls);

function btcPriceChart(chart){
 if(!chart?.points?.length)return `<section class="btc-chart"><h4>Bitcoin · 15-minute price movement</h4><p>${chart?.status==='UNAVAILABLE'?'Public BRTI prices are temporarily unavailable.':'Loading public BRTI prices…'}</p></section>`;
 const pts=chart.points.filter(p=>Array.isArray(p)&&Number.isFinite(Number(p[0]))&&Number.isFinite(Number(p[1])));
 if(!pts.length)return '<p>BRTI prices unavailable.</p>';
 const start=Number(chart.startNs)/1e9,end=Number(chart.endNs)/1e9,target=Number(chart.priceToBeat);
 if(!(end>start)||!Number.isFinite(target))return '<p>BTC contract metadata unavailable.</p>';
 const values=pts.map(p=>Number(p[1])).concat(target),low=Math.min(...values),high=Math.max(...values),pad=Math.max(5,(high-low)*.14);
 const ymin=low-pad,ymax=high+pad,x=t=>12+(t-start)/(end-start)*520,y=p=>20+(ymax-p)/(ymax-ymin)*154;
 const price=p=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(p);
 const clock=t=>new Date(t*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
 let path='',last=null;
 for(const [t,p]of pts){path+=(last===null||t-last!==1?'M':'L')+x(t).toFixed(2)+','+y(Number(p)).toFixed(2)+' ';last=t;}
 const entry=Number(chart.entryStartsNs)/1e9,fresh=chart.fresh&&recordFresh(chart.latestPriceNs,25),latest=Number(pts[pts.length-1][1]),delta=latest-target;
 return `<section class="btc-chart" aria-label="Bitcoin price movement"><div class="btc-chart-heading"><h4>Bitcoin · 15-minute price movement</h4><span class="${fresh?'':'btc-stale'}">${fresh?'Live · refreshes every 10s':'Delayed / reconnecting'}</span></div><div class="btc-chart-price">${escapeHTML(price(latest))}<small>${delta>=0?'+':''}${escapeHTML(price(delta))} vs target</small></div><svg viewBox="0 0 640 218" role="img" aria-label="BTC BRTI price over the current fifteen-minute contract, original target dashed, final five minutes shaded"><rect x="${x(entry)}" y="16" width="${x(end)-x(entry)}" height="163" fill="#e3ac5010"/><text x="${x(entry)+7}" y="12" class="btc-window-label">Final 5 min</text>${[ymin,(ymin+ymax)/2,ymax].map(v=>`<line x1="12" x2="532" y1="${y(v)}" y2="${y(v)}" class="btc-grid"/><text x="542" y="${y(v)+4}">${escapeHTML(price(v))}</text>`).join('')}<line x1="12" x2="532" y1="${y(target)}" y2="${y(target)}" class="btc-target"/><path d="${path}" class="btc-series"/><circle cx="${x(pts[pts.length-1][0])}" cy="${y(latest)}" r="3" fill="#e4b76c"/>${[start,start+450,end].map((t,i)=>`<text x="${x(t)}" y="205" text-anchor="${i===0?'start':i===2?'end':'middle'}">${escapeHTML(clock(t))}</text>`).join('')}</svg><div class="btc-chart-legend"><span>— BRTI / USD</span><span>╌ Original target ${escapeHTML(price(target))}</span></div><p>Last tick ${escapeHTML(ageText(chart.latestPriceNs))} · rolling 60-second average ${chart.rollingAverageUSD==null?'unavailable':escapeHTML(money(chart.rollingAverageUSD))}. Settlement uses the closing 60-second average; the line shows individual index prices.</p>${chart.missingSeconds?`<p>${chart.missingSeconds} seconds without a qualified observation; gaps remain visible.</p>`:''}</section>`;
}
