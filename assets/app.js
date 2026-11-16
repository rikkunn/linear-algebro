/* 画面の切り替え、学習記録、用語集、問題集。 */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const view=$('#view'), topTitle=$('#top-title'), backBtn=$('#back');
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const md=s=>s.split(/\$([^$]+)\$/).map((p,i)=>i%2?TeX(p):esc(p).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')).join('');
const IMP=['','発展','重要','最重要'];
const imp=(v,label)=>`<span class="imp" data-v="${v}" role="img" aria-label="重要度 ${IMP[v]}"><i></i><i></i><i></i></span>${label?`<span class="imp-label">${IMP[v]}</span>`:''}`;
const CH=Object.fromEntries(CHAPTERS.map((c,i)=>(c.n=i+1,[c.id,c])));
const SHORT={vec:'ベクトル',comb:'線形結合・独立',dot:'内積・直交',map:'行列・線形変換',prod:'積・逆行列',det:'行列式',sys:'連立方程式',rank:'ランク・核・像',space:'空間・基底',eig:'固有値',diag:'対角化',orth:'直交化・SVD'};
const shuffle=a=>{ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const hash=s=>{ let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))|0; return (h>>>0).toString(36); };

/* ---- 記録 (この端末のブラウザにだけ保存) ---- */
let prog={read:{},q:{}};
try{ const s=JSON.parse(localStorage.getItem('la-progress')||'null'); if(s&&s.read&&s.q) prog=s; }catch(e){}
const save=()=>{ try{ localStorage.setItem('la-progress',JSON.stringify(prog)); }catch(e){} };

/* ---- 問題の一覧を作る ---- */
const TERM=TERMS.map((t,i)=>({i,c:t[0],t:t[1],y:t[2],en:t[3],imp:t[4],def:t[5],more:t[6]}));
const POOL=[];
QUIZ.forEach(q=>POOL.push({...q,id:'h'+hash(q.q)}));
TERM.forEach(t=>{
  const e=`**${t.t}** (${t.en})。${t.def}`+(t.more?` ${t.more}`:'');
  if(!t.def.includes(t.t)) POOL.push({id:'a'+hash(t.t),c:t.c,k:'df',i:t.imp,term:t,dir:0,q:'次の説明に当てはまる用語はどれですか。',quote:t.def,e});
  POOL.push({id:'b'+hash(t.t),c:t.c,k:'df',i:t.imp,term:t,dir:1,q:`「${t.t}」の説明として正しいものはどれですか。`,e});
});
const KIND={df:'用語と定義',th:'理論',ca:'計算'};
function options(q){
  if(q.tf!==undefined) return {opts:['正しい','誤り'],ans:q.tf?0:1};
  let list;
  if(q.k==='df'){
    const same=shuffle(TERM.filter(t=>t.c===q.c&&t.i!==q.term.i)), rest=shuffle(TERM.filter(t=>t.c!==q.c));
    const pick=same.concat(rest).slice(0,3);
    list=[q.term].concat(pick).map(t=>q.dir?t.def:t.t);
  }else list=q.o;
  const idx=shuffle(list.map((_,i)=>i));
  return {opts:idx.map(i=>list[i]),ans:idx.indexOf(0)};
}

/* ---- 画面の部品 ---- */
let cleanups=[], lastRoute='', scrollPos={};
function mountViz(root){
  const io=new IntersectionObserver(es=>es.forEach(e=>{ if(!e.isIntersecting) return; io.unobserve(e.target);
    const f=VIZ[e.target.dataset.viz]; if(f) cleanups.push(f(e.target)); }),{rootMargin:'400px'});
  $$('.viz[data-viz]',root).forEach(el=>io.observe(el)); cleanups.push(()=>io.disconnect());
}
const chStat=c=>{ let ok=0,ng=0; POOL.forEach(q=>{ if(q.c===c&&prog.q[q.id]){ ok+=prog.q[q.id][0]; ng+=prog.q[q.id][1]; } }); return {ok,ng,n:ok+ng,rate:ok+ng?ok/(ok+ng):0}; };
const ring=r=>{ const C=2*Math.PI*9; return `<svg class="ring" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="9" fill="none" stroke="var(--line2)" stroke-width="2.5"/><circle cx="11" cy="11" r="9" fill="none" stroke="var(--ink)" stroke-width="2.5" stroke-dasharray="${C*r} ${C}" transform="rotate(-90 11 11)" stroke-linecap="round"/></svg>`; };

/* ---- 学ぶ (ホーム) ---- */
function mapSvg(){
  const N={vec:[180,30],comb:[100,94],dot:[272,94],map:[100,158],prod:[64,222],det:[190,222],sys:[64,286],rank:[64,350],space:[190,350],eig:[190,414],diag:[150,478],orth:[280,542]};
  const E=[['vec','comb'],['vec','dot'],['comb','map'],['map','prod'],['map','det'],['prod','sys'],['sys','rank'],['rank','space'],['det','eig'],['space','eig'],['eig','diag'],['diag','orth'],['dot','orth']];
  const w=116,h=40;
  return `<svg class="map" viewBox="0 0 360 580" role="img" aria-label="章のつながりを表す図。上から下へ進みます。">
  ${E.map(([a,b])=>`<path class="edge" d="M${N[a][0]} ${N[a][1]+h/2} C${N[a][0]} ${N[a][1]+h/2+22},${N[b][0]} ${N[b][1]-h/2-22},${N[b][0]} ${N[b][1]-h/2}"/>`).join('')}
  ${CHAPTERS.map(c=>{ const [x,y]=N[c.id]; return `<a href="#ch-${c.id}" aria-label="第${c.n}章 ${c.title}"><rect class="node v${c.imp}${prog.read[c.id]?' done':''}" x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="4"/><text class="n" x="${x-w/2+9}" y="${y+4}">${String(c.n).padStart(2,'0')}</text><text x="${x-w/2+28}" y="${y+4}">${SHORT[c.id]}</text></a>`; }).join('')}
  </svg>`;
}
function home(){
  const next=CHAPTERS.find(c=>!prog.read[c.id])||CHAPTERS[0], started=Object.keys(prog.read).length>0;
  view.innerHTML=`<div class="page">
  <div class="hero"><canvas aria-hidden="true"></canvas><div class="hero-cap" id="hero-cap"></div>
    <div class="hero-txt"><h1>線形代数を<br>図で動かして学ぶ</h1>
    <p class="lead">矢印や方眼を指で動かしながら 12 章を進めます。用語 ${TERM.length} 語と問題 ${POOL.length} 問で、定義と理論を確かめられます。</p>
    <div class="cta"><a class="btn" href="#ch-${next.id}">${started?`第 ${next.n} 章から続ける`:'第 1 章から始める'}</a><a class="btn ghost" href="#quiz">問題を解く</a></div></div></div>

  <div class="sec-head"><h2>最初に押さえる 7 項目</h2></div>
  <p class="sub pad">この 7 つがわかると残りの内容がつながります。時間がないときはここから読んでください。</p>
  <ol class="core">${CORE.map(c=>`<li><a href="#ch-${c.ch}"><b>${c.t}</b><span>${c.d}</span><em>第 ${CH[c.ch].n} 章</em></a></li>`).join('')}</ol>

  <div class="sec-head"><h2>章のつながり</h2></div>
  <p class="sub pad">上の章が下の章の前提です。赤い枠が最重要の章です。</p>
  ${mapSvg()}
  <div class="legend pad"><span>${imp(3)}最重要 あとの章で何度も使う</span><span>${imp(2)}重要 標準的な試験範囲</span><span>${imp(1)}発展 余裕があれば</span></div>

  <div class="sec-head"><h2>全 12 章</h2><span class="sub">${Object.keys(prog.read).length} / 12 章を読了</span></div>
  <ul class="rows">${CHAPTERS.map(c=>{ const s=chStat(c.id); return `<li><a class="row" href="#ch-${c.id}"><span class="no">${String(c.n).padStart(2,'0')}</span><span class="tt">${c.title}${imp(c.imp)}</span>
    <span class="ds">${c.lead}</span><span class="st">${prog.read[c.id]?'<span class="done-mark">読了</span>':''}${s.n?ring(s.rate):''}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a></li>`; }).join('')}</ul>
  <p class="foot">大学 1 年で学ぶ線形代数の範囲を扱っています。学習の記録はこの端末のブラウザの中にだけ保存されます。</p></div>`;
  cleanups.push(VIZ.hero($('.hero canvas'),$('#hero-cap')));
}

/* ---- 章 ---- */
function chapter(id){
  const c=CH[id]; if(!c) return home();
  const terms=TERM.filter(t=>t.c===id), nq=POOL.filter(q=>q.c===id).length, nx=CHAPTERS[c.n];
  const block=b=>b.h?`<h2>${md(b.h)}</h2>`:b.p?`<p>${md(b.p)}</p>`:b.f?`<div class="fx">${TeX(b.f,true)}</div>`:b.viz?`<div class="viz" data-viz="${b.viz}"></div>`:
    b.must?`<div class="must"><div class="k">ここが重点</div><p>${md(b.must)}</p></div>`:b.pts?`<ul class="pts">${b.pts.map(x=>`<li>${md(x)}</li>`).join('')}</ul>`:'';
  view.innerHTML=`<article class="page">
  <header class="ch-head"><div class="eyebrow">第 ${c.n} 章 ${imp(c.imp,true)}</div><h1>${c.title}</h1><p class="lead">${c.lead}</p>
    <ul class="goals" aria-label="この章でできるようになること">${c.goals.map(g=>`<li>${md(g)}</li>`).join('')}</ul></header>
  <div class="body">${c.blocks.map(block).join('')}
    <h2>この章の要点</h2><ul class="pts">${c.pts.map(x=>`<li>${md(x)}</li>`).join('')}</ul>
    <h2>まちがえやすい点</h2><ul class="pts trap">${c.traps.map(x=>`<li>${md(x)}</li>`).join('')}</ul>
    <h2>この章の用語</h2><p class="sub">押すと定義が開きます。棒が 3 本の用語から覚えてください。</p>
    <ul class="termlist">${terms.sort((a,b)=>b.imp-a.imp||a.i-b.i).map(t=>`<li><button type="button" class="tl" data-term="${t.i}">${t.t}${imp(t.imp)}</button></li>`).join('')}</ul>
  </div>
  <div class="ch-foot" id="ch-foot"><button type="button" class="btn wide" id="ch-quiz">この章の問題を解く (${nq} 問から 10 問)</button>
    ${nx?`<a class="btn ghost wide" href="#ch-${nx.id}">第 ${nx.n} 章 ${nx.title} へ進む</a>`:`<a class="btn ghost wide" href="#learn">章の一覧に戻る</a>`}</div></article>`;
  mountViz(view);
  $('#ch-quiz').onclick=()=>{ setup.ch=id; startQuiz('all'); };
  const io=new IntersectionObserver(es=>{ if(es[0].isIntersecting&&!prog.read[id]){ prog.read[id]=1; save(); } }); io.observe($('#ch-foot')); cleanups.push(()=>io.disconnect());
}

/* ---- 用語 ---- */
let termQ='', termImp=0;
function termsPage(){
  view.innerHTML=`<div class="page"><div class="ch-head"><h1>用語集</h1><p class="lead">${TERM.length} 語。読み、英語、定義を確かめられます。</p></div>
  <div class="tools"><input class="search" id="tq" type="search" placeholder="用語、読み、英語でさがす" aria-label="用語をさがす" value="${esc(termQ)}" autocomplete="off">
    <div class="seg" role="group" aria-label="重要度でしぼる">${['すべて','最重要','重要','発展'].map((l,i)=>`<button type="button" data-f="${[0,3,2,1][i]}" aria-pressed="${termImp===[0,3,2,1][i]}">${l}</button>`).join('')}</div></div>
  <div id="tlist"></div></div>`;
  const list=$('#tlist');
  const draw=()=>{
    const q=termQ.trim().toLowerCase(); let html='', n=0;
    CHAPTERS.forEach(c=>{
      const ts=TERM.filter(t=>t.c===c.id&&(!termImp||t.imp===termImp)&&(!q||t.t.toLowerCase().includes(q)||t.y.includes(q)||t.en.toLowerCase().includes(q)));
      if(!ts.length) return; n+=ts.length;
      html+=`<div class="grp"><span>第 ${c.n} 章 ${c.title}</span><span>${ts.length} 語</span></div>`+ts.map(t=>`<div class="acc" id="t${t.i}"><button type="button" class="acc-h" aria-expanded="false" aria-controls="tb${t.i}"><span class="t">${t.t}<span class="y">${t.y}　${t.en}</span></span>${imp(t.imp)}
        <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <div class="acc-b" id="tb${t.i}"><div><div class="acc-in" data-i="${t.i}"></div></div></div></div>`).join('');
    });
    list.innerHTML=html||`<p class="empty">「${esc(termQ)}」に合う用語はありません。別の言葉か、重要度を「すべて」にして試してください。</p>`;
  };
  draw();
  $('#tq').oninput=e=>{ termQ=e.target.value; draw(); };
  $$('.tools .seg button').forEach(b=>b.onclick=()=>{ termImp=+b.dataset.f; $$('.tools .seg button').forEach(x=>x.setAttribute('aria-pressed',x===b)); draw(); });
  list.onclick=e=>{ const h=e.target.closest('.acc-h'); if(!h) return; const a=h.parentElement, open=!a.hasAttribute('data-open');
    if(open){ const box=$('.acc-in',a), t=TERM[+box.dataset.i]; if(!box.innerHTML) box.innerHTML=`<div>${md(t.def)}</div>${t.more?`<div class="more">${md(t.more)}</div>`:''}<a href="#ch-${t.c}">第 ${CH[t.c].n} 章 ${CH[t.c].title} で読む</a>`; }
    a.toggleAttribute('data-open',open); h.setAttribute('aria-expanded',open); };
}

/* ---- 用語のシート ---- */
const sheet=$('#sheet'), sheetBack=$('#sheet-back'); let sheetFrom=null;
function openTerm(i){
  const t=TERM[i]; sheetFrom=document.activeElement;
  $('#sheet-body').innerHTML=`<h3 id="sheet-title">${t.t}</h3><div class="y"><span>${t.y}</span><span>${t.en}</span>${imp(t.imp,true)}</div><p>${md(t.def)}</p>${t.more?`<p class="sub" style="font-size:14px">${md(t.more)}</p>`:''}`;
  sheet.hidden=sheetBack.hidden=false; requestAnimationFrame(()=>{ sheet.classList.add('on'); sheetBack.classList.add('on'); $('#sheet-close').focus(); });
}
function closeSheet(){ if(sheet.hidden) return; sheet.classList.remove('on'); sheetBack.classList.remove('on'); setTimeout(()=>{ sheet.hidden=sheetBack.hidden=true; },430); if(sheetFrom) sheetFrom.focus(); }
sheetBack.onclick=closeSheet; $('#sheet-close').onclick=closeSheet;
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeSheet(); });
document.addEventListener('click',e=>{ const b=e.target.closest('[data-term]'); if(b) openTerm(+b.dataset.term); });

/* ---- 問題 ---- */
const setup={ch:'all',core:false,n:10}; let session=null;
const filt=kind=>POOL.filter(q=>(setup.ch==='all'||q.c===setup.ch)&&(!setup.core||q.i===3)&&(kind==='all'||kind==='miss'||q.k===kind)&&(kind!=='miss'||(prog.q[q.id]&&prog.q[q.id][2]===0)));
function quizPage(){
  if(session) return runQuiz();
  const sets=[['df','用語と定義','説明から用語を選ぶ。用語から説明を選ぶ。'],['th','理論','定義の意味、成り立つ性質、成り立たない性質。'],['ca','計算','同じ種類の量をいくつもの方法で求める。'],['all','全部まぜる','3 種類を混ぜて出題。'],['miss','まちがえた問題','最後に解いたときに不正解だった問題。']];
  view.innerHTML=`<div class="page"><div class="ch-head"><h1>問題集</h1><p class="lead">全 ${POOL.length} 問。用語と定義 ${POOL.filter(q=>q.k==='df').length} 問、理論 ${POOL.filter(q=>q.k==='th').length} 問、計算 ${POOL.filter(q=>q.k==='ca').length} 問。</p></div>
  <div class="fl"><span class="lab">出題する章</span><div class="seg" id="q-ch" role="group" aria-label="出題する章"><button type="button" data-c="all" aria-pressed="${setup.ch==='all'}">全章</button>${CHAPTERS.map(c=>`<button type="button" data-c="${c.id}" aria-pressed="${setup.ch===c.id}">${c.n} ${SHORT[c.id]}</button>`).join('')}</div></div>
  <div class="fl"><span class="lab">1 回の問題数</span><div class="seg" id="q-n" role="group" aria-label="1 回の問題数">${[5,10,20].map(n=>`<button type="button" data-n="${n}" aria-pressed="${setup.n===n}">${n} 問</button>`).join('')}</div>
    <div class="tog"><span id="q-core-l">最重要の項目だけ出題する</span><button type="button" class="sw" id="q-core" role="switch" aria-checked="${setup.core}" aria-labelledby="q-core-l"></button></div></div>
  <div class="sec-head"><h2>出題の種類</h2></div><ul class="qsets" id="q-sets"></ul></div>`;
  const draw=()=>{ $('#q-sets').innerHTML=sets.map(([k,t,d])=>{ const n=filt(k).length; return `<li><button type="button" class="qset" data-k="${k}" ${n?'':'disabled'}><b>${t}</b><span>${d}</span><em>${n} 問</em></button></li>`; }).join(''); };
  draw();
  $('#q-ch').onclick=e=>{ const b=e.target.closest('button'); if(!b) return; setup.ch=b.dataset.c; $$('#q-ch button').forEach(x=>x.setAttribute('aria-pressed',x===b)); draw(); };
  $('#q-n').onclick=e=>{ const b=e.target.closest('button'); if(!b) return; setup.n=+b.dataset.n; $$('#q-n button').forEach(x=>x.setAttribute('aria-pressed',x===b)); };
  $('#q-core').onclick=e=>{ setup.core=!setup.core; e.currentTarget.setAttribute('aria-checked',setup.core); draw(); };
  $('#q-sets').onclick=e=>{ const b=e.target.closest('.qset'); if(b&&!b.disabled) startQuiz(b.dataset.k); };
  const a=$('#q-ch [aria-pressed="true"]'); if(a&&setup.ch!=='all') a.scrollIntoView({block:'nearest',inline:'center'});
}
function startQuiz(kind){
  let qs=shuffle(filt(kind));
  if(kind==='all'){ /* 種類がかたよらないように順に取る */
    const by={df:[],th:[],ca:[]}; qs.forEach(q=>by[q.k].push(q)); qs=[]; const order=['th','df','ca','th','df'];
    for(let i=0;qs.length<setup.n&&(by.df.length||by.th.length||by.ca.length);i++){ const k=order[i%order.length]; if(by[k].length) qs.push(by[k].pop()); }
  }
  /* 同じ用語の問題が続けて出ないようにする */
  const seen=new Set(); qs=qs.filter(q=>{ if(q.k!=='df') return true; if(seen.has(q.term.i)) return false; seen.add(q.term.i); return true; });
  qs=qs.slice(0,setup.n); if(!qs.length) return;
  session={qs,i:0,ok:0,miss:[],kind,cur:null,answered:false};
  if(location.hash!=='#quiz') location.hash='#quiz'; else route();
}
function runQuiz(){
  const s=session; if(s.i>=s.qs.length) return resultPage();
  const q=s.qs[s.i]; if(!s.cur||s.cur.q!==q) { s.cur={q,...options(q)}; s.answered=false; }
  const {opts,ans}=s.cur;
  view.innerHTML=`<div class="page"><div class="qbar"><span>${s.i+1} / ${s.qs.length}</span><span class="bar"><i style="transform:scaleX(${s.i/s.qs.length})"></i></span><button type="button" class="mini" id="q-quit">やめる</button></div>
  <div class="qtag"><span class="kind">${KIND[q.k]}</span><span>第 ${CH[q.c].n} 章 ${CH[q.c].title}</span>${q.m?`<span class="meth">方法: ${q.m}</span>`:''}${imp(q.i)}</div>
  <div class="qtext" id="q-text">${md(q.q)}${q.quote?`<div class="must" style="margin:12px calc(var(--gut) * -1) 0;border-color:var(--ink);font-weight:400;font-size:16px"><p>${md(q.quote)}</p></div>`:''}</div>
  <ul class="opts">${opts.map((o,i)=>`<li><button type="button" class="opt" data-i="${i}"><span class="l">${'ABCD'[i]}</span><span>${md(o)}</span><svg class="mk" viewBox="0 0 24 24" aria-hidden="true"></svg></button></li>`).join('')}</ul>
  <div id="q-exp"></div></div>`;
  requestAnimationFrame(()=>{ const b=$('.qbar .bar i'); if(b) b.style.transform=`scaleX(${(s.i+(s.answered?1:0))/s.qs.length})`; });
  $('#q-quit').onclick=()=>{ session=null; route(); };
  const reveal=(pick,first)=>{
    $$('.opt').forEach((b,i)=>{ b.disabled=true; const mk=$('.mk',b);
      if(i===ans){ b.classList.add('ok'); mk.innerHTML='<path d="M5 12.5l4.5 4.5L19 7"/>'; }
      else if(i===pick){ b.classList.add('ng'); mk.innerHTML='<path d="M6 6l12 12M18 6L6 18"/>'; }
      else b.classList.add('dim'); });
    const good=pick===ans;
    $('#q-exp').innerHTML=`<div class="exp" role="status"><div class="res ${good?'ok':'ng'}">${good?'正解':'不正解'}</div><p>${md(q.e)}</p>
      <a class="link" href="#ch-${q.c}">第 ${CH[q.c].n} 章 ${CH[q.c].title} を読み直す</a></div>
      <div class="qnext"><button type="button" class="btn wide" id="q-next">${s.i+1<s.qs.length?'次の問題':'結果を見る'}</button></div>`;
    $('#q-next').onclick=()=>{ s.i++; s.cur=null; window.scrollTo(0,0); route(); };
    if(first){ const r=prog.q[q.id]||(prog.q[q.id]=[0,0,0]); r[good?0:1]++; r[2]=good?1:0; save(); if(good) s.ok++; else s.miss.push(q);
      s.answered=true; s.pick=pick; $('.qbar .bar i').style.transform=`scaleX(${(s.i+1)/s.qs.length})`;
      const ex=$('#q-exp'); setTimeout(()=>{ const r=ex.getBoundingClientRect(); if(r.top>window.innerHeight-220) window.scrollBy({top:Math.min(r.top-window.innerHeight*.45,r.height+120),behavior:REDUCED?'auto':'smooth'}); },240); }
  };
  if(s.answered) reveal(s.pick,false);
  else $('.opts').onclick=e=>{ const b=e.target.closest('.opt'); if(b&&!b.disabled) reveal(+b.dataset.i,true); };
}
function resultPage(){
  const s=session, n=s.qs.length, r=s.ok/n;
  const say=r===1?'全問正解です。':r>=.8?'よく理解できています。まちがえた問題の解説を読み直してください。':r>=.5?'半分以上できています。下の章を読み直してからもう一度解いてください。':'まず下の章の「要点」と図を見直してください。';
  const chs=[...new Set(s.miss.map(q=>q.c))];
  view.innerHTML=`<div class="page"><div class="score"><div class="eyebrow">結果</div><div class="big">${s.ok}<small> / ${n}</small></div><p class="lead">${say}</p></div>
  ${chs.length?`<div class="sec-head"><h2>読み直す章</h2></div><ul class="rows">${chs.map(c=>`<li><a class="row" href="#ch-${c}"><span class="no">${String(CH[c].n).padStart(2,'0')}</span><span class="tt">${CH[c].title}</span><span class="ds">${s.miss.filter(q=>q.c===c).length} 問まちがえました</span><span class="st"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a></li>`).join('')}</ul>`:''}
  <div class="ch-foot"><button type="button" class="btn wide" id="r-again">同じ条件でもう一度</button>${s.miss.length?'<button type="button" class="btn ghost wide" id="r-miss">まちがえた問題だけ解く</button>':''}<button type="button" class="btn ghost wide" id="r-back">問題集に戻る</button></div></div>`;
  const kind=s.kind, miss=s.miss;
  $('#r-again').onclick=()=>{ session=null; startQuiz(kind); };
  $('#r-back').onclick=()=>{ session=null; route(); };
  if($('#r-miss')) $('#r-miss').onclick=()=>{ session={qs:shuffle(miss),i:0,ok:0,miss:[],kind,cur:null,answered:false}; route(); };
}

/* ---- 記録 ---- */
function recordPage(){
  let ok=0,ng=0; const kind={df:[0,0],th:[0,0],ca:[0,0]};
  POOL.forEach(q=>{ const r=prog.q[q.id]; if(r){ ok+=r[0]; ng+=r[1]; kind[q.k][0]+=r[0]; kind[q.k][1]+=r[1]; } });
  const n=ok+ng, read=Object.keys(prog.read).length, solved=POOL.filter(q=>prog.q[q.id]).length;
  const weak=CHAPTERS.map(c=>({c,s:chStat(c.id)})).filter(x=>x.s.n>=3&&x.s.rate<.6).sort((a,b)=>a.s.rate-b.s.rate);
  const bar=(label,o,g,extra='')=>{ const t=o+g, r=t?o/t:0; return `<li><span class="bt">${label}${extra}</span><span class="bv">${t?Math.round(r*100)+'%　'+t+' 回':'未回答'}</span><span class="bb"><i class="${t&&r<.6?'low':''}" style="width:${r*100}%"></i></span></li>`; };
  view.innerHTML=`<div class="page"><div class="ch-head"><h1>学習の記録</h1><p class="lead">${n?'正答率が 60% に届かない章は赤い線で表示します。':'まだ記録がありません。章を読むか問題を解くと、ここに進み具合が出ます。'}</p></div>
  <div class="stat"><div><b>${read}<small style="font-size:14px;color:var(--ink3)"> / 12</small></b><span>読んだ章</span></div><div><b>${solved}<small style="font-size:14px;color:var(--ink3)"> / ${POOL.length}</small></b><span>解いた問題</span></div><div><b>${n?Math.round(ok/n*100)+'%':'–'}</b><span>正答率</span></div></div>
  ${weak.length?`<div class="sec-head"><h2>先に見直す章</h2></div><ul class="rows">${weak.slice(0,3).map(({c,s})=>`<li><a class="row" href="#ch-${c.id}"><span class="no">${String(c.n).padStart(2,'0')}</span><span class="tt">${c.title}${imp(c.imp)}</span><span class="ds">正答率 ${Math.round(s.rate*100)}%</span><span class="st"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a></li>`).join('')}</ul>`:''}
  <div class="sec-head"><h2>種類ごとの正答率</h2></div><ul class="bars">${Object.keys(kind).map(k=>bar(KIND[k],kind[k][0],kind[k][1])).join('')}</ul>
  <div class="sec-head"><h2>章ごとの正答率</h2></div><ul class="bars">${CHAPTERS.map(c=>{ const s=chStat(c.id); return bar(`<span class="mono" style="color:var(--ink3)">${String(c.n).padStart(2,'0')}</span>${c.title}`,s.ok,s.ng,imp(c.imp)); }).join('')}</ul>
  <button type="button" class="danger" id="reset">記録をすべて消す</button></div>`;
  const rb=$('#reset'); let armed=false;
  rb.onclick=()=>{ if(!armed){ armed=true; rb.textContent='もう一度押すと消えます。元には戻せません。'; setTimeout(()=>{ if(rb.isConnected){armed=false; rb.textContent='記録をすべて消す';} },4000); return; }
    prog={read:{},q:{}}; save(); route(); };
}

/* ---- 画面の切り替え ---- */
const TABS=['learn','terms','quiz','record'];
function route(){
  const h=(location.hash||'#learn').slice(1)||'learn', isCh=h.startsWith('ch-'), tab=isCh?'learn':(TABS.includes(h)?h:'learn');
  scrollPos[lastRoute]=window.scrollY;
  cleanups.forEach(f=>{ try{f&&f();}catch(e){} }); cleanups=[]; closeSheet();
  const wasCh=lastRoute.startsWith('ch-'), dir=isCh&&!wasCh?'fwd':(!isCh&&wasCh?'back':isCh&&wasCh?'fwd':'');
  if(isCh) chapter(h.slice(3)); else if(tab==='terms') termsPage(); else if(tab==='quiz') quizPage(); else if(tab==='record') recordPage(); else home();
  const pg=$('.page',view); if(pg&&dir&&h!==lastRoute) pg.classList.add(dir);
  const inQuiz=tab==='quiz'&&session;
  topTitle.textContent=isCh&&CH[h.slice(3)]?`第 ${CH[h.slice(3)].n} 章`:inQuiz?'問題':'Linear Algebro';
  backBtn.hidden=!isCh;
  $$('#tabs a').forEach(a=>{ if(a.dataset.tab===tab) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
  $('#tabs-pill').style.transform=`translateX(${TABS.indexOf(tab)*100}%)`;
  if(h!==lastRoute){ const y=(!isCh&&wasCh&&scrollPos[h])||0; window.scrollTo(0,y); }
  document.title=(isCh&&CH[h.slice(3)]?CH[h.slice(3)].title+' | ':'')+'Linear Algebro 線形代数を図で学ぶ';
  lastRoute=h;
}
backBtn.onclick=()=>{ location.hash='#learn'; };
window.addEventListener('hashchange',route);
$('#theme').onclick=()=>{
  const cur=document.documentElement.dataset.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'), nx=cur==='dark'?'light':'dark';
  document.documentElement.dataset.theme=nx; try{ localStorage.setItem('la-theme',nx); }catch(e){}
  route();
};
route();
})();
