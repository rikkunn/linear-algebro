/* 各章の図。VIZ[id](root) が図を組み立て、後始末の関数を返す。 */
const VIZ = {};
const V = v=>`(${fmt(v[0])}, ${fmt(v[1])})`;
const matTex = (M,c1,c2)=>{ const f=(v,c)=>c?'\\textcolor{'+c+'}{'+fmt(v)+'}':fmt(v); return ('\\begin{pmatrix}'+f(M[0],c1)+'&'+f(M[1],c2)+'\\\\'+f(M[2],c1)+'&'+f(M[3],c2)+'\\end{pmatrix}').replace(/−/g,'-'); };

function frame(root,{title,hint='丸い点を指で動かせます',h=300,range=4,cy}){
  root.innerHTML=`<div class="viz-cap"><b>${title}</b>${hint?`<span class="hint"><i></i>${hint}</span>`:''}</div>
  <canvas role="img" aria-label="${title}の図"></canvas><div class="viz-read" aria-live="off"></div><div class="viz-msg"></div><div class="viz-ctl"></div>`;
  const q=s=>root.querySelector(s);
  const plot=new Plot(q('canvas'),{h,range,cy});
  return {plot,read:q('.viz-read'),msg:q('.viz-msg'),ctl:q('.viz-ctl')};
}
function seg(ctl,items,onPick,active=0){
  const d=document.createElement('div'); d.className='seg'; d.setAttribute('role','group');
  items.forEach((label,i)=>{ const b=document.createElement('button'); b.type='button'; b.textContent=label; b.setAttribute('aria-pressed',i===active);
    b.onclick=()=>{ d.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b)); b.scrollIntoView({block:'nearest',inline:'center',behavior:REDUCED?'auto':'smooth'}); onPick(i); }; d.append(b); });
  ctl.append(d); return {clear:()=>d.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',false))};
}
let SLID=0;
function slider(ctl,label,min,max,step,val,onInput){
  const id='sl'+(++SLID), l=document.createElement('div'); l.className='sl';
  l.innerHTML=`<label for="${id}">${label}</label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${val}"><output for="${id}">${fmt(val)}</output>`;
  const inp=l.querySelector('input'), out=l.querySelector('output');
  inp.oninput=()=>{ out.textContent=fmt(+inp.value); onInput(+inp.value); };
  ctl.append(l); return {set:v=>{inp.value=v; out.textContent=fmt(v);}};
}
function btn(ctl,label,fn,solid){ const b=document.createElement('button'); b.type='button'; b.className='mini'+(solid?' solid':''); b.textContent=label; b.onclick=()=>fn(b); ctl.append(b); return b; }
function moveTo(plot,hs,targets,ms=520){ const from=hs.map(h=>[h.x,h.y]); plot.play(ms,t=>hs.forEach((h,i)=>{h.x=from[i][0]+(targets[i][0]-from[i][0])*t; h.y=from[i][1]+(targets[i][1]-from[i][1])*t; })); }

/* 1 ベクトルの和とスカラー倍 */
VIZ.vecAdd=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'和とスカラー倍'});
  const a={x:2,y:1,color:'--c-i'}, b={x:1,y:2,color:'--c-j'}; let mode=0,k=2;
  plot.handles=[a,b];
  plot.draw=p=>{
    p.base(); const A=[a.x,a.y],B=[b.x,b.y],S=[a.x+b.x,a.y+b.y];
    if(mode===0){
      p.line(A,S,p.css('--c-j'),1.5,[5,5]); p.line(B,S,p.css('--c-i'),1.5,[5,5]);
      p.arrow([0,0],S,p.css('--c-k'),3.5,'a+b'); p.arrow([0,0],A,p.css('--c-i'),3,'a'); p.arrow([0,0],B,p.css('--c-j'),3,'b');
      read.innerHTML=`<span><b class="ci">a</b> = ${V(A)}</span><span><b class="cj">b</b> = ${V(B)}</span><span><b class="ck">a+b</b> = ${V(S)}</span><span>‖a+b‖ = ${fmt(Math.hypot(...S))}</span>`;
      msg.innerHTML='破線は <b>b</b> を <b>a</b> の先へ平行に移したものです。先をつなぐと <b>a+b</b> に着きます。';
    }else{
      const K=[a.x*k,a.y*k]; p.inf([0,0],A,p.css('--grid2'),1.2,[4,5]);
      p.arrow([0,0],K,p.css('--c-k'),3.5,fmt(k)+'a'); p.arrow([0,0],A,p.css('--c-i'),3,'a');
      read.innerHTML=`<span><b class="ci">a</b> = ${V(A)}</span><span><b class="ck">${fmt(k)}a</b> = ${V(K)}</span><span>‖${fmt(k)}a‖ = ${fmt(Math.hypot(...K))}</span>`;
      msg.innerHTML=k<0?'負の数を掛けたので逆を向きました。長さは絶対値のぶんだけ変わります。':k===0?'0 を掛けると零ベクトルになります。':'スカラー倍しても、原点を通る同じ直線の上から出ません。';
    }
  };
  seg(ctl,['和 a+b','スカラー倍 ka'],i=>{mode=i; b.hide=b.fixed=i===1; sl.style.display=i?'grid':'none'; plot.render();});
  slider(ctl,'k',-2,2,.5,k,v=>{k=v;plot.render();}); const sl=ctl.querySelector('.sl'); sl.style.display='none';
  plot.render(); return ()=>plot.destroy();
};

/* 2 線形結合と張る空間 */
VIZ.linComb=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'線形結合 s v + t w',h:310});
  const v={x:2,y:.5,color:'--c-i'}, w={x:-.5,y:1.5,color:'--c-j'}; let s=1.5,t=1;
  plot.handles=[v,w];
  plot.draw=p=>{
    const M=[v.x,w.x,v.y,w.y], dep=Math.abs(det2(M))<1e-6;
    p.grid(null,p.css('--grid'),1,1);
    if(dep){ const d=(v.x||v.y)?[v.x,v.y]:[w.x,w.y]; if(d[0]||d[1]) p.inf([0,0],d,p.css('--c-m'),5); }
    else p.grid(M,p.css('--c-m'),.28,1,14);
    const sv=[s*v.x,s*v.y], r=[sv[0]+t*w.x,sv[1]+t*w.y];
    p.line([0,0],sv,p.css('--c-i'),2,[6,5]); p.line(sv,r,p.css('--c-j'),2,[6,5]);
    p.arrow([0,0],[v.x,v.y],p.css('--c-i'),3,'v'); p.arrow([0,0],[w.x,w.y],p.css('--c-j'),3,'w');
    p.dot(r,p.css('--c-m'),7); p.text(r,'sv+tw',p.css('--c-m'),[0,-18]);
    read.innerHTML=`<span>${fmt(s)}<b class="ci">v</b> + ${fmt(t)}<b class="cj">w</b> = <b class="cm">${V(r)}</b></span>`;
    msg.innerHTML=dep?'<b>線形従属です。</b> v と w が同じ直線上にあり、s と t をどう変えても紫の直線の上にしか届きません。':'<b>線形独立です。</b> 紫の方眼が v と w の作る網目です。s と t を選べば平面のどの点にも届きます。';
  };
  slider(ctl,'s',-2,2,.25,s,x=>{s=x;plot.render();}); slider(ctl,'t',-2,2,.25,t,x=>{t=x;plot.render();});
  btn(ctl,'w を v に重ねる',()=>moveTo(plot,[w],[[-v.x/2,-v.y/2]]));
  btn(ctl,'はじめに戻す',()=>moveTo(plot,[v,w],[[2,.5],[-.5,1.5]]));
  plot.render(); return ()=>plot.destroy();
};

/* 3 内積と正射影 */
VIZ.dotProj=root=>{
  const {plot,read,msg}=frame(root,{title:'内積と正射影'});
  const a={x:1.5,y:2.5,color:'--c-i'}, b={x:3,y:.5,color:'--c-j'};
  plot.handles=[a,b];
  plot.draw=p=>{
    p.base(); const A=[a.x,a.y],B=[b.x,b.y], bb=B[0]*B[0]+B[1]*B[1], d=A[0]*B[0]+A[1]*B[1];
    if(bb<1e-9){ p.arrow([0,0],A,p.css('--c-i'),3,'a'); read.textContent='b が零ベクトルです'; msg.textContent='b を原点から離してください。'; return; }
    const c=d/bb, P=[c*B[0],c*B[1]];
    p.inf([0,0],B,p.css('--grid2'),1.2,[4,5]);
    p.line(A,P,p.css('--ink3'),1.5,[5,4]);
    const n=Math.hypot(...B), u=[B[0]/n,B[1]/n], sgn=c>=0?-1:1, pr=[A[0]-P[0],A[1]-P[1]], pn=Math.hypot(...pr);
    if(pn>.3){ const q=.22, e=[pr[0]/pn*q,pr[1]/pn*q], f=[u[0]*q*sgn,u[1]*q*sgn]; p.curve([[P[0]+e[0],P[1]+e[1]],[P[0]+e[0]+f[0],P[1]+e[1]+f[1]],[P[0]+f[0],P[1]+f[1]]],p.css('--ink3'),1.2); }
    p.arrow([0,0],B,p.css('--c-j'),3,'b'); p.arrow([0,0],P,p.css('--c-k'),5,'影'); p.arrow([0,0],A,p.css('--c-i'),3,'a');
    const an=Math.hypot(...A), th=an>1e-9?Math.acos(Math.max(-1,Math.min(1,d/(an*n))))*180/Math.PI:0;
    read.innerHTML=`<span><b class="ci">a</b>·<b class="cj">b</b> = ${fmt(d)}</span><span>角 = ${fmt(th)}°</span><span><b class="ck">影</b> = ${fmt(c)} b = ${V(P)}</span>`;
    msg.innerHTML=Math.abs(d)<1e-9?'<b>内積が 0 です。</b> a と b は直交していて、影は原点に縮みます。':d>0?'内積が正です。影は b と同じ向きに落ちます。a を回して内積が 0 になる場所を探してください。':'内積が負です。影は b と逆向きに落ちます。なす角は 90°より大きくなっています。';
  };
  plot.render(); return ()=>plot.destroy();
};

/* 4 行列は変形 */
VIZ.transform=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'行列が方眼を変形する',h:330});
  const e1={x:1.5,y:.5,color:'--c-i'}, e2={x:-.5,y:1,color:'--c-j'};
  plot.handles=[e1,e2]; const x=[2,1];
  plot.draw=p=>{
    const M=[e1.x,e2.x,e1.y,e2.y];
    p.grid(null,p.css('--grid'),1,1); p.grid(M,p.css('--ink3'),.55,1); p.line(mul(M,[-12,0]),mul(M,[12,0]),p.css('--ink2'),1.6); p.line(mul(M,[0,-12]),mul(M,[0,12]),p.css('--ink2'),1.6);
    const a=[x[0]*e1.x,x[0]*e1.y], r=mul(M,x);
    p.line([0,0],a,p.css('--c-i'),2,[6,5]); p.line(a,r,p.css('--c-j'),2,[6,5]);
    p.arrow([0,0],r,p.css('--c-m'),3,'Ax');
    p.arrow([0,0],[e1.x,e1.y],p.css('--c-i'),3.5,'e₁の行き先',[0,18]); p.arrow([0,0],[e2.x,e2.y],p.css('--c-j'),3.5,'e₂の行き先',[0,-16]);
    read.innerHTML=`<span>${TeX('A='+matTex(M,p.css('--c-i'),p.css('--c-j')))}</span><span>${TeX(R`\vb{x}=\M{2\\1}`)}</span><span class="cm">${TeX(R`A\vb{x}=\M{${fmt(r[0])}\\${fmt(r[1])}}`.replace(/−/g,'-'))}</span>`;
    msg.innerHTML='赤い列が e₁ の行き先、緑の列が e₂ の行き先です。紫の Ax は「赤を 2 回、緑を 1 回」たどった先にあります。';
  };
  const P=[['回転 90°',[0,1],[-1,0]],['拡大',[2,0],[0,1.5]],['せん断',[1,0],[1,1]],['鏡映',[-1,0],[0,1]],['つぶす',[1,.5],[2,1]],['何もしない',[1,0],[0,1]]];
  const sg=seg(ctl,P.map(x=>x[0]),i=>moveTo(plot,[e1,e2],[P[i][1],P[i][2]]),-1);
  plot.onDrag=()=>sg.clear();
  plot.render(); return ()=>plot.destroy();
};

/* 5 積は合成 */
VIZ.compose=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'順番を変えると結果が変わる',hint:'',h:300,range:4.2});
  const A=[0,-1,1,0], B=[1,1,0,1], I=[1,0,0,1], F=[[0,0],[1.6,0],[1.6,.5],[.5,.5],[.5,1],[1.2,1],[1.2,1.5],[.5,1.5],[.5,2.4],[0,2.4]];
  let order=0, M=I, stage=0;
  plot.draw=p=>{
    p.base(); p.poly(F,null,p.css('--ink3'),1.2);
    const other=order===0?mm(B,A):mm(A,B);
    if(stage===2){ const o=F.map(q=>mul(other,q)); p.curve(o.concat([o[0]]),p.css('--ink3'),1.5,[5,4]); }
    p.poly(F.map(q=>mul(M,q)),p.css('--c-k'),p.css('--c-k'),2,.25);
    p.arrow([0,0],mul(M,[1,0]),p.css('--c-i'),3); p.arrow([0,0],mul(M,[0,1]),p.css('--c-j'),3);
    if(stage===2){ const lab=order===0?'BA':'AB'; p.text(mul(other,[.8,2.4]),lab+' の結果',p.css('--ink3'),[0,-14]); }
    read.innerHTML=`<span>${TeX(R`A=\M{0&-1\\1&0}`)} 回転</span><span>${TeX(R`B=\M{1&1\\0&1}`)} せん断</span><span>${TeX(R`AB=\M{0&-1\\1&1}`)}</span><span>${TeX(R`BA=\M{1&-1\\1&0}`)}</span>`;
  };
  const say=()=>{ msg.innerHTML=stage===0?'「再生」を押すと 2 つの変形を続けて行います。':stage===1?(order===0?'まず B (せん断) を行っています。':'まず A (回転) を行っています。'):(order===0?'<b>AB</b> は「せん断のあとに回転」です。灰色の線は順番を逆にした BA の結果で、重なりません。':'<b>BA</b> は「回転のあとにせん断」です。灰色の線は順番を逆にした AB の結果で、重なりません。'); };
  const run=()=>{ const first=order===0?B:A, both=order===0?mm(A,B):mm(B,A); stage=1; say();
    plot.play(700,t=>{M=lerpM(I,first,t);},()=>setTimeout(()=>{ if(plot.dead) return; plot.play(700,t=>{M=lerpM(first,both,t);},()=>{stage=2;say();plot.render();}); },250)); };
  seg(ctl,['AB: B のあとに A','BA: A のあとに B'],i=>{order=i;M=I;stage=0;say();run();});
  btn(ctl,'再生',run,true);
  say(); plot.render(); return ()=>plot.destroy();
};

/* 6 行列式 */
VIZ.det=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'行列式は面積の倍率',h:310,range:3.6});
  const e1={x:2,y:.5,color:'--c-i'}, e2={x:.5,y:1.5,color:'--c-j'}; plot.handles=[e1,e2];
  plot.draw=p=>{
    p.base(); const a=[e1.x,e1.y], b=[e2.x,e2.y], d=a[0]*b[1]-b[0]*a[1];
    p.poly([[0,0],[1,0],[1,1],[0,1]],null,p.css('--ink3'),1.3); p.ctx.setLineDash([]);
    p.poly([[0,0],a,[a[0]+b[0],a[1]+b[1]],b],d<0?p.css('--c-m'):p.css('--c-area'),d<0?p.css('--c-m'):p.css('--c-area'),2,.3);
    p.arrow([0,0],a,p.css('--c-i'),3.5); p.arrow([0,0],b,p.css('--c-j'),3.5);
    p.text([(a[0]+b[0])/2,(a[1]+b[1])/2],'面積 '+fmt(Math.abs(d)),d<0?p.css('--c-m'):p.css('--c-area'),[0,0]);
    read.innerHTML=`<span>${TeX(R`\det`+matTex([a[0],b[0],a[1],b[1]],p.css('--c-i'),p.css('--c-j')))}</span><span>= ${fmt(a[0])}×${fmt(b[1])} − ${fmt(b[0])}×${fmt(a[1])} = <b>${fmt(d)}</b></span>`;
    msg.innerHTML=Math.abs(d)<1e-9?'<b>行列式が 0 です。</b> 平行四辺形がつぶれて面積がなくなりました。この変形は元に戻せないので逆行列がありません。':d<0?'<b>行列式が負です。</b> 赤と緑の位置関係が入れ替わり、平面が裏返っています。面積の倍率は絶対値で読みます。':'灰色の正方形 (面積 1) が黄色の平行四辺形に移ります。面積がそのまま行列式の値です。';
  };
  btn(ctl,'つぶす',()=>moveTo(plot,[e1,e2],[[2,1],[1,.5]]));
  btn(ctl,'裏返す',()=>moveTo(plot,[e1,e2],[[.5,1.5],[2,.5]]));
  btn(ctl,'はじめに戻す',()=>moveTo(plot,[e1,e2],[[2,.5],[.5,1.5]]));
  plot.render(); return ()=>plot.destroy();
};

/* 7 連立方程式の図 */
VIZ.linsys=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'2 本の式は 2 本の直線',h:310,range:4.5});
  const P=[{x:-2,y:-1,color:'--c-i',snap:1},{x:2,y:3,color:'--c-i',snap:1},{x:0,y:3,color:'--c-j',snap:1},{x:3,y:0,color:'--c-j',snap:1}];
  P.forEach((h,i)=>h.lock=(x,y)=>{ const o=P[i^1]; return (x===o.x&&y===o.y)?null:[x,y]; });
  plot.handles=P;
  const g=(a,b)=>b?g(b,a%b):Math.abs(a);
  const eq=(p,q)=>{ let a=q.y-p.y, b=p.x-q.x, c=a*p.x+b*p.y; const k=g(g(Math.round(a),Math.round(b)),Math.round(c))||1; a/=k;b/=k;c/=k; if(a<0||(a===0&&b<0)){a=-a;b=-b;c=-c;} return [a,b,c]; };
  const term=(k,v,first)=>{ if(!k) return ''; const s=k<0?'-':(first?'':'+'), m=Math.abs(k)===1?'':Math.abs(k); return s+m+v; };
  const str=e=>{ const l=term(e[0],'x',true)+term(e[1],'y',!e[0]); return `${l}=${e[2]}`; };
  plot.draw=p=>{
    p.base(); const E1=eq(P[0],P[1]), E2=eq(P[2],P[3]);
    p.inf([P[0].x,P[0].y],[P[1].x-P[0].x,P[1].y-P[0].y],p.css('--c-i'),2.5); p.inf([P[2].x,P[2].y],[P[3].x-P[2].x,P[3].y-P[2].y],p.css('--c-j'),2.5);
    const D=E1[0]*E2[1]-E1[1]*E2[0]; let m, rA, rAb;
    if(Math.abs(D)>1e-9){ const x=(E1[2]*E2[1]-E1[1]*E2[2])/D, y=(E1[0]*E2[2]-E1[2]*E2[0])/D; p.dot([x,y],p.css('--bg'),9); p.dot([x,y],p.css('--c-m'),6); p.text([x,y],V([x,y]),p.css('--c-m'),[0,-20]);
      rA=2;rAb=2; m=`<b>解はただ 1 つ。</b> 交点 ${V([x,y])} が両方の式を満たします。`; }
    else if(Math.abs(E1[0]*E2[2]-E1[2]*E2[0])<1e-9&&Math.abs(E1[1]*E2[2]-E1[2]*E2[1])<1e-9){ rA=1;rAb=1; m='<b>解は無数にある。</b> 2 本が重なり、直線上のすべての点が解です。式は実質 1 本しかありません。'; }
    else{ rA=1;rAb=2; m='<b>解はない。</b> 2 本が平行で交わりません。左辺は同じ形なのに右辺が合っていません。'; }
    read.innerHTML=`<span class="ci">${TeX(str(E1))}</span><span class="cj">${TeX(str(E2))}</span><span>rank A = ${rA}</span><span>rank (A|b) = ${rAb}</span>`;
    msg.innerHTML=m;
  };
  const T=[[[-2,-1],[2,3],[0,3],[3,0]],[[-2,-1],[2,3],[-1,2],[1,4]],[[-2,-1],[2,3],[-1,0],[1,2]]];
  const sg=seg(ctl,['交わる','平行','重なる'],i=>moveTo(plot,P,T[i]));
  plot.onDrag=()=>sg.clear();
  plot.render(); return ()=>plot.destroy();
};

/* 7 掃き出し法を一手ずつ */
VIZ.elim=root=>{
  const S=[
    [[[1,1,1,6],[2,3,1,11],[1,2,4,17]],-1,'拡大係数行列を作りました。左下の 3 か所を 0 にしていきます。'],
    [[[1,1,1,6],[0,1,-1,-1],[1,2,4,17]],1,'2 行目から 1 行目の 2 倍を引きます。2 行目の先頭が 0 になりました。'],
    [[[1,1,1,6],[0,1,-1,-1],[0,1,3,11]],2,'3 行目から 1 行目を引きます。1 列目が片づきました。'],
    [[[1,1,1,6],[0,1,-1,-1],[0,0,4,12]],2,'3 行目から 2 行目を引きます。階段行列になりました。0 でない行が 3 つなのでランクは 3 です。'],
    [[[1,1,1,6],[0,1,-1,-1],[0,0,1,3]],2,'3 行目を 4 で割ります。z = 3 が読み取れます。'],
    [[[1,1,1,6],[0,1,0,2],[0,0,1,3]],1,'2 行目に 3 行目を足します。y = 2 です。'],
    [[[1,1,0,3],[0,1,0,2],[0,0,1,3]],0,'1 行目から 3 行目を引きます。'],
    [[[1,0,0,1],[0,1,0,2],[0,0,1,3]],0,'1 行目から 2 行目を引きます。左側が単位行列になり、解 (x, y, z) = (1, 2, 3) が右端に並びました。'],
  ];
  root.innerHTML=`<div class="viz-cap"><b>掃き出し法を一手ずつ</b><span class="mono" id="el-n"></span></div><div class="steps"></div><div class="steps-op"></div><div class="dots">${S.map(()=>'<i></i>').join('')}</div>
  <div class="viz-ctl"><button type="button" class="mini" data-d="-1">戻る</button><button type="button" class="mini solid" data-d="1">次の操作</button><button type="button" class="mini" data-d="0">最初から</button></div>`;
  const st=root.querySelector('.steps'), op=root.querySelector('.steps-op'), dots=[...root.querySelectorAll('.dots i')], n=root.querySelector('#el-n'), bs=root.querySelectorAll('button'); let i=0;
  const col=getComputedStyle(document.documentElement).getPropertyValue('--c-i').trim();
  const show=()=>{ const [m,hl,tx]=S[i];
    const rows=m.map((r,ri)=>{ const c=r.map(v=>ri===hl?`\\textcolor{${col}}{${v}}`:v); return `${c[0]}&${c[1]}&${c[2]}&${c[3]}`; }).join('\\\\');
    st.innerHTML=TeX(`\\left(\\begin{array}{ccc|c}${rows}\\end{array}\\right)`,true); st.firstElementChild.classList.add('swap');
    op.textContent=tx; dots.forEach((d,k)=>d.classList.toggle('on',k===i)); n.textContent=`${i} / ${S.length-1} 手`;
    bs[0].disabled=i===0; bs[1].disabled=i===S.length-1; bs[0].style.opacity=i===0?.35:1; bs[1].style.opacity=i===S.length-1?.35:1; };
  bs.forEach(b=>b.onclick=()=>{ const d=+b.dataset.d; i=d===0?0:Math.max(0,Math.min(S.length-1,i+d)); show(); });
  show(); return ()=>{};
};

/* 8 核と像 */
VIZ.kernel=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'つぶれる方向と残る方向',hint:'',h:310,range:4});
  const Ms=[[1.5,.5,.5,1],[1,2,.5,1],[0,0,0,0]], I=[1,0,0,1]; let k=1, t=0;
  const pts=[]; for(let x=-3;x<=3;x+=.5) for(let y=-3;y<=3;y+=.5) pts.push([x,y]);
  plot.draw=p=>{
    p.base(); const A=Ms[k], M=lerpM(I,A,t);
    if(k===1){ p.inf([0,0],[2,-1],p.css('--c-m'),2,[6,5]); if(t>.98) p.inf([0,0],[1,.5],p.css('--c-k'),2); }
    for(const q of pts){ const onK=k===1&&Math.abs(q[0]+2*q[1])<1e-9; p.dot(mul(M,q),onK?p.css('--c-m'):p.css('--ink2'),onK?4:2.4); }
    if(k===1){ p.text([2.6,-1.3],'核',p.css('--c-m'),[14,8]); if(t>.98) p.text([2.8,1.4],'像',p.css('--c-k'),[10,-12]); }
    if(k===2&&t>.98) p.dot([0,0],p.css('--c-k'),7);
    const rk=[2,1,0][k];
    read.innerHTML=`<span>${TeX('A='+matTex(A))}</span><span>ランク ${rk}</span><span>核の次元 ${2-rk}</span><span>${rk} + ${2-rk} = 2</span>`;
    msg.innerHTML=[t<.98?'「再生」を押すと点が A で移ります。':'<b>ランク 2。</b> 点は平面全体に広がったままです。原点に移るのは原点だけなので、核は {0} です。',
      t<.98?'紫の破線の上の点に注目して「再生」を押してください。':'<b>ランク 1。</b> 平面が青い直線につぶれました。この直線が像です。紫の破線 (核) の上にあった点は全部原点に集まりました。',
      t<.98?'「再生」を押してください。':'<b>ランク 0。</b> 零行列はすべての点を原点に移します。像は原点だけ、核は平面全体です。'][k];
  };
  const go=()=>{ t=0; plot.play(1100,x=>{t=x;}); };
  seg(ctl,['ランク 2','ランク 1','ランク 0'],i=>{k=i;go();},1);
  btn(ctl,'再生',go,true); btn(ctl,'元に戻す',()=>{cancelAnimationFrame(plot.raf);t=0;plot.render();});
  plot.render(); return ()=>plot.destroy();
};

/* 9 基底と座標 */
VIZ.basis=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'同じ点を別の基底で測る',h:320,range:4.5});
  const b1={x:2,y:1,color:'--c-i'}, b2={x:-1,y:1,color:'--c-j'}, pt={x:3,y:3,color:'--c-m'}; plot.handles=[b1,b2,pt];
  plot.draw=p=>{
    const M=[b1.x,b2.x,b1.y,b2.y], d=det2(M); p.base();
    if(Math.abs(d)<1e-9){ p.arrow([0,0],[b1.x,b1.y],p.css('--c-i'),3,'b₁'); p.arrow([0,0],[b2.x,b2.y],p.css('--c-j'),3,'b₂');
      read.innerHTML=`<span>ふつうの座標 <b class="cm">${V([pt.x,pt.y])}</b></span><span>基底 B での座標 なし</span>`; msg.innerHTML='<b>基底になっていません。</b> b₁ と b₂ が線形従属で、平面を張れません。'; return; }
    p.grid(M,p.css('--c-k'),.4,1,14);
    const c=[(M[3]*pt.x-M[1]*pt.y)/d,(-M[2]*pt.x+M[0]*pt.y)/d], s=[c[0]*b1.x,c[0]*b1.y];
    p.line([0,0],s,p.css('--c-i'),2.2,[6,5]); p.line(s,[pt.x,pt.y],p.css('--c-j'),2.2,[6,5]);
    p.arrow([0,0],[b1.x,b1.y],p.css('--c-i'),3.5,'b₁'); p.arrow([0,0],[b2.x,b2.y],p.css('--c-j'),3.5,'b₂'); p.text([pt.x,pt.y],'p',p.css('--c-m'),[14,-14]);
    read.innerHTML=`<span>ふつうの座標 <b class="cm">${V([pt.x,pt.y])}</b></span><span>基底 B での座標 <b class="ck">${V(c)}</b></span>`;
    msg.innerHTML=`p = <b class="ci">${fmt(c[0])} b₁</b> + <b class="cj">${fmt(c[1])} b₂</b> です。青い網目は基底 B の方眼です。点 p は同じ場所にあるのに、測る方眼を変えると数が変わります。`;
  };
  btn(ctl,'標準基底にする',()=>moveTo(plot,[b1,b2],[[1,0],[0,1]]));
  btn(ctl,'はじめに戻す',()=>moveTo(plot,[b1,b2,pt],[[2,1],[-1,1],[3,3]]));
  plot.render(); return ()=>plot.destroy();
};

function eig2(M){
  const tr=M[0]+M[3], d=det2(M), ds=tr*tr-4*d; if(ds<-1e-9) return [];
  const s=Math.sqrt(Math.max(0,ds)), ls=s<1e-9?[tr/2]:[(tr+s)/2,(tr-s)/2];
  return ls.map(l=>{ let v; if(Math.abs(M[1])>1e-9) v=[M[1],l-M[0]]; else if(Math.abs(M[2])>1e-9) v=[l-M[3],M[2]]; else v=Math.abs(M[0]-l)<1e-9?[1,0]:[0,1];
    const n=Math.hypot(...v); return {l,v:[v[0]/n,v[1]/n]}; });
}
/* 10 固有ベクトルを探す */
VIZ.eigen=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'向きが変わらない方向を探す',hint:'青い点を回せます',h:320,range:3.2});
  const Ms=[[1.5,.5,.5,1.5],[2,0,0,.5],[1,1,0,1],[.5,-.866,.866,.5],[1,.5,.5,.25]]; let k=0, show=false, spin=0;
  const x={x:1,y:0,color:'--c-k',snap:0,lock:(a,b)=>{const n=Math.hypot(a,b); return n<.05?null:[a/n,b/n];}}; plot.handles=[x];
  plot.draw=p=>{
    p.base(); const A=Ms[k], X=[x.x,x.y], AX=mul(A,X), E=eig2(A);
    const c=[]; for(let i=0;i<=64;i++) c.push([Math.cos(i/32*Math.PI),Math.sin(i/32*Math.PI)]); p.curve(c,p.css('--grid2'),1.2,[3,4]);
    if(show) E.forEach(e=>p.inf([0,0],e.v,p.css('--c-area'),2,[7,5]));
    const cr=X[0]*AX[1]-X[1]*AX[0], al=Math.abs(cr)<.035, col=al?p.css('--c-area'):null;
    p.arrow([0,0],AX,col||p.css('--c-m'),al?4.5:3,'Ax'); p.arrow([0,0],X,col||p.css('--c-k'),al?4.5:3,'x');
    const lam=X[0]*AX[0]+X[1]*AX[1];
    read.innerHTML=`<span>${TeX('A='+matTex(A))}</span><span>固有値 ${E.length?E.map(e=>fmt(e.l)).join(', '):'実数にはない'}</span>`;
    msg.innerHTML=al?`<b class="ca">固有ベクトルです。</b> x と Ax が同じ直線に乗りました。Ax = ${fmt(lam)} x なので固有値は ${fmt(lam)} です。`:
      E.length?'青い x を回して、紫の Ax が x と同じ直線に乗る場所を探してください。':'この行列は回転です。どの x も向きが変わるので、固有ベクトルが見つかりません。';
  };
  seg(ctl,['斜めに伸ばす','軸ごとに伸縮','せん断','回転 60°','つぶす'],i=>{k=i;plot.render();});
  btn(ctl,'ゆっくり回す',b=>{ if(spin){cancelAnimationFrame(spin);spin=0;b.textContent='ゆっくり回す';return;} b.textContent='止める';
    let a=Math.atan2(x.y,x.x); const tick=()=>{ if(plot.dead) return; a+=.012; x.x=Math.cos(a); x.y=Math.sin(a); plot.render(); spin=requestAnimationFrame(tick); }; tick(); });
  btn(ctl,'答えの方向を表示',b=>{show=!show;b.textContent=show?'答えの方向を隠す':'答えの方向を表示';plot.render();});
  plot.render(); return ()=>{cancelAnimationFrame(spin);plot.destroy();};
};

/* 11 べき乗 */
VIZ.power=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'同じ行列を何回も掛ける',hint:'',h:310,range:4});
  const l1=1.15,l2=.6, P=[2,-1,1,1], Pi=[1/3,1/3,-1/3,2/3], A=mm(mm(P,[l1,0,0,l2]),Pi); let n=0, f=0;
  const start=[]; for(let i=0;i<14;i++) start.push([Math.cos(i/7*Math.PI),Math.sin(i/7*Math.PI)]);
  plot.draw=p=>{
    p.base(); p.inf([0,0],[2,1],p.css('--c-i'),1.8,[7,5]); p.inf([0,0],[-1,1],p.css('--c-j'),1.8,[7,5]);
    p.text([3.2,1.6],'λ='+l1,p.css('--c-i'),[0,-14]); p.text([-2.4,2.4],'λ='+l2,p.css('--c-j'),[16,-10]);
    for(const s of start){ const tr=[s]; let q=s; for(let i=0;i<Math.ceil(f);i++){ const nx=mul(A,q), u=Math.min(1,f-i); q=[q[0]+(nx[0]-q[0])*u,q[1]+(nx[1]-q[1])*u]; tr.push(q); }
      p.curve(tr,p.css('--ink3'),1); p.dot(s,p.css('--ink3'),2.2); p.dot(q,p.css('--c-k'),4.5); }
    read.innerHTML=`<span>${TeX('A='+matTex(A))}</span><span>n = ${n}</span><span class="ci">${l1}ⁿ = ${fmt(Math.pow(l1,n))}</span><span class="cj">${l2}ⁿ = ${fmt(Math.pow(l2,n))}</span>`;
    msg.innerHTML=n===0?'円の上に点を並べました。n を増やすと各点に A を n 回掛けます。':n<4?'緑の方向の成分は毎回 0.6 倍になって縮み、赤の方向の成分は 1.15 倍になって伸びます。':'緑の方向の成分がほとんど消え、点が赤い固有ベクトルの直線に並びました。大きい固有値の方向だけが残ります。';
  };
  const sl=slider(ctl,'n',0,8,1,0,v=>{ const from=f; n=v; plot.play(380,t=>{f=from+(v-from)*t;}); });
  plot.render(); return ()=>plot.destroy();
};

/* 12 グラム・シュミット */
VIZ.gram=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'影を引いて直交させる',h:310,range:3.6});
  const a1={x:2.5,y:1,color:'--c-i'}, a2={x:1,y:2.5,color:'--c-j'}; plot.handles=[a1,a2]; let st=2;
  plot.draw=p=>{
    p.base(); const A1=[a1.x,a1.y],A2=[a2.x,a2.y], n1=Math.hypot(...A1);
    const c=[]; for(let i=0;i<=64;i++) c.push([Math.cos(i/32*Math.PI),Math.sin(i/32*Math.PI)]); p.curve(c,p.css('--grid2'),1.2,[3,4]);
    if(n1<1e-9){ msg.textContent='a₁ を原点から離してください。'; return; }
    const u1=[A1[0]/n1,A1[1]/n1], d=A2[0]*u1[0]+A2[1]*u1[1], pr=[d*u1[0],d*u1[1]], w=[A2[0]-pr[0],A2[1]-pr[1]], nw=Math.hypot(...w);
    p.arrow([0,0],A1,p.css('--c-i'),2,'a₁'); p.arrow([0,0],A2,p.css('--c-j'),2,'a₂');
    p.arrow([0,0],u1,p.css('--c-i'),5,'u₁',[-u1[1]*-16,u1[0]*16]);
    if(st>=1){ p.inf([0,0],u1,p.css('--grid2'),1.2,[4,5]); p.line(A2,pr,p.css('--ink3'),1.5,[5,4]); p.arrow([0,0],pr,p.css('--ink3'),2.5,'影'); p.arrow([0,0],w,p.css('--c-k'),2.5,'w₂'); }
    let u2=null; if(st>=2&&nw>1e-9){ u2=[w[0]/nw,w[1]/nw]; p.arrow([0,0],u2,p.css('--c-j'),5,'u₂'); }
    read.innerHTML=`<span><b class="ci">u₁</b> = ${V(u1)}</span>`+(st>=1?`<span><b class="ck">w₂</b> = ${V(w)}</span>`:'')+(u2?`<span><b class="cj">u₂</b> = ${V(u2)}</span><span>u₁·u₂ = 0</span>`:'');
    msg.innerHTML=nw<1e-9&&st>=1?'<b>a₂ が a₁ と同じ直線上にあります。</b> 影を引くと何も残りません。線形従属な組からは直交する 2 本目が作れません。':
      ['a₁ を自分の長さで割って u₁ にします。点線の円は半径 1 です。','a₂ から u₁ 方向の影を引きます。残った青い w₂ は u₁ と直交します。','w₂ を長さ 1 にして u₂ にします。太い 2 本が正規直交基底です。'][st];
  };
  seg(ctl,['1 正規化','2 影を引く','3 もう一度正規化'],i=>{st=i;plot.render();},2);
  plot.render(); return ()=>plot.destroy();
};

/* 12 最小二乗 */
VIZ.lsq=root=>{
  const {plot,read,msg}=frame(root,{title:'誤差の 2 乗の和を最小にする直線',h:300,range:4.2});
  const P=[[-3,-1],[-1.5,.5],[0,.5],[1.5,2],[3,1.5]].map(q=>({x:q[0],y:q[1],color:'--ink',snap:.25})); plot.handles=P;
  plot.draw=p=>{
    p.base(); const n=P.length, sx=P.reduce((s,q)=>s+q.x,0), sy=P.reduce((s,q)=>s+q.y,0), sxx=P.reduce((s,q)=>s+q.x*q.x,0), sxy=P.reduce((s,q)=>s+q.x*q.y,0), D=n*sxx-sx*sx;
    if(Math.abs(D)<1e-9){ read.textContent='点が縦一列に並んでいます'; msg.textContent='x 座標がすべて同じだと、傾きが決まりません。点を左右に散らしてください。'; return; }
    const a=(n*sxy-sx*sy)/D, b=(sy-a*sx)/n; let e=0;
    for(const q of P){ const y=a*q.x+b; e+=(q.y-y)**2; p.line([q.x,q.y],[q.x,y],p.css('--c-m'),2.5); }
    p.inf([0,b],[1,a],p.css('--c-k'),2.5);
    read.innerHTML=`<span class="ck">y = ${fmt(a)}x ${b<0?'−':'+'} ${fmt(Math.abs(b))}</span><span class="cm">誤差の 2 乗の和 = ${fmt(e)}</span>`;
    msg.innerHTML='5 つの点を全部通る直線はありません。青い直線は、紫の線分 (誤差) の 2 乗の和がいちばん小さくなるように決まっています。点を動かすと直線が引き直されます。';
  };
  plot.render(); return ()=>plot.destroy();
};

/* 12 特異値分解 */
VIZ.svd=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'円は楕円に移る',h:320,range:3.6});
  const e1={x:2,y:1,color:'--ink2'}, e2={x:-.5,y:1.5,color:'--ink2'}; plot.handles=[e1,e2];
  plot.draw=p=>{
    p.base(); const M=[e1.x,e2.x,e1.y,e2.y], S=[M[0]*M[0]+M[2]*M[2],M[0]*M[1]+M[2]*M[3],M[0]*M[1]+M[2]*M[3],M[1]*M[1]+M[3]*M[3]], E=eig2(S);
    const c=[],im=[]; for(let i=0;i<=72;i++){ const q=[Math.cos(i/36*Math.PI),Math.sin(i/36*Math.PI)]; c.push(q); im.push(mul(M,q)); }
    p.curve(c,p.css('--ink3'),1.3,[3,4]); p.poly(im,p.css('--c-k'),p.css('--c-k'),2.2,.12);
    p.arrow([0,0],[e1.x,e1.y],p.css('--ink2'),1.6); p.arrow([0,0],[e2.x,e2.y],p.css('--ink2'),1.6);
    const s1=Math.sqrt(Math.max(0,E[0].l)), s2=E.length>1?Math.sqrt(Math.max(0,E[1].l)):s1;
    const v1=E[0].v, u1=s1>1e-9?mul(M,v1).map(x=>x/s1):[1,0], u2=[-u1[1],u1[0]];
    p.arrow([0,0],[u1[0]*s1,u1[1]*s1],p.css('--c-i'),3.5,'σ₁'); if(s2>.02) p.arrow([0,0],[u2[0]*s2,u2[1]*s2],p.css('--c-j'),3.5,'σ₂');
    read.innerHTML=`<span>${TeX('A='+matTex(M))}</span><span class="ci">σ₁ = ${fmt(s1)}</span><span class="cj">σ₂ = ${fmt(s2)}</span><span>σ₁σ₂ = ${fmt(s1*s2)} = |det A|</span>`;
    msg.innerHTML=s2<.02?'<b>σ₂ が 0 です。</b> 楕円が線分につぶれました。0 でない特異値は 1 個で、ランクも 1 です。':'点線の円 (半径 1) が青い楕円に移ります。長い半径が σ₁、短い半径が σ₂ です。灰色の点は A の 2 つの列で、動かせます。';
  };
  btn(ctl,'つぶす',()=>moveTo(plot,[e1,e2],[[2,1],[1,.5]]));
  btn(ctl,'回転だけにする',()=>moveTo(plot,[e1,e2],[[.8,.6],[-.6,.8]]));
  btn(ctl,'はじめに戻す',()=>moveTo(plot,[e1,e2],[[2,1],[-.5,1.5]]));
  plot.render(); return ()=>plot.destroy();
};

/* ホームの図: 方眼がいくつかの行列で順に変形する */
VIZ.hero=(canvas,cap)=>{
  const plot=new Plot(canvas,{h:canvas.clientHeight||250,range:4.6});
  const seq=[[1,0,0,1],[1,1,0,1],[0,-1,1,0],[1.6,0,0,.7],[1.2,.6,.6,1.2],[1,2,.5,1]], names=['単位行列','せん断','回転','伸縮','対称行列','つぶれる (det = 0)']; let M=seq[0], i=0, timer=0;
  plot.draw=p=>{
    p.grid(null,p.css('--grid'),1,1); p.grid(M,p.css('--ink3'),.5,1);
    p.poly([[0,0],mul(M,[1,0]),mul(M,[1,1]),mul(M,[0,1])],p.css('--c-area'),null,1,.3);
    p.arrow([0,0],mul(M,[1,0]),p.css('--c-i'),4); p.arrow([0,0],mul(M,[0,1]),p.css('--c-j'),4);
    cap.innerHTML=`${names[i]}　${TeX(matTex(M,p.css('--c-i'),p.css('--c-j')))}`;
  };
  const next=()=>{ const from=M; i=(i+1)%seq.length; plot.play(900,t=>{M=lerpM(from,seq[i],t);},()=>{timer=setTimeout(next,1500);}); };
  plot.render(); if(!REDUCED) timer=setTimeout(next,1400);
  return ()=>{clearTimeout(timer);plot.destroy();};
};
