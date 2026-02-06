function rules(){
  setActiveTab('#btnRules');
  toggleHeroSection(false);
  
  const ruleContent = [
    { t: 'Artículo 1° – Objeto', c: 'El presente reglamento tiene por objeto establecer las normas de organización, participación y funcionamiento de las peñas, así como los criterios de asistencia, registro y eventuales sanciones o reconocimientos.' },
    { t: 'Artículo 2° – Asistencia y obligación', c: 'El presente artículo establece un régimen sancionatorio por inasistencia a las peñas. El 30 de junio del corriente año se cerrará el período Clausura y se evaluará la asistencia semestral, identificando a los dos participantes con menor concurrencia, quienes deberán asumir conjuntamente el costo de un asado para todos. Luego se reiniciará el cómputo de asistencias para el período Apertura, que finalizará el 31 de diciembre, aplicándose los mismos criterios.'},
    { t: 'Artículo 2.1° – Desempate en sanción por asistencia', c: 'Ante un empate en la menor asistencia al cierre del período, perderá aquel con menor porcentaje de victorias en truco. Si el porcentaje también estuviere igualado, los participantes empatados podrán acordar de común acuerdo el método de desempate, siempre que cuente con el consentimiento de todos los involucrados.'},
    { t: 'Artículo 3° – Frecuencia', c: 'Las peñas se llevarán a cabo los días viernes o sábado, siempre y cuando se cuente con un mínimo de tres (3) participantes confirmados. En ausencia de dicho mínimo, la realización de la peña quedará automáticamente suspendida.' },
    { t: 'Artículo 4° – Registro', c: 'El registro oficial de asistencias y actividades se realizará exclusivamente mediante la aplicación <br><a href="https://shorturl.at/reQy5" target="_blank" class="rule-link">Peñas Rosarinas</a><br><br>Dicha herramienta deberá ser utilizada de manera responsable, veraz y diligente por todos los participantes, siendo la información allí consignada considerada válida a todos los efectos reglamentarios.' },
    { t: 'Artículo 5° – Premios', c: 'La eventual asignación de un premio para aquellos participantes que obtengan la mayor cantidad de victorias en el juego de truco queda pendiente de definición, debiendo ser resuelta mediante acuerdo posterior conforme a los mecanismos previstos en el presente reglamento.' },
    { t: 'Artículo 6° – Modificaciones', c: 'Cualquier modificación, total o parcial, del presente reglamento requerirá la aprobación expresa de al menos dos tercios (2/3) del total de los integrantes. La sola conformidad de los participantes presentes en una peña no será suficiente para validar cambios reglamentarios.' },
    { t: 'Artículo 7° – Vigencia', c: 'El presente reglamento entra en vigencia a partir de su aprobación y será de aplicación obligatoria para todos los participantes, sin excepción.' }
  ];

  app.innerHTML = `<h3 style="margin:10px 0 20px;color:var(--gold);text-align:center;text-transform:uppercase;letter-spacing:2px;font-size:14px;animation:fadeIn 0.5s">Reglamento General</h3>` + 
    ruleContent.map((r, i) => `
      <div class="item" style="animation-delay:${i * 0.05}s">
        <div class="rule-title">${r.t}</div>
        <div class="rule-content">${r.c}</div>
      </div>
    `).join('') + `
    <div class="firma-section">
      <div class="firma-header">
        <div class="firma-title">Libro de Firmas</div>
        <div class="firma-subtitle">Cada trazo queda registrado junto a tu nombre y fecha</div>
      </div>

      <div id="firmasGrid" class="firma-grid"></div>

      <div class="firma-title firma-title-sign">Tu Firma Oficial</div>
      <div class="firma-canvas-shell">
        <div class="firma-canvas-topbar">
          <span>Documento de aceptación del reglamento</span>
          <span id="firmaStrokeIndicator">Trazo 0</span>
        </div>
        <div class="firma-canvas-wrapper">
          <canvas id="firmaCanvas"></canvas>
          <div id="firmaPenCursor" class="firma-pen-cursor" aria-hidden="true"></div>
        </div>
        <div class="firma-hint">Deslizá suave para una firma más prolija. En móvil también responde con precisión.</div>
      </div>

      <div class="firma-controls">
        <button class="firma-btn firma-btn-clear" onclick="clearFirma()">Limpiar</button>
        <button class="firma-btn firma-btn-save" onclick="saveFirma()">Firmar y registrar</button>
      </div>
    </div>
  `;
  
  initFirmaCanvas();
  setTimeout(() => loadFirmasRegistradasLibro(), 100);
}

/* ===================== FIRMA DIGITAL ===================== */
let firmaCtx = null;
let firmaDrawing = false;
let firmaData = null;
let firmaPointerId = null;
let firmaLastPoint = null;
let firmaLastTime = 0;
let firmaStrokePoints = 0;
let firmaHasInk = false;
let firmaPenCursorEl = null;
let firmaDpr = 1;

const FIRMA_MIN_WIDTH = 1.1;
const FIRMA_MAX_WIDTH = 4.4;

function initFirmaCanvas() {
  const canvas = $('#firmaCanvas');
  if(!canvas) return;
  
  const rect = canvas.getBoundingClientRect();
  firmaDpr = Math.max(window.devicePixelRatio || 1, 1);
  canvas.width = Math.floor(rect.width * firmaDpr);
  canvas.height = Math.floor(rect.height * firmaDpr);
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  
  firmaCtx = canvas.getContext('2d');
  firmaCtx.setTransform(firmaDpr, 0, 0, firmaDpr, 0, 0);
  firmaCtx.strokeStyle = '#101923';
  firmaCtx.lineWidth = 3.2;
  firmaCtx.lineCap = 'round';
  firmaCtx.lineJoin = 'round';
  firmaCtx.imageSmoothingEnabled = true;

  firmaPenCursorEl = $('#firmaPenCursor');
  drawFirmaPaper();

  canvas.addEventListener('pointerenter', onFirmaPointerEnter);
  canvas.addEventListener('pointerleave', onFirmaPointerLeave);
  canvas.addEventListener('pointerdown', onFirmaPointerDown);
  canvas.addEventListener('pointermove', onFirmaPointerMove);
  canvas.addEventListener('pointerup', onFirmaPointerUp);
  canvas.addEventListener('pointercancel', onFirmaPointerUp);

  loadSavedFirma();
  updateStrokeIndicator(0);
}

function drawFirmaPaper() {
  const canvas = $('#firmaCanvas');
  if(!canvas || !firmaCtx) return;

  const width = canvas.width / firmaDpr;
  const height = canvas.height / firmaDpr;

  const bg = firmaCtx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, '#ffffff');
  bg.addColorStop(1, '#f3f8ff');
  firmaCtx.fillStyle = bg;
  firmaCtx.fillRect(0, 0, width, height);

  firmaCtx.save();
  firmaCtx.strokeStyle = 'rgba(72, 111, 153, 0.09)';
  firmaCtx.lineWidth = 1;
  for(let y = 24; y < height; y += 24) {
    firmaCtx.beginPath();
    firmaCtx.moveTo(0, y + 0.5);
    firmaCtx.lineTo(width, y + 0.5);
    firmaCtx.stroke();
  }

  const baselineY = Math.max(height - 36, 92);
  firmaCtx.strokeStyle = 'rgba(217, 163, 74, 0.6)';
  firmaCtx.lineWidth = 1.4;
  firmaCtx.beginPath();
  firmaCtx.moveTo(18, baselineY);
  firmaCtx.lineTo(width - 18, baselineY);
  firmaCtx.stroke();

  firmaCtx.fillStyle = 'rgba(22, 36, 54, 0.28)';
  firmaCtx.font = '700 12px "Trebuchet MS", sans-serif';
  firmaCtx.fillText('Firmá aquí', 22, baselineY - 10);

  firmaCtx.translate(width / 2, height / 2);
  firmaCtx.rotate(-0.11);
  firmaCtx.fillStyle = 'rgba(16, 25, 35, 0.06)';
  firmaCtx.font = '700 22px "Trebuchet MS", sans-serif';
  firmaCtx.textAlign = 'center';
  firmaCtx.fillText('PEÑAS ROSARINAS', 0, 0);
  firmaCtx.restore();
}

function loadSavedFirma() {
  const saved = localStorage.getItem('firma_digital');
  if(saved) {
    const canvas = $('#firmaCanvas');
    if(!canvas) return;
    const img = new Image();
    img.onload = function() {
      drawFirmaPaper();
      firmaCtx.drawImage(img, 0, 0, canvas.width / 2, canvas.height / 2);
      firmaHasInk = true;
    };
    img.src = saved;
  }
}

function getPos(e) {
  const canvas = $('#firmaCanvas');
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left), y: (e.clientY - rect.top) };
}

function onFirmaPointerEnter(e) {
  if(!firmaPenCursorEl) return;
  firmaPenCursorEl.classList.add('active');
  updatePenCursor(getPos(e));
}

function onFirmaPointerLeave() {
  if(!firmaPenCursorEl) return;
  if(firmaDrawing) return;
  firmaPenCursorEl.classList.remove('active', 'drawing');
}

function onFirmaPointerDown(e) {
  if(e.pointerType === 'mouse' && e.button !== 0) return;

  const canvas = $('#firmaCanvas');
  if(!canvas) return;

  firmaPointerId = e.pointerId;
  canvas.setPointerCapture(e.pointerId);
  firmaDrawing = true;

  const pos = getPos(e);
  firmaLastPoint = pos;
  firmaLastTime = performance.now();

  firmaCtx.beginPath();
  firmaCtx.moveTo(pos.x, pos.y);

  firmaStrokePoints += 1;
  firmaHasInk = true;
  updateStrokeIndicator(firmaStrokePoints);
  updatePenCursor(pos, true);
}

function onFirmaPointerMove(e) {
  const pos = getPos(e);
  updatePenCursor(pos, firmaDrawing);

  if(!firmaDrawing || e.pointerId !== firmaPointerId || !firmaLastPoint) return;

  const now = performance.now();
  const dt = Math.max(now - firmaLastTime, 1);
  const dx = pos.x - firmaLastPoint.x;
  const dy = pos.y - firmaLastPoint.y;
  const distance = Math.hypot(dx, dy);
  const velocity = distance / dt;

  const dynamicWidth = Math.max(FIRMA_MIN_WIDTH, Math.min(FIRMA_MAX_WIDTH, FIRMA_MAX_WIDTH - velocity * 1.7));
  firmaCtx.lineWidth = dynamicWidth;

  const midX = (firmaLastPoint.x + pos.x) * 0.5;
  const midY = (firmaLastPoint.y + pos.y) * 0.5;
  firmaCtx.quadraticCurveTo(firmaLastPoint.x, firmaLastPoint.y, midX, midY);
  firmaCtx.stroke();

  firmaLastPoint = pos;
  firmaLastTime = now;
  firmaStrokePoints += 1;
  updateStrokeIndicator(firmaStrokePoints);
}

function onFirmaPointerUp(e) {
  if(e.pointerId !== firmaPointerId) return;

  const canvas = $('#firmaCanvas');
  firmaDrawing = false;
  firmaPointerId = null;
  firmaLastPoint = null;

  if(firmaCtx) firmaCtx.closePath();
  if(canvas && canvas.hasPointerCapture(e.pointerId)) {
    canvas.releasePointerCapture(e.pointerId);
  }
  if(firmaPenCursorEl) firmaPenCursorEl.classList.remove('drawing');
}

function updatePenCursor(pos, isDrawing = false) {
  if(!firmaPenCursorEl || !pos) return;
  firmaPenCursorEl.style.left = pos.x + 'px';
  firmaPenCursorEl.style.top = pos.y + 'px';
  firmaPenCursorEl.classList.add('active');
  firmaPenCursorEl.classList.toggle('drawing', !!isDrawing);
}

function updateStrokeIndicator(points) {
  const el = $('#firmaStrokeIndicator');
  if(el) el.textContent = `Trazo ${Math.floor(points / 8)}`;
}

function clearFirma() {
  const canvas = $('#firmaCanvas');
  if(!canvas || !firmaCtx) return;
  drawFirmaPaper();
  firmaStrokePoints = 0;
  firmaHasInk = false;
  updateStrokeIndicator(0);
  localStorage.removeItem('firma_digital');
  const preview = $('#firmaPreview');
  if(preview) preview.innerHTML = '';
}

async function saveFirma() {
  const canvas = $('#firmaCanvas');
  if(!canvas) return;

  if(!firmaHasInk || firmaStrokePoints < 10) {
    alertMsg('Primero realizá tu firma en el recuadro', 'warning');
    return;
  }
  
  const nombre = await promptMsg('Ingresá tu nombre para la firma:', 'Tu nombre', 'Firma Digital');
  if(!nombre || !nombre.trim()) {
    alertMsg('Debés ingresar un nombre', 'warning');
    return;
  }
  
  const btn = $('.firma-btn-save');
  const originalText = btn.textContent;
  btn.textContent = '⏳ Guardando...';
  btn.disabled = true;
  
  try {
    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = canvas.width / 2;
    smallCanvas.height = canvas.height / 2;
    const smallCtx = smallCanvas.getContext('2d');
    smallCtx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
    
    const dataUrl = smallCanvas.toDataURL('image/png', 0.85);
    const blob = await (await fetch(dataUrl)).blob();
    const fileName = `firma-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    
    await supaFetch(`storage/v1/object/firmas/${fileName}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: blob
    }, true);
    
    const firmaUrl = `${SUPABASE_URL}/storage/v1/object/public/firmas/${fileName}`;
    
    await supaFetch('firmas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre.trim(), firma_url: firmaUrl })
    });
    
    clearFirma();
    btn.textContent = '✅ Guardada!';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 2000);
    
    setTimeout(() => loadFirmasRegistradasLibro(), 100);
    
  } catch(e) {
    console.error(e);
    alertMsg('Error guardando firma: ' + e.message, 'error');
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

async function loadFirmasRegistradasLibro() {
  const grid = $('#firmasGrid');
  if(!grid) return;
  
  try {
    const res = await supaFetch('firmas?order=created_at.desc');
    if(!res.ok) throw new Error('Error fetching');
    const firmas = await res.json();
    
    grid.innerHTML = '';
    
    if(firmas && firmas.length) {
      for(const f of firmas) {
        const div = document.createElement('div');
        div.className = 'firma-item';
        
        const imgContainer = document.createElement('div');
        imgContainer.className = 'firma-item-img';
        
        const img = document.createElement('img');
        img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;opacity:0;transition:opacity 0.3s';
        img.onload = () => img.style.opacity = '1';
        
        imgContainer.appendChild(img);
        div.appendChild(imgContainer);
        
        const name = document.createElement('div');
        name.textContent = f.nombre;
        name.className = 'firma-item-name';
        div.appendChild(name);
        
        const date = document.createElement('div');
        date.textContent = new Date(f.created_at).toLocaleDateString('es-AR');
        date.className = 'firma-item-date';
        div.appendChild(date);
        
        grid.appendChild(div);
        loadImageWithAuth(f.firma_url, null, img, null, 'firmas');
      }
    } else {
      grid.innerHTML = '<div class="firma-grid-empty">Aún no hay firmas registradas</div>';
    }
  } catch(e) {
    console.warn(e);
    grid.innerHTML = '<div class="firma-grid-error">Error cargando firmas</div>';
  }
}
