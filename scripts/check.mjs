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
console.log('PASS: deterministic seeking, distinct scenes, data response, boundaries and invalid config checks');
