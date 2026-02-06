/* SMOKE GENERATOR - ORIENTED STRAND SIMULATION */
const smokeCanvas = document.getElementById('smokeCanvas');
const ctx = smokeCanvas ? smokeCanvas.getContext('2d', { alpha: true }) : null;

let smokeButtonRect = null;
let particles = [];
let particleTexture = null;

const DEFAULT_SMOKE_FORCE = { x: 0, y: -1 };
const smokeForce = { x: DEFAULT_SMOKE_FORCE.x, y: DEFAULT_SMOKE_FORCE.y };
const smokeForceTarget = { x: DEFAULT_SMOKE_FORCE.x, y: DEFAULT_SMOKE_FORCE.y };
const isMobileDevice =
  window.matchMedia('(pointer: coarse)').matches ||
  /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
let motionListenersAttached = false;

// Guardar posición inicial (nunca se borra)
let initialButtonRect = null;

// CONFIGURACIÓN FINA
const CONFIG = {
  emission: 1,
  speed: 0.05,
  drag: 0.998,
  buoyancy: 0.002,
  curlScale: 0.002,
  noiseSpeed: 0.00002,
  drift: 0.003,
  motionSmoothing: 0.08,
  minGravityMagnitude: 1.5
};

function normalizeVector(x, y, fallback = DEFAULT_SMOKE_FORCE) {
  const length = Math.hypot(x, y);
  if (!length) return { x: fallback.x, y: fallback.y };
  return { x: x / length, y: y / length };
}

function getScreenAngle() {
  if (screen.orientation && typeof screen.orientation.angle === 'number') {
    return screen.orientation.angle;
  }
  if (typeof window.orientation === 'number') {
    return window.orientation;
  }
  return 0;
}

function rotateToScreenCoordinates(x, y, angleDeg) {
  const radians = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos
  };
}

function updateSmokeForceTargetFromGravity(gx, gy) {
  const mapped = rotateToScreenCoordinates(gx, gy, getScreenAngle());
  const magnitude = Math.hypot(mapped.x, mapped.y);
  if (magnitude < CONFIG.minGravityMagnitude) return;

  const up = normalizeVector(mapped.x, -mapped.y, smokeForceTarget);
  smokeForceTarget.x = up.x;
  smokeForceTarget.y = up.y;
}

function handleDeviceMotion(event) {
  const gravity = event.accelerationIncludingGravity;
  if (!gravity) return;

  const gx = Number.isFinite(gravity.x) ? gravity.x : 0;
  const gy = Number.isFinite(gravity.y) ? gravity.y : 0;
  updateSmokeForceTargetFromGravity(gx, gy);
}

function requiresMotionPermission() {
  return (
    typeof DeviceMotionEvent !== 'undefined' &&
    typeof DeviceMotionEvent.requestPermission === 'function'
  );
}

async function enableMobileSmokeMotion() {
  if (!isMobileDevice || motionListenersAttached) return;

  if (requiresMotionPermission()) {
    try {
      const permissionState = await DeviceMotionEvent.requestPermission();
      if (permissionState !== 'granted') return;
    } catch (_) {
      return;
    }
  }

  window.addEventListener('devicemotion', handleDeviceMotion, { passive: true });
  motionListenersAttached = true;
}

function setupMobileMotionPermissionTrigger() {
  if (!isMobileDevice || !requiresMotionPermission()) return;

  const button = document.querySelector('#heroSection .big-btn');
  if (!button) return;

  const requestMotionAccess = () => {
    enableMobileSmokeMotion();
  };

  button.addEventListener(
    'pointerdown',
    requestMotionAccess,
    { passive: true, once: true }
  );
  button.addEventListener(
    'touchstart',
    requestMotionAccess,
    { passive: true, once: true }
  );
  button.addEventListener(
    'click',
    requestMotionAccess,
    { passive: true, once: true }
  );
}

// 1. TEXTURA: "MANCHA ALARGADA"
function createSmokeBrush() {
  const w = 64;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const tCtx = canvas.getContext('2d');
  
  const grad = tCtx.createLinearGradient(w/2, 0, w/2, h);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.2, 'rgba(180, 190, 200, 0.05)');
  grad.addColorStop(0.5, 'rgba(180, 190, 200, 0.15)');
  grad.addColorStop(0.8, 'rgba(180, 190, 200, 0.05)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  
  tCtx.filter = 'blur(8px)';
  tCtx.fillStyle = grad;
  tCtx.fillRect(10, 0, w-20, h);
  
  return canvas;
}

if (ctx) {
  particleTexture = createSmokeBrush();
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  if (!smokeCanvas) return;
  smokeCanvas.width = window.innerWidth;
  smokeCanvas.height = window.innerHeight;
}

function updateSmokeSourcePosition() {
  const button = document.querySelector('#heroSection .big-btn');
  const heroSection = document.getElementById('heroSection');
  
  // Verificaciones de seguridad:
  // 1. Elementos existen
  // 2. No tiene clase hidden
  // 3. Estamos en la pestaña HOME (btnLoad seleccionado)
  // 4. No se está animando la entrada (dataset.isAnimating)
  
  const isHomeTab = document.querySelector('#btnLoad')?.classList.contains('selected');
  const isAnimating = heroSection?.dataset.isAnimating === 'true';
  const isHidden = heroSection?.classList.contains('hidden');
  
  const isVisible = button && heroSection && !isHidden && isHomeTab && !isAnimating;
  
  if (isVisible && button) {
    const newRect = button.getBoundingClientRect();
    
    // Evitar actualización si el botón está colapsado o muy pequeño (animación en curso)
    // Esto previene que la brasa aparezca en (0,0) o posiciones incorrectas.
    if (newRect.width < 50 || newRect.height < 50) {
        const glow = document.getElementById('cigaretteGlow');
        if (glow) glow.style.display = 'none';
        return;
    }
    
    // Guardar posición inicial y actualizar siempre que esté visible
    initialButtonRect = newRect;
    smokeButtonRect = newRect;
    
    const glow = document.getElementById('cigaretteGlow');
    if (glow) {
        glow.style.display = 'block';
        // Ajuste fino: Asegurar enteros para evitar subpixel rendering issues
        const centerX = Math.round(smokeButtonRect.left + smokeButtonRect.width / 2);
        const topY = Math.round(smokeButtonRect.top + smokeButtonRect.height * 0.56);
        
        glow.style.left = (centerX - 28) + 'px';
        glow.style.top = topY + 'px';
    }
  } else {
    smokeButtonRect = null;
    
    const glow = document.getElementById('cigaretteGlow');
    if (glow) {
        glow.style.display = 'none';
    }
  }
}

// RUIDO SIMPLEX (Optimizado)
const p = new Uint8Array(256);
for(let i=0; i<256; i++) p[i] = i;
for(let i=0; i<256; i++) {
    let r = Math.floor(Math.random()*256);
    let t = p[i]; p[i] = p[r]; p[r] = t;
}
const perm = new Uint8Array(512);
for(let i=0; i<512; i++) perm[i] = p[i & 255];

function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(t, a, b) { return a + t * (b - a); }
function grad(hash, x, y, z) {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}
function noise(x, y, z) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z);
  const A = perm[X]+Y, AA = perm[A]+Z, AB = perm[A+1]+Z;
  const B = perm[X+1]+Y, BA = perm[B]+Z, BB = perm[B+1]+Z;
  return lerp(w, lerp(v, lerp(u, grad(perm[AA], x, y, z), grad(perm[BA], x-1, y, z)),
                         lerp(u, grad(perm[AB], x, y-1, z), grad(perm[BB], x-1, y-1, z))),
                  lerp(v, lerp(u, grad(perm[AA+1], x, y, z-1), grad(perm[BA+1], x-1, y, z-1)),
                         lerp(u, grad(perm[AB+1], x, y-1, z-1), grad(perm[BB+1], x-1, y-1, z-1))));
}

// PARTÍCULA "SEDA"
class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 0.02;
    this.vy = -CONFIG.speed - Math.random() * 0.1;
    this.life = 1.0;
    this.decay = 0.0005 + Math.random() * 0.0003;
    this.width = 0.5;
    this.height = 2;
    this.angle = 0;
  }

  update() {
    this.life -= this.decay;
    const time = Date.now() * CONFIG.noiseSpeed;
    const n1 = noise(this.x * CONFIG.curlScale, this.y * CONFIG.curlScale, time);
    const n2 = noise(this.x * CONFIG.curlScale + 100, this.y * CONFIG.curlScale, time);
    
    let turbulence = 0;
    if (this.life < 0.95) turbulence = (0.95 - this.life) * 0.08;
    
    this.vx += n1 * turbulence * 0.05;
    this.vy += n2 * turbulence * 0.05;
    this.vx += smokeForce.x * CONFIG.buoyancy;
    this.vy += smokeForce.y * CONFIG.buoyancy;
    this.vx += (Math.random() - 0.5) * CONFIG.drift;
    this.vx *= CONFIG.drag;
    this.vy *= CONFIG.drag;
    
    this.x += this.vx;
    this.y += this.vy;
    
    const ceiling = 20;
    if (this.y < ceiling) {
      this.y = ceiling;
      this.vy = Math.abs(this.vy) * 0.5;
    }
    
    this.angle = Math.atan2(this.vx, this.vy) + Math.PI;
    this.width += 0.01;
    this.height += 0.05;
    
    return this.life > 0;
  }

  draw() {
    if (!ctx || !particleTexture) return;
    let alpha = this.life * 0.6;
    if (this.life > 0.9) alpha = (1 - this.life) * 5;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(-this.angle);
    ctx.drawImage(particleTexture, -this.width/2, -this.height/2, this.width, this.height);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

function animateSmoke() {
  if (!ctx) return;
  ctx.clearRect(0, 0, smokeCanvas.width, smokeCanvas.height);

  smokeForce.x += (smokeForceTarget.x - smokeForce.x) * CONFIG.motionSmoothing;
  smokeForce.y += (smokeForceTarget.y - smokeForce.y) * CONFIG.motionSmoothing;
  const normalized = normalizeVector(smokeForce.x, smokeForce.y, DEFAULT_SMOKE_FORCE);
  smokeForce.x = normalized.x;
  smokeForce.y = normalized.y;
  
  if (smokeButtonRect) {
    const spawnX = smokeButtonRect.left + smokeButtonRect.width / 2 - 28;
    const spawnY = smokeButtonRect.top + smokeButtonRect.height * 0.56;
    if (Math.random() < 0.8) {
        particles.push(new Particle(spawnX, spawnY));
    }
  }
  
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    if (p.update()) {
      p.draw();
    } else {
      particles.splice(i, 1);
    }
  }
  requestAnimationFrame(animateSmoke);
}

window.addEventListener('scroll', updateSmokeSourcePosition, { passive: true });
window.addEventListener('resize', updateSmokeSourcePosition, { passive: true });

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
      const target = mutation.target;
      // Si el heroSection se está mostrando (no tiene hidden), ignoramos esta llamada
      // y esperamos al evento 'transitionend' para calcular la posición final estable.
      if (target.id === 'heroSection' && !target.classList.contains('hidden')) {
          return;
      }
      updateSmokeSourcePosition();
    }
  });
});

const heroSection = document.getElementById('heroSection');
if (heroSection) {
  observer.observe(heroSection, { attributes: true });
  heroSection.addEventListener('transitionend', () => {
    // La animación terminó, liberamos el bloqueo
    heroSection.dataset.isAnimating = 'false';
    
    // Doble verificación para asegurar posición final estable
    updateSmokeSourcePosition();
    setTimeout(updateSmokeSourcePosition, 100);
  });
}

// Recalcular posición cuando cambia el tamaño del cuerpo (por ejemplo, al aparecer scrollbars)
if (window.ResizeObserver) {
  const resizeObserver = new ResizeObserver(() => {
    updateSmokeSourcePosition();
  });
  resizeObserver.observe(document.body);
}

setTimeout(() => {
  const heroSection = document.getElementById('heroSection');
  if (heroSection) {
      // Limpieza inicial: aseguramos que no quede bloqueado al inicio
      heroSection.dataset.isAnimating = 'false';
  }

  if (isMobileDevice) {
    if (requiresMotionPermission()) {
      setupMobileMotionPermissionTrigger();
    } else {
      enableMobileSmokeMotion();
    }
  }

  updateSmokeSourcePosition();
  animateSmoke();
}, 500);
