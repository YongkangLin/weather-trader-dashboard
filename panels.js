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
  return `<article class="daily-high-card" data-city="${city}"><div class="daily-high-city"><h3>${name}</h3><span class="station-code">${city}</span></div><p class="daily-high-date">${escapeHTML(new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(target+'T12:00:00Z')))}</p><div class="daily-high-pair"><div><p class="daily-high-label">Observed high</p><div class="daily-high-value">${observed?escapeHTML(Number(row.highF).toFixed(2).replace(/\.?0+$/,''))+'<span>°F</span>':'—'}</div><span class="daily-high-status ${observed&&!fresh&&dailyHighOffset===0?'delayed':''}">${observed?(!fresh&&dailyHighOffset===0?'Updates delayed':'Observed so far'):'Waiting for readings'}</span></div><div><p class="daily-high-label">${available&&!completed?'NWS high':'Settled high'}</p><div class="daily-high-value">${available?escapeHTML(String(report.highF))+'<span>°F</span>':'—'}</div><span class="daily-high-status ${available&&!completed?'preliminary':''}">${available?(completed?(report.corrected?'Corrected daily report':'Daily report'):'Preliminary'):'Awaiting report'}</span></div></div><details class="daily-high-details" data-city="${city}" ${opened.has(city)?'open':''}><summary>View source</summary><p>${observed?(row.highKind==='SIX_HOUR_MAXIMUM'?'Six-hour maximum reported ':'Observed peak ')+escapeHTML(when(row.highObservedNs))+' · '+escapeHTML(source):'No usable reading for this day.'}</p>${row?.highLiteralMetar?'<p><code>'+escapeHTML(row.highLiteralMetar)+'</code></p>':''}<p>Hourly-only high: ${Number.isFinite(hourly?.highF)?escapeHTML(hourly.highF.toFixed(2))+'°F':'Waiting'} · ${escapeHTML(hourly?.reportCount||0)} reports${hourly?.status==='PARTIAL'?' · some hours missing':''}</p>${available&&!completed?'<p>Preliminary NWS report: '+escapeHTML(String(report.highF))+'°F · may change</p>':''}<a class="daily-high-source" target="_blank" rel="noopener noreferrer" href="https://www.weather.gov/wrh/timeseries?site=${city.toLowerCase()}">NWS station observations ↗</a>${href?'<br><a class="daily-high-source" target="_blank" rel="noopener noreferrer" href="'+escapeHTML(href)+'">NWS settlement report ↗</a>':''}</details></article>`;
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
 el.innerHTML=`<dl class="capital-grid">${fact('Withdrawable cash',c.withdrawableCashUSD)}${fact('Bonus credit · separate',c.bonusUSD)}${fact('Protected amount',c.protectedUSD)}${fact('Held position cost',c.heldCostUSD)}${fact('Pending commitments',c.committedUSD)}${fact('Conservative position value',c.markedClaimsUSD)}${fact('Trading bankroll',c.bankrollUSD)}${fact('Remaining capacity · upper bound',c.remainingCapacityUSD)}</dl><p class="capital-note">${c.active?'Quarter Kelly · shared caps: 5% losing outcome, 15% city/day, 25% city, 50% total. Unquoted position quantity has zero risk value.':'Conservative risk update is not active. Figures follow the running policy; activate the update to enable quarter Kelly and the tighter limits.'}</p>${!c.available?'<p class="capital-alert">'+escapeHTML(c.reason||'Risk inputs unavailable')+'</p>':''}${Number(c.reserveShortfallUSD)>0?'<p class="capital-alert">Withdrawable cash is '+escapeHTML(money(c.reserveShortfallUSD))+' below your protected amount. Bonus is not protected cash.</p>':''}${c.reserveDiffersFromAccount?'<p class="capital-note">Limits reflect your saved reserve; trader acknowledgement is pending.</p>':''}${c.active?'<p class="capital-note">Daily drawdown '+pct(dd.dailyDrawdownFraction)+' · peak drawdown '+pct(dd.peakDrawdownFraction)+'. '+(dd.dailyLatched?'Daily brake stays on until the next account day. ':'')+(dd.peakLatched?'Peak brake requires review before new risk. ':'')+'Account day: Los Angeles time.</p>':''}${c.newRiskHoldReason?'<p class="capital-alert">New risk paused: '+escapeHTML(String(c.newRiskHoldReason).replaceAll('_',' ').toLowerCase())+'. Closing and reconciliation remain available.</p>':''}${c.breaches?.length?'<details class="capital-breaches"><summary>'+c.breaches.length+' existing limit breaches</summary><ul>'+c.breaches.map(b=>'<li>'+escapeHTML(b.scope+' · '+b.identity)+': '+escapeHTML(money(b.exposureUSD))+' / '+escapeHTML(money(b.limitUSD))+'</li>').join('')+'</ul><p>Additions to breached exposures are blocked. Existing positions are not forcibly sold.</p></details>':''}<p class="capital-note">Capacity is shared across strategies and repeat purchases, before individual outcome limits and order checks. This panel is not profit or liquidation proceeds.</p>`;
}
