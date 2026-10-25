import * as THREE from './vendor/three.module.js';
import {DATA as D} from './data.js';
const bn=x=>(x/1000).toFixed(2),pct=x=>(x*100).toFixed(1)+'%';
document.querySelector('#hero-revenue').textContent=bn(D.q.rev);
const messages=[
 ['制造业仍是收入底盘。','汽车、服务及其他占合并营收近六成。储能、火箭与AI的加入，并未改变当前收入重心。','汽车业务是正式分部，已包含服务及其他。FSD、Robotaxi和机器人没有另行披露独立分部利润。','Tesla Q3季报 · 附注14；业绩公告 p.27'],
 ['储能连接工厂与算力。','能源业务为计算基础设施提供电力支持；但集团内部销售，不能成为新增外部收入。','已从能源收入中扣除2.21亿美元Megapack内部销售，并扣除0.50亿美元内部毛利；未计折旧回转。','Tesla Q3季报 · 附注13、14'],
 ['火箭是基础设施，\n并非最大的收入块。','航天业务占比不大，却为卫星网络和后续基础设施扩张提供运载能力。','航天分部当季经营亏损700万美元。内部卫星发射不是对外收入，模型沿用SpaceX披露分部口径。','SpaceX Q3业绩公告 · p.4'],
 ['连接业务支撑\n当季经营利润。','卫星连接贡献23.67亿美元经营利润，是合并后利润结构中最清晰的支柱。','连接业务贡献合并备考经营利润约68.4%；这是扣除Tesla经营费用后的整体口径，不能拿毛利直接比较。','SpaceX Q3业绩公告 · p.5'],
 ['超级智能增长，\n伴随最重的资本投入。','SI包含模型、应用、算力服务及广告。它改变了SpaceX的业务构成，也放大了资金需求。','SI当季资本开支164.44亿美元，高于当季SI收入。Cursor从8月14日起并入，历史季度不完全可比。','SpaceX Q3业绩公告 · pp.6–8']];
document.querySelector('#stages').innerHTML=D.segments.map((s,i)=>`<section class="stage panel" id="stage-${i}" style="--accent:${s.color}"><div class="copy"><div class="stage-index"><b>0${i+1}</b> ${s.name.toUpperCase()}</div><h2>${messages[i][0].replace('\n','<br>')}</h2><p class="lead">${messages[i][1]}</p><div class="stage-data"><div><strong>${bn(s.rev)}</strong><span>外部营收 · 十亿美元</span></div><div><strong>${s.profit<0?'−':''}${bn(Math.abs(s.profit))}</strong><span>${s.profitLabel} · 十亿美元</span></div><div class="wide"><b>${pct(s.share)}</b> 合并营收占比 <div class="revenue-track"><i style="width:${s.share*100}%"></i></div></div></div><p class="insight">${messages[i][2]}</p><p class="fine">${messages[i][3]} · 2026Q3 · 取数2026-10-22<br>数据源自Excel「合并备考」；内部抵销含明确假设。</p></div></section>`).join('');
const kpis=[['营收',D.q.rev],['经营利润',D.q.op],['自由现金流',D.q.fcf],['现金及短期投资',D.bs.liq],['有息负债',D.bs.debt]];
document.querySelector('#kpis').innerHTML=kpis.map(([label,x])=>`<div class="kpi ${x<0?'negative':''}"><strong>${x<0?'−':''}${bn(Math.abs(x))}</strong><span>${label}</span></div>`).join('');
function updateScenarios(p=0){document.querySelector('#premium-value').textContent=(p>0?'+':'')+Math.round(p*100)+'%';document.querySelector('#scenario-grid').innerHTML=D.scenarios.map((s,i)=>{const r=s.sprice*(1+p)/s.tprice,n=r*D.ownership.sext,total=D.ownership.tshares+n,t=D.ownership.tshares/total,m=(D.ownership.tmusk+r*D.ownership.smusk)/total;return `<article class="scenario"><h4>0${i+1} / ${s.name}</h4><div class="ratio">${r.toFixed(4)} <small>股 / 1股SpaceX</small></div><div class="split-bar"><span class="t" style="width:${t*100}%"></span><span class="s" style="width:${(1-t)*100}%"></span></div><div class="share-labels"><span>${pct(t)}</span><span>${pct(1-t)}</span></div><div class="musk">Musk股份占比 <b>${pct(m)}</b></div></article>`}).join('')}
updateScenarios();document.querySelector('#premium').addEventListener('input',e=>updateScenarios(Number(e.target.value)/100));
const sections=[...document.querySelectorAll('main section')];document.querySelector('#nav').innerHTML=sections.map((s,i)=>`<a href="#${s.id}" aria-label="${i===0?'总览':i===6?'整体与换股':D.segments[i-1].name}"></a>`).join('');
let scroll=0,targetScroll=0,active=-1,pointerX=0;const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
function onScroll(){const h=innerHeight;targetScroll=scrollY/h;let nearest=0;sections.forEach((s,i)=>{if(s.getBoundingClientRect().top<h*.5)nearest=i});active=nearest-1;document.querySelectorAll('#nav a').forEach((a,i)=>a.classList.toggle('active',i===nearest));document.querySelector('#progress').style.width=`${100*scrollY/(document.documentElement.scrollHeight-h)}%`;document.querySelector('#scene-caption').textContent=nearest===0?'五个分部 · 一个资本配置问题':nearest===6?'合并≠自动创造自由现金流':`${D.segments[nearest-1].name} / 营收占比 ${pct(D.segments[nearest-1].share)}`;document.querySelector('#scene-label').style.opacity=nearest===6?'0':'1';}
addEventListener('scroll',onScroll,{passive:true});addEventListener('pointermove',e=>pointerX=(e.clientX/innerWidth-.5)*2);onScroll();
try{
 const host=document.querySelector('#scene'),scene=new THREE.Scene();scene.background=new THREE.Color('#edf7fb');scene.fog=new THREE.Fog('#edf7fb',45,100);
 const camera=new THREE.PerspectiveCamera(36,host.clientWidth/host.clientHeight,.1,140);camera.position.set(25,20,31);camera.lookAt(0,8.5,0);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(host.clientWidth,host.clientHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.4;host.appendChild(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xcaf0ff,0xacc6d0,2.4));const sun=new THREE.DirectionalLight(0xffecd5,4.1);sun.position.set(-12,30,17);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-24;sun.shadow.camera.right=24;sun.shadow.camera.top=25;sun.shadow.camera.bottom=-20;sun.shadow.bias=-.0004;scene.add(sun);const rim=new THREE.DirectionalLight(0x9feaff,2.4);rim.position.set(8,20,-15);scene.add(rim);
 const mat=(color,metalness=.25,roughness=.4)=>new THREE.MeshStandardMaterial({color,metalness,roughness});const ivory=mat('#f7fcff',.55,.28),steel=mat('#90a6b8',.7,.25),dark=mat('#203d53',.65,.28),glass=mat('#6fc7dd',.55,.2),white=mat('#ffffff',.1,.6),pad=mat('#d7e4e9',.35,.6);
 const mesh=(geo,material,parent,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m};
 const ground=mesh(new THREE.PlaneGeometry(180,180),mat('#e0eff1',.05,.85),scene,0,-.18,0);ground.rotation.x=-Math.PI/2;
 const island=mesh(new THREE.CylinderGeometry(13.5,14,0.7,96),white,scene,0,.1,0);const island2=mesh(new THREE.CylinderGeometry(12.8,12.8,.06,96),pad,scene,0,.49,0);
 function ring(rad,tube,color,y,parent=scene){const m=mesh(new THREE.TorusGeometry(rad,tube,12,96),mat(color,.4,.35),parent,0,y,0);m.rotation.x=Math.PI/2;return m}
 ring(4.1,.04,'#1fb5c0',.55);ring(4.4,.025,'#1fb5c0',.55);ring(11.8,.035,'#ffffff',.55);mesh(new THREE.CylinderGeometry(2.1,2.2,.5,64),steel,scene,0,.8,0);
 // Generic factory campus, with glass fronts, solar roof and cooling equipment.
 const factory=new THREE.Group();factory.position.set(-6,.6,-4.2);factory.rotation.y=.2;scene.add(factory);
 mesh(new THREE.BoxGeometry(6.5,2.4,4),white,factory,0,1.2,0);mesh(new THREE.BoxGeometry(6.8,.18,4.25),steel,factory,0,2.45,0);
 for(let i=0;i<10;i++){mesh(new THREE.BoxGeometry(.43,1.05,.04),glass,factory,-2.8+i*.62,1.45,2.025);mesh(new THREE.BoxGeometry(.43,.13,.06),dark,factory,-2.8+i*.62,.48,2.025)}
 for(let i=0;i<5;i++)for(let j=0;j<3;j++){let p=mesh(new THREE.BoxGeometry(1,.04,.8),mat('#306c9d',.5,.3),factory,-2.45+i*1.18,2.65,-1.2+j*1);p.rotation.x=.14;for(let t=0;t<3;t++)mesh(new THREE.BoxGeometry(.012,.015,.76),steel,p,-.32+t*.32,.03,0)}
 const building=mesh(new THREE.BoxGeometry(3.4,1.7,3.5),mat('#a8cbd5',.3,.45),scene,5.5,1.4,-5.5);
 for(let i=0;i<5;i++){mesh(new THREE.BoxGeometry(.4,1,.05),glass,building,-1.3+i*.65,.08,1.78)}
 for(let i=0;i<5;i++){mesh(new THREE.BoxGeometry(.75,1.3,1),white,scene,5+i*.9,1.2,-2.7);mesh(new THREE.BoxGeometry(.45,.12,.8),steel,scene,5+i*.9,1.88,-2.7)}
 for(let i=0;i<7;i++){const z=2+i*.85;mesh(new THREE.BoxGeometry(.2,.5,.2),white,scene,-7,.8,z);mesh(new THREE.BoxGeometry(.17,.1,.17),mat('#30d5d5',.1,.2),scene,-7,1.1,z)}
 // Five constant-radius sections: cylinder height exactly equals external-revenue share × 14.
 const rocket=new THREE.Group();scene.add(rocket);const stages=[];let y=2;
 D.segments.forEach((s,i)=>{const h=s.share*14,g=new THREE.Group();g.position.y=y+h/2;g.userData={baseY:g.position.y,h,index:i};rocket.add(g);const color=mat(s.color,.55,.3);mesh(new THREE.CylinderGeometry(1.11,1.11,h,80),i===0?ivory:mat('#f0f8fb',.55,.3),g);const bandH=Math.min(h*.2,.35);mesh(new THREE.CylinderGeometry(1.125,1.125,bandH,80),color,g,0,-h/2+bandH/2+.025,0);
  const top=mesh(new THREE.CylinderGeometry(1.1,1.1,.035,64),steel,g,0,h/2,0);mesh(new THREE.CylinderGeometry(.66,.75,.06,48),dark,g,0,h/2+.025,0);
  ring(1.115,.025,s.color,h/2-.02,g);for(let j=0;j<8;j++){const a=j*Math.PI/4;let line=mesh(new THREE.BoxGeometry(.018,Math.max(.08,h-.15),.016),steel,g,Math.sin(a)*1.114,0,Math.cos(a)*1.114);line.rotation.y=a;}
  // A generic section number on a restrained ceramic panel.
  const c=document.createElement('canvas');c.width=256;c.height=128;const cx=c.getContext('2d');cx.fillStyle='#f7fcff';cx.fillRect(0,0,256,128);cx.fillStyle=s.color;cx.font='500 54px Arial';cx.fillText('0'+(i+1),20,65);cx.font='16px Arial';cx.fillText(['MOBILITY','ENERGY','SPACE','CONNECT','INTELLIGENCE'][i],23,102);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const plate=mesh(new THREE.PlaneGeometry(.63,Math.min(.33,h*.48)),new THREE.MeshStandardMaterial({map:tex,roughness:.6}),g,.52,0,.99);plate.rotation.y=.5;
  stages.push(g);y+=h;
 });
 const topGroup=stages[4],toph=topGroup.userData.h;mesh(new THREE.ConeGeometry(1.1,2.4,80),ivory,topGroup,0,toph/2+1.2,0);mesh(new THREE.CylinderGeometry(.045,.045,.6,12),steel,topGroup,0,toph/2+2.7,0);
 const bottom=stages[0],bh=bottom.userData.h;for(let i=0;i<5;i++){const a=i*2*Math.PI/5;mesh(new THREE.CylinderGeometry(.19,.33,.68,24),dark,bottom,Math.cos(a)*.65,-bh/2-.31,Math.sin(a)*.65)}
 for(let j=0;j<3;j++){const fin=new THREE.Shape();fin.moveTo(0,0);fin.lineTo(.9,-.7);fin.lineTo(.9,-2.2);fin.lineTo(0,-1.65);const f=mesh(new THREE.ExtrudeGeometry(fin,{depth:.08,bevelEnabled:true,bevelSize:.03,bevelThickness:.02,bevelSegments:2,steps:1}),ivory,bottom);f.position.y=-bh/2+1.7;f.position.x=Math.cos(j*2*Math.PI/3)*1.05;f.position.z=Math.sin(j*2*Math.PI/3)*1.05;f.rotation.y=-j*2*Math.PI/3;}
 // Circular scaffolding and subtle atmospheric highlights.
 const gantry=new THREE.Group();gantry.position.set(-2.9,0,-1.2);scene.add(gantry);mesh(new THREE.BoxGeometry(.25,11,.25),steel,gantry,0,6,0);mesh(new THREE.BoxGeometry(.25,11,.25),steel,gantry,1,6,0);for(let i=0;i<10;i++){mesh(new THREE.BoxGeometry(1.1,.09,.25),white,gantry,.5,1+i,0)}
 const ray=mesh(new THREE.SphereGeometry(20,40,24),new THREE.MeshBasicMaterial({color:'#fff4e1',transparent:true,opacity:.5,depthWrite:false}),scene,-33,24,-65);ray.castShadow=false;
 let last=performance.now(),tick=0;
 function animate(now){const dt=Math.min((now-last)/1000,.05);last=now;tick+=dt;scroll+=(targetScroll-scroll)*(reduced?1:.065);const explode=THREE.MathUtils.clamp(scroll*.32,0,1);const a=active;
  stages.forEach((g,i)=>{const detached=THREE.MathUtils.smoothstep(scroll,i+.25,i+1.1);const activeAmt=i===a?1:0;const xTarget=detached*(i%2===0?1.65:-1.05)+activeAmt*.35;g.position.x+=(xTarget-g.position.x)*.065;g.position.y=g.userData.baseY+explode*i*.63+(reduced?0:Math.sin(tick*.55+i)*.035*explode);g.rotation.y+=(detached*.12-g.rotation.y)*.05;});
  rocket.rotation.y=.3+(reduced?0:Math.sin(tick*.12)*.04);const tx=25+pointerX*.7;camera.position.x+=(tx-camera.position.x)*.02;camera.lookAt(.1,9+explode*.9,0);renderer.render(scene,camera);requestAnimationFrame(animate);
 }
 requestAnimationFrame(animate);addEventListener('resize',()=>{camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight);onScroll()});window.__orbit={renderer,scene,stages,data:D,version:THREE.REVISION};
}catch(err){document.querySelector('#fallback').hidden=false;document.querySelector('#scene').style.display='none';window.__orbitFallback=String(err);}
