import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {config as c} from '../src/config.js';import {draw,validate} from '../src/motion.js';
const require=createRequire(process.env.CANVAS_PACKAGE_ROOT?`${process.env.CANVAS_PACKAGE_ROOT}/package.json`:import.meta.url);
const {createCanvas}=require('@napi-rs/canvas');validate(c);
const canvas=createCanvas(c.width,c.height),ctx=canvas.getContext('2d');
function sample(f){draw(ctx,f,c);return canvas.toBuffer('image/png');}
const a=sample(177);sample(20);assert.deepEqual(sample(177),a,'Random access must be repeatable');
assert.notDeepEqual(sample(60),sample(180),'Scenes must differ');
const changed=structuredClone(c);changed.data[3]=12;draw(ctx,320,changed);const altered=canvas.toBuffer('image/png');assert.notDeepEqual(sample(320),altered,'Data must drive chart output');
for(const f of [0,1,119,120,121,239,240,241,359])sample(f);
assert.throws(()=>validate({...c,width:1279}));assert.throws(()=>validate({...c,data:[NaN]}));
// Compare actual glyph pixels during the almost-stationary tail and the hold.
// Crop out the intentionally moving signal, chart, orbit, HUD and scene fades.
function crop(frame,x,y,w,h){draw(ctx,frame,c);return Buffer.from(ctx.getImageData(x,y,w,h).data);}
assert.deepEqual(crop(30,64,155,600,170),crop(38,64,155,600,170),'Opening type must lock without subpixel shimmer');
assert.deepEqual(crop(149,64,175,500,80),crop(158,64,175,500,80),'Second scene heading must hold still');
assert.deepEqual(crop(269,64,155,580,85),crop(278,64,155,580,85),'Final heading must hold still');
console.log('PASS: deterministic seeking, distinct scenes, data response, boundaries and invalid config checks');
console.log('PASS: pixel-identical text during final settling and hold in all three scenes');
