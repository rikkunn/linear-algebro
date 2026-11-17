/* 各章の図。VIZ[id](root) が図を組み立て、後始末の関数を返す。
   色の役割: 赤 = 1 本目 (e1)、緑 = 2 本目 (e2)、青 = 結果、紫 = 動かす入力や注目する部分、黄 = 面積、桃 = 固有ベクトルの方向 */
const VIZ = {};
const V = v=>'('+v.map(fmt).join(', ')+')';
const tx = s=>TeX(s.replace(/−/g,'-'));
const matTex = (M,c1,c2)=>{ const f=(v,c)=>c?'\\textcolor{'+c+'}{'+fmt(v)+'}':fmt(v); return '\\begin{pmatrix}'+f(M[0],c1)+'&'+f(M[1],c2)+'\\\\'+f(M[2],c1)+'&'+f(M[3],c2)+'\\end{pmatrix}'; };
const colTex = v=>'\\begin{pmatrix}'+v.map(fmt).join('\\\\')+'\\end{pmatrix}';
const CIRC = n=>{ const a=[]; for(let i=0;i<=n;i++) a.push([Math.cos(i/n*2*Math.PI),Math.sin(i/n*2*Math.PI)]); return a; };
const getM = (e1,e2)=>[e1.x,e2.x,e1.y,e2.y];
const setM = (e1,e2,M)=>{ e1.x=M[0]; e1.y=M[2]; e2.x=M[1]; e2.y=M[3]; };
const FSHAPE = [[0,0],[1.6,0],[1.6,.5],[.5,.5],[.5,1],[1.2,1],[1.2,1.5],[.5,1.5],[.5,2.4],[0,2.4]];

function frame(root,{title,hint='丸い点を指で動かせます',legend,h=300,range=4,cy,three,opt}){
  root.innerHTML=`<div class="viz-cap"><b>${title}</b>${hint?`<span class="hint">${hint}</span>`:''}</div>
  ${legend?`<div class="viz-leg">${legend.map(l=>`<span class="${l[0]}"><i></i>${l[1]}</span>`).join('')}</div>`:''}
  <canvas tabindex="0" role="img" aria-label="${title}の図。${three?'左右の矢印キーで回せます。':'矢印キーで点を動かし、スペースキーで動かす点を切り替えます。'}図の点は、このあとの調整つまみでも動かせます。"></canvas>
  <p class="sr" aria-live="polite"></p><div class="viz-read"></div><div class="viz-msg"></div><div class="viz-ctl"></div>`;
  const q=s=>root.querySelector(s);
  const plot=three?new Plot3(q('canvas'),Object.assign({h},opt)):new Plot(q('canvas'),{h,range,cy});
  const read=q('.viz-read'), msg=q('.viz-msg'), live=q('.sr');
  plot.onSettle=()=>{ live.textContent=read.textContent+' '+msg.textContent; };
  queueMicrotask(()=>a11ySliders(root,plot,three));
  return {plot,read,msg,ctl:q('.viz-ctl'),root};
}
/* 図の点を、画面の外に置いた調整つまみでも動かせるようにする (読み上げ機能やキーボード向け) */
const CNAME={'--c-i':'赤い点','--c-j':'緑の点','--c-m':'紫の点','--c-k':'青い点','--ink':'黒い点','--ink2':'灰色の点'};
function a11ySliders(root,plot,three){
  const hs=plot.handles.filter(h=>!h.fixed); if(!hs.length) return;
  const box=document.createElement('div'); box.className='sr'; const seen={};
  hs.forEach(h=>{ const base=CNAME[h.color]||'点'; seen[base]=(seen[base]||0)+1; const nm=h.name||base+(hs.filter(x=>(CNAME[x.color]||'点')===base).length>1?' '+seen[base]:'');
    ['x','y'].forEach(ax=>{ const R=three?(h.lim||3):plot.range, st=h.snap||(h.snap===0?.05:.25), inp=document.createElement('input');
      inp.type='range'; inp.min=-R; inp.max=R; inp.step=st; inp.value=h[ax]; inp.setAttribute('aria-label',`${nm}の ${ax} 座標`);
      inp.oninput=()=>{ if(h.hide) return; const v=+inp.value;
        if(three){ h[ax]=v; plot.render(); } else plot.place(h,ax==='x'?v:h.x,ax==='y'?v:h.y);
        inp.value=h[ax]; inp.setAttribute('aria-valuetext',`${fmt(h.x)}, ${fmt(h.y)}`); };
      inp.onchange=()=>plot.onSettle&&plot.onSettle();
      box.append(inp); }); });
  root.querySelector('canvas').after(box);
}
function seg(ctl,items,onPick,active=0){
  const d=document.createElement('div'); d.className='seg'; d.setAttribute('role','group');
  items.forEach((label,i)=>{ const b=document.createElement('button'); b.type='button'; b.textContent=label; b.setAttribute('aria-pressed',i===active);
    b.onclick=()=>{ d.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b)); onPick(i); }; d.append(b); });
  ctl.append(d); return {clear:()=>d.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',false))};
}
let SLID=0;
function slider(ctl,label,min,max,step,val,onInput){
  const id='sl'+(++SLID), l=document.createElement('div'); l.className='sl';
  l.innerHTML=`<label for="${id}">${label}</label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${val}"><output for="${id}">${fmt(val)}</output>`;
  const inp=l.querySelector('input'), out=l.querySelector('output');
  inp.oninput=()=>{ out.textContent=fmt(+inp.value); onInput(+inp.value); };
  ctl.append(l); return {el:l,set:v=>{inp.value=v; out.textContent=fmt(v);}};
}
function btn(ctl,label,fn,solid){ const b=document.createElement('button'); b.type='button'; b.className='mini'+(solid?' solid':''); b.textContent=label; b.onclick=()=>fn(b); ctl.append(b); return b; }
function moveTo(plot,hs,targets,ms=520,done){ const from=hs.map(h=>[h.x,h.y]); plot.play(ms,t=>hs.forEach((h,i)=>{h.x=from[i][0]+(targets[i][0]-from[i][0])*t; h.y=from[i][1]+(targets[i][1]-from[i][1])*t; }),done); }
function moveM(plot,e1,e2,T,ms=600){ const A=getM(e1,e2); plot.play(ms,t=>setM(e1,e2,tween(A,T,t)),()=>{setM(e1,e2,T);plot.render();}); }

/* 1 和とスカラー倍 */
VIZ.vecAdd=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'和とスカラー倍',legend:[['ci','a'],['cj','b'],['ck','結果']]});
  const a={x:2,y:1,color:'--c-i'}, b={x:1,y:2,color:'--c-j'}; let mode=0,k=2;
  plot.handles=[a,b];
  plot.draw=p=>{
    p.base(); const A=[a.x,a.y],B=[b.x,b.y],S=[a.x+b.x,a.y+b.y];
    if(mode===0){
      p.line(A,S,p.css('--c-j'),1.5,[5,5]); p.line(B,S,p.css('--c-i'),1.5,[5,5]);
      p.arrow([0,0],S,p.css('--c-k'),3.5,'a+b'); p.arrow([0,0],A,p.css('--c-i'),3,'a'); p.arrow([0,0],B,p.css('--c-j'),3,'b');
      read.innerHTML=`<span><b class="ci">a</b> = ${V(A)}</span><span><b class="cj">b</b> = ${V(B)}</span><span><b class="ck">a+b</b> = ${V(S)}</span><span>‖a+b‖ = ${fmt(Math.hypot(...S))}</span>`;
      msg.innerHTML='破線は b を a の先へ平行に移したものです。先をつなぐと a+b に着きます。';
    }else{
      const K=[a.x*k,a.y*k]; p.inf([0,0],A,p.css('--grid2'),1.2,[4,5]);
      p.arrow([0,0],K,p.css('--c-k'),3.5,fmt(k)+'a'); p.arrow([0,0],A,p.css('--c-i'),3,'a',[-14,16]);
      read.innerHTML=`<span><b class="ci">a</b> = ${V(A)}</span><span><b class="ck">${fmt(k)}a</b> = ${V(K)}</span><span>‖${fmt(k)}a‖ = ${fmt(Math.hypot(...K))}</span>`;
      msg.innerHTML=k<0?'負の数を掛けたので逆を向きました。長さは絶対値のぶんだけ変わります。':k===0?'0 を掛けると零ベクトルになります。':'スカラー倍しても、原点を通る同じ直線の上から出ません。';
    }
  };
  seg(ctl,['和 a+b','スカラー倍 ka'],i=>{mode=i; b.hide=b.fixed=i===1; sl.el.style.display=i?'grid':'none'; plot.render();});
  const sl=slider(ctl,'k',-2,2,.25,k,v=>{k=v;plot.render();}); sl.el.style.display='none';
  plot.render(); return ()=>plot.destroy();
};

/* 2 線形結合と張る空間 */
VIZ.linComb=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'線形結合 s v + t w',h:310,legend:[['ci','v'],['cj','w'],['ck','s v + t w と届く範囲']]});
  const v={x:2,y:.5,color:'--c-i'}, w={x:-.5,y:1.5,color:'--c-j'}; let s=1.5,t=1;
  plot.handles=[v,w];
  plot.draw=p=>{
    const M=[v.x,w.x,v.y,w.y], dep=Math.abs(det2(M))<1e-6;
    p.grid(null,p.css('--grid'),1,1);
    if(dep){ const d=(v.x||v.y)?[v.x,v.y]:[w.x,w.y]; if(d[0]||d[1]) p.inf([0,0],d,p.css('--c-k'),6); }
    else p.grid(M,p.css('--c-k'),.3,1,14);
    const sv=[s*v.x,s*v.y], r=[sv[0]+t*w.x,sv[1]+t*w.y];
    p.line([0,0],sv,p.css('--c-i'),2,[6,5]); p.line(sv,r,p.css('--c-j'),2,[6,5]);
    p.arrow([0,0],[v.x,v.y],p.css('--c-i'),3,'v'); p.arrow([0,0],[w.x,w.y],p.css('--c-j'),3,'w');
    p.dot(r,p.css('--bg'),10); p.dot(r,p.css('--c-k'),7); p.text(r,'sv+tw',p.css('--c-k'),[0,-20]);
    read.innerHTML=`<span>${fmt(s)}<b class="ci">v</b> + ${fmt(t)}<b class="cj">w</b> = <b class="ck">${V(r)}</b></span>`;
    msg.innerHTML=dep?'<b>線形従属です。</b> v と w が同じ直線上にあり、s と t をどう変えても青い直線の上にしか届きません。':'<b>線形独立です。</b> 青い網目が v と w の作る方眼です。s と t を選べば平面のどの点にも届きます。';
  };
  slider(ctl,'s',-2,2,.25,s,x=>{s=x;plot.render();}); slider(ctl,'t',-2,2,.25,t,x=>{t=x;plot.render();});
  btn(ctl,'w を v に重ねる',()=>moveTo(plot,[w],[[-v.x*.75,-v.y*.75]]));
  btn(ctl,'はじめに戻す',()=>moveTo(plot,[v,w],[[2,.5],[-.5,1.5]]));
  plot.render(); return ()=>plot.destroy();
};

/* 3 内積と正射影 */
VIZ.dotProj=root=>{
  const {plot,read,msg}=frame(root,{title:'内積と正射影',h:330,cy:.4,legend:[['ci','a'],['cj','b'],['ck','正射影'],['ca','面積 = 内積の大きさ']]});
  const a={x:1.5,y:2,color:'--c-i'}, b={x:2,y:.5,color:'--c-j'};
  plot.handles=[a,b];
  plot.draw=p=>{
    p.base(); const A=[a.x,a.y],B=[b.x,b.y], bb=B[0]*B[0]+B[1]*B[1], d=A[0]*B[0]+A[1]*B[1];
    if(bb<1e-9){ p.arrow([0,0],A,p.css('--c-i'),3,'a'); read.textContent='b が零ベクトルです'; msg.textContent='b を原点から離してください。零ベクトルへの正射影は定義しません。'; return; }
    const c=d/bb, P=[c*B[0],c*B[1]], n=Math.sqrt(bb), u=[B[0]/n,B[1]/n];
    /* 面積が |a·b| の長方形: 横は影の長さ、縦は ‖b‖。a と反対側に描く */
    const side=(A[0]*-u[1]+A[1]*u[0])>=0?-1:1, q=[-u[1]*n*side,u[0]*n*side];
    if(Math.abs(d)>1e-9) p.poly([[0,0],P,[P[0]+q[0],P[1]+q[1]],q],p.css('--c-area'),p.css('--c-area'),1.5,.3);
    p.inf([0,0],B,p.css('--grid2'),1.2,[4,5]);
    p.line(A,P,p.css('--ink3'),1.5,[5,4]);
    p.arrow([0,0],B,p.css('--c-j'),3,'b'); p.arrow([0,0],P,p.css('--c-k'),5); p.arrow([0,0],A,p.css('--c-i'),3,'a');
    if(Math.abs(d)>1e-9) p.text([(P[0]+q[0])/2,(P[1]+q[1])/2],(d<0?'負 ':'')+'面積 '+fmt(Math.abs(d)),p.css('--c-area'),[0,0]);
    const an=Math.hypot(...A), th=an>1e-9?Math.acos(Math.max(-1,Math.min(1,d/(an*n))))*180/Math.PI:0, r=an>1e-9?Math.abs(d)/(an*n):0;
    read.innerHTML=`<span><b class="ci">a</b>·<b class="cj">b</b> = <b>${fmt(d)}</b></span><span>角 ${fmt(th)}°</span><span><b class="ck">正射影</b> = ${fmt(c)} b</span>
      <span class="cs">|a·b| = ${fmt(Math.abs(d))}<span class="cs-bar"><i style="width:${r*100}%"></i></span>‖a‖‖b‖ = ${fmt(an*n)}</span>`;
    msg.innerHTML=Math.abs(d)<1e-9?'<b>内積が 0 です。</b> a と b は直交していて、正射影は零ベクトル、長方形はなくなります。':d>0?'黄色い長方形は横が影の長さ、縦が b の長さです。面積が内積の値になります。下の帯は |a·b| が ‖a‖‖b‖ を超えないことを表しています。':'<b>内積が負です。</b> 影が b と逆向きに落ちています。なす角は 90°より大きくなっています。';
  };
  plot.render(); return ()=>plot.destroy();
};

/* 3 外積 (立体) */
VIZ.cross3=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'外積は両方に直交する',hint:'なぞると回ります。丸い点も動かせます',three:true,h:330,opt:{scale:56,cy:.64},legend:[['ci','a'],['cj','b'],['ck','a×b (長さは半分で表示)'],['ca','平行四辺形']]});
  const a={x:1.5,y:0,z:0,color:'--c-i',lim:2,name:'a'}, b={x:.5,y:1.5,z:0,color:'--c-j',lim:2,name:'b'}; plot.handles=[a,b]; let ghost=null;
  const cr=(A,B)=>[A[1]*B[2]-A[2]*B[1],A[2]*B[0]-A[0]*B[2],A[0]*B[1]-A[1]*B[0]];
  plot.draw=p=>{
    p.floor(2.5); const A=[a.x,a.y,a.z], B=[b.x,b.y,b.z], C=cr(A,B), len=Math.hypot(...C);
    if(b.z>0) p.line(B,[b.x,b.y,0],p.css('--ink3'),1.2,[4,4]);
    if(a.z>0) p.line(A,[a.x,a.y,0],p.css('--ink3'),1.2,[4,4]);
    p.poly([[0,0,0],A,[A[0]+B[0],A[1]+B[1],A[2]+B[2]],B],p.css('--c-area'),.35,p.css('--c-area'));
    if(ghost) p.line([0,0,0],ghost.map(x=>x/2),p.css('--ink3'),2,[5,4]);
    p.arrow([0,0,0],A,p.css('--c-i'),3,'a'); p.arrow([0,0,0],B,p.css('--c-j'),3,'b'); p.arrow([0,0,0],C.map(x=>x/2),p.css('--c-k'),4,'a×b');
    read.innerHTML=`<span><b class="ck">a×b</b> = ${V(C)}</span><span>‖a×b‖ = <b class="ca">${fmt(len)}</b> = 平行四辺形の面積</span>`;
    msg.innerHTML=len<1e-9?'<b>a と b が同じ直線上にあります。</b> 平行四辺形がつぶれ、外積は零ベクトルです。':ghost?'入れ替える前の a×b を灰色の破線で残しています。長さは同じで、向きが反対になりました。':'青い矢印は a と b の両方に直角です。右手の親指を a、人差し指を b に向けると、中指の向きが a×b です。';
  };
  const sa=slider(ctl,'a の高さ',0,2,.25,0,v=>{a.z=v;ghost=null;plot.render();});
  const sb=slider(ctl,'b の高さ',0,2,.25,0,v=>{b.z=v;ghost=null;plot.render();});
  btn(ctl,'a と b を入れ替える',()=>{ ghost=cr([a.x,a.y,a.z],[b.x,b.y,b.z]); for(const k of ['x','y','z']){ const t=a[k]; a[k]=b[k]; b[k]=t; } sa.set(a.z); sb.set(b.z); plot.render(); plot.onSettle(); });
  plot.onSettle2=()=>{ghost=null;};
  plot.render(); return ()=>plot.destroy();
};

/* 4 線形性 */
VIZ.linear=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'足してから移す、移してから足す',h:320,legend:[['cm','u, v, u+v'],['ci','f(u)'],['cj','f(v)'],['ck','f(u+v)']]});
  const u={x:1.5,y:.25,color:'--c-m'}, v={x:.25,y:1.25,color:'--c-m'}; plot.handles=[u,v]; let mode=0;
  const A=[1,-.75,.5,1], T=[1,.75];
  const f=x=>mode===0?mul(A,x):[x[0]+T[0],x[1]+T[1]];
  plot.draw=p=>{
    p.base(); const U=[u.x,u.y], W=[v.x,v.y], S=[U[0]+W[0],U[1]+W[1]], fu=f(U), fv=f(W), fs=f(S), sum=[fu[0]+fv[0],fu[1]+fv[1]];
    p.line(U,S,p.css('--c-m'),1.2,[4,4]); p.line(W,S,p.css('--c-m'),1.2,[4,4]);
    p.arrow([0,0],U,p.css('--c-m'),2,'u'); p.arrow([0,0],W,p.css('--c-m'),2,'v'); p.dot(S,p.css('--c-m'),4);
    p.arrow([0,0],fu,p.css('--c-i'),3); p.arrow([0,0],fv,p.css('--c-j'),3);
    p.line(fu,sum,p.css('--c-j'),2,[6,5]); p.line(fv,sum,p.css('--c-i'),2,[6,5]);
    p.arrow([0,0],fs,p.css('--c-k'),3.5,'f(u+v)');
    const c=p.ctx; c.beginPath(); c.arc(p.X(sum[0]),p.Y(sum[1]),9,0,7); c.lineWidth=2.5; c.strokeStyle=p.css('--ink'); c.stroke();
    const ok=Math.hypot(fs[0]-sum[0],fs[1]-sum[1])<1e-9;
    if(!ok) p.text(sum,'f(u)+f(v)',p.css('--ink'),[0,-20]);
    read.innerHTML=`<span><b class="ck">f(u+v)</b> = ${V(fs)}</span><span>f(u)+f(v) = ${V(sum)}</span>`;
    msg.innerHTML=ok?'<b>一致します。</b> 丸い輪が f(u)+f(v) の位置で、青い矢印の先と重なっています。u と v をどこへ動かしても重なったままです。':'<b>一致しません。</b> 平行移動 f(x) = x + (1, 0.75) では、移してから足すとずれが 2 回ぶん入ります。輪と青い矢印の先が離れています。';
  };
  seg(ctl,['線形変換','平行移動'],i=>{mode=i;plot.render();});
  plot.render(); return ()=>plot.destroy();
};

/* 4 行列は変形 */
VIZ.transform=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'行列が方眼を変形する',h:330,legend:[['ci','e₁ の行き先'],['cj','e₂ の行き先'],['cm','x'],['ck','Ax']]});
  const e1={x:1.5,y:.5,color:'--c-i'}, e2={x:-.5,y:1,color:'--c-j'}, x={x:2,y:1,color:'--c-m'};
  plot.handles=[e1,e2,x];
  plot.draw=p=>{
    const M=getM(e1,e2), X=[x.x,x.y];
    p.grid(null,p.css('--grid'),1,1); p.grid(M,p.css('--ink3'),.55,1); p.line(mul(M,[-12,0]),mul(M,[12,0]),p.css('--ink2'),1.6); p.line(mul(M,[0,-12]),mul(M,[0,12]),p.css('--ink2'),1.6);
    const a=[X[0]*e1.x,X[0]*e1.y], r=mul(M,X);
    p.line([0,0],a,p.css('--c-i'),2,[6,5]); p.line(a,r,p.css('--c-j'),2,[6,5]);
    p.arrow([0,0],X,p.css('--c-m'),2,'x'); p.arrow([0,0],r,p.css('--c-k'),3.5,'Ax');
    p.arrow([0,0],[e1.x,e1.y],p.css('--c-i'),3.5); p.arrow([0,0],[e2.x,e2.y],p.css('--c-j'),3.5);
    read.innerHTML=`<span>${tx('A='+matTex(M,p.css('--c-i'),p.css('--c-j')))}</span><span class="cm">${tx('\\boldsymbol{x}='+colTex(X))}</span><span class="ck">${tx('A\\boldsymbol{x}='+colTex(r))}</span><span>det A = ${fmt(det2(M))}</span>`;
    msg.innerHTML=`青い Ax は、赤い矢印を ${fmt(X[0])} 回、緑の矢印を ${fmt(X[1])} 回たどった先にあります。行列の 1 列目が赤、2 列目が緑の矢印です。`;
  };
  const P=[['回転 90°',[0,-1,1,0]],['拡大',[2,0,0,1.5]],['せん断',[1,1,0,1]],['鏡映',[-1,0,0,1]],['つぶす',[1,2,.5,1]],['何もしない',[1,0,0,1]]];
  const sg=seg(ctl,P.map(x=>x[0]),i=>moveM(plot,e1,e2,P[i][1]),-1);
  btn(ctl,'単位行列から再生',()=>{ const T=getM(e1,e2); plot.play(900,t=>setM(e1,e2,tween([1,0,0,1],T,t)),()=>{setM(e1,e2,T);plot.render();}); },true);
  plot.onDrag=()=>sg.clear();
  plot.render(); return ()=>plot.destroy();
};

/* 5 積は合成。戻す順番も確かめる */
VIZ.compose=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'順番を変えると結果が変わる',hint:'ボタンで動かします',h:310,range:4.2,legend:[['ck','変形した図形'],['ci','e₁ の行き先'],['cj','e₂ の行き先']]});
  const A=[0,-1,1,0], B=[1,1,0,1], I=[1,0,0,1];
  let order=0, M=I, stage=0, ghost=null, undo='';
  const first=()=>order===0?B:A, second=()=>order===0?A:B, both=()=>mm(second(),first());
  plot.draw=p=>{
    p.base(); p.poly(FSHAPE,null,p.css('--ink3'),1.2);
    if(ghost) p.poly(FSHAPE.map(q=>mul(ghost,q)),p.css('--ink3'),p.css('--ink3'),1,.12);
    const other=order===0?mm(B,A):mm(A,B);
    if(stage===2){ const o=FSHAPE.map(q=>mul(other,q)); p.curve(o.concat([o[0]]),p.css('--ink2'),1.5,[5,4]);
      const top=o.reduce((m,q)=>q[1]>m[1]?q:m,o[0]); p.text(top,(order===0?'BA':'AB')+' の結果',p.css('--ink2'),[0,-14]); }
    p.poly(FSHAPE.map(q=>mul(M,q)),p.css('--c-k'),p.css('--c-k'),2,.25);
    p.arrow([0,0],mul(M,[1,0]),p.css('--c-i'),3); p.arrow([0,0],mul(M,[0,1]),p.css('--c-j'),3);
    read.innerHTML=`<span>${TeX(R`A=\M{0&-1\\1&0}`)} 回転</span><span>${TeX(R`B=\M{1&1\\0&1}`)} せん断</span><span>${TeX(R`AB=\M{0&-1\\1&1}`)}</span><span>${TeX(R`BA=\M{1&-1\\1&0}`)}</span>`;
  };
  const nm=()=>order===0?['B (せん断)','A (回転)','AB']:['A (回転)','B (せん断)','BA'];
  const say=()=>{ const n=nm(); msg.innerHTML=undo||(stage===0?'「再生」を押すと 2 つの変形を続けて行います。':stage===1?`まず ${n[0]} を行っています。`:stage===2?`<b>${n[2]}</b> は「${n[0]} のあとに ${n[1]}」です。薄い灰色は 1 つ目の変形だけを行った形、破線は順番を逆にした結果です。青い形と破線は重なりません。`:'戻しています。'); b1.disabled=b2.disabled=stage!==2; };
  const run=()=>{ undo=''; stage=1; ghost=null; M=I; say();
    plot.play(800,t=>{M=tween(I,first(),t);},()=>setTimeout(()=>{ if(plot.dead) return; ghost=first(); plot.play(800,t=>{M=tween(first(),both(),t);},()=>{stage=2;say();plot.render();}); },300)); };
  const back=good=>{ if(stage!==2) return; const s1=good?inv2(second()):inv2(first()), s2=good?inv2(first()):inv2(second()), m0=both(), m1=mm(s1,m0), m2=mm(s2,m1); ghost=null; stage=3; say();
    plot.play(800,t=>{M=tween(m0,m1,t);},()=>setTimeout(()=>{ if(plot.dead) return; plot.play(800,t=>{M=tween(m1,m2,t);},()=>{ const n=nm();
      undo=good?`<b>元に戻りました。</b> あとから行った ${n[1]} を先に戻しました。(${n[2]})⁻¹ は「${n[1]} の逆」を先に、「${n[0]} の逆」をあとに行います。`:`<b>元に戻りません。</b> 先に行った ${n[0]} から戻そうとしたためです。戻すときは順番を逆にします。`; say(); plot.render(); }); },300)); };
  seg(ctl,['AB: B のあとに A','BA: A のあとに B'],i=>{order=i;run();});
  btn(ctl,'再生',run,true);
  const b1=btn(ctl,'あとの変形から戻す',()=>back(true)), b2=btn(ctl,'先の変形から戻す',()=>back(false));
  say(); plot.render(); return ()=>plot.destroy();
};

/* 5 逆行列 */
VIZ.inverse=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'逆行列は元に戻す変形',h:320,legend:[['ci','A の 1 列目'],['cj','A の 2 列目'],['ck','変形した図形']]});
  const e1={x:1.5,y:.5,color:'--c-i'}, e2={x:-.5,y:1.25,color:'--c-j'}; plot.handles=[e1,e2]; let t=1; const I=[1,0,0,1];
  const pts=[]; for(let x=-2;x<=2;x++) for(let y=-2;y<=2;y++) pts.push([x*.75,y*.75]);
  plot.draw=p=>{
    const A=getM(e1,e2), d=det2(A), M=tween(I,A,t), ok=Math.abs(d)>1e-9;
    p.grid(null,p.css('--grid'),1,1); p.grid(M,p.css('--ink3'),.5,1); p.poly(FSHAPE,null,p.css('--ink3'),1.2);
    p.poly(FSHAPE.map(q=>mul(M,q)),p.css('--c-k'),p.css('--c-k'),2,.25);
    pts.forEach(q=>p.dot(mul(M,q),p.css('--c-m'),3));
    p.arrow([0,0],mul(M,[1,0]),p.css('--c-i'),3.5); p.arrow([0,0],mul(M,[0,1]),p.css('--c-j'),3.5);
    read.innerHTML=`<span>${tx('A='+matTex(A,p.css('--c-i'),p.css('--c-j')))}</span><span>ad − bc = <b>${fmt(d)}</b></span><span>${ok?tx('A^{-1}=\\dfrac{1}{'+fmt(d)+'}'+matTex([A[3],-A[1],-A[2],A[0]])):'逆行列はありません'}</span>`;
    b2.disabled=!ok;
    msg.innerHTML=!ok?'<b>ad − bc が 0 です。</b> 平面が直線につぶれ、紫の点がいくつも同じ場所に重なりました。重なった点は区別できないので、元に戻す変形は作れません。':t>.99?'A を掛けた状態です。「元に戻す」を押すと A⁻¹ が掛かって、図形が灰色の元の位置に戻ります。赤と緑を同じ直線に並べると戻せなくなります。':t<.01?'元の状態です。「A を掛ける」を押してください。':'';
  };
  btn(ctl,'A を掛ける',()=>{ const f=t; plot.play(800,x=>{t=f+(1-f)*x;}); },true);
  const b2=btn(ctl,'元に戻す (A⁻¹ を掛ける)',()=>{ const f=t; plot.play(800,x=>{t=f*(1-x);}); });
  btn(ctl,'列を同じ直線に並べる',()=>{ t=1; moveM(plot,e1,e2,[1.5,.75,.5,.25]); });
  btn(ctl,'はじめに戻す',()=>{ t=1; moveM(plot,e1,e2,[1.5,-.5,.5,1.25]); });
  plot.render(); return ()=>plot.destroy();
};

/* 5 転置 */
VIZ.transpose=root=>{
  const sets=[[[1,2,3],[4,5,6]],[[2,7,1],[7,3,5],[1,5,4]]]; let k=0, T=false;
  root.innerHTML=`<div class="viz-cap"><b>転置は行と列を入れ替える</b><span class="hint">ボタンで動かします</span></div><div class="tp-wrap"><div class="tp"></div></div><div class="viz-msg" aria-live="polite"></div><div class="viz-ctl"></div>`;
  const box=root.querySelector('.tp'), msg=root.querySelector('.viz-msg'), ctl=root.querySelector('.viz-ctl');
  const lay=()=>{ const m=sets[k], r=m.length, c=m[0].length, R_=T?c:r, C_=T?r:c; box.style.width=C_*52+'px'; box.style.height=R_*46+'px';
    box.querySelectorAll('span').forEach(s=>{ const i=+s.dataset.i, j=+s.dataset.j, y=T?j:i, x=T?i:j; s.style.transform=`translate(${x*52}px,${y*46}px)`; });
    msg.innerHTML=k===0?(T?'<b>3×2 行列になりました。</b> 1 行目の 1, 2, 3 が 1 列目に移っています。(i, j) 成分は (j, i) 成分になります。':'2×3 行列です。色は行ごとに分けてあります。'):(T?'<b>対称行列は転置しても変わりません。</b> 対角をはさんで向かい合う成分が同じ数だからです。':'対称行列です。対角 (左上から右下) をはさんで向かい合う成分が等しくなっています。'); };
  const build=()=>{ const m=sets[k]; box.innerHTML=m.map((r,i)=>r.map((v,j)=>`<span data-i="${i}" data-j="${j}" class="${['ci','cj','cm'][i]}${i===j?' dg':''}">${v}</span>`).join('')).join(''); T=false; lay(); };
  seg(ctl,['2×3 行列','対称行列'],i=>{k=i;build();});
  btn(ctl,'転置する',()=>{T=!T;lay();},true);
  build(); return ()=>{};
};

/* 6 連立方程式の図 */
VIZ.linsys=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'2 本の式は 2 本の直線',h:310,range:4.5,legend:[['ci','1 本目の式'],['cj','2 本目の式'],['ck','解']]});
  const P=[{x:-2,y:-1,color:'--c-i',snap:1},{x:2,y:3,color:'--c-i',snap:1},{x:0,y:3,color:'--c-j',snap:1},{x:3,y:0,color:'--c-j',snap:1}];
  P.forEach((h,i)=>h.lock=(x,y)=>{ const o=P[i^1]; return (Math.abs(x-o.x)<1e-9&&Math.abs(y-o.y)<1e-9)?null:[x,y]; });
  plot.handles=P;
  const g=(a,b)=>b?g(b,a%b):Math.abs(a);
  const eq=(p,q)=>{ let a=q.y-p.y, b=p.x-q.x, c=a*p.x+b*p.y; const R4=x=>Math.round(x*4), k=g(g(R4(a),R4(b)),R4(c))/4||1; a/=k;b/=k;c/=k; if(a<0||(a===0&&b<0)){a=-a;b=-b;c=-c;} return [a,b,c]; };
  const term=(k,v,first)=>{ if(!k) return ''; const s=k<0?'-':(first?'':'+'), m=Math.abs(k)===1?'':fmt(Math.abs(k)); return s+m+v; };
  const str=e=>term(e[0],'x',true)+term(e[1],'y',!e[0])+'='+fmt(e[2]);
  plot.draw=p=>{
    p.base(); const E1=eq(P[0],P[1]), E2=eq(P[2],P[3]);
    p.inf([P[0].x,P[0].y],[P[1].x-P[0].x,P[1].y-P[0].y],p.css('--c-i'),2.5); p.inf([P[2].x,P[2].y],[P[3].x-P[2].x,P[3].y-P[2].y],p.css('--c-j'),2.5);
    const D=E1[0]*E2[1]-E1[1]*E2[0]; let m, rA, rAb;
    if(Math.abs(D)>1e-9){ const x=(E1[2]*E2[1]-E1[1]*E2[2])/D, y=(E1[0]*E2[2]-E1[2]*E2[0])/D; p.dot([x,y],p.css('--bg'),10); p.dot([x,y],p.css('--c-k'),6.5); p.text([x,y],V([x,y]),p.css('--c-k'),[0,-22]);
      rA=2;rAb=2; m=`<b>解はただ 1 つです。</b> 交点 ${V([x,y])} が両方の式を満たします。`; }
    else if(Math.abs(E1[0]*E2[2]-E1[2]*E2[0])<1e-9&&Math.abs(E1[1]*E2[2]-E1[2]*E2[1])<1e-9){ rA=1;rAb=1; m='<b>解は無数にあります。</b> 2 本が重なり、直線上のすべての点が解です。式は実質 1 本しかありません。'; }
    else{ rA=1;rAb=2; m='<b>解はありません。</b> 2 本が平行で交わりません。左辺は同じ形なのに右辺が合っていません。'; }
    read.innerHTML=`<span class="ci">${tx(str(E1))}</span><span class="cj">${tx(str(E2))}</span><span>rank A = ${rA}</span><span>rank (A|b) = ${rAb}</span>`;
    msg.innerHTML=m;
  };
  const T=[[[-2,-1],[2,3],[0,3],[3,0]],[[-2,-1],[2,3],[-1,2],[1,4]],[[-2,-1],[2,3],[-1,0],[1,2]]];
  const sg=seg(ctl,['交わる','平行','重なる'],i=>moveTo(plot,P,T[i]));
  plot.onDrag=()=>sg.clear();
  plot.render(); return ()=>plot.destroy();
};

/* 原点を通り法線 n の平面を、1 辺 2L の立方体で切った多角形 */
function planeCube(n,L){
  const pts=[]; const add=q=>{ if(!pts.some(r=>Math.hypot(r[0]-q[0],r[1]-q[1],r[2]-q[2])<1e-6)) pts.push(q); };
  for(let k=0;k<3;k++){ const a=(k+1)%3, b=(k+2)%3; if(Math.abs(n[k])<1e-9) continue;
    for(const sa of [-L,L]) for(const sb of [-L,L]){ const t=-(n[a]*sa+n[b]*sb)/n[k]; if(Math.abs(t)<=L+1e-9){ const q=[0,0,0]; q[k]=t; q[a]=sa; q[b]=sb; add(q); } } }
  if(pts.length<3) return null;
  const nn=Math.hypot(...n), w=n.map(x=>x/nn), h=Math.abs(w[0])<.9?[1,0,0]:[0,1,0];
  const u=[w[1]*h[2]-w[2]*h[1],w[2]*h[0]-w[0]*h[2],w[0]*h[1]-w[1]*h[0]], v=[w[1]*u[2]-w[2]*u[1],w[2]*u[0]-w[0]*u[2],w[0]*u[1]-w[1]*u[0]];
  const ang=q=>Math.atan2(q[0]*v[0]+q[1]*v[1]+q[2]*v[2],q[0]*u[0]+q[1]*u[1]+q[2]*u[2]);
  return pts.sort((p,q)=>ang(p)-ang(q));
}
function cubeWire(p,L){ const g=p.css('--grid2'); for(let k=0;k<3;k++){ const a=(k+1)%3,b=(k+2)%3; for(const sa of [-L,L]) for(const sb of [-L,L]){ const s=[0,0,0],e=[0,0,0]; s[k]=-L;e[k]=L;s[a]=e[a]=sa;s[b]=e[b]=sb; p.line(s,e,g,1); } } }

/* 6 掃き出し法を一手ずつ。式 1 本が平面 1 枚 */
VIZ.elim=root=>{
  const S=[
    [[[1,1,1,6],[2,3,1,11],[1,2,4,17]],-1,'はじめ','拡大係数行列を作りました。3 枚の平面は 1 点 (1, 2, 3) で交わっています。左下の 3 か所を 0 にしていきます。'],
    [[[1,1,1,6],[0,1,-1,-1],[1,2,4,17]],1,'R₂ ← R₂ − 2R₁','2 行目から 1 行目の 2 倍を引きます。緑の平面が向きを変えましたが、交点は同じ場所です。'],
    [[[1,1,1,6],[0,1,-1,-1],[0,1,3,11]],2,'R₃ ← R₃ − R₁','3 行目から 1 行目を引きます。1 列目のピボットより下が 0 になりました。'],
    [[[1,1,1,6],[0,1,-1,-1],[0,0,4,12]],2,'R₃ ← R₃ − R₂','3 行目から 2 行目を引きます。階段行列になりました。0 でない行が 3 つなのでランクは 3 です。'],
    [[[1,1,1,6],[0,1,-1,-1],[0,0,1,3]],2,'R₃ ← R₃ ÷ 4','3 行目を 4 で割ります。紫の平面は z = 3 の水平な面です。'],
    [[[1,1,1,6],[0,1,0,2],[0,0,1,3]],1,'R₂ ← R₂ + R₃','2 行目に 3 行目を足します。緑の平面は y = 2 になりました。'],
    [[[1,1,0,3],[0,1,0,2],[0,0,1,3]],0,'R₁ ← R₁ − R₃','1 行目から 3 行目を引きます。'],
    [[[1,0,0,1],[0,1,0,2],[0,0,1,3]],0,'R₁ ← R₁ − R₂','1 行目から 2 行目を引きます。簡約階段行列になり、3 枚は x = 1、y = 2、z = 3 の面です。解が右端に並びました。'],
  ];
  root.innerHTML=`<div class="viz-cap"><b>掃き出し法を一手ずつ</b><span class="hint">図はなぞると回ります</span></div>
  <div class="viz-leg"><span class="ci"><i></i>1 行目の式</span><span class="cj"><i></i>2 行目の式</span><span class="cm"><i></i>3 行目の式</span><span class="ck"><i></i>解</span></div>
  <canvas tabindex="0" role="img" aria-label="3 枚の平面が 1 点で交わる図。左右の矢印キーで回せます。"></canvas>
  <div class="steps-op2"></div><div class="steps"></div><div class="steps-op" aria-live="polite"></div><div class="dots">${S.map(()=>'<i></i>').join('')}</div>
  <div class="viz-ctl"><button type="button" class="mini" data-d="-1">戻る</button><button type="button" class="mini solid" data-d="1">次の操作</button><button type="button" class="mini" data-d="0">最初から</button></div>`;
  const q=s=>root.querySelector(s), st=q('.steps'), op=q('.steps-op'), op2=q('.steps-op2'), dots=[...root.querySelectorAll('.dots i')], bs=root.querySelectorAll('button'); let i=0;
  const plot=new Plot3(q('canvas'),{h:260,scale:44,cy:.52,yaw:.6,pitch:.38});
  let N=S[0][0].map(r=>r.slice(0,3)), from=N, to=N;
  plot.draw=p=>{ const L=2.2; cubeWire(p,L); const cols=['--c-i','--c-j','--c-m'];
    N.map((n,k)=>({pg:planeCube(n,L),k})).filter(o=>o.pg).sort((a,b)=>p.depth(b.pg)-p.depth(a.pg)).forEach(o=>p.poly(o.pg,p.css(cols[o.k]),.3,p.css(cols[o.k]),1.5));
    const ax=[[[2.4,0,0],'x'],[[0,2.4,0],'y'],[[0,0,2.4],'z']]; ax.forEach(([v,l])=>{ p.line(v.map(x=>-x),v,p.css('--ink3'),1.2); const e=p.P(v); p.label(e[0],e[1],l,p.css('--ink3')); });
    p.dot([0,0,0],p.css('--bg'),8); p.dot([0,0,0],p.css('--c-k'),5.5); const o=p.P([0,0,0]); p.label(o[0]+28,o[1]-14,'(1, 2, 3)',p.css('--c-k')); };
  const PV=[[0,0],[0,0],[0,0],[1,1],[2,2],[2,2],[2,2],[1,1]];
  const show=anim=>{ const [m,hl,name,text]=S[i], col=hl>=0?plot.css(['--c-i','--c-j','--c-m'][hl]):'', pv=PV[i];
    const rows=m.map((r,ri)=>r.map((v,j)=>{ let s=String(v); if(ri===pv[0]&&j===pv[1]) s='\\boxed{'+s+'}'; return ri===hl?`\\textcolor{${col}}{${s}}`:s; }).join('&')).join('\\\\');
    st.innerHTML=TeX(`\\left(\\begin{array}{ccc|c}${rows}\\end{array}\\right)`,true); st.firstElementChild.classList.add('swap');
    op2.textContent=`${i} / ${S.length-1} 手　${name}`; op.textContent=text+(i===0?' 四角で囲んだ数が、次の操作で使うピボットです。':''); dots.forEach((d,k)=>d.classList.toggle('on',k===i));
    bs[0].disabled=i===0; bs[1].disabled=i===S.length-1;
    from=N; to=m.map(r=>r.slice(0,3)); if(anim) plot.play(700,t=>{ N=from.map((r,a)=>r.map((v,b)=>v+(to[a][b]-v)*t)); }); else { N=to; plot.render(); } };
  bs.forEach(b=>b.onclick=()=>{ const d=+b.dataset.d; i=d===0?0:Math.max(0,Math.min(S.length-1,i+d)); show(true); });
  show(false); return ()=>plot.destroy();
};

/* 7 行列式 (平面) */
VIZ.det=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'行列式は面積の倍率',h:310,range:3.6,legend:[['ci','e₁ の行き先'],['cj','e₂ の行き先'],['ca','正方形と円の行き先']]});
  const e1={x:2,y:.5,color:'--c-i'}, e2={x:.5,y:1.5,color:'--c-j'}; plot.handles=[e1,e2];
  const circ=CIRC(48).map(q=>[q[0]*.45-1.1,q[1]*.45+.9]);
  plot.draw=p=>{
    p.base(); const a=[e1.x,e1.y], b=[e2.x,e2.y], M=getM(e1,e2), d=det2(M);
    p.grid(M,p.css('--ink3'),.35,1);
    p.poly([[0,0],[1,0],[1,1],[0,1]],null,p.css('--ink3'),1.3); p.curve(circ,p.css('--ink3'),1.3);
    p.poly(circ.map(q=>mul(M,q)),p.css('--c-area'),p.css('--c-area'),1.5,.3);
    p.poly([[0,0],a,[a[0]+b[0],a[1]+b[1]],b],p.css('--c-area'),p.css('--c-area'),2,.32);
    if(d<0){ p.curve([[0,0],[a[0]+b[0],a[1]+b[1]]],p.css('--c-area'),1.2,[4,4]); p.curve([a,b],p.css('--c-area'),1.2,[4,4]); }
    p.arrow([0,0],a,p.css('--c-i'),3.5); p.arrow([0,0],b,p.css('--c-j'),3.5);
    p.text([(a[0]+b[0])/2,(a[1]+b[1])/2],(d<0?'裏返し 面積 ':'面積 ')+fmt(Math.abs(d)),p.css('--c-area'),[0,0]);
    read.innerHTML=`<span>${tx('\\det'+matTex(M,p.css('--c-i'),p.css('--c-j')))}</span><span>= ${fmt(a[0])}×${fmt(b[1])} − ${fmt(b[0])}×${fmt(a[1])} = <b>${fmt(d)}</b></span>`;
    msg.innerHTML=Math.abs(d)<1e-9?'<b>行列式が 0 です。</b> 平行四辺形がつぶれて面積がなくなりました。この変形は元に戻せないので逆行列がありません。':d<0?'<b>行列式が負です。</b> 赤と緑の位置関係が入れ替わり、平面が裏返っています。面積の倍率は絶対値で読みます。':`灰色の正方形 (面積 1) が黄色の平行四辺形に移ります。左上の円も面積が ${fmt(Math.abs(d))} 倍になっています。どの図形も同じ倍率です。`;
  };
  btn(ctl,'つぶす',()=>moveM(plot,e1,e2,[2,1,1,.5]));
  btn(ctl,'裏返す',()=>moveTo(plot,[e1,e2],[[.5,1.5],[2,.5]]));
  btn(ctl,'はじめに戻す',()=>moveTo(plot,[e1,e2],[[2,.5],[.5,1.5]]));
  plot.render(); return ()=>plot.destroy();
};

/* 7 3 次の行列式は体積 */
VIZ.det3=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'3 次の行列式は体積の倍率',hint:'なぞると回ります。丸い点も動かせます',three:true,h:330,opt:{scale:60,cy:.68},legend:[['ci','e₁ の行き先'],['cj','e₂ の行き先'],['cm','e₃ の行き先'],['ca','立方体の行き先']]});
  const a={x:1.5,y:0,z:0,color:'--c-i',lim:2.5}, b={x:.25,y:1.5,z:0,color:'--c-j',lim:2.5}, c={x:.25,y:.25,z:1.5,color:'--c-m',lim:2.5}; plot.handles=[a,b,c];
  const add=(...v)=>v.reduce((s,x)=>[s[0]+x[0],s[1]+x[1],s[2]+x[2]],[0,0,0]);
  plot.draw=p=>{
    p.floor(2.5); const A=[a.x,a.y,a.z],B=[b.x,b.y,b.z],C=[c.x,c.y,c.z], O=[0,0,0];
    const d=A[0]*(B[1]*C[2]-B[2]*C[1])-B[0]*(A[1]*C[2]-A[2]*C[1])+C[0]*(A[1]*B[2]-A[2]*B[1]);
    const F=[[O,A,add(A,B),B],[O,A,add(A,C),C],[O,B,add(B,C),C],[C,add(A,C),add(A,B,C),add(B,C)],[B,add(A,B),add(A,B,C),add(B,C)],[A,add(A,B),add(A,B,C),add(A,C)]];
    F.sort((x,y)=>p.depth(y)-p.depth(x)).forEach(f=>p.poly(f,p.css('--c-area'),.2,p.css('--c-area'),1.3));
    if(c.z>0) p.line(C,[c.x,c.y,0],p.css('--ink3'),1.2,[4,4]);
    p.arrow(O,A,p.css('--c-i'),3.5); p.arrow(O,B,p.css('--c-j'),3.5); p.arrow(O,C,p.css('--c-m'),3.5);
    const row=i=>[A[i],B[i],C[i]].map(fmt).join('&');
    read.innerHTML=`<span>${tx('\\det\\begin{pmatrix}'+row(0)+'\\\\'+row(1)+'\\\\'+row(2)+'\\end{pmatrix}')} = <b>${fmt(d)}</b></span><span class="ca">体積 ${fmt(Math.abs(d))}</span>`;
    msg.innerHTML=Math.abs(d)<1e-9?'<b>行列式が 0 です。</b> 3 本の矢印が同じ平面に乗り、箱がつぶれて体積がなくなりました。':d<0?'<b>行列式が負です。</b> 3 本の矢印の並び方が鏡に映したように入れ替わっています。':'1 辺が 1 の立方体が、3 本の矢印を辺とする平行六面体に移ります。その体積が行列式です。';
  };
  const P=[['立方体',[1,0,0],[0,1,0],[0,0,1]],['伸ばす',[2,0,0],[0,1.5,0],[0,0,1]],['傾ける',[1.5,0,0],[.25,1.5,0],[.75,.5,1.5]],['つぶす',[1.5,0,0],[0,1.5,0],[1,1,0]],['裏返す',[0,1.5,0],[1.5,0,0],[0,0,1.5]]];
  seg(ctl,P.map(x=>x[0]),i=>{ const f=[a,b,c].map(h=>[h.x,h.y,h.z]); plot.play(700,t=>[a,b,c].forEach((h,k)=>{ h.x=f[k][0]+(P[i][k+1][0]-f[k][0])*t; h.y=f[k][1]+(P[i][k+1][1]-f[k][1])*t; h.z=f[k][2]+(P[i][k+1][2]-f[k][2])*t; }),()=>sl.set(c.z)); },-1);
  const sl=slider(ctl,'e₃ の行き先の高さ',0,2.5,.25,1.5,v=>{c.z=v;plot.render();});
  plot.render(); return ()=>plot.destroy();
};

/* 8 部分空間の 3 条件 */
VIZ.subspace=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'部分空間になる集合、ならない集合',h:320,legend:[['cm','u, v (集合の中で動かす)'],['ck','u+v と ku'],['ca','集合']]});
  const u={x:2,y:1,color:'--c-m'}, v={x:-1,y:-.5,color:'--c-m'}; plot.handles=[u,v]; let k=0, sc=-1;
  const proj=(x,y,d,o)=>{ const t=((x-o[0])*d[0]+(y-o[1])*d[1])/(d[0]*d[0]+d[1]*d[1]), r=Math.round(t*4)/4; return [o[0]+r*d[0],o[1]+r*d[1]]; };
  const SETS=[
    {n:'原点を通る直線',lock:(x,y)=>proj(x,y,[2,1],[0,0]),has:q=>Math.abs(q[0]-2*q[1])<1e-9,zero:true,init:[[2,1],[-1,-.5]],draw:p=>p.inf([0,0],[2,1],p.css('--c-area'),7)},
    {n:'原点を通らない直線',lock:(x,y)=>proj(x,y,[2,1],[0,1]),has:q=>Math.abs(q[0]-2*(q[1]-1))<1e-9,zero:false,init:[[2,2],[-1,.5]],draw:p=>p.inf([0,1],[2,1],p.css('--c-area'),7)},
    {n:'2 本の直線を合わせた集合',lock:(x,y)=>Math.abs(x)>=Math.abs(y)?[x,0]:[0,y],has:q=>Math.abs(q[0])<1e-9||Math.abs(q[1])<1e-9,zero:true,init:[[2,0],[0,1.5]],draw:p=>{p.inf([0,0],[1,0],p.css('--c-area'),7);p.inf([0,0],[0,1],p.css('--c-area'),7);}},
    {n:'右上の 4 分の 1',lock:(x,y)=>[Math.max(0,x),Math.max(0,y)],has:q=>q[0]>=-1e-9&&q[1]>=-1e-9,zero:true,init:[[2,.5],[.5,1.5]],draw:p=>p.poly([[0,0],[9,0],[9,9],[0,9]],p.css('--c-area'),null,1,.3)},
  ];
  u.lock=(x,y)=>SETS[k].lock(x,y); v.lock=(x,y)=>SETS[k].lock(x,y);
  plot.draw=p=>{
    p.base(); const S=SETS[k]; S.draw(p);
    const U=[u.x,u.y], W=[v.x,v.y], sum=[U[0]+W[0],U[1]+W[1]], ku=[sc*U[0],sc*U[1]], o1=S.has(sum), o2=S.has(ku);
    p.arrow([0,0],U,p.css('--c-m'),2.5,'u'); p.arrow([0,0],W,p.css('--c-m'),2.5,'v');
    p.arrow([0,0],sum,p.css('--c-k'),3,'u+v'); p.arrow([0,0],ku,p.css('--c-k'),3,fmt(sc)+'u');
    const mk=(ok,t)=>`<span class="${ok?'yes':'no'}">${ok?'○':'×'} ${t}</span>`;
    read.innerHTML=mk(S.zero,'0 を含む')+mk(o1,'u+v が中にある')+mk(o2,fmt(sc)+'u が中にある');
    msg.innerHTML=['<b>部分空間です。</b> u と v をどこへ動かしても、k をどう変えても、和とスカラー倍は直線の外に出ません。',
      '<b>部分空間ではありません。</b> 0 を含んでいません。和もスカラー倍も、ほとんどの場合に直線の外へ出ます。',
      o1?'u と v を別々の直線に置いてください。和が外に出ます。':'<b>部分空間ではありません。</b> スカラー倍では外に出ませんが、別々の直線から取った u と v の和が外に出ます。',
      o2?'k を負にしてください。スカラー倍が外に出ます。':'<b>部分空間ではありません。</b> 和では外に出ませんが、負の数を掛けると外に出ます。'][k];
  };
  seg(ctl,SETS.map(s=>s.n),i=>{ k=i; u.x=SETS[i].init[0][0]; u.y=SETS[i].init[0][1]; v.x=SETS[i].init[1][0]; v.y=SETS[i].init[1][1]; plot.render(); });
  slider(ctl,'k',-2,2,.5,sc,x=>{sc=x;plot.render();});
  plot.render(); return ()=>plot.destroy();
};

/* 8 基底と座標 */
VIZ.basis=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'同じ点を別の基底で測る',h:320,range:4.5,legend:[['ci','b₁'],['cj','b₂'],['cm','点 p'],['ck','基底 B の方眼']]});
  const b1={x:2,y:1,color:'--c-i'}, b2={x:-1,y:1,color:'--c-j'}, pt={x:3,y:3,color:'--c-m'}; plot.handles=[b1,b2,pt];
  plot.draw=p=>{
    const M=getM(b1,b2), d=det2(M); p.base();
    if(Math.abs(d)<1e-9){ p.arrow([0,0],[b1.x,b1.y],p.css('--c-i'),3,'b₁'); p.arrow([0,0],[b2.x,b2.y],p.css('--c-j'),3,'b₂');
      read.innerHTML=`<span>標準基底での座標 <b class="cm">${V([pt.x,pt.y])}</b></span><span>基底 B での座標 なし</span>`; msg.innerHTML='<b>基底になっていません。</b> b₁ と b₂ が線形従属で、平面を張れません。'; return; }
    p.grid(M,p.css('--c-k'),.4,1,14);
    const c=mul(inv2(M),[pt.x,pt.y]), s=[c[0]*b1.x,c[0]*b1.y];
    p.line([0,0],s,p.css('--c-i'),2.2,[6,5]); p.line(s,[pt.x,pt.y],p.css('--c-j'),2.2,[6,5]);
    p.arrow([0,0],[b1.x,b1.y],p.css('--c-i'),3.5,'b₁'); p.arrow([0,0],[b2.x,b2.y],p.css('--c-j'),3.5,'b₂'); p.text([pt.x,pt.y],'p',p.css('--c-m'),[16,-16]);
    read.innerHTML=`<span>標準基底での座標 <b class="cm">${V([pt.x,pt.y])}</b></span><span>基底 B での座標 <b class="ck">${V(c)}</b></span><span>${tx('P='+matTex(M,p.css('--c-i'),p.css('--c-j')))}</span><span>${tx('P^{-1}='+matTex(inv2(M)))}</span>`;
    msg.innerHTML=`p = <b class="ci">${fmt(c[0])} b₁</b> + <b class="cj">${fmt(c[1])} b₂</b> です。B での座標は P⁻¹ を p に掛けた値になっています。点 p は同じ場所にあるのに、測る方眼を変えると数が変わります。`;
  };
  btn(ctl,'標準基底にする',()=>moveM(plot,b1,b2,[1,0,0,1]));
  btn(ctl,'はじめに戻す',()=>moveTo(plot,[b1,b2,pt],[[2,1],[-1,1],[3,3]]));
  plot.render(); return ()=>plot.destroy();
};

/* 9 核と像。左が入力、右が出力 */
VIZ.kernel=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'つぶれる方向と残る方向',h:300,range:5.2,legend:[['ci','A の 1 列目'],['cj','A の 2 列目'],['cm','核と、核の上の点'],['ck','像']]});
  const O=2.6, c1={x:O+1,y:.5,color:'--c-i',name:'1 列目の先'}, c2={x:O+.5,y:1,color:'--c-j',name:'2 列目の先'}; let t=0;
  [c1,c2].forEach(h=>{ h.lock=(x,y)=>[Math.max(O-1.25,Math.min(O+1.25,x)),Math.max(-1.25,Math.min(1.25,y))]; });
  plot.handles=[c1,c2];
  const pts=[]; for(let x=-1;x<=1.001;x+=.5) for(let y=-1;y<=1.001;y+=.5) pts.push([x,y]);
  plot.draw=p=>{
    const A=[c1.x-O,c2.x-O,c1.y,c2.y], d=det2(A), n1=Math.hypot(A[0],A[2]), n2=Math.hypot(A[1],A[3]), rk=Math.abs(d)>1e-9?2:(n1>1e-9||n2>1e-9?1:0);
    const img=n1>1e-9?[A[0]/n1,A[2]/n1]:n2>1e-9?[A[1]/n2,A[3]/n2]:[1,0];
    const ker=rk===1?(n1>1e-9?[-(A[1]*img[0]+A[3]*img[1]),n1]:[1,0]):null, half=p.w/2;
    const onK=q=>{ const y=mul(A,q); return Math.hypot(y[0],y[1])<1e-9; };
    for(const side of [0,1]){ p.clip(side*half,(side+1)*half); const ox=side?O:-O;
      for(let k=-3;k<=3;k++){ p.line([ox+k,-9],[ox+k,9],p.css('--grid'),1); p.line([ox-9,k],[ox+9,k],p.css('--grid'),1); }
      p.line([ox-9,0],[ox+9,0],p.css('--grid2'),1.2); p.line([ox,-9],[ox,9],p.css('--grid2'),1.2);
      if(side===0&&ker){ pts.forEach(q=>p.inf([q[0]-O,q[1]],ker,p.css('--grid2'),1,[3,4])); p.inf([-O,0],ker,p.css('--c-m'),2.5,[6,5]); }
      if(side===0) pts.forEach(q=>p.dot([q[0]-O,q[1]],onK(q)&&rk<2?p.css('--c-m'):p.css('--ink2'),3.2));
      if(side===1){ if(rk===1&&t>.5) p.inf([O,0],img,p.css('--c-k'),2.5);
        pts.forEach(q=>{ const y=mul(A,q); p.dot([O+q[0]+(y[0]-q[0])*t,q[1]+(y[1]-q[1])*t],onK(q)&&rk<2?p.css('--c-m'):p.css('--ink2'),3.2); });
        p.arrow([O,0],[c1.x,c1.y],p.css('--c-i'),2.5); p.arrow([O,0],[c2.x,c2.y],p.css('--c-j'),2.5); }
      p.ctx.restore(); }
    p.line([0,-9],[0,9],p.css('--line3'),1); p.label(half/2,14,'入力',p.css('--ink2')); p.label(half*1.5,14,'出力',p.css('--ink2'));
    read.innerHTML=`<span>${tx('A='+matTex(A,p.css('--c-i'),p.css('--c-j')))}</span><span>ランク ${rk}</span><span>核の次元 ${2-rk}</span><span>${rk} + ${2-rk} = 2</span>`;
    msg.innerHTML=t<.98?['「再生」を押すと、右側の点が全部原点に移ります。','左側の紫の破線が核です。細い破線に沿って並んだ点は、右側でそれぞれ 1 点に重なります。「再生」を押してください。','2 本の列が同じ直線上にないので、何もつぶれません。「再生」を押してください。'][rk]:
      ['<b>ランクは 0 です。</b> 零行列はすべての点を原点に移します。像は原点だけで、核は平面全体です。','<b>ランクは 1 です。</b> 平面が青い直線 (像) につぶれました。左側の破線に沿って並んでいた点は、右側でそれぞれ 1 点に重なっています。紫の点 (核の上の点) は原点に集まりました。','<b>ランクは 2 です。</b> 点は重ならずに広がっています。原点に移るのは原点だけなので、核は {0} です。'][rk];
  };
  const go=()=>{ t=0; plot.play(1300,x=>{t=x;}); };
  const P=[[[O+1,.5],[O+.5,1]],[[O+1,.5],[O+.5,.25]],[[O,0],[O,0]]];
  const sg=seg(ctl,['ランク 2','ランク 1','ランク 0'],i=>{ t=0; moveTo(plot,[c1,c2],P[i],500); });
  plot.onDrag=()=>{ sg.clear(); t=0; };
  btn(ctl,'再生',go,true); btn(ctl,'点を戻す',()=>{cancelAnimationFrame(plot.raf);t=0;plot.render();});
  plot.render(); return ()=>plot.destroy();
};

/* 9 核と像 (立体) */
VIZ.kernel3=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'空間がつぶれる様子',hint:'なぞると回ります',three:true,h:320,opt:{scale:46,cy:.55},legend:[['cm','核'],['ck','像']]});
  const Ms=[[[1,0,.5],[0,1,.5],[0,0,1]],[[1,0,1],[0,1,1],[0,0,0]],[[.4,.4,.4],[.4,.4,.4],[.2,.2,.2]]], info=[{rk:3},{rk:2,ker:[1,1,-1],imgN:[0,0,1]},{rk:1,kerN:[1,1,1],img:[1,1,.5]}];
  let k=1, t=0; const pts=[]; for(let x=-1.5;x<=1.5;x+=.75) for(let y=-1.5;y<=1.5;y+=.75) for(let z=-1.5;z<=1.5;z+=.75) pts.push([x,y,z]);
  const ap=(M,v)=>M.map(r=>r[0]*v[0]+r[1]*v[1]+r[2]*v[2]);
  plot.draw=p=>{ const L=1.9, I=info[k]; cubeWire(p,L);
    if(I.kerN) p.poly(planeCube(I.kerN,L),p.css('--c-m'),.18*(1-t*.5),p.css('--c-m'),1.2);
    if(I.imgN&&t>.98) p.poly(planeCube(I.imgN,L),p.css('--c-k'),.22,p.css('--c-k'),1.2);
    pts.map(q=>{ const y=ap(Ms[k],q); return q.map((v,i)=>v+(y[i]-v)*t); }).sort((a,b)=>p.P(b)[2]-p.P(a)[2]).forEach(q=>p.dot(q,p.css('--ink2'),2.6));
    if(I.ker){ const s=1.9/Math.max(...I.ker.map(Math.abs)); p.line(I.ker.map(v=>-v*s),I.ker.map(v=>v*s),p.css('--c-m'),2.5,[6,5]); }
    if(I.img&&t>.98){ const s=1.9/Math.max(...I.img.map(Math.abs)); p.line(I.img.map(v=>-v*s),I.img.map(v=>v*s),p.css('--c-k'),3); }
    read.innerHTML=`<span>ランク ${I.rk}</span><span>核の次元 ${3-I.rk}</span><span>${I.rk} + ${3-I.rk} = 3</span>`;
    msg.innerHTML=t<.98?['「再生」を押してください。','紫の破線が核です。「再生」を押すと、この直線の方向につぶれます。','紫の平面が核です。「再生」を押すと、この平面に沿った 2 次元ぶんがつぶれます。'][k]:
      ['<b>ランクは 3 です。</b> 箱は傾きましたが、つぶれていません。核は {0} です。','<b>ランクは 2 です。</b> 空間が青い平面 (像) につぶれました。核は直線で 1 次元です。','<b>ランクは 1 です。</b> 空間が青い直線 (像) につぶれました。核は平面で 2 次元です。'][k]; };
  const go=()=>{ t=0; plot.play(1300,x=>{t=x;}); };
  seg(ctl,['ランク 3','ランク 2','ランク 1'],i=>{k=i;go();},1);
  btn(ctl,'再生',go,true); btn(ctl,'点を戻す',()=>{cancelAnimationFrame(plot.raf);t=0;plot.render();});
  plot.render(); return ()=>plot.destroy();
};

function eig2(M){
  const tr=M[0]+M[3], d=det2(M), ds=tr*tr-4*d; if(ds<-1e-9) return [];
  const s=Math.sqrt(Math.max(0,ds)), ls=s<1e-9?[tr/2]:[(tr+s)/2,(tr-s)/2];
  return ls.map(l=>{ let v; if(Math.abs(M[1])>1e-9) v=[M[1],l-M[0]]; else if(Math.abs(M[2])>1e-9) v=[l-M[3],M[2]]; else v=Math.abs(M[0]-l)<1e-9?[1,0]:[0,1];
    const n=Math.hypot(...v); return {l,v:[v[0]/n,v[1]/n]}; });
}
/* 10 固有ベクトルを探す。下に固有多項式のグラフ */
VIZ.eigen=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'同じ直線に乗る方向を探す',hint:'紫の点を回せます',h:300,range:2.7,legend:[['cm','x'],['ck','Ax'],['ce','固有ベクトルの方向と固有値']]});
  const Ms=[[1.5,.5,.5,1.5],[2,0,0,.5],[1,1,0,1],[.5,-.866,.866,.5],[1,.5,.5,.25],[.5,1.5,1.5,.5]]; let k=0, show=false, spin=0;
  const x={x:1,y:0,color:'--c-m',snap:0,lock:(a,b)=>{const n=Math.hypot(a,b); return n<.05?null:[a/n,b/n];}}; plot.handles=[x];
  const cv2=document.createElement('canvas'); cv2.setAttribute('role','img'); cv2.setAttribute('aria-label','固有多項式のグラフ'); plot.cv.after(cv2);
  const g=new Plot(cv2,{h:120,range:3,cy:.6});
  g.draw=p=>{ const A=Ms[k], tr=A[0]+A[3], d=det2(A), f=l=>l*l-tr*l+d, X=l=>l-1, Yk=.45;
    p.line([-9,0],[9,0],p.css('--grid2'),1.2); for(let l=-1;l<=3;l++){ p.line([X(l),-.08],[X(l),.08],p.css('--grid2'),1.2); p.text([X(l),0],fmt(l),p.css('--ink3'),[0,13],'500 11px "Geist Mono",monospace'); }
    const c=[]; for(let l=-2;l<=4.01;l+=.05) c.push([X(l),f(l)*Yk]); p.curve(c,p.css('--ink2'),2);
    eig2(A).forEach(e=>{ p.dot([X(e.l),0],p.css('--bg'),8); p.dot([X(e.l),0],p.css('--c-e'),5.5); p.text([X(e.l),0],'λ='+fmt(e.l),p.css('--c-e'),[0,-16]); });
    p.label(p.w/2,12,'det(A − λI) のグラフ',p.css('--ink2'),'500 12px "Hiragino Sans","Noto Sans JP",sans-serif'); };
  plot.draw=p=>{
    const A=Ms[k], X=[x.x,x.y], AX=mul(A,X), E=eig2(A);
    p.grid(null,p.css('--grid'),1,1); p.grid(A,p.css('--ink3'),.35,1); p.axes();
    p.curve(CIRC(64),p.css('--grid2'),1.2,[3,4]);
    if(show) E.forEach(e=>p.inf([0,0],e.v,p.css('--c-e'),2,[7,5]));
    const cr=X[0]*AX[1]-X[1]*AX[0], al=Math.abs(cr)<.03, lam=X[0]*AX[0]+X[1]*AX[1];
    if(al) p.inf([0,0],X,p.css('--c-e'),5);
    p.arrow([0,0],AX,p.css('--c-k'),3.5,'Ax'); p.arrow([0,0],X,p.css('--c-m'),3,'x',[-X[1]*20-X[0]*4,-X[0]*20-X[1]*-4]);
    read.innerHTML=`<span>${tx('A='+matTex(A))}</span><span class="ce">固有値 ${E.length?E.map(e=>fmt(e.l)).join(', '):'実数にはない'}</span>`;
    msg.innerHTML=al?`<b>固有ベクトルです。</b> x と Ax が同じ直線 (桃色) に乗りました。Ax = ${fmt(lam)} x なので固有値は ${fmt(lam)} です。${lam<-1e-9?'負なので向きは逆です。':Math.abs(lam)<1e-9?'0 なので Ax は零ベクトルです。':''}`:
      E.length?'紫の x を回して、青い Ax が x と同じ直線に乗る場所を探してください。薄い方眼は A で変形した方眼です。':'この行列は回転です。どの x も向きが変わります。下のグラフも横軸と交わらず、実数の固有値はありません。';
  };
  seg(ctl,['斜めに伸ばす','軸ごとに伸縮','せん断','回転 60°','つぶす','負の固有値'],i=>{k=i;plot.render();g.render();});
  btn(ctl,'ゆっくり回す',b=>{ if(spin){cancelAnimationFrame(spin);spin=0;b.textContent='ゆっくり回す';return;} b.textContent='止める';
    let a=Math.atan2(x.y,x.x); const tick=()=>{ if(plot.dead) return; a+=.01; x.x=Math.cos(a); x.y=Math.sin(a); plot.render(); spin=requestAnimationFrame(tick); }; tick(); });
  btn(ctl,'答えの方向を表示',b=>{show=!show;b.textContent=show?'答えの方向を隠す':'答えの方向を表示';plot.render();});
  plot.render(); return ()=>{cancelAnimationFrame(spin);plot.destroy();g.destroy();};
};

/* 11 対角化の 3 段階 */
VIZ.diagSteps=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'A = P D P⁻¹ を 3 段階で',hint:'ボタンで動かします',h:320,range:4,legend:[['ce','固有ベクトルの方眼'],['ck','変形した図形']]});
  const P=[2,-1,1,1], Pi=inv2(P), D=[1.5,0,0,.5], A=mm(mm(P,D),Pi), I=[1,0,0,1];
  const seq=[I,Pi,mm(D,Pi),A]; let st=0, M=I, note='';
  const shape=FSHAPE.map(q=>[q[0]*.8+.4,q[1]*.8-.2]);
  plot.draw=p=>{
    p.grid(null,p.css('--grid'),1,1); p.axes(); p.grid(mm(M,P),p.css('--c-e'),.5,1,10);
    const tg=shape.map(q=>mul(A,q)); p.curve(tg.concat([tg[0]]),p.css('--ink2'),1.4,[5,4]);
    p.poly(shape.map(q=>mul(M,q)),p.css('--c-k'),p.css('--c-k'),2,.25);
    p.arrow([0,0],mul(M,[2,1]),p.css('--c-e'),3,'v₁'); p.arrow([0,0],mul(M,[-1,1]),p.css('--c-e'),3,'v₂');
    const on=i=>st===i?' class="now"':'';
    read.innerHTML=`<span${on(3)}>${tx('P='+matTex(P))}</span><span${on(2)}>${tx('D='+matTex(D))}</span><span${on(1)}>${tx('P^{-1}='+matTex(Pi))}</span><span>${tx('A='+matTex(A))}</span>`;
    msg.innerHTML=note||['桃色の網目は固有ベクトル v₁、v₂ が作る方眼です。破線は A を直接掛けたときの行き先です。「次の段階」を押してください。',
      '<b>P⁻¹ を掛けました。</b> 固有ベクトルの方眼が標準の方眼に重なりました。固有ベクトルを基底にした座標で見ている状態です。',
      '<b>D を掛けました。</b> 横に 1.5 倍、縦に 0.5 倍しただけです。固有ベクトルの座標では、A は軸ごとの伸縮になります。',
      '<b>P を掛けました。</b> 方眼を元の向きに戻すと、青い図形が破線に重なりました。3 段階を続けたものが A です。'][st];
    nx.disabled=st===3;
  };
  const nx=btn(ctl,'次の段階',()=>{ if(st>=3) return; note=''; const a=seq[st], b=seq[st+1]; st++; plot.play(900,t=>{M=tween(a,b,t);}); },true);
  btn(ctl,'最初から',()=>{ note=''; st=0; M=I; plot.render(); });
  btn(ctl,'A を直接掛ける',()=>{ const f=M; st=3; note='A を 1 回で掛けました。行き先は 3 段階に分けたときと同じです。もう一度見るときは「最初から」を押してください。'; plot.play(900,t=>{M=tween(f,A,t);}); });
  plot.render(); return ()=>plot.destroy();
};

/* 11 べき乗 */
VIZ.power=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'同じ行列を何回も掛ける',hint:'紫の点を動かせます',h:310,range:4,legend:[['cm','始めの点'],['ck','A を n 回掛けた点'],['ce','固有ベクトルの方向']]});
  const l1=1.15,l2=.6, P=[2,-1,1,1], Pi=inv2(P), A=mm(mm(P,[l1,0,0,l2]),Pi); let n=0, f=0;
  const start=CIRC(14).slice(0,14), s0={x:-1.5,y:1.75,color:'--c-m'}; plot.handles=[s0];
  const trail=s=>{ const tr=[s]; let q=s; for(let i=0;i<Math.ceil(f);i++){ const nx=mul(A,q), u=Math.min(1,f-i); q=[q[0]+(nx[0]-q[0])*u,q[1]+(nx[1]-q[1])*u]; tr.push(q); } return tr; };
  plot.draw=p=>{
    p.base(); p.inf([0,0],[2,1],p.css('--c-e'),2,[7,5]); p.inf([0,0],[-1,1],p.css('--c-e'),1.2,[3,5]);
    p.text([3.1,1.55],'λ = '+l1,p.css('--c-e'),[0,-14]); p.text([-2.3,2.3],'λ = '+l2,p.css('--c-e'),[20,-10]);
    for(const s of start){ const tr=trail(s); p.curve(tr,p.css('--ink3'),1); p.dot(s,p.css('--ink3'),2.2); p.dot(tr[tr.length-1],p.css('--c-k'),4); }
    const tr=trail([s0.x,s0.y]); p.curve(tr,p.css('--c-m'),2); tr.slice(1).forEach(q=>p.dot(q,p.css('--c-m'),3)); p.dot(tr[tr.length-1],p.css('--c-k'),6);
    read.innerHTML=`<span>${tx('A='+matTex(A))}</span><span>n = ${n}</span><span class="ce">${l1}ⁿ = ${fmt(Math.pow(l1,n))}</span><span class="ce">${l2}ⁿ = ${fmt(Math.pow(l2,n))}</span>`;
    msg.innerHTML=n===0?'円の上の点と紫の点に、A を n 回掛けます。下の n を増やしてください。':n<4?'固有値 0.6 の方向 (細い破線) の成分は毎回 0.6 倍に縮み、固有値 1.15 の方向 (太い破線) の成分は 1.15 倍に伸びます。':'固有値 0.6 の方向の成分がほとんど消え、点が固有値 1.15 の固有ベクトルの直線に並びました。紫の点をどこに置いても同じ直線に寄ります。細い破線の上にちょうど置いた点だけは、その上を原点へ向かいます。';
  };
  slider(ctl,'n',0,8,1,0,v=>{ const from=f; n=v; plot.play(380,t=>{f=from+(v-from)*t;}); });
  plot.render(); return ()=>plot.destroy();
};

/* 12 グラム・シュミット */
VIZ.gram=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'影を引いて直交させる',h:310,range:3.4,legend:[['ci','a₁ と u₁'],['cj','a₂ と u₂'],['ck','影を引いた残り w₂']]});
  const a1={x:2.5,y:1,color:'--c-i'}, a2={x:1,y:2.5,color:'--c-j'}; plot.handles=[a1,a2]; let st=0, an=1;
  plot.draw=p=>{
    p.base(); const A1=[a1.x,a1.y],A2=[a2.x,a2.y], n1=Math.hypot(...A1);
    p.curve(CIRC(64),p.css('--grid2'),1.2,[3,4]);
    if(n1<1e-9){ msg.textContent='a₁ を原点から離してください。'; return; }
    const u1=[A1[0]/n1,A1[1]/n1], d=A2[0]*u1[0]+A2[1]*u1[1], pr=[d*u1[0],d*u1[1]], w=[A2[0]-pr[0],A2[1]-pr[1]], nw=Math.hypot(...w);
    p.arrow([0,0],A1,p.css('--c-i'),1.8,'a₁'); p.arrow([0,0],A2,p.css('--c-j'),1.8,'a₂');
    p.arrow([0,0],u1,p.css('--c-i'),5,'u₁',[u1[1]*18,u1[0]*18]);
    if(st>=1){ p.inf([0,0],u1,p.css('--grid2'),1.2,[4,5]); p.arrow([0,0],pr,p.css('--ink2'),2.2,'影',[u1[1]*16,u1[0]*16]);
      /* a₂ の先から影のぶんだけ戻ると w₂ の先に着く */
      const tip=[A2[0]-pr[0]*an,A2[1]-pr[1]*an]; p.line(A2,tip,p.css('--ink2'),1.5,[5,4]); p.arrow([0,0],tip,p.css('--c-k'),3,an>.98?'w₂':''); }
    let u2=null; if(st>=2&&nw>1e-9){ u2=[w[0]/nw,w[1]/nw]; p.arrow([0,0],u2,p.css('--c-j'),5,'u₂',[-22,0]); }
    read.innerHTML=`<span><b class="ci">u₁</b> = ${V(u1)}</span>`+(st>=1?`<span><b class="ck">w₂</b> = ${V(w)}</span>`:'')+(u2?`<span><b class="cj">u₂</b> = ${V(u2)}</span><span>u₁·u₂ = 0</span>`:'');
    msg.innerHTML=nw<1e-9&&st>=1?'<b>a₂ が a₁ と同じ直線上にあります。</b> 影を引くと何も残りません。線形従属な組からは直交する 2 本目が作れません。':
      ['a₁ を自分の長さで割って u₁ (太い赤) にします。点線の円は半径 1 です。「2 影を引く」へ進んでください。','a₂ から、u₁ 方向の影を引きます。残った青い w₂ は u₁ と直交します。','w₂ を長さ 1 にして u₂ (太い緑) にします。太い 2 本が正規直交基底です。'][st];
  };
  seg(ctl,['1 長さを 1 に','2 影を引く','3 長さを 1 に'],i=>{ const was=st; st=i; if(i>=1&&was<1){ an=0; plot.play(800,t=>{an=t;}); } else { an=1; plot.render(); } },0);
  plot.render(); return ()=>plot.destroy();
};

/* 12 最小二乗。直線を手で動かして確かめる */
VIZ.lsq=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'誤差の 2 乗の和を小さくする',h:310,range:4.2,legend:[['ck','直線 (両端を動かす)'],['ca','誤差の 2 乗 (正方形の面積)']]});
  const D=[[-3,-1],[-1.5,.5],[0,.5],[1.5,2],[3,1.5]].map(q=>({x:q[0],y:q[1],color:'--ink',snap:.25}));
  const L0={x:-3.5,y:1,color:'--c-k',snap:.125,lock:(x,y)=>[-3.5,y]}, L1={x:3.5,y:0,color:'--c-k',snap:.125,lock:(x,y)=>[3.5,y]};
  plot.handles=[...D,L0,L1];
  const fit=()=>{ const n=D.length, sx=D.reduce((s,q)=>s+q.x,0), sy=D.reduce((s,q)=>s+q.y,0), sxx=D.reduce((s,q)=>s+q.x*q.x,0), sxy=D.reduce((s,q)=>s+q.x*q.y,0), d=n*sxx-sx*sx;
    if(Math.abs(d)<1e-9) return null; const a=(n*sxy-sx*sy)/d; return [a,(sy-a*sx)/n]; };
  const err=(a,b)=>D.reduce((s,q)=>s+(q.y-a*q.x-b)**2,0);
  plot.draw=p=>{
    p.base(); const a=(L1.y-L0.y)/7, b=L0.y+3.5*a, F=fit();
    for(const q of D){ const y=a*q.x+b, s=Math.abs(q.y-y)*(q.x>0?-1:1); p.poly([[q.x,y],[q.x,q.y],[q.x+s,q.y],[q.x+s,y]],p.css('--c-area'),p.css('--c-area'),1.2,.3); }
    p.line([L0.x,L0.y],[L1.x,L1.y],p.css('--c-k'),2.5);
    if(!F){ read.textContent='点が縦一列に並んでいます'; msg.textContent='x 座標がすべて同じだと、傾きが決まりません。黒い点を左右に散らしてください。'; return; }
    const e=err(a,b), best=err(F[0],F[1]), top=Math.max(e,best,1e-9);
    read.innerHTML=`<span class="ck">y = ${fmt(a)}x ${b<0?'−':'+'} ${fmt(Math.abs(b))}</span><span class="cs">今の合計 ${fmt(e)}<span class="cs-bar"><i style="width:${e/top*100}%"></i></span></span><span class="cs">最小の合計 ${fmt(best)}<span class="cs-bar"><i style="width:${best/top*100}%"></i></span></span>`;
    msg.innerHTML=e-best<.02?'<b>合計が最小になりました。</b> この直線が最小二乗法で求める直線です。直線を少しでも動かすと、正方形の面積の合計が増えます。':'黒い点と直線のずれを 1 辺とする正方形を描いています。青い直線の両端を動かして、面積の合計を「最小の合計」に近づけてください。';
  };
  btn(ctl,'最小の直線にする',()=>{ const F=fit(); if(F) moveTo(plot,[L0,L1],[[-3.5,F[1]-3.5*F[0]],[3.5,F[1]+3.5*F[0]]]); },true);
  btn(ctl,'直線をずらす',()=>moveTo(plot,[L0,L1],[[-3.5,1],[3.5,0]]));
  plot.render(); return ()=>plot.destroy();
};

/* 12 最小二乗は列空間への正射影。3 点 (x = −1, 0, 1) に直線 y = a + bx を当てはめる */
VIZ.lsq3=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'列空間へ垂直に下ろす',hint:'なぞると回ります',three:true,h:330,opt:{scale:50,cy:.6,yaw:2.6,pitch:.42},legend:[['ci','1 列目 (1, 1, 1)'],['cj','2 列目 (−1, 0, 1)'],['cm','b = 3 点の y 座標'],['ck','Ax (正射影)'],['ca','誤差']]});
  const c1=[1,1,1], c2=[-1,0,1], y=[.5,2.25,1];
  const dot=(u,v)=>u[0]*v[0]+u[1]*v[1]+u[2]*v[2];
  plot.draw=p=>{
    p.floor(2.5); const B=y.slice(), a=(B[0]+B[1]+B[2])/3, b=(B[2]-B[0])/2, pr=c1.map((v,i)=>a*v+b*c2[i]), r=B.map((v,i)=>v-pr[i]), rl=Math.hypot(...r);
    const c=(s,t)=>c1.map((v,i)=>s*v+t*c2[i]); p.poly([c(-.2,-1),c(2,-1),c(2,1),c(-.2,1)],p.css('--c-k'),.15,p.css('--c-k'),1);
    p.arrow([0,0,0],c1,p.css('--c-i'),3); p.arrow([0,0,0],c2,p.css('--c-j'),3);
    p.arrow([0,0,0],pr,p.css('--c-k'),3.5);
    if(rl>.02){ p.line(pr,B,p.css('--c-area'),4); const m=p.P(pr.map((v,i)=>(v+B[i])/2)); p.label(m[0]+26,m[1],'誤差',p.css('--c-area')); const u=r.map(x=>x/rl*.22), w=Math.hypot(...pr)>1e-9?pr.map(x=>-x/Math.hypot(...pr)*.22):[0,0,0];
      p.line(pr.map((v,i)=>v+u[i]),pr.map((v,i)=>v+u[i]+w[i]),p.css('--ink2'),1.2); p.line(pr.map((v,i)=>v+w[i]),pr.map((v,i)=>v+u[i]+w[i]),p.css('--ink2'),1.2); }
    p.arrow([0,0,0],B,p.css('--c-m'),3,'b'); const e=p.P(pr); p.label(e[0]-22,e[1]+14,'Ax',p.css('--c-k'));
    read.innerHTML=`<span class="ck">直線 y = ${fmt(a)} ${b<0?'−':'+'} ${fmt(Math.abs(b))}x</span><span class="ca">誤差の長さ ${fmt(rl)}</span><span>誤差·1 列目 = ${fmt(dot(r,c1))}</span><span>誤差·2 列目 = ${fmt(dot(r,c2))}</span>`;
    msg.innerHTML=rl<.02?'<b>誤差は 0 です。</b> b が青い面の上にあります。3 点が一直線に並んでいて、Ax = b に解があります。':'3 点 (−1, y₁)、(0, y₂)、(1, y₃) に直線 y = a + bx を当てはめます。b は青い面 (列空間) の外にあるので、Ax = b には解がありません。面の上で b にいちばん近い点が Ax で、黄色い誤差は面と直交します。Ax の係数 (a, b) が直線の切片と傾きです。';
  };
  [['点 1 (x = −1) の y₁',0],['点 2 (x = 0) の y₂',1],['点 3 (x = 1) の y₃',2]].forEach(([l,k])=>slider(ctl,l,0,2.5,.25,y[k],v=>{y[k]=v;plot.render();}));
  plot.render(); return ()=>plot.destroy();
};

/* 13 二次形式 */
VIZ.quad=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'xᵀAx = 1 の曲線と固有ベクトル',hint:'スライダーで動かします',h:310,range:3.2,legend:[['ck','xᵀAx = 1 の曲線'],['ce','固有ベクトルの方向']]});
  let a=2,b=.5,c=1;
  plot.draw=p=>{
    p.base(); const M=[a,b,b,c], E=eig2(M), l1=E[0].l, l2=E.length>1?E[1].l:E[0].l;
    const v1=E[0].v, v2=E.length>1?E[1].v:[-v1[1],v1[0]];
    p.inf([0,0],v1,p.css('--c-e'),1.8,[7,5]); p.inf([0,0],v2,p.css('--c-e'),1.8,[7,5]);
    let sg=[]; const flush=()=>{ if(sg.length>1) p.curve(sg,p.css('--c-k'),3); sg=[]; };
    for(let i=0;i<=360;i++){ const th=i/180*Math.PI, x=Math.cos(th), y=Math.sin(th), q=a*x*x+2*b*x*y+c*y*y;
      if(q>.02){ const r=1/Math.sqrt(q); if(r<8) sg.push([r*x,r*y]); else flush(); } else flush(); }
    flush();
    const lab=(v,l)=>{ const r=l>.02?Math.min(2.6,1/Math.sqrt(l)+.5):2.4; p.text([v[0]*r,v[1]*r],'λ='+fmt(l),p.css('--c-e'),[0,-12]); };
    lab(v1,l1); lab(v2,l2);
    const kind=l2>1e-9?'正定値':l2>-1e-9?(l1>1e-9?'半正定値':'零行列'):l1>1e-9?'不定符号':l1>-1e-9?'半負定値':'負定値';
    read.innerHTML=`<span>${tx('A=\\begin{pmatrix}'+fmt(a)+'&'+fmt(b)+'\\\\'+fmt(b)+'&'+fmt(c)+'\\end{pmatrix}')}</span><span class="ce">固有値 ${fmt(l1)}, ${fmt(l2)}</span><span><b>${kind}</b></span>`;
    msg.innerHTML=l2>1e-9?'固有値がどちらも正なので曲線は楕円です。桃色の破線が固有ベクトルの方向で、楕円の軸になっています。半径は 1/√λ なので、固有値が大きい方向ほど半径が短くなります。':l1>1e-9&&l2<-1e-9?'固有値の符号が違うので双曲線です。負の固有値の方向では xᵀAx が負になり、1 になる点がありません。':l1>1e-9?'固有値の 1 つが 0 です。その方向にはどこまで行っても値が変わらず、曲線は平行な 2 本の直線になります。':'固有値が正でないので、xᵀAx = 1 になる点はありません。';
  };
  slider(ctl,'x² の係数 a',-1,3,.25,a,v=>{a=v;plot.render();}); slider(ctl,'xy の係数の半分 b',-2,2,.25,b,v=>{b=v;plot.render();}); slider(ctl,'y² の係数 c',-1,3,.25,c,v=>{c=v;plot.render();});
  plot.render(); return ()=>plot.destroy();
};

/* 14 特異値分解 */
VIZ.svd=root=>{
  const {plot,read,msg,ctl}=frame(root,{title:'円は楕円に移る',h:320,range:3.4,legend:[['ci','A の 1 列目'],['cj','A の 2 列目'],['ck','円の行き先'],['ce','v₁, v₂ と σ₁u₁, σ₂u₂']]});
  const e1={x:2,y:1,color:'--c-i'}, e2={x:-.5,y:1.5,color:'--c-j'}; plot.handles=[e1,e2]; let M=null, st=-1;
  const dec=()=>{ const A=getM(e1,e2), S=[A[0]*A[0]+A[2]*A[2],A[0]*A[1]+A[2]*A[3],A[0]*A[1]+A[2]*A[3],A[1]*A[1]+A[3]*A[3]], E=eig2(S);
    const s1=Math.sqrt(Math.max(0,E[0].l)), s2=E.length>1?Math.sqrt(Math.max(0,E[1].l)):s1, v1=E[0].v, v2=[-v1[1],v1[0]];
    return {A,s1,s2,v1,v2,Vt:[v1[0],v1[1],v2[0],v2[1]]}; };
  plot.draw=p=>{
    const d=dec(), T=M||d.A, c=CIRC(72);
    p.grid(null,p.css('--grid'),1,1); p.axes(); if(M) p.grid(T,p.css('--ink3'),.35,1);
    p.curve(c,p.css('--ink3'),1.3,[3,4]);
    p.line([0,0],d.v1,p.css('--c-e'),2,[5,4]); p.line([0,0],d.v2,p.css('--c-e'),2,[5,4]); p.text(d.v1,'v₁',p.css('--c-e'),[d.v1[0]*14,-d.v1[1]*14]); p.text(d.v2,'v₂',p.css('--c-e'),[d.v2[0]*14,-d.v2[1]*14]);
    p.poly(c.map(q=>mul(T,q)),p.css('--c-k'),p.css('--c-k'),2.2,.12);
    p.arrow([0,0],mul(T,d.v1),p.css('--c-e'),3.5,M?'':'σ₁u₁'); if(d.s2>.02||M) p.arrow([0,0],mul(T,d.v2),p.css('--c-e'),3.5,M?'':'σ₂u₂');
    if(!M){ p.arrow([0,0],[e1.x,e1.y],p.css('--c-i'),1.8); p.arrow([0,0],[e2.x,e2.y],p.css('--c-j'),1.8); }
    const on=i=>st===i?' class="now"':'';
    read.innerHTML=`<span>A =</span><span${on(2)}>U</span><span${on(1)}>Σ</span><span${on(0)}>Vᵀ</span><span><b class="ce">σ₁ = ${fmt(d.s1)}　σ₂ = ${fmt(d.s2)}</b></span><span>σ₁σ₂ = ${fmt(d.s1*d.s2)} = |det A|</span>`;
    msg.innerHTML=st>=0?['<b>Vᵀ を掛けています。</b> v₁、v₂ が横軸と縦軸に重なるように向きを変えます。円は円のままです。','<b>Σ を掛けています。</b> 横に σ₁ 倍、縦に σ₂ 倍します。円が楕円になります。','<b>U を掛けています。</b> 楕円の向きを変えます。これで A を掛けた結果と同じになります。'][st]:
      d.s2<.02?'<b>σ₂ が 0 です。</b> 楕円が線分につぶれました。0 でない特異値は 1 個で、ランクも 1 です。':'点線の円 (半径 1) が青い楕円に移ります。破線の v₁、v₂ は直交していて、行き先の σ₁u₁、σ₂u₂ も直交しています。長い半径が σ₁、短い半径が σ₂ です。';
  };
  btn(ctl,'3 段階で再生',()=>{ const d=dec(), I=[1,0,0,1], S=[d.s1,0,0,d.s2], seq=[I,d.Vt,mm(S,d.Vt),d.A]; e1.hide=e2.hide=true;
    const run=i=>{ if(plot.dead) return; if(i>=3){ setTimeout(()=>{ if(plot.dead) return; M=null; st=-1; e1.hide=e2.hide=false; plot.render(); },900); return; } st=i; plot.play(900,t=>{M=tween(seq[i],seq[i+1],t);},()=>setTimeout(()=>run(i+1),500)); }; run(0); },true);
  btn(ctl,'つぶす',()=>moveM(plot,e1,e2,[2,1,1,.5]));
  btn(ctl,'回転だけにする',()=>moveM(plot,e1,e2,[.8,-.6,.6,.8]));
  btn(ctl,'はじめに戻す',()=>moveM(plot,e1,e2,[2,-.5,1,1.5]));
  plot.render(); return ()=>plot.destroy();
};

/* ホームの図: 方眼がいくつかの行列で順に変形する */
VIZ.hero=(canvas,cap)=>{
  const plot=new Plot(canvas,{h:canvas.clientHeight||190,range:4.6});
  const seq=[[1,0,0,1],[1,1,0,1],[0,-1,1,0],[1.6,0,0,.7],[1.2,.6,.6,1.2],[1,2,.5,1]], names=['単位行列','せん断','回転','伸縮','対称行列','つぶれる (行列式 0)']; let M=seq[0], i=0, timer=0;
  plot.draw=p=>{
    p.grid(null,p.css('--grid'),1,1); p.grid(M,p.css('--ink3'),.5,1);
    p.poly([[0,0],mul(M,[1,0]),mul(M,[1,1]),mul(M,[0,1])],p.css('--c-area'),null,1,.3);
    p.arrow([0,0],mul(M,[1,0]),p.css('--c-i'),4); p.arrow([0,0],mul(M,[0,1]),p.css('--c-j'),4);
    cap.innerHTML=`${names[i]}　${tx(matTex(M,p.css('--c-i'),p.css('--c-j')))}`;
  };
  const next=()=>{ const from=M; i=(i+1)%seq.length; plot.play(1000,t=>{M=tween(from,seq[i],t);},()=>{timer=setTimeout(next,1500);}); };
  plot.render(); if(!REDUCED) timer=setTimeout(next,1400);
  return ()=>{clearTimeout(timer);plot.destroy();};
};
