/* Adli AR Dedektif – Kart modu (MindAR) eklentisi v1
   Kullanım: index.html içinde ana <script> bloğunun HEMEN ARDINA, </body> öncesine ekle:
   <script src="kart.js"></script>
   Oyundaki HUD'a "Kart" düğmesi eklenir. Kart modunda deliller örnek hedef kartın etrafında sabitlenir. */
(function(){
const $=id=>document.getElementById(id);
const MS=new THREE.Matrix4().makeRotationX(Math.PI/2).scale(new THREE.Vector3(.5,.5,.5)); // oda → kart uzayı, ölçek 0.5
let KM=false,busy=false,fr=null,kg=null,last=null,grps=[],sv=null,found=false,tm=0;

// MindAR + A-Frame ayrı bir iframe içinde çalışır (three.js sürümleri çakışmasın diye)
function inner(){
 const SRC={
  m1:['https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.1.4/dist/mindar-image.prod.js'],
  af:['https://cdn.jsdelivr.net/npm/aframe@1.2.0/dist/aframe.min.js','https://cdnjs.cloudflare.com/ajax/libs/aframe/1.2.0/aframe.min.js'],
  m2:['https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.1.4/dist/mindar-image-aframe.prod.js']};
 const MIND='https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.1.4/examples/image-tracking/assets/card-example/card.mind';
 const load=u=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=u;s.onload=ok;s.onerror=()=>no(u);document.head.appendChild(s)});
 const first=async n=>{for(const u of SRC[n]){try{await load(u);return}catch(e){}}throw new Error(n)};
 const send=m=>parent.postMessage(Object.assign({k:1},m),'*');
 (async()=>{
  try{await first('m1');await first('af');await first('m2')}catch(e){send({err:'Kütüphaneler yüklenemedi (internet?)'});return}
  document.body.innerHTML='<a-scene mindar-image="imageTargetSrc: '+MIND+';" color-space="sRGB" renderer="colorManagement: true, physicallyCorrectLights" vr-mode-ui="enabled: false" device-orientation-permission-ui="enabled: false"><a-camera position="0 0 0" look-controls="enabled: false"></a-camera><a-entity id="ktg" mindar-image-target="targetIndex: 0"></a-entity></a-scene>';
  const sc=document.querySelector('a-scene'),tg=document.getElementById('ktg');
  sc.addEventListener('arReady',()=>send({ready:1}));
  sc.addEventListener('arError',()=>send({err:'Kamera/MindAR başlatılamadı (izin? HTTPS?)'}));
  (function tick(){requestAnimationFrame(tick);if(!sc.camera)return;const o=tg.object3D;
   send({f:o.visible?1:0,p:Array.from(sc.camera.projectionMatrix.elements),m:Array.from(o.matrix.elements)})})();
 })();
}

const kms=document.createElement('div');
kms.style.cssText='position:fixed;left:10px;right:10px;top:calc(56px + env(safe-area-inset-top,0px));z-index:5;padding:8px;border-radius:10px;background:rgba(0,0,0,.75);text-align:center;display:none;pointer-events:none;color:#fff;font:14px sans-serif';
document.body.appendChild(kms);
function kmsg(t,ms){clearTimeout(tm);kms.textContent=t;kms.style.display=t?'block':'none';if(t&&ms)tm=setTimeout(()=>{kms.style.display='none'},ms)}

function toCard(){kg=new THREE.Group();kg.matrixAutoUpdate=false;kg.visible=false;
 grps=scene.children.filter(c=>c.isGroup);scene.add(kg);
 sv={sy:sp.map(s=>s.position.y),gy:grps.map(g=>g.position.y)};
 sp.forEach(s=>{s.position.y=.55;kg.add(s)});grps.forEach(g=>{g.position.y=0;kg.add(g)});
 if(line)line.visible=false;if(mLine)mLine.visible=false;grid.visible=false}
function fromCard(){
 sp.forEach((s,i)=>{s.position.y=sv.sy[i];scene.add(s)});grps.forEach((g,i)=>{g.position.y=sv.gy[i];scene.add(g)});
 scene.remove(kg);if(line)line.visible=true;if(mLine)mLine.visible=true}

async function enter(){if(busy||KM)return;busy=true;kmsg('Kart modu açılıyor...');
 try{if(tv)$('bv').click();
  const s=$('v').srcObject;if(s)s.getTracks().forEach(t=>t.stop());$('v').style.display='none';
  fr=document.createElement('iframe');fr.allow='camera';
  fr.style.cssText='position:fixed;inset:0;width:100%;height:100%;border:0;z-index:-1;pointer-events:none;background:#000';
  fr.srcdoc='<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#000;overflow:hidden}</style></head><body><scr'+'ipt>('+inner.toString()+')()</scr'+'ipt></body></html>';
  document.body.appendChild(fr);toCard();KM=true;found=false;last=null;$('bk').classList.add('on');
 }catch(e){kmsg('Kart modu açılamadı: '+(e.message||e),4000);await exit()}
 busy=false}
async function exit(){if(!KM&&!fr)return;if(KM)fromCard();KM=false;if(fr){fr.remove();fr=null}last=null;
 cam.updateProjectionMatrix();cam.quaternion.set(0,0,0,1);$('bk').classList.remove('on');kmsg('');
 await new Promise(r=>setTimeout(r,400));
 try{const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
  $('v').srcObject=s;$('v').style.display='block';await $('v').play()}catch(e){kmsg('Kamera hatası: '+e.name,4000)}}

addEventListener('message',e=>{const d=e.data;if(!d||d.k!==1||!fr)return;
 if(d.err){kmsg(d.err,5000);exit();return}
 if(d.ready){kmsg('Hazır. Kartı kameraya göster.',4000);return}
 if(d.p){last=d;if(d.f&&!found){found=true;kmsg('Kart bulundu',1500)}else if(!d.f&&found){found=false;kmsg('Kart görünmüyor: kameraya göster')}}});

// Ana oyunun orient() fonksiyonunu sar: kart modunda kamerayı karttan al
const _o=orient;
orient=function(){if(!KM)return _o();if(!last||!last.p)return;
 cam.position.set(0,0,0);cam.quaternion.set(0,0,0,1);
 cam.projectionMatrix.fromArray(last.p);cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
 kg.visible=!!last.f;if(last.f){kg.matrix.fromArray(last.m).multiply(MS);kg.matrixWorldNeedsUpdate=true}};
// Ölçüm çizgisi ve lazer kart modunda kartın içinde çizilsin
const _m=measure;measure=function(i){if(KM&&mLine&&mLine.parent===kg)kg.remove(mLine);_m(i);if(KM&&mLine&&mLine.parent===scene)kg.add(mLine)};
const _l=laser;laser=function(){_l();if(KM&&line&&line.parent===scene)kg.add(line)};

$('fin').insertAdjacentHTML('beforebegin','<button id="bk">Kart</button> ');
$('bk').onclick=()=>KM?exit():enter();
})();
