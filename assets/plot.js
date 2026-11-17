/* 図を描く部品。平面用の Plot と、回して見る立体用の Plot3。 */
const KMACROS = {'\\M':'\\begin{pmatrix}#1\\end{pmatrix}','\\D':'\\begin{vmatrix}#1\\end{vmatrix}','\\vb':'\\boldsymbol{#1}'};
function TeX(s, display){
  try{ return katex.renderToString(s,{macros:KMACROS,throwOnError:false,displayMode:!!display,strict:false}); }
  catch(e){ return s; }
}
const fmt = n => { const r=Math.round(n*100)/100; return (Object.is(r,-0)?0:r).toString().replace('-','−'); };
const mul = (M,v)=>[M[0]*v[0]+M[1]*v[1], M[2]*v[0]+M[3]*v[1]];           // M = [a,b,c,d] (行ごと)
const mm  = (A,B)=>[A[0]*B[0]+A[1]*B[2],A[0]*B[1]+A[1]*B[3],A[2]*B[0]+A[3]*B[2],A[2]*B[1]+A[3]*B[3]];
const det2 = M=>M[0]*M[3]-M[1]*M[2];
const inv2 = M=>{ const d=det2(M); return [M[3]/d,-M[1]/d,-M[2]/d,M[0]/d]; };
const lerpM = (A,B,t)=>A.map((a,i)=>a+(B[i]-a)*t);
const ease = t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const LIVE = new Set();

/* 行列を「回転 × 対称行列」に分け、回転は角度で補間する。回転の途中で形が縮まないようにするため */
function polar(M){
  if(det2(M)<=1e-9) return null;
  const th=Math.atan2(M[2]-M[1],M[0]+M[3]), c=Math.cos(th), s=Math.sin(th);
  return {th,S:[c*M[0]+s*M[2],c*M[1]+s*M[3],-s*M[0]+c*M[2],-s*M[1]+c*M[3]]};
}
function tween(A,B,t){
  const a=polar(A), b=polar(B); if(!a||!b) return lerpM(A,B,t);
  let d=b.th-a.th; while(d>Math.PI) d-=2*Math.PI; while(d<-Math.PI) d+=2*Math.PI;
  const th=a.th+d*t, c=Math.cos(th), s=Math.sin(th), S=lerpM(a.S,b.S,t);
  return [c*S[0]-s*S[2],c*S[1]-s*S[3],s*S[0]+c*S[2],s*S[1]+c*S[3]];
}

class Plot{
  constructor(canvas,{h=300,range=4,cy=.5}={}){
    this.cv=canvas; this.ctx=canvas.getContext('2d'); this.h=h; this.range=range; this.cy=cy;
    this.handles=[]; this.draw=()=>{}; this.drag=null; this.raf=0; this.dead=false; this.sel=0; this.focus=false; this._c={};
    canvas.style.height=h+'px'; LIVE.add(this);
    this.ro=new ResizeObserver(()=>this.resize()); this.ro.observe(canvas);
    const hit=(e)=>{
      const r=canvas.getBoundingClientRect(), px=e.clientX-r.left, py=e.clientY-r.top;
      let best=null,bd=36;
      for(const hd of this.handles){ if(hd.fixed||hd.hide) continue; const d=Math.hypot(this.X(hd.x)+(hd.dx||0)-px,this.Y(hd.y)-py); if(d<bd){bd=d;best=hd;} }
      return best;
    };
    canvas.addEventListener('touchstart',e=>{ if(hit(e.touches[0])) e.preventDefault(); },{passive:false});
    canvas.addEventListener('pointerdown',e=>{
      const hd=hit(e); if(!hd) return;
      this.drag=hd; this.sel=this.handles.indexOf(hd); canvas.setPointerCapture(e.pointerId); canvas.style.cursor='grabbing'; e.preventDefault(); this.render();
    });
    canvas.addEventListener('pointermove',e=>{
      if(!this.drag) return;
      const r=canvas.getBoundingClientRect(), hd=this.drag;
      this.place(hd,(e.clientX-r.left-this.ox-(hd.dx||0))/this.s,-(e.clientY-r.top-this.oy)/this.s);
    });
    const up=()=>{ if(!this.drag) return; this.drag=null; canvas.style.cursor='grab'; this.render(); this.onSettle&&this.onSettle(); };
    canvas.addEventListener('pointerup',up); canvas.addEventListener('pointercancel',up);
    /* キーボード: 矢印キーで動かし、スペースで動かす点を切り替える */
    canvas.addEventListener('focus',()=>{ this.focus=true; this.render(); });
    canvas.addEventListener('blur',()=>{ this.focus=false; this.render(); });
    canvas.addEventListener('keydown',e=>{
      const hs=this.handles.filter(h=>!h.fixed&&!h.hide); if(!hs.length) return;
      let hd=this.handles[this.sel]; if(!hd||hd.fixed||hd.hide){ hd=hs[0]; this.sel=this.handles.indexOf(hd); }
      const st=hd.snap||.25, k={ArrowLeft:[-st,0],ArrowRight:[st,0],ArrowUp:[0,st],ArrowDown:[0,-st]}[e.key];
      if(k){ e.preventDefault(); this.place(hd,hd.x+k[0],hd.y+k[1]); this.onSettle&&this.onSettle(); }
      else if(e.key===' '||e.key==='Enter'){ e.preventDefault(); this.sel=this.handles.indexOf(hs[(hs.indexOf(hd)+1)%hs.length]); this.render(); }
    });
    this.resize();
  }
  place(hd,x,y){
    const sn=hd.snap===undefined?.25:hd.snap;
    if(sn){ x=Math.round(x/sn)*sn; y=Math.round(y/sn)*sn; }
    const lim=(hd.lim||this.range)-.25, ly=this.h/2/this.s-.25;
    x=Math.max(-lim,Math.min(lim,x)); y=Math.max(-ly,Math.min(ly,y));
    if(hd.lock){ const p=hd.lock(x,y); if(!p) return; [x,y]=p; }
    if(x===hd.x&&y===hd.y) return;
    hd.x=x; hd.y=y; if(this.onDrag) this.onDrag(hd); this.render();
  }
  css(n){ return this._c[n]||(this._c[n]=getComputedStyle(document.documentElement).getPropertyValue(n).trim()); }
  resize(){
    const w=this.cv.clientWidth; if(!w) return;
    const d=Math.min(window.devicePixelRatio||1,3);
    this.w=w; this.cv.width=Math.round(w*d); this.cv.height=Math.round(this.h*d);
    this.ctx.setTransform(d,0,0,d,0,0);
    this.s=Math.min(w/(2*this.range), 64); this.ox=w/2; this.oy=this.h*this.cy; this.render();
  }
  X(x){return this.ox+x*this.s} Y(y){return this.oy-y*this.s}
  render(){ if(this.dead||!this.w) return; this._c={}; const c=this.ctx; c.clearRect(0,0,this.w,this.h); this.draw(this); this.drawHandles(); }
  destroy(){ this.dead=true; cancelAnimationFrame(this.raf); this.ro.disconnect(); LIVE.delete(this); }
  /* t を 0 から 1 へ動かしながら描く */
  play(ms,fn,done){
    cancelAnimationFrame(this.raf);
    if(REDUCED){ fn(1,1); this.render(); done&&done(); return; }
    const t0=performance.now();
    const step=now=>{ if(this.dead) return; const t=Math.min(1,(now-t0)/ms); fn(ease(t),t); this.render(); if(t<1) this.raf=requestAnimationFrame(step); else done&&done(); };
    this.raf=requestAnimationFrame(step);
  }
  line(a,b,col,w=1.5,dash){ const c=this.ctx; c.beginPath(); c.moveTo(this.X(a[0]),this.Y(a[1])); c.lineTo(this.X(b[0]),this.Y(b[1])); c.strokeStyle=col; c.lineWidth=w; c.setLineDash(dash||[]); c.stroke(); c.setLineDash([]); }
  inf(p,d,col,w=1.5,dash){ const L=30, n=Math.hypot(d[0],d[1])||1; this.line([p[0]-d[0]/n*L,p[1]-d[1]/n*L],[p[0]+d[0]/n*L,p[1]+d[1]/n*L],col,w,dash); }
  grid(M,col,alpha=1,w=1,N=12){
    const c=this.ctx; c.globalAlpha=alpha; M=M||[1,0,0,1];
    for(let k=-N;k<=N;k++){ this.line(mul(M,[k,-N]),mul(M,[k,N]),col,w); this.line(mul(M,[-N,k]),mul(M,[N,k]),col,w); }
    c.globalAlpha=1;
  }
  axes(){ const g=this.css('--grid2'); this.line([-99,0],[99,0],g,1.2); this.line([0,-99],[0,99],g,1.2); }
  base(){ this.grid(null,this.css('--grid'),1,1); this.axes(); }
  clip(x0,x1){ const c=this.ctx; c.save(); c.beginPath(); c.rect(x0,0,x1-x0,this.h); c.clip(); }
  arrow(a,b,col,w=3,label,lo){
    const c=this.ctx, x1=this.X(a[0]),y1=this.Y(a[1]),x2=this.X(b[0]),y2=this.Y(b[1]);
    const len=Math.hypot(x2-x1,y2-y1);
    if(len<2){ this.dot(b,col,4); }
    else{
      const ux=(x2-x1)/len, uy=(y2-y1)/len, hl=Math.min(12,len*.6), hw=hl*.5;
      c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2-ux*hl*.8,y2-uy*hl*.8); c.strokeStyle=col; c.lineWidth=w; c.lineCap='round'; c.stroke(); c.lineCap='butt';
      c.beginPath(); c.moveTo(x2,y2); c.lineTo(x2-ux*hl-uy*hw,y2-uy*hl+ux*hw); c.lineTo(x2-ux*hl+uy*hw,y2-uy*hl-ux*hw); c.closePath(); c.fillStyle=col; c.fill();
    }
    if(label){ const n=len||1, dx=(x2-x1)/n, dy=(y2-y1)/n, o=lo||[dx*18-dy*6,dy*18+dx*6]; this.text([b[0],b[1]],label,col,o); }
  }
  poly(pts,fill,stroke,w=1.5,alpha=.22){
    const c=this.ctx; c.beginPath(); pts.forEach((p,i)=>i?c.lineTo(this.X(p[0]),this.Y(p[1])):c.moveTo(this.X(p[0]),this.Y(p[1]))); c.closePath();
    if(fill){ c.globalAlpha=alpha; c.fillStyle=fill; c.fill(); c.globalAlpha=1; }
    if(stroke){ c.strokeStyle=stroke; c.lineWidth=w; c.lineJoin='round'; c.stroke(); }
  }
  curve(pts,col,w=2,dash){ const c=this.ctx; c.beginPath(); pts.forEach((p,i)=>i?c.lineTo(this.X(p[0]),this.Y(p[1])):c.moveTo(this.X(p[0]),this.Y(p[1]))); c.strokeStyle=col; c.lineWidth=w; c.setLineDash(dash||[]); c.stroke(); c.setLineDash([]); }
  dot(p,col,r=4){ const c=this.ctx; c.beginPath(); c.arc(this.X(p[0]),this.Y(p[1]),r,0,7); c.fillStyle=col; c.fill(); }
  text(p,str,col,o=[8,-8],font){ this.label(this.X(p[0])+o[0],this.Y(p[1])+o[1],str,col,font); }
  label(x,y,str,col,font){
    const c=this.ctx; c.font=font||'600 13px "Geist Mono","Hiragino Sans","Noto Sans JP",monospace'; c.textAlign='center'; c.textBaseline='middle';
    const tw=c.measureText(str).width/2+3;
    x=Math.max(tw,Math.min(this.w-tw,x)); y=Math.max(10,Math.min(this.h-10,y));
    c.lineWidth=4; c.strokeStyle=this.css('--bg'); c.lineJoin='round'; c.strokeText(str,x,y); c.fillStyle=col; c.fillText(str,x,y);
  }
  drawHandles(){
    const c=this.ctx;
    this.handles.forEach((hd,i)=>{ if(hd.hide) return;
      const x=this.X(hd.x)+(hd.dx||0), y=this.Y(hd.y), col=this.css(hd.color||'--ink');
      if(!hd.fixed){ c.beginPath(); c.arc(x,y,this.drag===hd?18:14,0,7); c.globalAlpha=.22; c.fillStyle=col; c.fill(); c.globalAlpha=1; }
      c.beginPath(); c.arc(x,y,6.5,0,7); c.fillStyle=this.css('--bg'); c.fill(); c.lineWidth=3; c.strokeStyle=col; c.stroke();
      if(this.focus&&i===this.sel&&!hd.fixed){ c.beginPath(); c.arc(x,y,20,0,7); c.lineWidth=2; c.strokeStyle=this.css('--ink'); c.setLineDash([4,3]); c.stroke(); c.setLineDash([]); }
    });
  }
}

/* 立体の図。z が上。左右になぞると回る。床 (z を固定した面) の上で点を動かせる */
class Plot3{
  constructor(canvas,{h=320,scale=42,yaw=-.6,pitch=.42,cy=.62}={}){
    this.cv=canvas; this.ctx=canvas.getContext('2d'); this.h=h; this.sc=scale; this.yaw=yaw; this.pitch=pitch; this.cy=cy;
    this.handles=[]; this.draw=()=>{}; this.raf=0; this.dead=false; this._c={}; this.drag=null; this.rot=null;
    canvas.style.height=h+'px'; canvas.style.touchAction='pan-y'; LIVE.add(this);
    this.ro=new ResizeObserver(()=>this.resize()); this.ro.observe(canvas);
    const pos=e=>{ const r=canvas.getBoundingClientRect(); return [e.clientX-r.left,e.clientY-r.top]; };
    const hit=e=>{ const [px,py]=pos(e); let best=null,bd=34; for(const hd of this.handles){ if(hd.hide) continue; const q=this.P([hd.x,hd.y,hd.z||0]); const d=Math.hypot(q[0]-px,q[1]-py); if(d<bd){bd=d;best=hd;} } return best; };
    canvas.addEventListener('touchstart',e=>{ if(hit(e.touches[0])) e.preventDefault(); },{passive:false});
    canvas.addEventListener('pointerdown',e=>{ const hd=hit(e); canvas.setPointerCapture(e.pointerId);
      if(hd){ this.drag=hd; e.preventDefault(); } else this.rot={x:e.clientX,yaw:this.yaw}; });
    canvas.addEventListener('pointermove',e=>{
      if(this.drag){ const [px,py]=pos(e), hd=this.drag, z=hd.z||0, sp=Math.sin(this.pitch), cp=Math.cos(this.pitch);
        const xr=(px-this.ox)/this.s, yr=((this.oy-py)/this.s-z*cp)/sp, c=Math.cos(this.yaw), s=Math.sin(this.yaw);
        let x=c*xr+s*yr, y=-s*xr+c*yr; const sn=.25, L=hd.lim||3; x=Math.max(-L,Math.min(L,Math.round(x/sn)*sn)); y=Math.max(-L,Math.min(L,Math.round(y/sn)*sn));
        if(x!==hd.x||y!==hd.y){ hd.x=x; hd.y=y; this.render(); } }
      else if(this.rot){ this.yaw=this.rot.yaw+(e.clientX-this.rot.x)*.01; this.render(); }
    });
    const up=()=>{ const was=this.drag; this.drag=null; this.rot=null; if(was&&this.onSettle) this.onSettle(); };
    canvas.addEventListener('pointerup',up); canvas.addEventListener('pointercancel',up);
    canvas.addEventListener('keydown',e=>{ const k={ArrowLeft:-.15,ArrowRight:.15}[e.key]; if(k){ e.preventDefault(); this.yaw+=k; this.render(); } });
    this.resize();
  }
  css(n){ return this._c[n]||(this._c[n]=getComputedStyle(document.documentElement).getPropertyValue(n).trim()); }
  resize(){ const w=this.cv.clientWidth; if(!w) return; const d=Math.min(window.devicePixelRatio||1,3); this.w=w; this.cv.width=Math.round(w*d); this.cv.height=Math.round(this.h*d);
    this.ctx.setTransform(d,0,0,d,0,0); this.s=Math.min(this.sc,w/9); this.ox=w/2; this.oy=this.h*this.cy; this.render(); }
  /* 空間の点を画面の点に。3 番目は奥行き (大きいほど奥) */
  P(v){ const c=Math.cos(this.yaw), s=Math.sin(this.yaw), xr=c*v[0]-s*v[1], yr=s*v[0]+c*v[1], sp=Math.sin(this.pitch), cp=Math.cos(this.pitch);
    return [this.ox+this.s*xr, this.oy-this.s*(v[2]*cp+yr*sp), yr*cp-v[2]*sp]; }
  render(){ if(this.dead||!this.w) return; this._c={}; this.ctx.clearRect(0,0,this.w,this.h); this.draw(this);
    const c=this.ctx; for(const hd of this.handles){ if(hd.hide) continue; const q=this.P([hd.x,hd.y,hd.z||0]), col=this.css(hd.color);
      c.beginPath(); c.arc(q[0],q[1],this.drag===hd?18:14,0,7); c.globalAlpha=.22; c.fillStyle=col; c.fill(); c.globalAlpha=1;
      c.beginPath(); c.arc(q[0],q[1],6.5,0,7); c.fillStyle=this.css('--bg'); c.fill(); c.lineWidth=3; c.strokeStyle=col; c.stroke(); } }
  destroy(){ this.dead=true; cancelAnimationFrame(this.raf); this.ro.disconnect(); LIVE.delete(this); }
  play(ms,fn,done){ cancelAnimationFrame(this.raf); if(REDUCED){ fn(1,1); this.render(); done&&done(); return; } const t0=performance.now();
    const step=now=>{ if(this.dead) return; const t=Math.min(1,(now-t0)/ms); fn(ease(t),t); this.render(); if(t<1) this.raf=requestAnimationFrame(step); else done&&done(); }; this.raf=requestAnimationFrame(step); }
  line(a,b,col,w=1.5,dash){ const c=this.ctx, p=this.P(a), q=this.P(b); c.beginPath(); c.moveTo(p[0],p[1]); c.lineTo(q[0],q[1]); c.strokeStyle=col; c.lineWidth=w; c.setLineDash(dash||[]); c.stroke(); c.setLineDash([]); }
  arrow(a,b,col,w=3,label){ const c=this.ctx, p=this.P(a), q=this.P(b), len=Math.hypot(q[0]-p[0],q[1]-p[1]);
    if(len>3){ const ux=(q[0]-p[0])/len, uy=(q[1]-p[1])/len, hl=Math.min(11,len*.6), hw=hl*.5;
      c.beginPath(); c.moveTo(p[0],p[1]); c.lineTo(q[0]-ux*hl*.8,q[1]-uy*hl*.8); c.strokeStyle=col; c.lineWidth=w; c.lineCap='round'; c.stroke(); c.lineCap='butt';
      c.beginPath(); c.moveTo(q[0],q[1]); c.lineTo(q[0]-ux*hl-uy*hw,q[1]-uy*hl+ux*hw); c.lineTo(q[0]-ux*hl+uy*hw,q[1]-uy*hl-ux*hw); c.closePath(); c.fillStyle=col; c.fill();
      if(label) this.label(q[0]+ux*16,q[1]+uy*16,label,col); }
    else if(label) this.label(q[0]+12,q[1]-12,label,col); }
  poly(pts,fill,alpha=.25,stroke,w=1.2){ const c=this.ctx; c.beginPath(); pts.forEach((v,i)=>{ const q=this.P(v); i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]); }); c.closePath();
    if(fill){ c.globalAlpha=alpha; c.fillStyle=fill; c.fill(); c.globalAlpha=1; } if(stroke){ c.strokeStyle=stroke; c.lineWidth=w; c.lineJoin='round'; c.stroke(); } }
  dot(v,col,r=3){ const c=this.ctx, q=this.P(v); c.beginPath(); c.arc(q[0],q[1],r,0,7); c.fillStyle=col; c.fill(); }
  depth(pts){ return pts.reduce((s,v)=>s+this.P(v)[2],0)/pts.length; }
  label(x,y,str,col){ const c=this.ctx; c.font='600 13px "Geist Mono","Hiragino Sans","Noto Sans JP",monospace'; c.textAlign='center'; c.textBaseline='middle';
    const tw=c.measureText(str).width/2+3; x=Math.max(tw,Math.min(this.w-tw,x)); y=Math.max(10,Math.min(this.h-10,y));
    c.lineWidth=4; c.strokeStyle=this.css('--bg'); c.lineJoin='round'; c.strokeText(str,x,y); c.fillStyle=col; c.fillText(str,x,y); }
  /* 床の方眼と 3 本の軸 */
  floor(n=3){ const g=this.css('--grid'), g2=this.css('--grid2'); for(let k=-n;k<=n;k++){ this.line([k,-n,0],[k,n,0],g,1); this.line([-n,k,0],[n,k,0],g,1); }
    this.line([-n,0,0],[n,0,0],g2,1.3); this.line([0,-n,0],[0,n,0],g2,1.3); this.line([0,0,0],[0,0,n],g2,1.3);
    const a=this.P([n,0,0]), b=this.P([0,n,0]), z=this.P([0,0,n]); this.label(a[0]+10,a[1],'x',g2); this.label(b[0]+10,b[1],'y',g2); this.label(z[0],z[1]-10,'z',g2); }
}
