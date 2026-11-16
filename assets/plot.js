/* 平面の図を描く小さな道具。座標変換、方眼、矢印、つまめる点。 */
const KMACROS = {'\\M':'\\begin{pmatrix}#1\\end{pmatrix}','\\D':'\\begin{vmatrix}#1\\end{vmatrix}','\\vb':'\\boldsymbol{#1}'};
function TeX(s, display){
  try{ return katex.renderToString(s,{macros:KMACROS,throwOnError:false,displayMode:!!display,strict:false}); }
  catch(e){ return s; }
}
const fmt = n => { const r=Math.round(n*100)/100; return (Object.is(r,-0)?0:r).toString().replace('-','−'); };
const mul = (M,v)=>[M[0]*v[0]+M[1]*v[1], M[2]*v[0]+M[3]*v[1]];           // M = [a,b,c,d] (行ごと)
const mm  = (A,B)=>[A[0]*B[0]+A[1]*B[2],A[0]*B[1]+A[1]*B[3],A[2]*B[0]+A[3]*B[2],A[2]*B[1]+A[3]*B[3]];
const det2 = M=>M[0]*M[3]-M[1]*M[2];
const lerpM = (A,B,t)=>A.map((a,i)=>a+(B[i]-a)*t);
const ease = t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

class Plot{
  constructor(canvas,{h=300,range=4,cy=.5}={}){
    this.cv=canvas; this.ctx=canvas.getContext('2d'); this.h=h; this.range=range; this.cy=cy;
    this.handles=[]; this.draw=()=>{}; this.drag=null; this.raf=0; this.dead=false;
    canvas.style.height=h+'px';
    this.ro=new ResizeObserver(()=>this.resize()); this.ro.observe(canvas);
    const hit=(e)=>{
      const r=canvas.getBoundingClientRect(), px=e.clientX-r.left, py=e.clientY-r.top;
      let best=null,bd=34;
      for(const hd of this.handles){ if(hd.fixed) continue; const d=Math.hypot(this.X(hd.x)-px,this.Y(hd.y)-py); if(d<bd){bd=d;best=hd;} }
      return best;
    };
    canvas.addEventListener('touchstart',e=>{ const t=e.touches[0]; if(hit(t)) e.preventDefault(); },{passive:false});
    canvas.addEventListener('pointerdown',e=>{
      const hd=hit(e); if(!hd) return;
      this.drag=hd; this.touched=true; canvas.setPointerCapture(e.pointerId); canvas.style.cursor='grabbing'; e.preventDefault();
    });
    canvas.addEventListener('pointermove',e=>{
      if(!this.drag) return;
      const r=canvas.getBoundingClientRect();
      let x=(e.clientX-r.left-this.ox)/this.s, y=-(e.clientY-r.top-this.oy)/this.s;
      const hd=this.drag, sn=hd.snap===undefined?.5:hd.snap;
      if(sn){ x=Math.round(x/sn)*sn; y=Math.round(y/sn)*sn; }
      const lim=this.range-.25, ly=this.h/2/this.s-.25;
      x=Math.max(-lim,Math.min(lim,x)); y=Math.max(-ly,Math.min(ly,y));
      if(hd.lock){ const p=hd.lock(x,y); if(!p) return; [x,y]=p; }
      if(x===hd.x&&y===hd.y) return;
      hd.x=x; hd.y=y; if(this.onDrag) this.onDrag(hd); this.render();
    });
    const up=()=>{ this.drag=null; canvas.style.cursor='grab'; };
    canvas.addEventListener('pointerup',up); canvas.addEventListener('pointercancel',up);
    this.resize();
  }
  css(n){ return this._c[n]||(this._c[n]=getComputedStyle(document.documentElement).getPropertyValue(n).trim()); }
  resize(){
    const w=this.cv.clientWidth; if(!w) return;
    const d=Math.min(window.devicePixelRatio||1,3);
    this.w=w; this.cv.width=Math.round(w*d); this.cv.height=Math.round(this.h*d);
    this.ctx.setTransform(d,0,0,d,0,0);
    this.s=Math.min(w/(2*this.range), 60); this.ox=w/2; this.oy=this.h*this.cy; this.render();
  }
  X(x){return this.ox+x*this.s} Y(y){return this.oy-y*this.s}
  render(){ if(this.dead||!this.w) return; this._c={}; const c=this.ctx; c.clearRect(0,0,this.w,this.h); this.draw(this); this.drawHandles(); }
  destroy(){ this.dead=true; cancelAnimationFrame(this.raf); this.ro.disconnect(); }
  /* t を 0 から 1 へ動かしながら描く */
  play(ms,fn,done){
    cancelAnimationFrame(this.raf);
    if(REDUCED){ fn(1); this.render(); done&&done(); return; }
    const t0=performance.now();
    const step=now=>{ if(this.dead) return; const t=Math.min(1,(now-t0)/ms); fn(ease(t),t); this.render(); if(t<1) this.raf=requestAnimationFrame(step); else done&&done(); };
    this.raf=requestAnimationFrame(step);
  }
  line(a,b,col,w=1.5,dash){ const c=this.ctx; c.beginPath(); c.moveTo(this.X(a[0]),this.Y(a[1])); c.lineTo(this.X(b[0]),this.Y(b[1])); c.strokeStyle=col; c.lineWidth=w; c.setLineDash(dash||[]); c.stroke(); c.setLineDash([]); }
  /* 点 p を通り方向 d の直線 */
  inf(p,d,col,w=1.5,dash){ const L=30, n=Math.hypot(d[0],d[1])||1; this.line([p[0]-d[0]/n*L,p[1]-d[1]/n*L],[p[0]+d[0]/n*L,p[1]+d[1]/n*L],col,w,dash); }
  grid(M,col,alpha=1,w=1,N=12){
    const c=this.ctx; c.globalAlpha=alpha; M=M||[1,0,0,1];
    for(let k=-N;k<=N;k++){ this.line(mul(M,[k,-N]),mul(M,[k,N]),col,w); this.line(mul(M,[-N,k]),mul(M,[N,k]),col,w); }
    c.globalAlpha=1;
  }
  axes(){ const g=this.css('--grid2'); this.line([-99,0],[99,0],g,1.2); this.line([0,-99],[0,99],g,1.2); }
  base(){ this.grid(null,this.css('--grid'),1,1); this.axes(); }
  arrow(a,b,col,w=3,label,lo){
    const c=this.ctx, x1=this.X(a[0]),y1=this.Y(a[1]),x2=this.X(b[0]),y2=this.Y(b[1]);
    const len=Math.hypot(x2-x1,y2-y1);
    if(len<2){ this.dot(b,col,4); }
    else{
      const ux=(x2-x1)/len, uy=(y2-y1)/len, hl=Math.min(12,len*.6), hw=hl*.5;
      c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2-ux*hl*.8,y2-uy*hl*.8); c.strokeStyle=col; c.lineWidth=w; c.lineCap='round'; c.stroke();
      c.beginPath(); c.moveTo(x2,y2); c.lineTo(x2-ux*hl-uy*hw,y2-uy*hl+ux*hw); c.lineTo(x2-ux*hl+uy*hw,y2-uy*hl-ux*hw); c.closePath(); c.fillStyle=col; c.fill();
    }
    if(label){ const n=len||1, dx=(x2-x1)/n, dy=(y2-y1)/n, o=lo||[dx*16-dy*4,dy*16+dx*4]; this.text([b[0],b[1]],label,col,o); }
  }
  poly(pts,fill,stroke,w=1.5,alpha=.22){
    const c=this.ctx; c.beginPath(); pts.forEach((p,i)=>i?c.lineTo(this.X(p[0]),this.Y(p[1])):c.moveTo(this.X(p[0]),this.Y(p[1]))); c.closePath();
    if(fill){ c.globalAlpha=alpha; c.fillStyle=fill; c.fill(); c.globalAlpha=1; }
    if(stroke){ c.strokeStyle=stroke; c.lineWidth=w; c.lineJoin='round'; c.stroke(); }
  }
  curve(pts,col,w=2,dash){ const c=this.ctx; c.beginPath(); pts.forEach((p,i)=>i?c.lineTo(this.X(p[0]),this.Y(p[1])):c.moveTo(this.X(p[0]),this.Y(p[1]))); c.strokeStyle=col; c.lineWidth=w; c.setLineDash(dash||[]); c.stroke(); c.setLineDash([]); }
  dot(p,col,r=4){ const c=this.ctx; c.beginPath(); c.arc(this.X(p[0]),this.Y(p[1]),r,0,7); c.fillStyle=col; c.fill(); }
  text(p,str,col,o=[8,-8],font){
    const c=this.ctx; c.font=font||'600 13px "Geist Mono","Noto Sans JP",monospace'; c.textAlign='center'; c.textBaseline='middle';
    let x=this.X(p[0])+o[0], y=this.Y(p[1])+o[1]; const tw=c.measureText(str).width/2+3;
    x=Math.max(tw,Math.min(this.w-tw,x)); y=Math.max(10,Math.min(this.h-10,y));
    c.lineWidth=4; c.strokeStyle=this.css('--bg'); c.lineJoin='round'; c.strokeText(str,x,y); c.fillStyle=col; c.fillText(str,x,y);
  }
  drawHandles(){
    const c=this.ctx;
    for(const hd of this.handles){ if(hd.hide) continue;
      const x=this.X(hd.x), y=this.Y(hd.y), col=this.css(hd.color||'--ink');
      if(!hd.fixed){ c.beginPath(); c.arc(x,y,this.drag===hd?17:13,0,7); c.globalAlpha=.2; c.fillStyle=col; c.fill(); c.globalAlpha=1; }
      c.beginPath(); c.arc(x,y,6.5,0,7); c.fillStyle=this.css('--bg'); c.fill(); c.lineWidth=3; c.strokeStyle=col; c.stroke();
    }
  }
}
