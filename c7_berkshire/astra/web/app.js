import * as THREE from './vendor/three.module.js';
const $=id=>document.getElementById(id);
let decisions=[], index=0, answers=[], mode='intro', reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const STORAGE='long-view-history-v1';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
try{const saved=JSON.parse(localStorage.getItem(STORAGE));if(saved&&Array.isArray(saved.answers)&&saved.answers.every(v=>Number.isInteger(v)&&v>=0&&v<3)){answers=saved.answers.slice(0,10);index=Math.min(answers.length,9);}}catch{}
const save=()=>{try{localStorage.setItem(STORAGE,JSON.stringify({answers}));}catch{}};
function setMode(m){mode=m;document.body.classList.toggle('playing',m==='play');document.body.classList.toggle('finished',m==='result');['intro','play','result'].forEach(x=>$(x).hidden=x!==m);requestAnimationFrame(resize);window.scrollTo({top:0,behavior:'instant'});}
function drawQuestion(){
 const d=decisions[index];setMode('play');$('year').textContent=d.year;$('scene-tag').textContent=d.tag+' / THE LONG VIEW';$('scene-title').textContent=d.title;$('question-title').textContent=d.title;$('context').textContent=d.context;
 const num=String(index+1).padStart(2,'0');$('chapter').textContent=num+' / 10';$('question-num').textContent=num;$('scene-caption').textContent='决定尚未揭晓';$('footer-state').textContent='第 '+(index+1)+' 站 · '+d.year;
 $('question-content').hidden=false;$('reveal').hidden=true;$('phase').textContent='当时的处境';$('choices').innerHTML='';
 d.options.forEach((option,i)=>{const b=document.createElement('button');b.className='choice';b.innerHTML=`<span class="letter-key">${'ABC'[i]}</span><span>${escape(option)}</span>`;b.onclick=()=>choose(i);$('choices').append(b)});
 $('timeline').innerHTML=decisions.map((d,i)=>`<span class="time-item ${i===index?'current':i<index?'done':''}" ${i===index?'aria-current="step"':''}>${d.year}</span>`).join('');
 $('decision-panel').style.animation='none';requestAnimationFrame(()=>{$('decision-panel').style.animation='';});activeScene=d.scene;scenePulse=1;
}
function choose(choice){
 if($('question-content').hidden)return;
 const d=decisions[index];answers[index]=choice;save();$('question-content').hidden=true;$('reveal').hidden=false;
 const match=choice===d.answer;$('match-badge').textContent=match?'与历史选择一致 · +10':'另一种选择 · 看看他的思考';$('match-badge').className='match-badge'+(match?'':' different');$('actual').textContent=d.actual;$('why').textContent=d.why;$('quote').textContent=d.quote;$('letter-year').textContent=d.letter+' 年致股东信 · 原文';$('source').textContent=d.source;$('lesson').textContent=d.lesson;$('phase').textContent='历史揭晓';$('scene-caption').textContent=match?'这一次，你们走向了同一条路':'不同的选择，同样值得思考';$('next').innerHTML=index===9?'查看我的旅程 <span>↗</span>':'前往 '+decisions[index+1].year+' <span>→</span>';scenePulse=1.6;
 requestAnimationFrame(()=>{$('next').focus({preventScroll:true});if(innerWidth<721)$('decision-panel').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});});
}
function showResult(){
 setMode('result');activeScene='all';const count=decisions.reduce((s,d,i)=>s+(answers[i]===d.answer?1:0),0);$('score').textContent=count*10;$('score-title').textContent=count>=8?'理解之外，保留独立判断':count>=5?'一些共鸣，一些自己的路线':'不同的路线，也有值得追问的理由';$('score-detail').textContent=`十个路口中，有 ${count} 次与你的选择相同。历史中的成功与错误，都保留在这份记录里。`;
 requestAnimationFrame(()=>{$('score-arc').style.strokeDashoffset=528*(1-count/10)});$('recap').hidden=true;$('review').textContent='翻阅我的决定';$('recap').innerHTML=decisions.map((d,i)=>`<article class="recap-card"><span class="recap-badge">${d.year} · ${answers[i]===d.answer?'选择一致':'不同选择'}</span><h4>${escape(d.title)}</h4><p>你的选择：${escape(d.options[answers[i]])}</p><p>实际决定：${escape(d.actual)}</p><p>${escape(d.lesson)}</p><blockquote>${escape(d.quote)}</blockquote><small>${escape(d.source)}</small></article>`).join('');$('footer-state').textContent='旅程结束 · 思考继续';
}
$('start').onclick=()=>{if(answers.length===10)showResult();else{index=answers.length;drawQuestion();}};
$('next').onclick=()=>{if(index===9)showResult();else{index++;drawQuestion();$('choices').querySelector('button').focus({preventScroll:true});}};
$('home').onclick=()=>{setMode('intro');activeScene='all';updateStart()};
$('restart').onclick=()=>{answers=[];index=0;save();drawQuestion()};
$('review').onclick=()=>{$('recap').hidden=!$('recap').hidden;$('review').textContent=$('recap').hidden?'翻阅我的决定':'收起我的决定';if(!$('recap').hidden)$('recap').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});};
$('archive').onclick=()=>$('archive-dialog').showModal();$('close-dialog').onclick=()=>$('archive-dialog').close();$('archive-dialog').addEventListener('click',e=>{if(e.target===$('archive-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
function updateStart(){$('start').innerHTML=(answers.length===10?'查看我的旅程':answers.length?'继续我的时间旅程':'开启我的时间旅程')+' <span>↗</span>';}
function motion(){document.body.classList.toggle('reduced',reduced);$('motion').textContent='动效 · '+(reduced?'关':'开');$('motion').setAttribute('aria-pressed',String(reduced));}
$('motion').onclick=()=>{reduced=!reduced;motion()};motion();
addEventListener('keydown',e=>{if(mode==='play'&&!$('question-content').hidden&&!$('archive-dialog').open&&['1','2','3'].includes(e.key))choose(Number(e.key)-1)});
try{const res=await fetch('./decisions.json');if(!res.ok)throw new Error('档案文件读取失败');decisions=await res.json();$('archive-list').innerHTML=decisions.map(d=>`<div class="archive-row"><b>${d.year}</b><div>${escape(d.title)}<small>${d.letter} 年股东信 · ${escape(d.section)}</small></div></div>`).join('');updateStart()}catch(e){$('start').disabled=true;$('start').textContent='请通过本地 HTTP 服务打开';$('footer-state').textContent='无法加载历史档案';}
// The scene is built entirely from original geometric forms; no corporate marks or flags.
let renderer,scene,camera,city,train,activeScene='all',scenePulse=0,objects=[],clouds=[],coins=[],t=0;
const colors={cream:0xf4e7c9,white:0xfffdf2,teal:0x57a99d,dark:0x226f6b,mint:0xb8d9be,yellow:0xeeb952,coral:0xde8660,glass:0x79bcb9,blue:0x8bb5c5};
const material=(color,opts={})=>new THREE.MeshStandardMaterial({color,roughness:.72,metalness:0,...opts});
const mats={};Object.entries(colors).forEach(([k,v])=>mats[k]=material(v));
function mesh(geometry,mat,parent,x=0,y=0,z=0){const o=new THREE.Mesh(geometry,typeof mat==='string'?mats[mat]:mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function box(parent,w,h,d,x,y,z,mat='cream'){return mesh(new THREE.BoxGeometry(w,h,d),mat,parent,x,y,z)}
function cylinder(parent,rt,rb,h,x,y,z,mat='teal',sides=32){return mesh(new THREE.CylinderGeometry(rt,rb,h,sides),mat,parent,x,y,z)}
function roundedPlate(parent,w,d,h,r,y,mat){const shape=new THREE.Shape(),x=-w/2,z=-d/2;shape.moveTo(x+r,z);shape.lineTo(x+w-r,z);shape.quadraticCurveTo(x+w,z,x+w,z+r);shape.lineTo(x+w,z+d-r);shape.quadraticCurveTo(x+w,z+d,x+w-r,z+d);shape.lineTo(x+r,z+d);shape.quadraticCurveTo(x,z+d,x,z+d-r);shape.lineTo(x,z+r);shape.quadraticCurveTo(x,z,x+r,z);const geom=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.07,bevelThickness:.04});const o=mesh(geom,mat,parent,0,y,0);o.rotation.x=-Math.PI/2;return o;}
function group(x,z,type){const g=new THREE.Group();g.position.set(x,.15,z);city.add(g);g.userData.kind=type;objects.push(g);return g;}
function windows(g,w,h,d,rows,cols){for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){box(g,.17,.25,.025,-w/2+(c+1)*w/(cols+1),.5+r*.47,d/2+.015,'glass');box(g,.025,.25,.18,w/2+.015,.5+r*.47,-d/2+(c+1)*d/(cols+1),'glass');}}
function tree(parent,x,z,size=1){const g=new THREE.Group();g.position.set(x,.1,z);g.scale.setScalar(size);parent.add(g);cylinder(g,.055,.075,.65,0,.32,0,'coral',8);mesh(new THREE.IcosahedronGeometry(.43,1),'mint',g,0,.9,0);mesh(new THREE.IcosahedronGeometry(.33,1),'teal',g,.15,1.2,0);return g;}
function textPlane(parent,text,w,h,x,y,z,color='#296f65',bg='#fff8e6'){const can=document.createElement('canvas');can.width=512;can.height=128;const c=can.getContext('2d');c.fillStyle=bg;c.fillRect(0,0,512,128);c.fillStyle=color;c.font='500 53px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,66);const texture=new THREE.CanvasTexture(can);texture.colorSpace=THREE.SRGBColorSpace;const o=mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture}),parent,x,y,z);return o;}
function buildWorld(){
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(31,1,.1,120);camera.position.set(12,10.7,14);camera.lookAt(0,.65,0);
 renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.setClearColor(0xf5f4e9,0);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;$('world').append(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xffffff,0xc0cda9,2.2));const sun=new THREE.DirectionalLight(0xfff5df,4);sun.position.set(-7,12,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.5,far:35});sun.shadow.normalBias=.03;sun.shadow.bias=-.0001;scene.add(sun);const fill=new THREE.DirectionalLight(0xc1e8ff,1.8);fill.position.set(7,4,-5);scene.add(fill);
 city=new THREE.Group();scene.add(city);
 // A ledger becomes the ground of the miniature town.
 roundedPlate(city,8.8,6.7,.21,.65,-.5,'dark');roundedPlate(city,8.6,6.5,.34,.6,-.32,'white');roundedPlate(city,8.8,6.7,.12,.65,.06,'cream');
 for(let i=0;i<6;i++)box(city,8.2,.012,.015,0,-.28+i*.055,3.28,material(0xd8d5bc));
 roundedPlate(city,7.8,5.7,.025,.3,.19,'mint');
 box(city,6.6,.018,.58,0,.25,.15,material(0xe3dfc9));box(city,.6,.02,4.8,-.15,.26,0,material(0xe3dfc9));
 for(let i=-3;i<=3;i++)box(city,.22,.021,.035,i*.7,.272,.15,'white');
 const tower=group(-1.45,-1.05,'insurance');box(tower,1.52,2.6,1.28,0,1.3,0,'cream');box(tower,1.68,.15,1.45,0,2.66,0,'teal');box(tower,1.1,.3,.8,0,2.83,0,'teal');windows(tower,1.52,2.6,1.28,4,3);box(tower,.35,.55,.04,0,.35,.66,'dark');textPlane(tower,'保 险',1.05,.27,0,2.43,.66);cylinder(tower,.045,.045,.7,.3,3.25,0,'yellow',8);mesh(new THREE.SphereGeometry(.12,16,16),'yellow',tower,.3,3.62,0);
 const shop=group(1,-1.35,'store');box(shop,1.65,1.25,1.35,0,.62,0,'white');box(shop,1.85,.18,1.55,0,1.3,0,'coral');box(shop,1.2,.55,.035,0,.56,.7,'glass');for(let i=0;i<7;i++)box(shop,.24,.14,.42,-.73+i*.24,1.08,.8,i%2?'white':'coral');textPlane(shop,'好 生 意',1.18,.25,0,1.35,.8);
 const candy=group(2.5,.8,'candy');box(candy,1.2,.85,1.15,0,.43,0,'white');const roof=mesh(new THREE.ConeGeometry(1, .6,4),'yellow',candy,0,1.13,0);roof.rotation.y=Math.PI/4;box(candy,.32,.5,.035,0,.3,.59,'teal');textPlane(candy,'糖 果',.77,.2,0,.79,.59);cylinder(candy,.04,.04,.75,.45,1.62,.05,'cream',8);mesh(new THREE.SphereGeometry(.25,24,24),'coral',candy,.45,2,.05);
 const fac=group(-2.45,1.05,'factory');box(fac,1.5,.9,1.25,0,.45,0,'blue');box(fac,1.6,.13,1.35,0,.96,0,'dark');windows(fac,1.5,.9,1.25,1,3);cylinder(fac,.12,.16,1.8,-.45,1.1,-.3,'coral',12);cylinder(fac,.17,.17,.12,-.45,2.03,-.3,'cream',12);for(let i=0;i<3;i++){let cl=mesh(new THREE.IcosahedronGeometry(.14+i*.04,1),'white',fac,-.45+i*.13,2.3+i*.3,-.3);clouds.push(cl)}
 const energy=group(.4,1.2,'energy');const pole=cylinder(energy,.045,.08,1.8,0,.9,0,'white',12);const turbine=new THREE.Group();turbine.position.set(0,1.9,0);energy.add(turbine);for(let i=0;i<3;i++){const blade=box(turbine,.075,.75,.04,0,.35,0,'white');const pivot=new THREE.Group();turbine.remove(blade);pivot.add(blade);pivot.rotation.z=i*Math.PI*2/3;turbine.add(pivot)}mesh(new THREE.SphereGeometry(.11,16,16),'yellow',turbine);energy.userData.turbine=turbine;
 const rear=group(.25,-2.3,'tower');box(rear,.75,1.5,.7,0,.75,0,'teal');box(rear,.83,.1,.78,0,1.55,0,'white');windows(rear,.75,1.5,.7,2,2);
 const bottle=group(2.3,-1.6,'bottle');cylinder(bottle,.19,.25,.8,0,.4,0,'dark',20);cylinder(bottle,.09,.15,.35,0,.95,0,'dark',20);cylinder(bottle,.12,.12,.08,0,1.16,0,'yellow',20);cylinder(bottle,.254,.254,.27,0,.45,0,'cream',20);
 const pile=group(-.9,1.7,'coins');for(let j=0;j<3;j++)for(let i=0;i<4+j;i++){const coin=cylinder(pile,.23,.23,.07,j*.32,.1+i*.08,(j%2)*.23,'yellow',32);coins.push(coin)}
 // Elliptical rail loop and animated three-car train.
 const track=new THREE.Group();city.add(track);for(let r of [0,.14]){let pts=[];for(let i=0;i<=160;i++){let a=i/160*Math.PI*2;pts.push(new THREE.Vector3((3.9+r)*Math.cos(a),.275,(2.7+r)*Math.sin(a)))}const rail=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),160,.018,5,false),mats.dark);track.add(rail)}
 for(let i=0;i<70;i++){let a=i/70*Math.PI*2;const tie=box(track,.25,.035,.06,3.97*Math.cos(a),.25,2.77*Math.sin(a),'coral');tie.rotation.y=-Math.atan2(2.77*Math.cos(a),-3.97*Math.sin(a));}
 train=new THREE.Group();city.add(train);for(let i=0;i<3;i++){const car=new THREE.Group();train.add(car);box(car,.57,.38,.4,0,.4,0,i===0?'dark':'coral');box(car,.62,.09,.45,0,.63,0,'cream');for(let x of [-.18,.18])for(let z of [-.22,.22]){const wheel=cylinder(car,.085,.085,.04,x,.2,z,'dark',12);wheel.rotation.x=Math.PI/2}if(i===0){cylinder(car,.07,.07,.16,.16,.74,0,'yellow',12);box(car,.17,.15,.42,-.14,.47,0,'glass')}car.userData.offset=i*.17;}
 for(const [x,z,s] of [[-3,-1.8,.85],[-3.3,-.5,.6],[3,-.4,.8],[1.6,1.9,.6],[1.6,-2.1,.65],[-1.8,2,.55],[3.1,1.6,.5]])tree(city,x,z,s);
 const shadow=mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.12}),scene,0,-.6,0);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
 resize();
}
function resize(){if(!renderer)return;let r=$('world').getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}
addEventListener('resize',resize);new ResizeObserver(resize).observe($('world'));
let pointer={x:0,y:0};addEventListener('pointermove',e=>{pointer.x=e.clientX/innerWidth-.5;pointer.y=e.clientY/innerHeight-.5});
try{buildWorld();}catch(e){$('webgl-fallback').hidden=false;}
let last=performance.now();function frame(now){requestAnimationFrame(frame);if(!renderer||!city||document.hidden)return;const dt=Math.min((now-last)/1000,.05);last=now;if(!reduced)t+=dt;
 const target=mode==='intro'?-.15:mode==='play'?.12:0;city.rotation.y+=(target+(reduced?0:Math.sin(t*.13)*.06+pointer.x*.05)-city.rotation.y)*.035;city.position.y=reduced?0:Math.sin(t*.55)*.045;
 objects.forEach(o=>{let target=activeScene===o.userData.kind?1.15:1;o.scale.lerp(new THREE.Vector3(target,target,target),.035);if(o.userData.turbine&&!reduced)o.userData.turbine.rotation.z=t*.5});
 train.children.forEach(car=>{const a=t*.16-car.userData.offset;car.position.set(3.97*Math.cos(a),0,2.77*Math.sin(a));car.rotation.y=-Math.atan2(2.77*Math.cos(a),-3.97*Math.sin(a));});clouds.forEach((c,i)=>{c.position.y=2.3+i*.3+(reduced?0:Math.sin(t+i)*.07);c.scale.setScalar(1+(reduced?0:Math.sin(t*.7+i)*.12))});renderer.render(scene,camera);
}requestAnimationFrame(frame);
