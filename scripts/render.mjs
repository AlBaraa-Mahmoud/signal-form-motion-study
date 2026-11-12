import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {config} from '../src/config.js';import {draw,validate} from '../src/motion.js';
// Optional bundle path permits an offline run in the authoring environment.
const require=createRequire(process.env.CANVAS_PACKAGE_ROOT ? `${process.env.CANVAS_PACKAGE_ROOT}/package.json` : import.meta.url);
const {createCanvas}=require('@napi-rs/canvas');
const c=process.argv[2]?JSON.parse(await readFile(process.argv[2],'utf8')):config;validate(c);
await mkdir('renders',{recursive:true});
const canvas=createCanvas(c.width,c.height),ctx=canvas.getContext('2d');
const ff=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate',String(c.fps),'-vcodec','png','-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','renders/sample.mp4'],{stdio:['pipe','inherit','inherit']});
let pipeError;ff.stdin.on('error',e=>{pipeError=e;});
const finished=new Promise((resolve,reject)=>{ff.on('error',reject);ff.on('close',code=>code===0?resolve():reject(Error(`FFmpeg exited ${code}`)));});
// Attach a rejection handler immediately; inspect final result below.
finished.catch(()=>{});
for(let frame=0;frame<c.duration*c.fps;frame++){
  if(pipeError)throw pipeError;draw(ctx,frame,c);const png=canvas.toBuffer('image/png');
  if(frame===Math.round(c.fps*2))await writeFile('renders/poster.png',png);
  if(!ff.stdin.write(png))await once(ff.stdin,'drain');
  if(frame%c.fps===0)console.log(`Rendered ${frame/c.fps}/${c.duration}s`);
}
ff.stdin.end();await finished;
await writeFile('renders/render-config.json',JSON.stringify(c,null,2)+'\n');
console.log(`Wrote ${c.duration*c.fps} frames → renders/sample.mp4`);
