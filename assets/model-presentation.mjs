// Viewer-only state: none of these controls participate in customer URLs or QR.
export function createModelPresentation(THREE, stage) {
  const viewport = stage.parentElement;
  const modes = {system:['Assembly','Traction elevator assembly','Orbit to inspect · scroll to zoom'],cabin:['Cabin','Cabin detail','Cabin panels, sill, doors and safety edge'],plan:['Plan','Shaft plan','Top view · cabin, entrances and counterweight']};
  const toolbar = document.createElement('div'); toolbar.className='model-tools'; toolbar.setAttribute('role','group'); toolbar.setAttribute('aria-label','Model views');
  for (const [key, item] of Object.entries(modes)) {const button=document.createElement('button');button.type='button';button.dataset.modelView=key;button.textContent=item[0];button.setAttribute('aria-pressed',String(key==='system'));toolbar.append(button);}
  const reset=document.createElement('button');reset.type='button';reset.className='model-reset';reset.textContent='↺';reset.setAttribute('aria-label','Reset model camera');toolbar.append(reset);viewport.append(toolbar);
  const caption=document.createElement('div');caption.className='model-caption';caption.innerHTML='<b></b><span></span>';viewport.append(caption);
  const journey=document.createElement('div');journey.className='model-journey';journey.innerHTML='<div class="model-floor-line"><span>Floor</span><div class="model-floor-buttons" role="group" aria-label="Go to floor"></div><button type="button" class="model-walls" aria-pressed="true" data-wall-mode="dark" aria-label="Shaft wall mode: dark">Shaft · dark</button></div><output class="model-floor-status" aria-live="polite"></output>';viewport.append(journey);
  const floorButtons=journey.querySelector('.model-floor-buttons'),wallButton=journey.querySelector('.model-walls'),floorStatus=journey.querySelector('output');
  let model, dimensions, labelLayer, mode='system', dimensionPreference=true, wallMode='dark', lastFloorState='';
  const perspective=stage._camera;
  const orthographic=new THREE.OrthographicCamera(-2,2,2,-2,.01,500);
  const Controls=stage._controls.constructor;
  function selectCamera(next=mode==='plan'?orthographic:perspective){
    if(stage._camera===next)return;
    stage._controls.dispose();stage._camera=next;
    stage._controls=new Controls(next,stage._renderer.domElement);
    stage._controls.enableDamping=true;stage._controls.dampingFactor=.08;
    stage._controls.enableRotate=mode!=='plan';
    next.aspect=stage.clientWidth/stage.clientHeight;
  }
  const darkShell=new THREE.MeshStandardMaterial({color:0x59635e,roughness:.92,metalness:0});
  const tintedShell=new THREE.MeshPhysicalMaterial({color:0x47675b,roughness:.28,metalness:0,transparent:true,opacity:.2,transmission:.12,depthWrite:false,side:THREE.DoubleSide});
  darkShell.userData.sharedPresentation=tintedShell.userData.sharedPresentation=true;
  const concreteNames=/^(wall_|front_wall_|rear_wall_)/;
  stage._renderer.toneMapping=THREE.ACESFilmicToneMapping;stage._renderer.toneMappingExposure=1.2;
  const rim=new THREE.DirectionalLight(0xe8fff5,1.4);rim.position.set(-5,8,5);stage._scene.add(rim);
  const light=new THREE.HemisphereLight(0xffffff,0x8b9b92,1.25);stage._scene.add(light);
  const front=new THREE.DirectionalLight(0xffffff,1.1);front.position.set(2,3,8);stage._scene.add(front);stage._scene.add(front.target);
  const rootVisible=(mesh,r,d)=>{
    if(mode==='system')return true;
    if(mode==='cabin')return mesh===r.car;
    if(mode==='plan')return mesh===r.car||mesh===r.cwt||mesh.name==='model_plan_outline';
    return true;
  };
  function apply(){
    if(!model)return;const r=model.userData.rig,d=r.dims;
    model.traverse(mesh=>{if(mesh.userData.presentationOriginalVisible===undefined)mesh.userData.presentationOriginalVisible=mesh.visible;mesh.visible=mesh.userData.presentationOriginalVisible;});
    for(const mesh of model.children)mesh.visible=mesh.visible&&rootVisible(mesh,r,d);
    model.traverse(mesh=>{if(concreteNames.test(mesh.name)){mesh.visible=mesh.visible&&wallMode!=='off';mesh.material=wallMode==='tinted'?tintedShell:darkShell;}});
    const wallLabels={dark:'Shaft · dark',tinted:'Shaft · tinted glass',off:'Shaft · walls off'};
    wallButton.dataset.wallMode=wallMode;wallButton.setAttribute('aria-pressed',String(wallMode!=='off'));wallButton.setAttribute('aria-label',`Shaft wall mode: ${wallMode}`);wallButton.textContent=wallLabels[wallMode];
    // Open a face for close inspection, while keeping the true interior envelope.
    if(mode==='cabin'||mode==='plan')r.car.traverse(mesh=>{
      if(mode==='cabin'&&/^(cab_wall_right|cab_ceiling$|cab_ceiling_diffuser|cab_downlight_|cab_ceiling_frame_)/.test(mesh.name))mesh.visible=false;
      if(mode==='plan'&&!/^(car$|car_platform$|cab_floor|cab_wall_|cab_return_|cab_rear_return_|cab_skirting_|car_door_\d|rear_car_door_\d|car_sill$|cab_rear_sill$|cab_handrail)/.test(mesh.name))mesh.visible=false;
    });
    if(mode==='plan')r.cwt.visible=true;
    const plan=model.getObjectByName('model_plan_outline');if(plan)plan.visible=mode==='plan';
    stage._ground.visible=mode==='system';
    if(dimensions)dimensions.visible=dimensionPreference&&mode==='system';
    if(labelLayer)labelLayer.style.display=dimensionPreference&&mode==='system'?'':'none';
    toolbar.querySelectorAll('[data-model-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.modelView===mode)));
    caption.firstElementChild.textContent=modes[mode][1];caption.lastElementChild.textContent=mode==='plan'?`Shaft ${r.params.shaftW} × ${r.params.shaftD} · Car ${r.params.carW} × ${r.params.carD} mm`:modes[mode][2];
    model.userData.presentationView=mode;
  }
  function reframe(){
    if(!model)return;selectCamera();const r=model.userData.rig,d=r.dims,cam=stage._camera,ctl=stage._controls;
    model.updateMatrixWorld(true);
    const box=new THREE.Box3();
    model.traverseVisible(mesh=>{if(mesh.isMesh||mesh.isLine){if(!mesh.geometry)return;if(mesh.isInstancedMesh){mesh.computeBoundingBox();if(mesh.boundingBox)box.union(mesh.boundingBox.clone().applyMatrix4(mesh.matrixWorld));}else{mesh.geometry.computeBoundingBox();if(mesh.geometry.boundingBox)box.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));}}});
    if(mode==='plan'){box.min.set(-d.sw/2,r.yc+.3,-d.sd/2);box.max.set(d.sw/2,r.yc+.3,d.sd/2);}
    if(box.isEmpty())return;
    const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
    const vf=45*Math.PI/360,hf=Math.atan(Math.tan(vf)*cam.aspect);
    const height=mode==='plan'?d.sd:size.y;
    const width=mode==='plan'?d.sw:Math.hypot(size.x,size.z);
    const screenH=stage.clientHeight||600,screenW=stage.clientWidth||800;
    const top=window.innerWidth<=900?164:90,bottom=170;
    const usable=Math.max(200,screenH-top-bottom);
    const distance=Math.max((height+(mode==='system'?1.2:0))/(2*Math.tan(vf))*screenH/usable,width/(2*Math.tan(hf)),1.5)*1.14;
    const direction=mode==='plan'?new THREE.Vector3(0,1,.000001):mode==='cabin'?new THREE.Vector3(.7,.3,1):new THREE.Vector3(.82,.24,1.25);
    if(mode==='plan'){
      const half=Math.max(d.sd*screenH/usable,d.sw/cam.aspect)*.6;
      Object.assign(cam,{left:-half*cam.aspect,right:half*cam.aspect,top:half,bottom:-half,zoom:1});
    }
    cam.setViewOffset(screenW,screenH,0,-(top-bottom)/2,screenW,screenH);
    ctl.target.copy(center);cam.position.copy(center).add(direction.normalize().multiplyScalar(mode==='plan'?r.top+10:distance));
    cam.near=.1;cam.far=Math.max(50,distance*4+size.length());cam.updateProjectionMatrix();
    ctl.minDistance=.25;
    const damping=ctl.enableDamping;ctl.enableDamping=false;ctl.update();ctl.enableDamping=damping;
    stage._key.position.set(center.x+7,center.y+10,center.z+8);stage._key.target.position.copy(center);stage._scene.add(stage._key.target);
    front.position.copy(center).add(new THREE.Vector3(1,2,6));front.target.position.copy(center);
  }
  toolbar.addEventListener('click',event=>{const button=event.target.closest('[data-model-view]');if(button){mode=button.dataset.modelView;viewport.dispatchEvent(new CustomEvent('model-view-change',{bubbles:true,detail:{mode}}));apply();}reframe();});
  reset.addEventListener('click',reframe);
  wallButton.addEventListener('click',()=>{wallMode=wallMode==='dark'?'tinted':wallMode==='tinted'?'off':'dark';if(mode!=='system')mode='system';apply();reframe();});
  floorButtons.addEventListener('click',event=>{const button=event.target.closest('[data-go-floor]');if(button)viewport.dispatchEvent(new CustomEvent('model-floor-request',{bubbles:true,detail:{floor:Number(button.dataset.goFloor)}}));});
  return {
    attach(next,dims,labels){
      model=next;dimensions=dims;labelLayer=labels;
      model.traverse(mesh=>{if(mesh.isMesh&&concreteNames.test(mesh.name)){mesh.material=darkShell;mesh.castShadow=false;}});
      const d=model.userData.rig.dims,y=model.userData.rig.yc+.32;
      const pts=[[-d.sw/2,y,-d.sd/2],[-d.sw/2,y,d.sd/2],[d.sw/2,y,d.sd/2],[d.sw/2,y,-d.sd/2],[-d.sw/2,y,-d.sd/2]].map(p=>new THREE.Vector3(...p));
      const outline=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x1b6f4d}));outline.name='model_plan_outline';outline.visible=false;model.add(outline);
      floorButtons.replaceChildren();lastFloorState='';
      model.userData.rig.floors.forEach((height,index)=>{const button=document.createElement('button');button.type='button';button.dataset.goFloor=String(index);button.textContent=String(index+1);button.setAttribute('aria-label',`Go to floor ${index+1}`);floorButtons.append(button);});
      apply();
    },
    reframe,
    beforeBuild(){selectCamera(perspective);},
    setMode(value){if(!modes[value])return;mode=value;apply();reframe();},
    setDimensions(value){dimensionPreference=value;apply();},
    updateTravel(pose,{targetIndex=null,pendingIndex=null,running=false}={}){
      if(!model||!pose)return;const floor=model.userData.rig.floors.findIndex(y=>Math.abs(y-pose.y)<.015);
      const state={floor,targetIndex,pendingIndex,running,doorsOpen:pose.door>.95};model.userData.travelState=state;
      const key=JSON.stringify(state);if(key===lastFloorState)return;lastFloorState=key;
      floorButtons.querySelectorAll('button').forEach(button=>{const i=Number(button.dataset.goFloor);button.setAttribute('aria-current',i===floor?'true':'false');button.setAttribute('aria-pressed',String(i===targetIndex||i===pendingIndex));});
      const target=pendingIndex??targetIndex;
      floorStatus.textContent=target!==null&&floor!==target?`${running?'Going to':'Paused · destination'} floor ${target+1}${pendingIndex!==null?' · queued':''}`:floor>=0?`Floor ${floor+1}${pose.door>.95?' · doors open':''}`:running?'Travelling':'Paused between floors';
    },
    get mode(){return mode;},
    get wallMode(){return wallMode;},
    refreshVisibility:apply,
  };
}
