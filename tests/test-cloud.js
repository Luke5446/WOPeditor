// The saved changes kept in edits.json in the repo (21 Oct 2026), against a
// stand-in GitHub API:
//   1. no token: the editor is browser-only and the pill says so
//   2. a token and no file yet: the browser copy is written as edits.json
//   3. a save writes the file again, once, a moment after the change
//   4. a fresh browser (no local copy) reads the file and shows its edits
//   5. the file newer than the browser copy wins; the browser copy newer is written
//   6. a stale sha (422) is read again and the write lands
//   7. the file saved from another PC after this page opened is not written over
const { chromium } = require('playwright');
const path=require('path');
const URL='file://'+path.join(__dirname,'..','index.html');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ctx=await b.newContext(); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
 // the stand-in: a file store with sha, served on the API; everything else to the network is refused
 await p.addInitScript(()=>{
   // the store lives in sessionStorage so it survives the reloads below
   const load=()=>JSON.parse(sessionStorage.getItem('__store')||'{"file":null,"sha":0,"gets":0,"puts":0,"fail422":0,"log":[]}');
   const keep=st=>sessionStorage.setItem('__store',JSON.stringify(st));
   Object.defineProperty(window,'__store',{get:load,set:keep});
   const enc=s=>btoa(unescape(encodeURIComponent(s))), dec=b=>decodeURIComponent(escape(atob(b)));
   window.fetch=function(url,opt){ opt=opt||{}; const st=load();
     if(String(url).indexOf('api.github.com')<0) return Promise.reject(new Error('offline'));
     if(!opt.method||opt.method==='GET'){ st.gets++; keep(st); if(!st.file) return Promise.resolve({status:404,ok:false,json:()=>Promise.resolve({})});
       return Promise.resolve({status:200,ok:true,json:()=>Promise.resolve({content:enc(st.file),sha:'s'+st.sha})}); }
     const body=JSON.parse(opt.body); st.puts++;
     if(st.fail422>0){ st.fail422--; keep(st); return Promise.resolve({status:422,ok:false,json:()=>Promise.resolve({})}); }
     if(st.file && body.sha!=='s'+st.sha){ keep(st); return Promise.resolve({status:409,ok:false,json:()=>Promise.resolve({})}); }
     st.file=dec(body.content); st.sha++; st.log.push(body.message); keep(st);
     return Promise.resolve({status:200,ok:true,json:()=>Promise.resolve({content:{sha:'s'+st.sha}})}); };
 });
 const pill=()=>p.evaluate(()=>[$('cloudTxt').textContent, $('cloudPill').className]);
 const wait=ms=>p.waitForTimeout(ms);
 const out={};
 // 1. no token
 await p.goto(URL); await wait(600);
 out.noToken=await pill();
 // a saved change in the browser, as before this existed (no stamp)
 await p.evaluate(()=>{ localStorage.setItem('tibard_woe_v1', JSON.stringify({styles:{'ZZTEST01':{code:'ZZTEST01',name:'Test style',editedAt:'2026-10-20',fabrics:[],trims:[],mfg:[],fin:[]}},charts:{},chartCols:{}})); localStorage.setItem('tibard_woe_token','tok'); });
 // 2. token, no file yet: the browser copy goes up
 await p.goto(URL); await wait(2500);
 out.firstPush=await p.evaluate(()=>{ const st=window.__store; const f=st.file?JSON.parse(st.file):null; return [st.puts, f&&Object.keys(f.styles).join(), f&&f.styles.ZZTEST01.name, !!(f&&f.savedAt), $('cloudTxt').textContent.slice(0,18)]; });
 // 3. a save writes again, once
 await p.evaluate(()=>{ EDITS.styles.ZZTEST01.name='Test style renamed'; saveEdits(); saveEdits(); });
 await wait(2500);
 out.save=await p.evaluate(()=>{ const st=window.__store; return [st.puts, JSON.parse(st.file).styles.ZZTEST01.name, st.log[st.log.length-1].slice(0,24)]; });
 // 4. a fresh browser reads the file
 await p.evaluate(()=>{ localStorage.removeItem('tibard_woe_v1'); });
 await p.goto(URL); await wait(2500);
 out.fresh=await p.evaluate(()=>[Object.keys(EDITS.styles).join(), EDITS.styles.ZZTEST01&&EDITS.styles.ZZTEST01.name, window.__store.puts, $('cloudTxt').textContent.slice(0,18)]);
 // 5a. the file newer than the browser copy wins
 await p.evaluate(()=>{ const st=window.__store; const f=JSON.parse(st.file); f.styles.ZZTEST01.name='From another PC'; f.savedAt='2099-01-01T00:00:00.000Z'; st.file=JSON.stringify(f); st.sha++; window.__store=st; });
 await p.goto(URL); await wait(2500);
 out.fileWins=await p.evaluate(()=>[EDITS.styles.ZZTEST01.name, window.__store.puts]);
 // 5b. the browser copy newer than the file is written
 await p.evaluate(()=>{ const st=window.__store; const f=JSON.parse(st.file); f.savedAt='2000-01-01T00:00:00.000Z'; f.styles.ZZTEST01.name='Old file'; st.file=JSON.stringify(f); st.sha++; window.__store=st; const l=JSON.parse(localStorage.getItem('tibard_woe_v1')); l.savedAt='2026-10-21T21:00:00.000Z'; l.styles.ZZTEST01.name='Newer in browser'; localStorage.setItem('tibard_woe_v1', JSON.stringify(l)); });
 const putsBefore=await p.evaluate(()=>window.__store.puts);
 await p.goto(URL); await wait(2500);
 out.browserWins=await p.evaluate(()=>[EDITS.styles.ZZTEST01.name, JSON.parse(window.__store.file).styles.ZZTEST01.name, window.__store.puts]);
 out.browserWins.push(putsBefore);
 // 6. a stale sha is read again and the write lands
 await p.evaluate(()=>{ const st=window.__store; st.fail422=1; window.__store=st; EDITS.styles.ZZTEST01.name='After a 422'; saveEdits(); });
 await wait(4500);
 out.retry=await p.evaluate(()=>[JSON.parse(window.__store.file).styles.ZZTEST01.name, $('cloudTxt').textContent.slice(0,18)]);
 // 7. another PC saved after this page opened: not written over
 await p.evaluate(()=>{ const st=window.__store; const f=JSON.parse(st.file); f.savedAt='2099-06-01T00:00:00.000Z'; f.styles.ZZTEST01.name='Other PC, later'; st.file=JSON.stringify(f); st.sha++; window.__store=st; EDITS.styles.ZZTEST01.name='This PC, stale'; saveEdits(); });
 await wait(2500);
 out.behind=await p.evaluate(()=>[JSON.parse(window.__store.file).styles.ZZTEST01.name, $('cloudTxt').textContent]);
 console.log(JSON.stringify(out,null,1));
 const pass = out.noToken[0]==='Saved in this browser' && /snap/.test(out.noToken[1])
   && out.firstPush[0]===1 && out.firstPush[1]==='ZZTEST01' && out.firstPush[2]==='Test style' && out.firstPush[3]===true && out.firstPush[4]==='Saved in the repo '
   && out.save[0]===2 && out.save[1]==='Test style renamed' && out.save[2]==='Works order editor saved'
   && out.fresh[0]==='ZZTEST01' && out.fresh[1]==='Test style renamed' && out.fresh[2]===2 && out.fresh[3]==='Saved in the repo '
   && out.fileWins[0]==='From another PC' && out.fileWins[1]===2
   && out.browserWins[0]==='Newer in browser' && out.browserWins[1]==='Newer in browser' && out.browserWins[2]===out.browserWins[3]+1
   && out.retry[0]==='After a 422' && out.retry[1]==='Saved in the repo '
   && out.behind[0]==='Other PC, later' && out.behind[1]==='Another PC saved later';
 console.log(pass?'PASS':'FAIL'); console.log('errors:', errs.length?errs.join('\n'):'none'); await b.close();
})();
