/* 画面の切り替え、学習記録、用語集、問題集。 */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const view=$('#view'), topTitle=$('#top-title'), backBtn=$('#back');
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const TERM=TERMS.map((t,i)=>({i,c:t[0],t:t[1],y:t[2],en:t[3],imp:t[4],def:t[5],more:t[6],ex:(t[7]&&t[7].ex)||[]}));
const TBY=Object.fromEntries(TERM.map(t=>[t.t,t]));
/* $...$ は数式、**...** は強調。link が真なら、用語集にある強調語を押せるようにする */
const md=(s,link)=>s.split(/\$([^$]+)\$/).map((p,i)=>i%2?TeX(p):esc(p).replace(/\*\*(.+?)\*\*/g,(m,w)=>link&&TBY[w]?`<button type="button" class="tm" data-term="${TBY[w].i}">${w}</button>`:`<strong>${w}</strong>`)).join('');
const IMP=['','発展','重要','最重要'];
const imp=(v,label)=>`<span class="imp" data-v="${v}" ${label?'aria-hidden="true"':`role="img" aria-label="重要度 ${IMP[v]}"`}><i></i><i></i><i></i></span>${label?`<span class="imp-label" data-v="${v}">${IMP[v]}</span>`:''}`;
const CH=Object.fromEntries(CHAPTERS.map((c,i)=>(c.n=i+1,c.must=c.blocks.filter(b=>b.must),[c.id,c])));
const SHORT={vec:'ベクトル',comb:'線形結合・独立',dot:'内積・直交',map:'行列・線形変換',prod:'積・逆行列',sys:'連立方程式',det:'行列式',space:'空間・基底',rank:'核・像',eig:'固有値',diag:'対角化',orth:'直交化・最小二乗',sym:'対称行列・二次形式',svd:'特異値分解'};
const no2=n=>String(n).padStart(2,'0');
const shuffle=a=>{ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const hash=s=>{ let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))|0; return (h>>>0).toString(36); };
const CHEV='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* ---- 記録 (この端末のブラウザにだけ保存) ---- */
let prog={read:{},q:{}};
try{ const s=JSON.parse(localStorage.getItem('la-progress')||'null'); if(s&&s.read&&s.q) prog=s; }catch(e){}
const save=()=>{ try{ localStorage.setItem('la-progress',JSON.stringify(prog)); }catch(e){} };

/* ---- 問題の一覧を作る ---- */
const POOL=[];
QUIZ.forEach(q=>POOL.push({...q,i:Math.min(q.i,CH[q.c].imp),id:'h'+hash(q.q)}));
TERM.forEach(t=>{
  const i=Math.min(t.imp,CH[t.c].imp);
  /* 説明の中に用語そのものや語尾が出てくる語は、説明から用語を当てる問題にしない */
  const leak=t.t.length>=2&&(t.def.includes(t.t)||(t.t.length>=3&&t.def.includes(t.t.slice(-2))));
  if(!leak) POOL.push({id:'a'+hash(t.t),c:t.c,k:'df',i,term:t,dir:0,q:'次の説明に当てはまる用語はどれですか。',quote:t.def});
  POOL.push({id:'b'+hash(t.t),c:t.c,k:'df',i,term:t,dir:1,q:`「${t.t}」の説明として正しいものはどれですか。`});
});
const KIND={df:'用語と定義',th:'理論',ca:'計算'};
function options(q){
  if(q.tf!==undefined) return {opts:['正しい','誤り'],ans:q.tf?0:1};
  let list, src=null;
  if(q.k==='df'){
    const ok=t=>t.i!==q.term.i&&!q.term.ex.includes(t.t)&&!t.ex.includes(q.term.t);
    const pick=shuffle(TERM.filter(t=>t.c===q.c&&ok(t))).concat(shuffle(TERM.filter(t=>t.c!==q.c&&ok(t)))).slice(0,3);
    src=[q.term].concat(pick); list=src.map(t=>q.dir?t.def:t.t);
  }else list=q.o;
  const idx=shuffle(list.map((_,i)=>i));
  return {opts:idx.map(i=>list[i]),ans:idx.indexOf(0),src:src&&idx.map(i=>src[i])};
}

/* ---- 画面の部品 ---- */
let cleanups=[], lastRoute=null, scrollPos={}, depth=0;
function mountViz(root){
  const io=new IntersectionObserver(es=>es.forEach(e=>{ if(!e.isIntersecting) return; io.unobserve(e.target);
    const f=VIZ[e.target.dataset.viz]; if(f) cleanups.push(f(e.target)); }),{rootMargin:'500px'});
  $$('.viz[data-viz]',root).forEach(el=>io.observe(el)); cleanups.push(()=>io.disconnect());
}
const chStat=(c,core)=>{ let ok=0,ng=0; POOL.forEach(q=>{ if(q.c===c&&(!core||q.i===3)&&prog.q[q.id]){ ok+=prog.q[q.id][0]; ng+=prog.q[q.id][1]; } }); return {ok,ng,n:ok+ng,rate:ok+ng?ok/(ok+ng):0}; };
const row=(c,sub)=>`<li><a class="row" href="#ch-${c.id}"><span class="no">${no2(c.n)}</span><span class="tt">${c.title}</span><span class="st">${imp(c.imp,true)}${CHEV}</span><span class="ds">${sub}</span></a></li>`;

/* ---- 学ぶ (ホーム) ---- */
function mapSvg(){
  const N={vec:[180,26],comb:[100,82],dot:[282,82],map:[100,138],prod:[100,194],sys:[100,250],det:[62,306],space:[204,306],rank:[204,362],eig:[120,418],diag:[120,474],orth:[282,474],sym:[204,530],svd:[204,586]};
  const E=[['vec','comb'],['vec','dot'],['comb','map'],['map','prod'],['prod','sys'],['sys','det'],['sys','space'],['space','rank'],['det','eig'],['rank','eig'],['eig','diag'],['dot','orth'],['diag','sym'],['orth','sym'],['sym','svd']];
  const next=CHAPTERS.find(c=>!prog.read[c.id]);
  return `<svg class="map" viewBox="0 0 360 612" role="img" aria-label="章の前提関係の図。矢印の元の章が、先の章の前提です。">
  <defs><marker id="ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--ink3)"/></marker></defs>
  ${E.map(([a,b])=>`<line class="edge" x1="${N[a][0]}" y1="${N[a][1]+13}" x2="${N[b][0]}" y2="${N[b][1]-15}" marker-end="url(#ah)"/>`).join('')}
  ${CHAPTERS.map(c=>{ const [x,y]=N[c.id], done=prog.read[c.id], now=next&&next.id===c.id;
    return `<a href="#ch-${c.id}" aria-label="第 ${c.n} 章 ${c.title} ${IMP[c.imp]}${done?' 読了':''}"><rect class="hitbox" x="${x-64}" y="${y-22}" width="128" height="44"/>${now?`<rect class="nowbox" x="${x-62}" y="${y-13}" width="124" height="26" rx="13"/>`:''}
    <text class="v${c.imp}" x="${x}" y="${y+4}" text-anchor="middle"><tspan class="n">${no2(c.n)}</tspan> ${SHORT[c.id]}${done?'<tspan class="ok"> ✓</tspan>':''}</text></a>`; }).join('')}
  </svg>`;
}
function home(){
  const next=CHAPTERS.find(c=>!prog.read[c.id])||CHAPTERS[0], started=Object.keys(prog.read).length>0;
  view.innerHTML=`<div class="page">
  <div class="hero"><canvas aria-hidden="true"></canvas><div class="hero-cap" id="hero-cap"></div></div>
  <div class="hero-txt"><h1>線形代数を図で学ぶ</h1>
    <p class="lead">${CHAPTERS.length} 章に分けて、図を動かしながら読めるようにしました。章の終わりに問題があります。</p>
    <p class="route"><b>順に全部読む人</b>は第 1 章から進んでください。<b>時間がない人</b>は、下の 7 項目を番号順に読むだけで全体の骨組みがわかります。</p>
    <div class="cta"><a class="btn" href="#ch-${next.id}">${started?`第 ${next.n} 章から続ける`:'第 1 章から読む'}</a><a class="btn ghost" href="#ch-${CORE[0].ch}-${CORE[0].m}">7 項目だけ読む</a></div></div>

  <div class="sec-head"><h2>最初に押さえる 7 項目</h2></div>
  <p class="sub pad">番号順に読んでください。押すと、その項目を説明している場所が開きます。</p>
  <ol class="core">${CORE.map(c=>`<li><a href="#ch-${c.ch}-${c.m}"><b>${c.t}</b><span>${c.d}</span><em>第 ${CH[c.ch].n} 章</em></a></li>`).join('')}</ol>
  <div class="pad" style="margin-top:14px"><button type="button" class="btn ghost wide" id="core-quiz">最重要の問題を 10 問解く</button></div>

  <div class="sec-head"><h2>章のつながり</h2></div>
  <p class="sub pad">矢印の元の章が、先の章の前提です。太字が最重要の章、薄い字が発展の章です。${started?'✓ は読み終えた章、丸い枠は次に読む章です。':''}</p>
  ${mapSvg()}

  <div class="sec-head"><h2>全 ${CHAPTERS.length} 章</h2><span class="sub">${Object.keys(prog.read).length} 章を読了</span></div>
  <ul class="legend pad"><li>${imp(3,true)} 試験によく出て、あとの章でも使う</li><li>${imp(2,true)} 標準的な試験範囲</li><li>${imp(1,true)} 余裕があれば読む</li></ul>
  <ul class="rows">${CHAPTERS.map(c=>row(c,c.lead+(prog.read[c.id]?' <span class="done-mark">読了</span>':''))).join('')}</ul>
  <p class="foot">大学 1、2 年で学ぶ線形代数の範囲を扱っています。学習の記録はこの端末のブラウザの中にだけ保存されます。</p></div>`;
  cleanups.push(VIZ.hero($('.hero canvas'),$('#hero-cap')));
  $('#core-quiz').onclick=()=>startQuiz('all',{ch:'all',core:true,n:10});
}

/* ---- 章 ---- */
function chapter(id,mi){
  const c=CH[id]; if(!c) return home();
  const terms=TERM.filter(t=>t.c===id), nq=POOL.filter(q=>q.c===id).length, nc=POOL.filter(q=>q.c===id&&q.i===3&&q.k!=='df').length, nx=CHAPTERS[c.n]; let m=0;
  const block=b=>b.h?`<h2>${md(b.h)}</h2>`:b.p?`<p>${md(b.p)}</p>`:b.f?`<div class="fx" tabindex="0">${TeX(b.f,true)}</div>`:b.viz?`<div class="viz" data-viz="${b.viz}"></div>`:
    b.must?`<div class="must" id="must-${m++}"><div class="k">${b.k}</div><p>${md(b.must,true)}</p></div>`:b.pts?`<ul class="pts">${b.pts.map(x=>`<li>${md(x)}</li>`).join('')}</ul>`:'';
  const tl=v=>{ const ts=terms.filter(t=>t.imp===v); return ts.length?`<div class="tgrp"><span class="tgrp-h">${imp(v,true)}</span><ul class="termlist">${ts.map(t=>`<li><button type="button" class="tl" data-term="${t.i}">${t.t}</button></li>`).join('')}</ul></div>`:''; };
  view.innerHTML=`<article class="page">
  <header class="ch-head"><div class="eyebrow">第 <span class="mono">${c.n}</span> 章 ${imp(c.imp,true)}</div><h1>${c.title}</h1><p class="lead">${c.lead}</p>
    <div class="focus"><h2 class="focus-h">この章の重点</h2><ol>${c.must.map((b,i)=>`<li><button type="button" data-must="${i}"><span class="k">${b.k}</span>${b.t}</button></li>`).join('')}</ol></div></header>
  <div class="body">${c.blocks.map(block).join('')}
    <h2>この章の要点</h2><ul class="pts">${c.pts.map(x=>`<li>${md(x)}</li>`).join('')}</ul>
    <h2>まちがえやすい点</h2><ul class="pts trap">${c.traps.map(x=>`<li>${md(x)}</li>`).join('')}</ul>
    <h2>この章の用語</h2><p class="sub">押すと定義が開きます。</p>${tl(3)}${tl(2)}${tl(1)}
  </div>
  <div class="ch-foot" id="ch-foot">${nc?`<button type="button" class="btn wide" id="ch-core">最重要の問題だけ解く<small>理論と計算 ${Math.min(nc,10)} 問</small></button>`:''}
    <button type="button" class="btn ${nc?'ghost ':''}wide" id="ch-quiz">この章の問題を解く<small>${nq} 問の中から 10 問</small></button>
    ${nx?`<a class="btn ghost wide" href="#ch-${nx.id}">第 ${nx.n} 章 ${nx.title} へ進む</a>`:`<a class="btn ghost wide" href="#learn">章の一覧に戻る</a>`}</div></article>`;
  mountViz(view);
  const go=(i,smooth)=>{ const el=$('#must-'+i); if(el) el.scrollIntoView({block:'start',behavior:smooth&&!REDUCED?'smooth':'auto'}); };
  $$('[data-must]').forEach(b=>b.onclick=()=>go(b.dataset.must,true));
  $('#ch-quiz').onclick=()=>startQuiz('all',{ch:id,core:false,n:10});
  if(nc) $('#ch-core').onclick=()=>startQuiz('thca',{ch:id,core:true,n:10});
  const io=new IntersectionObserver(es=>{ if(es[0].isIntersecting&&!prog.read[id]){ prog.read[id]=1; save(); } }); io.observe($('#ch-foot')); cleanups.push(()=>io.disconnect());
  if(mi!==undefined) requestAnimationFrame(()=>{ go(mi,false); const el=$('#must-'+mi); if(el){ el.classList.add('flash'); } });
}

/* ---- 用語 ---- */
let termQ='', termImp=0;
const termBody=t=>`<div>${md(t.def)}</div>${t.more?`<div class="more">${md(t.more)}</div>`:''}<a class="go" href="#ch-${t.c}">第 ${CH[t.c].n} 章 ${CH[t.c].title} で読む${CHEV}</a>`;
function termsPage(){
  view.innerHTML=`<div class="page"><div class="ch-head"><h1>用語集</h1><p class="lead">${TERM.length} 語あります。重要度でしぼり込めます。</p>
    <div class="seg" id="t-imp" role="group" aria-label="重要度でしぼる">${['すべて','最重要','重要','発展'].map((l,i)=>`<button type="button" data-f="${[0,3,2,1][i]}" aria-pressed="${termImp===[0,3,2,1][i]}">${l}</button>`).join('')}</div></div>
  <div class="tools"><input class="search" id="tq" type="search" placeholder="用語、読み、英語、別名でさがす" aria-label="用語をさがす" value="${esc(termQ)}" autocomplete="off"></div>
  <div id="tlist" aria-live="polite"></div></div>`;
  const list=$('#tlist');
  const draw=()=>{
    const q=termQ.trim().toLowerCase(); let html='';
    CHAPTERS.forEach(c=>{
      const ts=TERM.filter(t=>t.c===c.id&&(!termImp||t.imp===termImp)&&(!q||t.t.toLowerCase().includes(q)||t.y.includes(q)||t.en.toLowerCase().includes(q)||t.more.toLowerCase().includes(q)));
      if(!ts.length) return;
      html+=`<div class="grp"><span>第 <span class="mono">${c.n}</span> 章 ${c.title}</span><span><span class="mono">${ts.length}</span> 語</span></div>`+ts.map(t=>`<div class="acc" id="t${t.i}"><button type="button" class="acc-h" aria-expanded="false" aria-controls="tb${t.i}"><span class="t">${t.t}<span class="y">${t.y?t.y+'　':''}<span lang="en">${t.en}</span></span></span><span class="ai">${imp(t.imp,true)}</span>
        <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <div class="acc-b" id="tb${t.i}"><div><div class="acc-in" data-i="${t.i}"></div></div></div></div>`).join('');
    });
    list.innerHTML=html||`<p class="empty">${q?`「${esc(termQ)}」に合う用語はありません。`:'この重要度の用語はありません。'}別の言葉でさがすか、重要度を「すべて」にしてください。</p>`;
  };
  draw();
  $('#tq').oninput=e=>{ termQ=e.target.value; draw(); };
  $('#t-imp').onclick=e=>{ const b=e.target.closest('button'); if(!b) return; termImp=+b.dataset.f; $$('#t-imp button').forEach(x=>x.setAttribute('aria-pressed',x===b)); draw(); };
  list.onclick=e=>{ const h=e.target.closest('.acc-h'); if(!h) return; const a=h.parentElement, open=!a.hasAttribute('data-open');
    if(open){ const box=$('.acc-in',a); if(!box.innerHTML) box.innerHTML=termBody(TERM[+box.dataset.i]); }
    a.toggleAttribute('data-open',open); h.setAttribute('aria-expanded',open); };
}

/* ---- 用語のシート ---- */
const sheet=$('#sheet'), sheetBack=$('#sheet-back'), others=[view,$('#top'),$('#tabs')]; let sheetFrom=null;
function openTerm(i){
  const t=TERM[i]; sheetFrom=document.activeElement;
  $('#sheet-body').innerHTML=`<h3 id="sheet-title">${t.t}</h3><div class="y">${t.y?`<span>${t.y}</span>`:''}<span lang="en">${t.en}</span>${imp(t.imp,true)}</div>${termBody(t)}`;
  sheet.hidden=sheetBack.hidden=false; sheet.style.transform=''; others.forEach(o=>o.inert=true); document.body.classList.add('lock');
  requestAnimationFrame(()=>{ sheet.classList.add('on'); sheetBack.classList.add('on'); $('#sheet-x').focus(); });
}
function closeSheet(){ if(sheet.hidden) return; sheet.classList.remove('on'); sheetBack.classList.remove('on'); sheet.style.transform=''; others.forEach(o=>o.inert=false); document.body.classList.remove('lock');
  setTimeout(()=>{ if(!sheet.classList.contains('on')) sheet.hidden=sheetBack.hidden=true; },430); if(sheetFrom&&sheetFrom.isConnected) sheetFrom.focus(); }
sheetBack.onclick=closeSheet; $('#sheet-x').onclick=closeSheet;
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeSheet(); });
document.addEventListener('click',e=>{ const b=e.target.closest('[data-term]'); if(b) openTerm(+b.dataset.term); });
{ /* 上の取っ手を下へ引くと閉じる */
  const grip=$('#sheet-grip'); let y0=null, dy=0;
  grip.addEventListener('pointerdown',e=>{ y0=e.clientY; dy=0; grip.setPointerCapture(e.pointerId); sheet.style.transition='none'; });
  grip.addEventListener('pointermove',e=>{ if(y0===null) return; dy=Math.max(0,e.clientY-y0); sheet.style.transform=`translateY(${dy}px)`; });
  const end=()=>{ if(y0===null) return; y0=null; sheet.style.transition=''; if(dy>70) closeSheet(); else sheet.style.transform=''; };
  grip.addEventListener('pointerup',end); grip.addEventListener('pointercancel',end);
}

/* ---- 問題 ---- */
const setup={ch:'all',core:false,n:10}; let session=null;
const filt=(kind,o=setup)=>POOL.filter(q=>(o.ch==='all'||q.c===o.ch)&&(!o.core||q.i===3)&&(kind==='all'||kind==='miss'||(kind==='thca'?q.k!=='df':q.k===kind))&&(kind!=='miss'||(prog.q[q.id]&&prog.q[q.id][2]===0)));
function quizPage(){
  if(session) return runQuiz();
  const cnt=k=>POOL.filter(q=>q.k===k).length;
  const sets=[['th','理論','定義や定理の内容を確かめる問題です。正誤問題も含みます。'],['df','用語と定義','用語とその定義を結びつける問題です。'],['ca','計算','行列式や固有値などを計算する問題です。同じ量を別々の方法で求めます。'],['all','3 種類をまぜる','理論と計算を多めに出します。'],['miss','まちがえた問題','最後に解いたときに不正解だった問題です。']];
  view.innerHTML=`<div class="page"><div class="ch-head"><h1>問題集</h1><p class="lead">理論 ${cnt('th')} 問、用語と定義 ${cnt('df')} 問、計算 ${cnt('ca')} 問があります。</p></div>
  <div class="pad first"><p class="sub">はじめての人は、最重要の項目だけを 10 問解いてみてください。</p><button type="button" class="btn wide" id="q-first">最重要の問題を 10 問解く</button></div>
  <div class="sec-head"><h2>条件を選んで解く</h2></div>
  <div class="fl"><span class="lab" id="lab-ch">出題する章</span><div class="seg" id="q-ch" role="group" aria-labelledby="lab-ch"><button type="button" data-c="all" aria-pressed="${setup.ch==='all'}">全章</button>${CHAPTERS.map(c=>`<button type="button" data-c="${c.id}" aria-pressed="${setup.ch===c.id}">${c.n} ${SHORT[c.id]}</button>`).join('')}</div></div>
  <div class="fl"><span class="lab" id="lab-n">1 回の問題数</span><div class="seg" id="q-n" role="group" aria-labelledby="lab-n">${[5,10,20].map(n=>`<button type="button" data-n="${n}" aria-pressed="${setup.n===n}">${n} 問</button>`).join('')}</div>
    <div class="tog"><span id="q-core-l">最重要の項目だけ出題する</span><button type="button" class="sw" id="q-core" role="switch" aria-checked="${setup.core}" aria-labelledby="q-core-l"></button></div></div>
  <ul class="qsets" id="q-sets"></ul></div>`;
  const draw=()=>{ $('#q-sets').innerHTML=sets.map(([k,t,d])=>{ const n=filt(k).length; return `<li><button type="button" class="qset" data-k="${k}" ${n?'':'disabled'}><b>${t}</b><span>${d}</span><em><span class="mono">${n}</span> 問</em></button></li>`; }).join(''); };
  draw();
  $('#q-first').onclick=()=>startQuiz('all',{ch:'all',core:true,n:10});
  $('#q-ch').onclick=e=>{ const b=e.target.closest('button'); if(!b) return; setup.ch=b.dataset.c; $$('#q-ch button').forEach(x=>x.setAttribute('aria-pressed',x===b)); draw(); };
  $('#q-n').onclick=e=>{ const b=e.target.closest('button'); if(!b) return; setup.n=+b.dataset.n; $$('#q-n button').forEach(x=>x.setAttribute('aria-pressed',x===b)); };
  $('#q-core').onclick=e=>{ setup.core=!setup.core; e.currentTarget.setAttribute('aria-checked',setup.core); draw(); };
  $('#q-sets').onclick=e=>{ const b=e.target.closest('.qset'); if(b&&!b.disabled) startQuiz(b.dataset.k); };
  const a=$('#q-ch [aria-pressed="true"]'); if(a&&setup.ch!=='all') a.scrollIntoView({block:'nearest',inline:'center'});
}
function startQuiz(kind,o){
  o=Object.assign({},setup,o); let qs=shuffle(filt(kind,o));
  if(kind==='all'){ /* 理論と計算を多めに、種類がかたよらないように順に取る */
    const by={df:[],th:[],ca:[]}; qs.forEach(q=>by[q.k].push(q)); qs=[]; const order=['th','ca','th','df','ca'];
    for(let i=0;qs.length<o.n&&(by.df.length||by.th.length||by.ca.length);i++){ const k=order[i%order.length]; if(by[k].length) qs.push(by[k].pop()); }
  }
  const seen=new Set(); qs=qs.filter(q=>{ if(q.k!=='df') return true; if(seen.has(q.term.i)) return false; seen.add(q.term.i); return true; });
  qs=qs.slice(0,o.n); if(!qs.length) return;
  session={qs,i:0,ok:0,miss:[],kind,o,cur:null,answered:false};
  if(location.hash!=='#quiz') location.hash='#quiz'; else route();
}
function runQuiz(){
  const s=session; if(s.i>=s.qs.length) return resultPage();
  const q=s.qs[s.i]; if(!s.cur||s.cur.q!==q) { s.cur={q,...options(q)}; s.answered=false; }
  const {opts,ans,src}=s.cur;
  view.innerHTML=`<div class="page"><div class="qbar"><span><span class="mono">${s.i+1}</span> / <span class="mono">${s.qs.length}</span> 問</span><span class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${s.qs.length}" aria-valuenow="${s.i}"><i style="transform:scaleX(${s.i/s.qs.length})"></i></span><button type="button" class="mini" id="q-quit">やめる</button></div>
  <div class="qtag"><span class="kind">${KIND[q.k]}</span><span>第 ${CH[q.c].n} 章 ${CH[q.c].title}</span>${imp(q.i,true)}${q.m?`<span class="meth">使う方法　${q.m}</span>`:''}</div>
  <div class="qtext" id="q-text">${md(q.q)}${q.quote?`<blockquote>${md(q.quote)}</blockquote>`:''}</div>
  <ul class="opts">${opts.map((o,i)=>`<li><button type="button" class="opt" data-i="${i}"><span class="l">${'ABCD'[i]}</span><span>${md(o)}</span><svg class="mk" viewBox="0 0 24 24" aria-hidden="true"></svg></button></li>`).join('')}</ul>
  <div id="q-exp"></div></div>`;
  const qb=$('#q-quit'); let armed=false;
  qb.onclick=()=>{ if(!armed&&s.i>0){ armed=true; qb.textContent='もう一度押すとやめます'; setTimeout(()=>{ if(qb.isConnected){ armed=false; qb.textContent='やめる'; } },3000); return; } session=null; route(); };
  const reveal=(pick,first)=>{
    $$('.opt').forEach((b,i)=>{ b.disabled=true; const mk=$('.mk',b);
      if(i===ans){ b.classList.add('ok'); mk.innerHTML='<path d="M5 12.5l4.5 4.5L19 7"/>'; }
      else if(i===pick){ b.classList.add('ng'); mk.innerHTML='<path d="M6 6l12 12M18 6L6 18"/>'; }
      else b.classList.add('dim'); });
    const good=pick===ans; let ex;
    if(q.k==='df'){ const t=q.term, w=src[pick];
      ex=(good?'':q.dir?`<p>選んだのは「${w.t}」の説明です。</p>`:`<p>「${w.t}」は次のものです。${md(w.def)}</p>`)+`<p>${q.dir?'':`正解は「${t.t}」です。`}${md(t.def)}${t.more?' '+md(t.more):''}</p>`; }
    else ex=`<p>${md(q.e)}</p>`;
    $('#q-exp').innerHTML=`<div class="exp" role="status"><div class="res ${good?'ok':'ng'}">${good?'正解':'不正解'}</div>${ex}</div>
      <a class="go pad" href="#ch-${q.c}">第 ${CH[q.c].n} 章 ${CH[q.c].title} を読み直す${CHEV}</a>
      <div class="qnext"><button type="button" class="btn wide" id="q-next">${s.i+1<s.qs.length?'次の問題':'結果を見る'}</button></div>`;
    $('#q-next').onclick=()=>{ s.i++; s.cur=null; window.scrollTo(0,0); route(); };
    if(first){ const r=prog.q[q.id]||(prog.q[q.id]=[0,0,0]); r[good?0:1]++; r[2]=good?1:0; save(); if(good) s.ok++; else s.miss.push(q);
      s.answered=true; s.pick=pick; $('.qbar .bar i').style.transform=`scaleX(${(s.i+1)/s.qs.length})`;
      const nb=$('#q-next'); nb.focus({preventScroll:true});
      setTimeout(()=>{ const x=$('#q-exp'); if(!x) return; const r=x.getBoundingClientRect(); if(r.top>window.innerHeight*.55) window.scrollBy({top:r.top-window.innerHeight*.4,behavior:REDUCED?'auto':'smooth'}); },260); }
  };
  if(s.answered) reveal(s.pick,false);
  else $('.opts').onclick=e=>{ const b=e.target.closest('.opt'); if(b&&!b.disabled) reveal(+b.dataset.i,true); };
}
function resultPage(){
  const s=session, n=s.qs.length, r=s.ok/n;
  const say=r===1?'全問正解です。':r>=.8?'まちがえた問題の解説を読み直してください。':'下の章を上から順に読み直してから、もう一度解いてください。';
  const chs=[...new Set(s.miss.map(q=>q.c))].map(c=>CH[c]).sort((a,b)=>b.imp-a.imp||a.n-b.n);
  view.innerHTML=`<div class="page"><div class="ch-head"><h1><span class="mono">${n}</span> 問中 <span class="mono">${s.ok}</span> 問正解</h1><p class="lead">${say}</p></div>
  ${chs.length?`<div class="sec-head"><h2>読み直す章</h2><span class="sub">重要度の高い順</span></div><ul class="rows">${chs.map(c=>row(c,`${s.miss.filter(q=>q.c===c.id).length} 問まちがえました`)).join('')}</ul>`:''}
  <div class="ch-foot">${s.miss.length?'<button type="button" class="btn wide" id="r-miss">まちがえた問題だけ解く</button>':''}<button type="button" class="btn ${s.miss.length?'ghost ':''}wide" id="r-again">同じ条件でもう一度</button><button type="button" class="btn ghost wide" id="r-back">問題集に戻る</button></div></div>`;
  const kind=s.kind, miss=s.miss, o=s.o;
  $('#r-again').onclick=()=>{ session=null; startQuiz(kind,o); };
  $('#r-back').onclick=()=>{ session=null; route(); };
  if($('#r-miss')) $('#r-miss').onclick=()=>{ session={qs:shuffle(miss),i:0,ok:0,miss:[],kind,o,cur:null,answered:false}; route(); };
}

/* ---- 記録 ---- */
function recordPage(){
  let ok=0,ng=0; const kind={th:[0,0],df:[0,0],ca:[0,0]};
  POOL.forEach(q=>{ const r=prog.q[q.id]; if(r){ ok+=r[0]; ng+=r[1]; kind[q.k][0]+=r[0]; kind[q.k][1]+=r[1]; } });
  const n=ok+ng, read=Object.keys(prog.read).length, solved=POOL.filter(q=>prog.q[q.id]).length, missN=filt('miss',{ch:'all',core:false}).length;
  /* 次にやること: 未読の最重要章、正答率の低い最重要章、まちがえた問題、の順に 1 つ選ぶ */
  const unread=CHAPTERS.find(c=>c.imp===3&&!prog.read[c.id]), weak=CHAPTERS.filter(c=>c.imp===3).map(c=>({c,s:chStat(c.id,true)})).filter(x=>x.s.n>=3&&x.s.rate<.6).sort((a,b)=>a.s.rate-b.s.rate)[0];
  const anyUnread=CHAPTERS.find(c=>!prog.read[c.id]);
  let todo;
  if(weak) todo=[`第 ${weak.c.n} 章「${weak.c.title}」は最重要の章ですが、最重要の問題の正答率が ${Math.round(weak.s.rate*100)}% です。章を読み直してから解き直してください。`,`<a class="btn wide" href="#ch-${weak.c.id}">第 ${weak.c.n} 章を読み直す</a><button type="button" class="btn ghost wide" id="todo-q" data-ch="${weak.c.id}">この章の最重要の問題を解く</button>`];
  else if(unread) todo=[`最重要の章のうち、第 ${unread.n} 章「${unread.title}」をまだ読んでいません。`,`<a class="btn wide" href="#ch-${unread.id}">第 ${unread.n} 章を読む</a>`];
  else if(missN) todo=[`最後に解いたときにまちがえた問題が ${missN} 問残っています。`,`<button type="button" class="btn wide" id="todo-miss">まちがえた問題を解く</button>`];
  else if(anyUnread) todo=[`最重要の章は読み終えました。次は第 ${anyUnread.n} 章「${anyUnread.title}」です。`,`<a class="btn wide" href="#ch-${anyUnread.id}">第 ${anyUnread.n} 章を読む</a>`];
  else todo=['全部の章を読み終えました。問題を解いて確かめてください。',`<a class="btn wide" href="#quiz">問題集を開く</a>`];
  const bar=(label,o,g,extra='')=>{ const t=o+g, r=t?o/t:0; return `<li><span class="bt">${label}${extra}</span><span class="bv">${t?`<span class="mono">${Math.round(r*100)}</span>%　<span class="mono">${t}</span> 回${r<.6?'　要復習':''}`:'まだ解いていません'}</span><span class="bb"><i class="${t&&r<.6?'low':''}" style="width:${r*100}%"></i></span></li>`; };
  view.innerHTML=`<div class="page"><div class="ch-head"><h1>学習の記録</h1>
    <p class="lead">${read||n?`${CHAPTERS.length} 章のうち ${read} 章を読み、${solved} 問を解きました。${n?`正答率は ${Math.round(ok/n*100)}% です。`:''}`:'まだ記録がありません。章を読むか問題を解くと、ここに進み具合が出ます。'}</p></div>
  <div class="sec-head"><h2>次にやること</h2></div><p class="pad todo">${todo[0]}</p><div class="ch-foot" style="margin-top:14px">${todo[1]}</div>
  ${n?`<div class="sec-head"><h2>種類ごとの正答率</h2></div><ul class="bars">${Object.keys(kind).map(k=>bar(KIND[k],kind[k][0],kind[k][1])).join('')}</ul>
  <div class="sec-head"><h2>章ごとの正答率</h2><span class="sub">60% 未満は要復習</span></div><ul class="bars">${CHAPTERS.map(c=>{ const s=chStat(c.id); return bar(`<span class="mono no">${no2(c.n)}</span>${c.title}`,s.ok,s.ng,imp(c.imp,true)); }).join('')}</ul>`:''}
  ${read||n?'<button type="button" class="danger" id="reset">記録をすべて消す</button>':''}</div>`;
  if($('#todo-q')) $('#todo-q').onclick=e=>startQuiz('thca',{ch:e.currentTarget.dataset.ch,core:true,n:10});
  if($('#todo-miss')) $('#todo-miss').onclick=()=>startQuiz('miss',{ch:'all',core:false,n:10});
  const rb=$('#reset'); let armed=false;
  if(rb) rb.onclick=()=>{ if(!armed){ armed=true; rb.textContent='もう一度押すと消えます。元には戻せません。'; setTimeout(()=>{ if(rb.isConnected){armed=false; rb.textContent='記録をすべて消す';} },4000); return; }
    prog={read:{},q:{}}; save(); route(); };
}

/* ---- 画面の切り替え ---- */
const TABS=['learn','terms','quiz','record'], TITLE={learn:'Linear Algebro',terms:'用語集',quiz:'問題集',record:'記録'};
function route(){
  const h=(location.hash||'#learn').slice(1)||'learn', cm=h.match(/^ch-([a-z]+)(?:-(\d+))?$/), isCh=!!(cm&&CH[cm[1]]), tab=isCh?'learn':(TABS.includes(h)?h:'learn');
  const key=isCh?'ch-'+cm[1]:tab, same=key===lastRoute;
  if(lastRoute!==null){ scrollPos[lastRoute]=window.scrollY; if(!same) depth++; }
  cleanups.forEach(f=>{ try{f&&f();}catch(e){} }); cleanups=[]; closeSheet();
  const wasCh=!!lastRoute&&lastRoute.startsWith('ch-'), dir=isCh&&!same?'fwd':(!isCh&&wasCh?'back':'');
  if(isCh) chapter(cm[1],cm[2]); else if(tab==='terms') termsPage(); else if(tab==='quiz') quizPage(); else if(tab==='record') recordPage(); else home();
  const pg=$('.page',view); if(pg&&!same) pg.classList.add(dir||'rise');
  topTitle.textContent=isCh?`第 ${CH[cm[1]].n} 章 ${CH[cm[1]].title}`:(tab==='quiz'&&session?'問題':TITLE[tab]);
  backBtn.hidden=!isCh;
  $$('#tabs a').forEach(a=>{ if(a.dataset.tab===tab) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
  $('#tabs-pill').style.transform=`translateX(${TABS.indexOf(tab)*100}%)`;
  if(!same&&!(isCh&&cm[2]!==undefined)) window.scrollTo(0,(!isCh&&scrollPos[key])||0);
  document.title=(isCh?CH[cm[1]].title+' | ':'')+'Linear Algebro 線形代数を図で学ぶ';
  lastRoute=key;
}
/* 戻る: アプリの中で移動してきたときは 1 つ前の画面へ。直接開いたときは章の一覧へ */
backBtn.onclick=()=>{ if(depth>0){ depth-=2; history.back(); } else location.hash='#learn'; };
window.addEventListener('hashchange',route);
const themeBtn=$('#theme');
const setTheme=(t,store)=>{ if(t) document.documentElement.dataset.theme=t;
  const dark=(document.documentElement.dataset.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'))==='dark';
  themeBtn.setAttribute('aria-label',dark?'明るい表示にする':'暗い表示にする'); themeBtn.setAttribute('aria-pressed',dark);
  if(document.documentElement.dataset.theme) $$('meta[name=theme-color]').forEach(m=>m.setAttribute('content',dark?'#0c0c0d':'#fbfbfa'));
  if(store){ try{ localStorage.setItem('la-theme',t); }catch(e){} }
  LIVE.forEach(p=>p.render()); };
themeBtn.onclick=()=>setTheme(themeBtn.getAttribute('aria-pressed')==='true'?'light':'dark',true);
setTheme();
route();
})();
