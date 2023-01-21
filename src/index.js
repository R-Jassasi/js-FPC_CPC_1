import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import './styles.css';

// TASK 2

//let timer = setInterval(myTimer, 1000); //isn't it supposed to show something?
//function myTimer(){
//  let d = new Date();
//  document.getElementById("demo").innerHTML = d.toLocaleTimeString();
//}

// TASK 3.1

//document.getElementById("app").innerHTML =`
//<h1>Hello Vanilla</h1>
//<div>
//  We use the same configuration as Parcel to bundle this sandbox, you can find more
//  info about Parcel
//  <a href="https://parceljs.org" target="_blank" rel="noopener noreferrer">here</a>
//</div>`

// TASK 3.2

let scene, camera, renderer;
let geometry, material, cube;
let colour, intensity, light;
let ambientLight;
let keyboard = {};
let player = { height: 1.8, speed: 0.09, turnSpeed: Math.PI * 0.008 };
let orbit, controls;
let loader, modelLoaded;
let tv, arcade;

let listener, sound, audioLoader;

let clock, delta, interval;

let sceneHeight, sceneWidth;

let size, divisions;

let startButton = document.getElementById('startButton');
startButton.addEventListener('click', init);

function init() {
  //alert("We have initialised!");
  let overlay = document.getElementById('overlay');
  overlay.remove();

  sceneWidth = window.innerWidth;
  sceneHeight = window.innerHeight;

  modelLoaded = false;

  //create our clock and set interval at 30 fpx
  clock = new THREE.Clock();
  delta = 0;
  interval = 1 / 60;

  //create the scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfe9f3);

  //create fog https://www.youtube.com/watch?v=k1zGz55EqfU&ab_channel=SimonDev
  const fog = new THREE.FogExp2(0xdfe9f3, 0.009);
  scene.fog = fog;

  //creating camera (fos,aspect,near,far)
  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 10;
  camera.position.y = player.height;
  camera.lookAt(new THREE.Vector3(0, player.height, 0));

  //SKY
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(10000, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0x8080ff,
      side: THREE.BackSide,
    })
  );
  scene.add(sky);

  //TREES Simon Dev Channel https://www.youtube.com/watch?v=k1zGz55EqfU&ab_channel=SimonDev
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x808080 });
  const leavesMat = new THREE.MeshStandardMaterial({ color: 0x80ff80 });
  const trunkGeo = new THREE.BoxGeometry(1, 1, 1);
  const leavesGeo = new THREE.ConeGeometry(1, 1, 10);
  for (let x = 0; x < 30; ++x) {
    for (let y = 0; y < 30; ++y) {
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      const leaves = new THREE.Mesh(leavesGeo, leavesMat);
      trunk.scale.set(2, (Math.random() + 1.0) * 5.0, 2);
      trunk.position.set(
        1000.0 * (Math.random() * 2.0 - 1.0),
        trunk.scale.y / 2.0,
        1000.0 * (Math.random() * 2.0 - 1.0)
      );
      leaves.scale.copy(trunk.scale);
      leaves.scale.set(10, trunk.scale.y * 2, 10);
      leaves.position.set(
        trunk.position.x,
        leaves.scale.y / 2 + (Math.random() + 1) * 2,
        trunk.position.z
      );
      scene.add(trunk);
      scene.add(leaves);
    }
  }

  //skybox https://www.youtube.com/watch?v=PPwR7h5SnOE
  let skyboxLoader = new THREE.CubeTextureLoader();
  let skyboxTexture = skyboxLoader.load([
    './assets/skybox/xpos.png',
    './assets/skybox/xneg.png',
    './assets/skybox/ypos.png',
    './assets/skybox/yneg.png',
    './assets/skybox/zpos.png',
    './assets/skybox/zneg.png',
  ]);
  //scene.background = skyboxTexture;

  //plane (ground) https://www.youtube.com/watch?v=PPwR7h5SnOE
  let plane = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xc3ebcd })
  );
  plane.castShadow = false;
  plane.receiveShadow = true;
  plane.rotation.x = -Math.PI / 2;
  scene.add(plane);

  //specify and adding renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  //create orbit controls to interact with mouse
  //orbit = new OrbitControls(camera, renderer.domElement);
  //orbit.enableZoom = true;

  // lighting
  colour = 0xffffff;
  intensity = 1;
  light = new THREE.DirectionalLight(colour, intensity);
  light.position.set(100, 100, 100);
  light.target.position.set(0, 0, 0);
  light.castShadow = true;
  scene.add(light);
  ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // create a box to spin
  geometry = new THREE.BoxGeometry();
  material = new THREE.MeshNormalMaterial(); // Change this from normal to Phong in step 5
  cube = new THREE.Mesh(geometry, material);
  cube.position.set(0, 1, 0);
  cube.castShadow = true;
  cube.receiveShadow = true;
  //scene.add(cube);

  //SOUND (for single source and single listener)
  listener = new THREE.AudioListener();
  camera.add(listener);
  sound = new THREE.PositionalAudio(listener);

  audioLoader = new THREE.AudioLoader();
  audioLoader.load('./sounds/CPC_Basic_Drone_Loop.mp3', function (buffer) {
    sound.setBuffer(buffer);
    sound.setRefDistance(10); //a double value representing the reference distance for reducing volume as the audio source moves further from the listener – i.e. the distance at which the volume reduction starts taking effect. This value is used by all distance models.
    sound.setDirectionalCone(180, 230, 0.1);
    sound.setLoop(true);
    sound.setVolume(0.5);
    sound.play();
  });

  //resize window
  window.addEventListener('resize', onWindowResize, false);

  //strech goal: add gridHelper
  size = 20;
  divisions = 20;
  let gridHelper = new THREE.GridHelper(size, divisions);
  scene.add(gridHelper);

  //loading models
  loadModels();

  play();
}

//stop animation
function stop() {
  renderer.setAnimationLoop(null);
}

// simple render function
function render() {
  //keyboard movement

  //W key
  if (keyboard[87]) {
    camera.position.x -= Math.sin(camera.rotation.y) * player.speed;
    camera.position.z -= Math.cos(camera.rotation.y) * player.speed;
  }
  //S key
  if (keyboard[83]) {
    camera.position.x += Math.sin(camera.rotation.y) * player.speed;
    camera.position.z += Math.cos(camera.rotation.y) * player.speed;
  }
  //A key
  if (keyboard[65]) {
    camera.position.x +=
      Math.sin(camera.rotation.y - Math.PI / 2) * player.speed;
    camera.position.z +=
      Math.cos(camera.rotation.y - Math.PI / 2) * player.speed;
  }
  //D key
  if (keyboard[68]) {
    camera.position.x +=
      Math.sin(camera.rotation.y + Math.PI / 2) * player.speed;
    camera.position.z +=
      Math.cos(camera.rotation.y + Math.PI / 2) * player.speed;
  }
  // Keyboard turn inputs

  //left E key
  if (keyboard[81]) {
    camera.rotation.y += player.turnSpeed;
  }
  //right Q key
  if (keyboard[69]) {
    camera.rotation.y -= player.turnSpeed;
  }
  renderer.render(scene, camera);
  //controls.update(clock.getDelta());
}

//start animation
function play() {
  //callback — The function will be called every available frame. If null is passed it will stop any already ongoing animation
  renderer.setAnimationLoop(() => {
    update();
    render();
  });
}

//our update function
function update() {
  //orbit.update();
  delta += clock.getDelta();

  cube.rotation.x += 0.01;
  cube.rotation.y += 0.04;
  cube.rotation.z -= 0.01;
}

function onWindowResize() {
  sceneHeight = window.innerHeight;
  sceneWidth = window.innerWidth;
  renderer.setSize(sceneWidth, sceneHeight);
  camera.aspect = sceneWidth / sceneHeight;
  // Always call updateProjectionMatrix on camera change
  camera.updateProjectionMatrix();
}

//3D models
function loadModels() {
  const loader = new GLTFLoader();

  //TV
  const TV = function (gltf, position) {
    // this callback handles loading a tv
    tv = gltf.scene.children[0];
    tv.scale.multiplyScalar(1 / 200);
    tv.position.copy(position);

    modelLoaded = true; // once our model has loaded, set our modelLoaded boolean flag to true
    scene.add(tv);
  };

  //----------------------------------------------------
  //ARCADE
  const ARCADE = function (gltf, position) {
    // this callback handles loading a ARCADE
    arcade = gltf.scene.children[0];
    arcade.scale.multiplyScalar(1 / 200);
    arcade.position.copy(position);

    modelLoaded = true; // once our model has loaded, set our modelLoaded boolean flag to true
    scene.add(arcade);
  };

  //----------------------------------------------------
  //the loader will report the loading status to this function
  const onProgress = function () {
    console.log('progress');
  };

  // the loader will send any error messages to this function
  const onError = function (errorMessage) {
    console.log(errorMessage);
  };

  //----------------------------------------------------
  //inital positions for the models
  const tvPos = new THREE.Vector3(20, 0, 0);

  //laod the GLTF file with all required callback functions
  loader.load(
    'models/black_and_white_belweder__ot_1782_tv_set.glb', //file path
    function (gltf) {
      //specify the callback unction to call the tv once it's loaded
      TV(gltf, tvPos);
    },
    onProgress, //specify progress callback
    onError //specify error callback
  );
  //----------------------------------------------------
  //inital positions for the models
  const arcadePos = new THREE.Vector3(0, 0, 0);

  //laod the GLTF file with all required callback functions
  loader.load(
    'models/arcade_game_machine_001.glb', //file path
    function (gltf) {
      //specify the callback unction to call the ARCADE once it's loaded
      ARCADE(gltf, arcadePos);
    },
    onProgress, //specify progress callback
    onError //specify error callback
  );
  //----------------------------------------------------
}

function keyDown(event) {
  keyboard[event.keyCode] = true;
}

function keyUp(event) {
  keyboard[event.keyCode] = false;
}
window.addEventListener('keydown', keyDown);
window.addEventListener('keyup', keyUp);
