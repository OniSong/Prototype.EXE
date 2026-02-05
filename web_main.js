// Minimal Three.js + three-vrm viewer with simple AI call to /api/infer
import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.152.2/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.152.2/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'https://unpkg.com/three@0.152.2/examples/jsm/loaders/RGBELoader.js';
import { RoomEnvironment } from 'https://unpkg.com/three@0.152.2/examples/jsm/environments/RoomEnvironment.js';
import { VRM, VRMUtils } from 'https://unpkg.com/@pixiv/three-vrm@1.8.0/dist/three-vrm.module.js';

const container = document.getElementById('canvas-container');
const status = document.getElementById('status');

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x040204);

const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(0, 1.4, 2.6);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.2, 0);
controls.enableDamping = true;

const hemi = new THREE.HemisphereLight(0x8a6f50, 0x101020, 0.7);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xfff6e6, 0.8);
dir.position.set(2, 5, 1);
scene.add(dir);

const pmrem = new THREE.PMREMGenerator(renderer);
const env = new RoomEnvironment();
scene.environment = pmrem.fromScene(env).texture;

function buildRoom() {
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x2b1f1d, roughness: 0.95 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x2b261f, roughness: 1.0 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  const wallGeo = new THREE.PlaneGeometry(6, 3);
  const back = new THREE.Mesh(wallGeo, wallMat); back.position.set(0, 1.5, -3); scene.add(back);
  const left = new THREE.Mesh(wallGeo, wallMat); left.rotation.y = Math.PI/2; left.position.set(-3,1.5,0); scene.add(left);
  const right = new THREE.Mesh(wallGeo, wallMat); right.rotation.y = -Math.PI/2; right.position.set(3,1.5,0); scene.add(right);
}
buildRoom();

const gltfLoader = new GLTFLoader();
let currentVrm = null;

document.getElementById('file-input').addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f) return;
  status.textContent = `Loading ${f.name}...`;
  const arrayBuffer = await f.arrayBuffer();
  const blob = new Blob([arrayBuffer]);
  const url = URL.createObjectURL(blob);

  gltfLoader.load(url, (gltf) => {
    VRMUtils.removeUnnecessaryJoints(gltf.scene);
    VRM.from(gltf).then((vrm) => {
      if (currentVrm) { scene.remove(currentVrm.scene); currentVrm.dispose(); }
      currentVrm = vrm;
      vrm.scene.scale.set(1,1,1);
      vrm.scene.position.set(0.3, 0, 0.2);
      scene.add(vrm.scene);
      status.textContent = `Loaded ${f.name}`;
      URL.revokeObjectURL(url);
    }).catch((err) => { console.error(err); status.textContent = 'VRM parse failed'; URL.revokeObjectURL(url); });
  }, undefined, (err) => { console.error(err); status.textContent = 'Load failed'; URL.revokeObjectURL(url); });
});

// Simple AI call: POST /api/infer { inputText } -> returns JSON with lookAt [x,y,z] and blendshapes map
async function sendToAI(text){
  try{
    status.textContent = 'Contacting AI...';
    const res = await fetch('/api/infer', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({inputText: text})
    });
    const data = await res.json();
    status.textContent = 'AI response received.';
    applyAiResponse(data);
  }catch(e){
    console.error(e); status.textContent = 'AI request failed.';
  }
}

function applyAiResponse(resp){
  if (!resp || !currentVrm) return;
  // Apply lookAt if present (world coords)
  try {
    if (resp.lookAt && resp.lookAt.length >= 3) {
      const head = currentVrm.humanoid?.getBoneNode('head');
      if (head) head.lookAt(new THREE.Vector3(resp.lookAt[0], resp.lookAt[1], resp.lookAt[2]));
    }
  } catch(e){ console.warn(e); }
  // Apply blendshapes (if names match)
  try {
    if (resp.blendshapes && currentVrm.blendShapeProxy) {
      for (const k in resp.blendshapes){
        const v = Math.max(0, Math.min(1, resp.blendshapes[k])) * 100;
        try {
          currentVrm.blendShapeProxy.setValue( new VRM.BlendShapeKey(k), v );
        } catch(e){
          // try preset
          try { currentVrm.blendShapeProxy.setValue( VRM.BlendShapePreset[k], v ); } catch(e2) {}
        }
      }
      currentVrm.blendShapeProxy.apply();
    }
  } catch(e){ console.warn(e); }
}

document.getElementById('send-ai').addEventListener('click', () => {
  const text = document.getElementById('ai-text').value;
  if (text && text.length>0) sendToAI(text);
});

window.addEventListener('resize', ()=> {
  camera.aspect = container.clientWidth / container.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(container.clientWidth, container.clientHeight);
});

function animate(){ requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); }
animate();