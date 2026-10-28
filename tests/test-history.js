// The change history (28 Oct 2026): a save asks for a reason and refuses without one; the reason is kept
// per style in the saved changes (edits.json / browser copy), shown on the style, exported with it, and
// an entry that came back through data.json is merged in.
const { chromium } = require('playwright');
const path=require('path');
const URL='file://'+path.join(__dirname,'..','index.html');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ctx=await b.newContext(); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
 p.on('dialog',d=>d.accept());
 await p.addInitScript(()=>{ window.fetch=function(){ return Promise.reject(new Error('offline')); }; });
 await p.goto(URL); await p.waitForTimeout(800);
 const out={};
 // 1. a change saved without a reason is refused
 out.refused=await p.evaluate(()=>{ const c=BASE.order[0]; cur=c; renderAll(); const s=edit(c); s.name=s.name+' (changed)'; afterEdit(); saveClose();
   const shown=$('ov').classList.contains('show')&&!!$('rsNote'); const before=!!EDITS.styles[c];
   document.querySelector('#mFoot .btn-gold').click();
   return [c, shown, before, !!EDITS.styles[c], $('rsWarn').style.display==='', cur===c]; });
 // 2. with a reason it saves, records the entry and closes
 out.saved=await p.evaluate(()=>{ const c=cur; $('rsNote').value='Name corrected — test'; $('rsBy').value='LH'; document.querySelector('#mFoot .btn-gold').click();
   const h=(EDITS.history[c]||[]); const e=h[h.length-1]||{};
   return [!!EDITS.styles[c], cur, h.length, e.note, e.by, (e.what||[]).join(','), e.via, !!e.at, $('ov').classList.contains('show')]; });
 // 3. kept in the browser copy and the payload for edits.json; exported with the style; shown on the style
 out.kept=await p.evaluate(()=>{ const c=out1=Object.keys(EDITS.history)[0]; const l=JSON.parse(localStorage.getItem('tibard_woe_v1')); const pay=JSON.parse(cloudPayload());
   const x=buildExport(false,false).styles.filter(s=>s.code===c)[0]; cur=c; renderAll(); const hist=$('hist')?$('hist').textContent:'';
   return [(l.history[c]||[]).length, (pay.history[c]||[]).length, x&&x.history&&x.history.length, hist.indexOf('Name corrected — test')>=0, !!EDITS.styles[c].history]; });
 // 4. an entry that came back through data.json is merged in, oldest first, with no duplicate
 out.merged=await p.evaluate(()=>{ const c=Object.keys(EDITS.history)[0]; BASE.styles[c].history=[{at:'2026-01-01T09:00:00.000Z',by:'GT',what:['trims'],note:'from data.json'}].concat(EDITS.history[c]);
   const h=historyFor(c); return [h.length, h[0].note, isChanged(c)]; });
 // 5. a save that changes nothing asks nothing
 out.quiet=await p.evaluate(()=>{ const c=cur; edit(c); saveClose(); return [$('ov').classList.contains('show'), cur, EDITS.history[c].length]; });
 // 6. the history survives a reload
 await p.goto(URL); await p.waitForTimeout(800);
 out.reload=await p.evaluate(()=>{ const c=Object.keys(EDITS.history)[0]; return [EDITS.history[c].length, EDITS.history[c][0].note]; });
 // 7. a bulk edit needs a reason too
 out.bulk=await p.evaluate(()=>{ tab='bulk'; const codes=Object.keys(EDITS.styles); bulkSel={}; codes.forEach(c=>bulkSel[c]=true); renderBulk(); curOp='lines'; renderOp();
   $('oLT').value='Test line added'; const before=JSON.stringify(EDITS.styles); opApply(); const blocked=JSON.stringify(EDITS.styles)===before;
   $('opWhy').value='Line added — test'; opApply(); const c=codes[0]; const e=EDITS.history[c][EDITS.history[c].length-1];
   return [blocked, e.note, e.via, (e.what||[]).join(',')]; });
 console.log(JSON.stringify(out,null,1));
 const pass = out.refused[1]===true && out.refused[2]===false && out.refused[3]===false && out.refused[4]===true && out.refused[5]===true
   && out.saved[0]===true && out.saved[1]===null && out.saved[2]===1 && out.saved[3]==='Name corrected — test' && out.saved[4]==='LH' && out.saved[5]==='details' && out.saved[6]==='editor' && out.saved[7]===true && out.saved[8]===false
   && out.kept[0]===1 && out.kept[1]===1 && out.kept[2]===1 && out.kept[3]===true && out.kept[4]===false
   && out.merged[0]===2 && out.merged[1]==='from data.json' && out.merged[2]===true
   && out.quiet[0]===false && out.quiet[1]===null && out.quiet[2]===1
   && out.reload[0]===1 && out.reload[1]==='Name corrected — test'
   && out.bulk[0]===true && out.bulk[1]==='Line added — test' && out.bulk[2]==='bulk' && /manufacturing/.test(out.bulk[3]);
 console.log(pass?'PASS':'FAIL'); console.log('errors:', errs.length?errs.join('\n'):'none'); await b.close();
})();
