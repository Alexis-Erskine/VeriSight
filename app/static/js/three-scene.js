document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('three-bg');
  if (!container) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const geometry = new THREE.IcosahedronGeometry(2, 0);
  const material = new THREE.MeshPhongMaterial({
    color: 0x00b4ff,
    wireframe: true,
    transparent: true,
    opacity: 0.15,
  });
  const icosahedron = new THREE.Mesh(geometry, material);
  scene.add(icosahedron);

  const particlesGeo = new THREE.BufferGeometry();
  const particlesCount = 2000;
  const positions = new Float32Array(particlesCount * 3);
  const colors = new Float32Array(particlesCount * 3);

  for (let i = 0; i < particlesCount * 3; i += 3) {
    const radius = 15 + Math.random() * 25;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i + 2] = radius * Math.cos(phi);
    const color = new THREE.Color().setHSL(0.55 + Math.random() * 0.15, 1, 0.5);
    colors[i] = color.r;
    colors[i + 1] = color.g;
    colors[i + 2] = color.b;
  }

  particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.08,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
  });

  const particles = new THREE.Points(particlesGeo, particleMaterial);
  scene.add(particles);

  const light = new THREE.DirectionalLight(0x00b4ff, 1);
  light.position.set(1, 1, 1);
  scene.add(light);

  const light2 = new THREE.DirectionalLight(0x8b5cf6, 0.5);
  light2.position.set(-1, -1, 0.5);
  scene.add(light2);

  const ambient = new THREE.AmbientLight(0x222244);
  scene.add(ambient);

  camera.position.z = 10;

  let mouseX = 0;
  let mouseY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function animate() {
    requestAnimationFrame(animate);

    icosahedron.rotation.x += 0.002;
    icosahedron.rotation.y += 0.004;

    particles.rotation.x += 0.0003;
    particles.rotation.y += 0.0005;

    icosahedron.position.x += (mouseX * 0.5 - icosahedron.position.x) * 0.02;
    icosahedron.position.y += (-mouseY * 0.5 - icosahedron.position.y) * 0.02;

    renderer.render(scene, camera);
  }

  animate();
});
