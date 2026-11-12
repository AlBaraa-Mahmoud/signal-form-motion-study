import {config as defaults} from './config.js';
export const clamp = v => Math.max(0, Math.min(1,v));
// Cubic Bezier (0.16, 1, 0.30, 1): quick attack, long soft settle.
// Solve x(u)=time before sampling y(u), as in CSS cubic-bezier().
export function ease(v) {
  v=clamp(v); if(v===0||v===1)return v;
  const bez=(u,a,b)=>3*(1-u)*(1-u)*u*a+3*(1-u)*u*u*b+u*u*u;
  let lo=0,hi=1;
  for(let i=0;i<24;i++){const u=(lo+hi)/2;if(bez(u,.16,.30)<v)lo=u;else hi=u;}
  return bez((lo+hi)/2,1,1);
}
const smooth = v => {v=clamp(v);return v*v*(3-2*v);};
// Stop the invisible Bezier tail from changing glyph antialiasing every frame.
// Keep fractional movement during the entrance, then lock to the exact target
// once the remaining travel is below half an output pixel. Never bounce/round
// moving text to whole pixels: that would introduce stepping on the way in.
const settle = (distance, progress, scale) => {
  const remaining=distance*(1-progress);
  return Math.abs(remaining)*scale<.5 ? 0 : remaining;
};
export function validate(c) {
  if (![c.width,c.height,c.fps,c.duration].every(v=>Number.isFinite(v)&&v>0)) throw Error('Positive finite dimensions, fps and duration required');
  if(c.width%2||c.height%2||!Number.isInteger(c.fps)||!Number.isInteger(c.duration*c.fps)) throw Error('Use even dimensions, integer fps and an integral frame count');
  if(!c.data.length||!c.data.every(v=>Number.isFinite(v)&&v>=0&&v<=100)) throw Error('Data must contain values from 0 to 100');
  if(!(c.timings.introEnd>1&&c.timings.orbitEnd>c.timings.introEnd+1&&c.timings.end>c.timings.orbitEnd+1&&c.timings.end===c.duration)) throw Error('Scene boundaries must ascend, leave transition room and end at duration');
}
// Pure frame sampling: no accumulated time, random state, DOM, or wall clock.
export function draw(ctx, frame, c=defaults) {
  const t=frame/c.fps, W=1280,H=720, C=c.colors;
  ctx.save();ctx.scale(c.width/W,c.height/H);
  ctx.fillStyle=C.background;ctx.fillRect(0,0,W,H);
  const line=(x,y,X,Y,color=C.grid,width=1)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(X,Y);ctx.stroke();};
  const text=(s,x,y,size=16,color=C.ink,font=c.font,align='left')=>{ctx.textAlign=align;ctx.fillStyle=color;ctx.font=`${size>=60?'bold ':''}${size}px "${font}", sans-serif`;ctx.fillText(s,x,y);};
  const fitted=(s,x,y,maxWidth,size,color)=>{ctx.textAlign='left';ctx.fillStyle=color;ctx.font=`bold ${size}px "${c.font}", sans-serif`;ctx.fillText(s,x,y,maxWidth);};
  for(let x=64;x<=1216;x+=96)line(x,64,x,656);
  for(let y=80;y<=656;y+=96)line(64,y,1216,y);
  text('S/F     MOTION SYSTEMS',64,43,13,C.muted,c.labelFont);
  text('EXPERIMENT 001 / SYNTHETIC DATA',891,43,13,C.muted,c.labelFont);
  const a=c.timings.introEnd,b=c.timings.orbitEnd;
  const scene=t<a?0:t<b?1:2, local=t-(scene===0?0:scene===1?a:b);
  const length=scene===0?a:scene===1?b-a:c.duration-b;
  const opacity=smooth(local/.3)*(1-smooth((local-length+.4)/.4));
  // Each line has its own offset and reveal mask, rather than one group fade.
  const reveal=(s,x,y,size=16,color=C.ink,font=c.font,delay=0)=>{
    const p=ease((local-delay)/1.05);
    ctx.save();ctx.beginPath();ctx.rect(x-4,y-size*1.2,1156-x,size*1.55);ctx.clip();
    ctx.globalAlpha*=smooth((local-delay)/.22);
    text(s,x,y+settle(size*.8,p,c.height/H),size,color,font);ctx.restore();
  };
  ctx.save();ctx.globalAlpha=opacity;
  text(['01 / RECEIVE','02 / TRANSFORM','03 / RESOLVE'][scene],64,104,16,C.accent,c.labelFont);
  if(scene===0){
    const enter=ease(local/1.3);
    ctx.save();ctx.beginPath();ctx.rect(64,150,1152,320);ctx.clip();
    fitted(c.title[0],58,318+settle(160,enter,c.height/H),1100,190,C.ink);
    fitted(c.title[1],63,464+settle(160,ease((local-.18)/1.3),c.height/H),600,146,C.accent);ctx.restore();
    for(let i=0;i<36;i++){
      const x=678+i*14, amplitude=(26+Math.sin(i*.54+t*2.8)*22)*ease((local-.5-i*.018)/.8);
      line(x,422-amplitude,x,422+amplitude,C.accent,5);
    }
    reveal(c.subtitle,68,547,19,C.muted,c.labelFont,.3);
    reveal('INPUT → PATTERN → MEANING',68,580,13,C.muted,c.labelFont,.4);
  }else if(scene===1){
    reveal('Order from',64,247,64);reveal('oscillation.',64,318,64,C.ink,c.font,.1);
    reveal('PHASE / FREQUENCY / AMPLITUDE',68,375,14,C.muted,c.labelFont,.22);
    reveal('A deterministic field, shaped in time.',68,411,18,C.ink,c.font,.3);
    const p=ease(local/1.6),phase=local*.52+.82*ease(local/1.7);ctx.save();ctx.translate(910,353);ctx.rotate(-.35+.36*ease(local/2.8));
    for(let j=0;j<15;j++){
      ctx.strokeStyle=j%4===0?C.accent:C.muted;ctx.lineWidth=j%4===0?2.4:1;
      ctx.beginPath();
      for(let i=0;i<=160;i++){
        const u=i/160*Math.PI*2;
        const radius=(174+24*Math.sin(u*3+phase*1.3+j*.22))*p;
        const x=Math.cos(u)*radius, y=Math.sin(u)*radius*.64+(j-7)*12*p;
        i?ctx.lineTo(x,y):ctx.moveTo(x,y);
      }ctx.closePath();ctx.stroke();
    }ctx.restore();
    text(`PHASE ${local.toFixed(2).padStart(5,'0')}`,802,594,14,C.accent,c.labelFont);
  }else{
    reveal('Make it',64,232,72);reveal('mean something.',64,310,72,C.ink,c.font,.1);
    reveal('NORMALIZED INPUT / 0–100',68,359,14,C.muted,c.labelFont,.22);
    const chartX=688, chartY=541, gap=528/c.data.length;
    c.data.forEach((v,i)=>{
      const progress=ease((local-.25-i*.085)/1.5);
      const target=v*3.45;
      const h=target-settle(target,progress,c.height/H),x=chartX+i*gap,center=x+gap*.3;
      ctx.fillStyle=i===3?C.accent:C.muted;ctx.fillRect(x,chartY-h,gap*.6,h);
      text(String(Math.round(v*progress)).padStart(2,'0'),center,chartY-h-15,18,C.ink,c.labelFont,'center');
      text(String(i+1).padStart(2,'0'),center,570,12,C.muted,c.labelFont,'center');
    });
    reveal('SIGNAL / FORM',68,504,28,C.accent,c.font,.35);
    reveal('Built from rules. Directed with intent.',68,542,17,C.ink,c.font,.43);
    reveal('AN ORIGINAL AI-ASSISTED MOTION STUDY',68,577,12,C.muted,c.labelFont,.51);
  }
  ctx.restore();
  line(64,621,1216,621,C.muted);
  line(64,621,64+1152*clamp(t/c.duration),621,C.accent,3);
  text(['RECEIVE THE SIGNAL','SHAPE THE SYSTEM','RESOLVE THE FORM'][scene],64,656,13,C.muted,c.labelFont);
  text(`${String(frame).padStart(4,'0')} / ${c.fps} FPS`,1060,656,13,C.muted,c.labelFont);
  ctx.restore();
}
