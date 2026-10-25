import * as THREE from './vendor/three.module.js';
const D=window.FACTORY_DATA,H=D.history,$=id=>document.getElementById(id),f=n=>Number(n).toFixed(4),pct=n=>(n*100).toFixed(1)+'%';
let index=15,room='vault',playing=false,timer=null,sceneReady=false;
const phase=q=>q<4?'下行防守':q<7?'筑底转产':q<11?'盈利修复':'加速兑现';
const titles=['先守住现金','让库存归零','穿过价格低谷','HBM，正式量产','现金流率先转正','把产能重新点亮','第一次季度盈利','为新订单留空间','让增长开始还债','HBM收入过半','无债务，向前走','小扩产正式到位','以现有产能兑现需求','留一分周期警觉','高带宽，满负荷','把增长变成现金'];
const summaries=['价格开始下跌。降低开工，投入研发，为下一种产品提前准备。','价格再跌30%。继续去库存，普通库存于本季清零。','普通价格指数跌至0.50。保留现金与借款空间，等待新产品。','首次取得资格。HBM售出8千片，借款支持恢复期周转。','渠道补库带动恢复。经营现金流转正，利润仍承受折旧压力。','服务器订单转强。提升开工，HBM开始贡献更多收入。','普通价格继续回升。满开工，并启动第一笔小规模扩产。','云厂商增加投入。追加一笔小扩产，继续提高HBM份额。','HBM供不应求。停止追加扩产，开始用现金偿债。','普通价格回调。HBM收入首次超过普通产品，继续偿债。','第一笔扩产上线。偿清全部普通债务，保留内部现金。','第二笔扩产上线。总产能达到325千片/季，不再追涨扩张。','价格加速上涨。将更多产能分配给HBM，普通产出全部销售。','涨价与抢货并存。谨慎估算订单，维持资本开支纪律。','全行业供不应求。满负荷运行，HBM产出达到160千片。','涨幅收窄、新产能将至。保持维护投入，以零债务结束十六季。'];
const rooms={
 clean:{n:'01',name:'洁净室',desc:'灯光与晶圆传送，记录生产节奏。',value:q=>q.decision.utilization,format:pct,unit:'开工率 · 现有产能利用',secondary:q=>`总产出 ${q.operations.produced_kwafers.toFixed(1)} 千片`,explain:'设备发光与传送速度随开工率变化。总产出包含普通内存和HBM。',anchor:new THREE.Vector3(-5.7,3.1,-4.1)},
 warehouse:{n:'02',name:'普通内存仓库',desc:'库存不是收入，现金回收才是终点。',value:q=>q.balance_sheet.inventory_kwafers,format:n=>n.toFixed(1),unit:'普通期末库存 · 千片',secondary:q=>`存货账面价值 ${f(q.balance_sheet.inventory)} 十亿美元`,explain:'箱数随普通期末库存变化。零库存显示空置托盘；不代表本季没有生产。',anchor:new THREE.Vector3(-6,1.2,5.0)},
 hbm:{n:'03',name:'HBM 产线',desc:'把研发里程碑，变成高带宽产品。',value:q=>q.operations.hbm_kwafers,format:n=>n.toFixed(1),unit:'HBM 本季生产 · 千片',secondary:q=>`实际销售 ${q.operations.hbm_sold_kwafers.toFixed(1)} 千片`,explain:'橙色堆叠随HBM产量分档增加。生产超过当季需求的部分作废，不进入库存。',anchor:new THREE.Vector3(1.5,3.3,-3.6)},
 board:{n:'04',name:'董事会会议室',desc:'所有决策，最终落在这张账上。',value:q=>q.balance_sheet.equity,format:f,unit:'期末股东权益 · 十亿美元',secondary:q=>`本季净利润 ${f(q.income_statement.net_income)} 十亿美元`,explain:'股东权益是本局主要成绩。末期利润受模拟市场涨价推动，不能外推为现实预测。',anchor:new THREE.Vector3(1.1,1.4,4.7)},
 vault:{n:'05',name:'金库',desc:'经营产生的现金，在这里积累。',value:q=>q.balance_sheet.cash,format:f,unit:'期末现金 · 十亿美元',secondary:q=>`有息债务 ${f(q.balance_sheet.debt+q.balance_sheet.emergency_debt)} 十亿美元`,explain:'金色堆叠随现金增加，右侧债务柱随借款缩短；精确金额以数字为准。',anchor:new THREE.Vector3(7.6,2.5,0.5)}
};
function spark(id,arr,w=160,h=35,color='#16867f'){
 const min=Math.min(0,...arr),max=Math.max(...arr,1),pts=arr.map((v,i)=>[5+i*(w-10)/15,h-5-(v-min)/(max-min)*(h-10)]),line=pts.map(p=>p.join(',')).join(' '),[x,y]=pts[index];
 $(id).innerHTML=`<path d="M5 ${h-4} H${w-4}" stroke="#d6e3db" fill="none"/><polyline points="${line}" fill="none" stroke="${color}" stroke-width="1.7"/><circle cx="${x}" cy="${y}" r="3.5" fill="${color}" stroke="#f2f6f3" stroke-width="2"/>`;
}
function renderRoom(){
 const r=rooms[room],q=H[index];$('room-index').textContent=r.n;$('room-name').textContent=r.name;$('room-description').textContent=r.desc;$('room-value').textContent=r.format(r.value(q));$('room-unit').textContent=r.unit;$('room-secondary').textContent=r.secondary(q);$('room-explain').textContent=r.explain;
 const vals=H.map(r.value),max=Math.max(...vals,1);$('room-bars').innerHTML=vals.map((v,i)=>`<span class="${i===index?'active':''}" style="height:${Math.max(4,v/max*100)}%" title="Q${i+1}: ${r.format(v)}"></span>`).join('');
 document.querySelectorAll('.room-label').forEach(b=>b.classList.toggle('active',b.dataset.room===room));
}
function update(){
 const q=H[index],i=q.income_statement,b=q.balance_sheet,cf=q.cash_flow;
 $('quarter-mark').textContent='Q'+String(index+1).padStart(2,'0');$('phase').textContent=phase(index+1);$('quarter-title').textContent=titles[index];$('quarter-desc').textContent=summaries[index];$('price').textContent=q.market.price_index.toFixed(2);$('util').textContent=pct(q.decision.utilization);$('share').textContent=pct(q.decision.hbm_share);$('capex').textContent=f(q.decision.capex);$('borrow').textContent=f(q.decision.borrow);$('revenue').textContent=f(i.revenue);$('profit').textContent=f(i.net_income);$('ocf').textContent=f(cf.operating);$('equity').textContent=f(b.equity);
 $('revenue-foot').textContent='HBM 收入占比 '+pct(i.revenue_hbm/i.revenue);$('profit-foot').textContent='毛利率 '+pct(i.gross_profit/i.revenue);$('ocf-foot').textContent='自由现金流 '+f(cf.operating+cf.investing);$('equity-foot').textContent='净负债 '+f(b.debt+b.emergency_debt-b.cash);
 $('quarter-slider').value=index+1;$('quarter-slider').style.background=`linear-gradient(to right,#237f75 ${index/15*100}%,#c3d8ce ${index/15*100}%)`;
 document.querySelectorAll('.quarter-ticks button').forEach((b,j)=>{b.classList.toggle('active',j===index);b.setAttribute('aria-pressed',j===index?'true':'false')});
 spark('price-chart',H.map(q=>q.market.price_index),260,68);spark('spark-revenue',H.map(q=>q.income_statement.revenue));spark('spark-profit',H.map(q=>q.income_statement.net_income));spark('spark-ocf',H.map(q=>q.cash_flow.operating));spark('spark-equity',H.map(q=>q.balance_sheet.equity));
 renderRoom();if(sceneReady)updateFactory(q);window.currentQuarter=index+1;
}
for(let j=0;j<16;j++){const b=document.createElement('button');b.textContent=String(j+1).padStart(2,'0');b.title='查看第'+(j+1)+'季度';b.onclick=()=>{stop();index=j;update()};$('quarter-ticks').appendChild(b)}
function stop(){playing=false;clearInterval(timer);$('play').textContent='▶';$('play').setAttribute('aria-label','播放季度');$('play-status').textContent='拖动时间轴'}
function start(){if(index===15)index=0;playing=true;$('play').textContent='Ⅱ';$('play').setAttribute('aria-label','暂停播放');$('play-status').textContent='正在回放';update();timer=setInterval(()=>{if(index<15){index++;update()}else stop()},Number($('speed').value))}
$('play').onclick=()=>playing?stop():start();$('speed').onchange=()=>{if(playing){stop();start()}};$('quarter-slider').oninput=e=>{stop();index=Number(e.target.value)-1;update()};$('method-button').onclick=()=>$('method').showModal();$('close-method').onclick=()=>$('method').close();
for(const [id,r] of Object.entries(rooms)){const b=document.createElement('button');b.className='room-label';b.dataset.room=id;b.innerHTML=`<b>${r.n} / ${r.name}</b><small></small>`;b.onclick=()=>{room=id;renderRoom()};$('labels').appendChild(b);r.label=b}
// Geometry is authored locally: the building is an illustrative cutaway, not a physical fab plan.
let renderer,scene,camera,factory,waferMovers=[],machineLeds=[],inventoryCrates=[],hbmStacks=[],cashStacks=[],debtBars=[],boardChart=[],rotTarget=0,topTarget=false,zoom=1;
const mat={};function material(name,color,metal=0,rough=.55,extra={}){mat[name]=new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough,...extra});return mat[name]}
function box(w,h,d,m,x,y,z,parent=factory){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function cyl(r,h,m,x,y,z,parent=factory,segments=24){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function sphere(r,m,x,y,z,parent=factory){const o=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o}
function textBoard(text,w,h,x,y,z,size=72,bg='#e0eae4',color='#27594f'){
 const cv=document.createElement('canvas');cv.width=1024;cv.height=256;const ctx=cv.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,1024,256);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`500 ${size}px sans-serif`;ctx.fillText(text,512,128);const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex}));o.position.set(x,y,z);factory.add(o);return o;
}
function plant(x,z){cyl(.24,.4,mat.white,x,.8,z);cyl(.035,.65,mat.wood,x,1.27,z);sphere(.35,mat.leaf,x,1.55,z);sphere(.23,mat.leaf2,x+.18,1.42,z+.12)}
function person(x,z,color=mat.teal){cyl(.11,.42,color,x,1.03,z,undefined,12);sphere(.105,mat.skin,x,1.36,z);box(.065,.26,.07,mat.navy,x-.06,.69,z);box(.065,.26,.07,mat.navy,x+.06,.69,z)}
function buildFactory(){
 material('base','#b8d0c6',.15);material('white','#f3f7f2',.08);material('floor','#e7efdf');material('wall','#d3e5d8');material('teal','#379b98',.3);material('darkTeal','#236b70',.25);material('navy','#285965',.15);material('coral','#e9956c',.25);material('orange','#e8ad73',.35);material('gold','#d9b862',.6,.3);material('goldLight','#f1d58b',.45,.4);material('silver','#afc8c8',.65,.25);material('wood','#bfa683');material('skin','#deb899');material('leaf','#559d7d');material('leaf2','#77b693');material('glass','#b8e4db',.05,.15,{transparent:true,opacity:.28,depthWrite:false});material('led','#a0e6d6',.1,.25,{emissive:'#28bda5',emissiveIntensity:.5});material('black','#1d4f5a',.2);material('screen','#254e59',.2,.25,{emissive:'#286677',emissiveIntensity:.2});
 box(23.6,.65,15.8,mat.base,0,-.04,0);box(23.4,.13,15.6,mat.white,0,.35,0);box(22.4,.09,14.5,mat.floor,0,.46,0);
 // Individual terrazzo-like floor zones and inset boundaries.
 box(8.6,.045,7.8,new THREE.MeshStandardMaterial({color:'#c9e6dc',roughness:.8}),-6,.53,-2.8);
 box(5.4,.045,7.8,new THREE.MeshStandardMaterial({color:'#f4dac5',roughness:.8}),1.25,.53,-2.8);
 box(5.0,.045,12.3,new THREE.MeshStandardMaterial({color:'#eee4bd',roughness:.8}),7.3,.53,-.65);
 box(8.6,.045,4.7,new THREE.MeshStandardMaterial({color:'#e5dfce',roughness:.8}),-6,.53,4.05);
 box(5.4,.045,4.7,new THREE.MeshStandardMaterial({color:'#d8e0df',roughness:.8}),1.25,.53,4.05);
 for(let x=-10.5;x<=10.5;x+=1.5)box(.018,.01,14,mat.white,x,.565,0);
 for(let z=-6.5;z<=6.5;z+=1.5)box(22,.01,.018,mat.white,0,.566,z);
 // Back and side walls remain; roof and front wall are removed for the cutaway.
 box(22.6,3.5,.24,mat.wall,0,2.25,-7.1);box(.24,3.5,14.2,mat.wall,-11.25,2.25,0);
 box(.2,1.6,14.2,mat.glass,11.25,1.35,0);box(22.7,.18,.4,mat.white,0,4.05,-7.1);box(.4,.18,14.5,mat.white,-11.25,4.05,0);
 for(let x=-10;x<=10;x+=2.5){box(.08,2.5,.15,mat.white,x,2.4,-6.92);box(1.8,1.25,.03,mat.glass,x+.7,2.7,-6.94)}
 box(.15,1.5,7.7,mat.glass,-1.65,1.3,-2.8);box(.16,2.0,12.5,mat.glass,4.2,1.55,-.6);
 for(const x of [-1.65,4.2]){box(.1,.12,12.3,mat.silver,x,2.6,-.65);for(const z of [-6.6,0,5.5])box(.1,2.0,.1,mat.silver,x,1.55,z)}
 textBoard('JINGXU  /  MEMORY SYSTEMS',9,.8,-3,3.42,-6.94,55);
 // Overhead air handling services, visible against the rear wall.
 for(let x=5;x<=9;x+=2){box(1.5,.8,1.35,mat.white,x,4.3,-6.3);for(let k=0;k<5;k++)box(.09,.82,.9,mat.silver,x-.5+k*.24,4.32,-6.27)}
 const pipe=cyl(.13,18,mat.silver,-.5,3.85,-6.45);pipe.rotation.z=Math.PI/2;
 // Clean room: six wafer processing tools, inspection windows and operator terminals.
 for(let i=0;i<3;i++)for(let j=0;j<2;j++){
  const x=-9+i*2.35,z=-4.4+j*3.1;box(1.65,.15,2.15,mat.silver,x,.67,z);box(1.5,1.45,1.85,mat.white,x,1.46,z);box(1.52,.18,1.88,mat.teal,x,2.18,z);box(1.08,.55,.06,mat.darkTeal,x,1.64,z+.94);box(.82,.37,.07,mat.glass,x,1.66,z+.985);
  const led=box(.85,.055,.05,mat.led.clone(),x,2.13,z+.96);machineLeds.push(led);
  const wafer=cyl(.39,.06,mat.silver,x,1.29,z+1.05);wafer.rotation.x=Math.PI/2;box(.25,.32,.09,mat.screen,x+.57,1.58,z+.99);box(.1,.15,.1,mat.orange,x+.5,2.43,z-.5);
 }
 // Conveyor and moving discs on the front edge of the clean room.
 box(7.7,.18,.65,mat.darkTeal,-6,.94,.77);for(let k=0;k<20;k++){const roller=cyl(.05,.58,mat.silver,-9.5+k*.38,1.05,.77,undefined,8);roller.rotation.x=Math.PI/2}
 for(let i=0;i<4;i++){const w=cyl(.23,.045,mat.goldLight,-9+i*1.6,1.13,.77);waferMovers.push(w)}
 // HBM packaging islands: stacked copper dies on three machine pedestals.
 for(let j=0;j<2;j++)for(let i=0;i<2;i++){
  const x=-.5+i*2.5,z=-4.4+j*3.3;box(1.7,.7,2.3,mat.white,x,.96,z);box(1.6,.15,2.2,mat.coral,x,1.39,z);box(1.2,.18,1.4,mat.black,x,1.56,z);box(.55,.3,.07,mat.screen,x,1.03,z+1.18);
  for(let n=0;n<10;n++){const chip=box(.98,.095,1.14,n%2?mat.coral:mat.orange,x,1.73+n*.145,z);hbmStacks.push({mesh:chip,level:n})}
  for(const dx of [-.7,.7]){box(.055,1.6,.055,mat.silver,x+dx,2.0,z-.85);box(.055,1.6,.055,mat.silver,x+dx,2.0,z+.85)}box(1.5,.06,1.8,mat.glass,x,2.87,z);
 }
 // Warehouse: a shelving rack and pallets. Empty pallets persist when inventory is zero.
 for(let x=-9.6;x<-3;x+=2){box(1.6,.2,1.6,mat.wood,x,.68,4.4);for(let n=0;n<3;n++)for(let k=0;k<2;k++){const c=box(.63,.52,1.1,n%2?mat.orange:mat.wood,x-.36+k*.73,1.05+n*.57,4.4);inventoryCrates.push(c);box(.04,.02,1.5,mat.white,x-.5+k*.5,.79,4.4)}}
 for(let x=-9.7;x<=-3.5;x+=2.05){box(.07,1.6,.07,mat.darkTeal,x,1.35,2.3);box(.07,1.6,.07,mat.darkTeal,x,1.35,3.1)}for(let y=.65;y<2.2;y+=.72)box(6.2,.07,.9,mat.silver,-6.6,y,2.7);
 // Board room: rounded conference table, chairs, people and a performance screen.
 box(3.8,.18,1.6,mat.wood,1.1,1.15,4.1);for(const x of [-.2,2.4])box(.14,.6,.8,mat.navy,x,.8,4.1);
 for(let x=-.2;x<=2.5;x+=1.3)for(const z of [2.8,5.3]){box(.65,.15,.62,mat.teal,x,.9,z);box(.65,.55,.12,mat.darkTeal,x,1.15,z+(z<4?-.25:.25));box(.08,.5,.08,mat.silver,x,.65,z);box(.5,.01,.36,mat.white,x,1.26,z<4?3.65:4.55)}
 box(3.2,1.3,.14,mat.navy,1.1,2.0,1.6);for(let k=0;k<12;k++){const v=box(.16,.15,.04,mat.led,-.15+k*.22,1.52,1.69);boardChart.push(v)}
 person(2.7,5.15,mat.navy);person(-.1,2.8,mat.teal);
 // Vault: segmented cash stacks and debt indicator; architectural scale is illustrative.
 box(4.0,.25,3.5,mat.white,7.45,.7,-2.2);box(4.1,.08,3.55,mat.gold,7.45,.86,-2.2);
 for(let x=0;x<4;x++)for(let z=0;z<3;z++)for(let n=0;n<8;n++){
  const m=box(.72,.17,.75,n%2?mat.gold:mat.goldLight,6.1+x*.88,1.0+n*.21,-3.2+z*.9);cashStacks.push({mesh:m,level:n,order:x*3+z});
 }
 const door=cyl(1.05,.22,mat.silver,7.5,1.75,-5.7);door.rotation.x=Math.PI/2;const ring=new THREE.Mesh(new THREE.TorusGeometry(.72,.07,12,40),mat.gold);ring.position.set(7.5,1.75,-5.55);factory.add(ring);for(let n=0;n<3;n++){const handle=box(.08,1.2,.09,mat.darkTeal,7.5,1.75,-5.48);handle.rotation.z=n*Math.PI/3}
 for(let n=0;n<5;n++){const bar=box(.45,.3,.65,mat.coral,9.4,0.77+n*.36,3.0);debtBars.push(bar)}
 textBoard('CASH / DEBT',3,.5,7.4,1.2,5.8,62,'#f2e9cd','#99713f');
 // Loading apron, bollards, a delivery vehicle, people and plants give scale.
 box(22,.06,.8,mat.silver,0,.42,7.3);for(let x=-10;x<=10;x+=2)box(.08,.02,.55,mat.white,x,.47,7.3);
 for(const x of [-10.5,3.8,10.7])plant(x,6.25);person(-2.8,6.1);person(-10,0.5);
 const truck=new THREE.Group();factory.add(truck);truck.position.set(-6,.1,9.1);box(2.7,.85,1.35,mat.white,0,.75,0,truck);box(.75,.72,1.3,mat.teal,1.7,.69,0,truck);box(.04,.4,1.15,mat.glass,2.09,.87,0,truck);for(const x of [-.9,1.5])for(const z of [-.7,.7]){const wheel=cyl(.27,.17,mat.navy,x,.34,z,truck);wheel.rotation.x=Math.PI/2}box(1.9,.07,.04,mat.teal,-.1,.9,.69,truck);
}
function updateFactory(q){
 const o=q.operations,b=q.balance_sheet;machineLeds.forEach(m=>m.material.emissiveIntensity=q.decision.utilization*.85);
 inventoryCrates.forEach((m,n)=>m.visible=n<Math.ceil(b.inventory_kwafers/60*inventoryCrates.length));
 hbmStacks.forEach(({mesh,level})=>mesh.visible=o.hbm_qualified&&level<Math.ceil(o.hbm_kwafers/180*10));
 cashStacks.forEach(({mesh,level,order})=>mesh.visible=(level*12+order)<Math.max(1,Math.ceil(b.cash/152.9207*96)));
 debtBars.forEach((m,n)=>m.visible=n<Math.ceil((b.debt+b.emergency_debt)/9*5));
 boardChart.forEach((m,n)=>{const v=H[Math.min(n+4,index)].balance_sheet.equity/171.2457*.95+.04;m.scale.y=v/.15;m.position.y=1.5+v/2});
 for(const [id,r] of Object.entries(rooms))r.label.querySelector('small').textContent=id==='clean'?pct(q.decision.utilization):id==='warehouse'?b.inventory_kwafers.toFixed(1)+' 千片':id==='hbm'?o.hbm_kwafers.toFixed(1)+' 千片':id==='board'?f(b.equity):f(b.cash);
}
try{
 scene=new THREE.Scene();scene.fog=new THREE.Fog('#eff5ef',45,100);camera=new THREE.OrthographicCamera(-20,20,12,-12,.1,150);camera.position.set(24,25,31);camera.lookAt(0,.5,0);
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;renderer.setClearColor('#eff5ef',0);$('scene').appendChild(renderer.domElement);
 scene.add(new THREE.HemisphereLight('#f7fffb','#a5bba5',2.3));const sun=new THREE.DirectionalLight('#fff0d6',4.0);sun.position.set(-12,26,13);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-25;sun.shadow.camera.right=25;sun.shadow.camera.top=22;sun.shadow.camera.bottom=-22;sun.shadow.bias=-.0003;sun.shadow.normalBias=.03;sun.shadow.radius=4;scene.add(sun);const fill=new THREE.DirectionalLight('#b9e0ef',1.5);fill.position.set(15,10,-12);scene.add(fill);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#edf3e6',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.42;ground.receiveShadow=true;scene.add(ground);
 factory=new THREE.Group();scene.add(factory);buildFactory();sceneReady=true;window.factoryReady=true;
 const resize=()=>{const w=$('scene').clientWidth,h=$('scene').clientHeight;renderer.setSize(w,h);const aspect=w/h,half=w<600?14.4:12.6;camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;if(aspect<1.25){camera.left=-17.5;camera.right=17.5;camera.top=17.5/aspect;camera.bottom=-17.5/aspect}camera.zoom=zoom;camera.updateProjectionMatrix()};new ResizeObserver(resize).observe($('scene'));resize();
 let down=false,startX=0,startRot=0;
 renderer.domElement.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&!e.isPrimary)return;down=true;startX=e.clientX;startRot=rotTarget;renderer.domElement.setPointerCapture(e.pointerId)});
 renderer.domElement.addEventListener('pointermove',e=>{if(down)rotTarget=Math.max(-.85,Math.min(.85,startRot+(e.clientX-startX)*.004))});renderer.domElement.addEventListener('pointerup',()=>down=false);renderer.domElement.addEventListener('pointercancel',()=>down=false);
 $('reset-view').onclick=()=>{rotTarget=0;topTarget=false;zoom=1;resize()};$('top-view').onclick=()=>{topTarget=true;rotTarget=0};$('zoom-in').onclick=()=>{zoom=Math.min(1.4,zoom+.1);resize()};$('zoom-out').onclick=()=>{zoom=Math.max(.65,zoom-.1);resize()};
 const clock=new THREE.Clock(),v=new THREE.Vector3();
 function animate(){requestAnimationFrame(animate);const t=clock.getElapsedTime();factory.rotation.y+=(rotTarget-factory.rotation.y)*.07;const target=topTarget?new THREE.Vector3(0,43,.1):new THREE.Vector3(24,25,31);camera.position.lerp(target,.045);camera.lookAt(0,.5,0);
  waferMovers.forEach((w,j)=>w.position.x=-9.5+((t*H[index].decision.utilization*.6+j*1.7)%7.0));
  factory.updateMatrixWorld();camera.updateMatrixWorld();
  for(const r of Object.values(rooms)){v.copy(r.anchor).applyMatrix4(factory.matrixWorld).project(camera);const x=(v.x*.5+.5)*$('scene').clientWidth,y=(-v.y*.5+.5)*$('scene').clientHeight;r.label.style.left=x+'px';r.label.style.top=y+'px'}
  renderer.render(scene,camera);
 }animate();
}catch(err){$('webgl-error').hidden=false;console.error(err);window.factoryReady=false}
update();
