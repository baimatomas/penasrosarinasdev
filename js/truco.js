/* ===================== TRUCO ===================== */
async function trucoInit() {
  setActiveTab('#btnTruco');
  toggleHeroSection(false);
  app.innerHTML = '<div style="text-align:center;padding:40px"><div class="spinner"></div></div>';
  try {
    const [penas, parts] = await Promise.all([
      supaFetch('penas?select=id,fecha,sede&order=fecha.desc&limit=5').then(r=>r.json()),
      supaFetch('participantes?select=id,nombre&order=nombre.asc').then(r=>r.json())
    ]);
    renderTrucoSetup(penas, parts);
  } catch(e) { console.error(e); alertMsg('Error cargando datos', 'error'); }
}
function renderTrucoSetup(penas, participantes) {
  trucoState = { penaId: penas[0]?.id, nosotros: [], ellos: [], puntosNos: 0, puntosEllos: 0 };
  app.innerHTML = `<div class="truco-container"><h2 style="color:var(--gold);text-align:center;text-transform:uppercase;font-size:16px;letter-spacing:2px;margin-bottom:20px">Nuevo Partido</h2><div class="form-group"><label class="form-label">SELECCIONAR PEÑA</label><select id="trucoPenaSelect" class="pena-selector" onchange="trucoState.penaId=this.value">${penas.map(p => `<option value="${p.id}">${formatDateSafe(p.fecha)} - ${p.sede}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">NOSOTROS (Máx 3)</label><div class="chips-container" id="chipsNos">${participantes.map(p => `<div class="chip" onclick="toggleTrucoPlayer(this, 'nosotros', '${p.id}', '${p.nombre}')">${p.nombre}</div>`).join('')}</div></div><div class="form-group"><label class="form-label">ELLOS (Máx 3)</label><div class="chips-container" id="chipsEllos">${participantes.map(p => `<div class="chip" onclick="toggleTrucoPlayer(this, 'ellos', '${p.id}', '${p.nombre}')">${p.nombre}</div>`).join('')}</div></div><button onclick="startTrucoMatch()" class="btn-main btn-save" style="margin-top:20px; width:100%">JUGAR ⚔️</button></div>`;
}
function toggleTrucoPlayer(el, equipo, id, nombre) { 
  const isSelected = el.classList.contains('selected'); 
  const arr = trucoState[equipo]; 
  if(isSelected) { 
    const idx = arr.findIndex(x => x.id === id); 
    if(idx > -1) arr.splice(idx, 1); 
    el.classList.remove('selected'); 
  } else { 
    if(arr.length >= 3) return alertMsg('Máximo 3 jugadores por equipo', 'warning'); 
    const otro = equipo === 'nosotros' ? 'ellos' : 'nosotros'; 
    if(trucoState[otro].find(x => x.id === id)) return alertMsg('Ya está en el otro equipo', 'warning'); 
    arr.push({ id, nombre }); 
    el.classList.add('selected'); 
  } 
} 

function startTrucoMatch() { 
  if(!trucoState.penaId) return alertMsg('Seleccioná la peña', 'warning'); 
  if(!trucoState.nosotros.length || !trucoState.ellos.length) return alertMsg('Faltan jugadores', 'warning'); 
  window.history.pushState({ screen: 'trucoBoard' }, '', '#truco-board'); 
  renderTrucoBoard(); 
}

function goBackFromTrucoBoard() {
  if (history.state && history.state.screen === 'trucoBoard') {
    history.back();
  }
  trucoInit();
}

function renderTrucoBoard() { 
  const nNos = trucoState.nosotros.map(x=>x.nombre).join(', '); 
  const nEllos = trucoState.ellos.map(x=>x.nombre).join(', '); 
  app.innerHTML = `<div class="truco-container"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><button class="btn-back-circle" onclick="goBackFromTrucoBoard()">←</button><div style="font-size:12px;color:var(--text-muted);font-weight:700">A 30 PUNTOS</div><div style="width:36px"></div></div><div class="truco-board"><div class="truco-col"><div class="truco-header">NOSOTROS</div><div style="font-size:11px;color:var(--celeste);margin-bottom:8px;text-align:center;min-height:30px">${nNos}</div><div class="fosforos-area" id="areaNos"></div><div class="truco-controls"><button class="btn-score btn-minus" onclick="updateScore('nos', -1)">-</button><button class="btn-score btn-plus" onclick="updateScore('nos', 1)">+</button></div></div><div class="truco-col"><div class="truco-header">ELLOS</div><div style="font-size:11px;color:var(--celeste);margin-bottom:8px;text-align:center;min-height:30px">${nEllos}</div><div class="fosforos-area" id="areaEllos"></div><div class="truco-controls"><button class="btn-score btn-minus" onclick="updateScore('ellos', -1)">-</button><button class="btn-score btn-plus" onclick="updateScore('ellos', 1)">+</button></div></div></div></div>`; 
  drawPhosphoros(); 
}

function updateScore(team, delta) { 
  if(team === 'nos') { 
    const nuevo = trucoState.puntosNos + delta; 
    if(nuevo >= 0 && nuevo <= 30) trucoState.puntosNos = nuevo; 
  } else { 
    const nuevo = trucoState.puntosEllos + delta; 
    if(nuevo >= 0 && nuevo <= 30) trucoState.puntosEllos = nuevo; 
  } 
  drawPhosphoros(); 
  checkWin(); 
}

function checkWin() { 
  if(trucoState.puntosNos === 30 || trucoState.puntosEllos === 30) { 
    const ganador = trucoState.puntosNos === 30 ? 'NOSOTROS' : 'ELLOS'; 
    setTimeout(() => { 
      app.innerHTML = `<div style="text-align:center;padding:40px;animation:fadeIn 0.5s"><div style="font-size:60px;margin-bottom:20px">🏆</div><h2 style="color:var(--gold);text-transform:uppercase;margin-bottom:10px">GANADOR: ${ganador}</h2><p style="color:var(--text-muted);margin-bottom:40px">Nosotros: ${trucoState.puntosNos} - Ellos: ${trucoState.puntosEllos}</p><div style="display:flex;gap:10px;width:100%"><button onclick="saveTrucoResult('${ganador}')" class="btn-main btn-save" style="flex:1">Guardar Partido</button><button onclick="trucoInit()" class="btn-main btn-cancel" style="flex:1">Descartar</button></div></div>`; 
    }, 200); 
  } 
}

async function saveTrucoResult(ganador) { 
  app.innerHTML = '<div style="text-align:center;padding:40px"><div class="spinner"></div><div style="margin-top:20px">Guardando...</div></div>'; 
  try { 
    const partidoBody = { 
      pena_id: trucoState.penaId, 
      puntos_nosotros: trucoState.puntosNos, 
      puntos_ellos: trucoState.puntosEllos, 
      ganador: ganador 
    }; 
    const rPart = await supaFetch('truco_partidos', { 
      method: 'POST', 
      headers: {'Content-Type': 'application/json', 'Prefer': 'return=representation'}, 
      body: JSON.stringify(partidoBody) 
    }); 
    if(!rPart.ok) throw new Error('Error guardando'); 
    const partido = (await rPart.json())[0]; 
    const jugadoresData = [ 
      ...trucoState.nosotros.map(p => ({ partido_id: partido.id, participante_id: p.id, equipo: 'NOSOTROS' })), 
      ...trucoState.ellos.map(p => ({ partido_id: partido.id, participante_id: p.id, equipo: 'ELLOS' })) 
    ]; 
    await supaFetch('truco_jugadores', { 
      method: 'POST', 
      headers: {'Content-Type': 'application/json'}, 
      body: JSON.stringify(jugadoresData) 
    }); 
    await alertMsg('Partido guardado', 'success'); 
    trucoInit(); 
  } catch(e) { 
    console.error(e); 
    alertMsg('Error: ' + e.message, 'error'); 
    trucoInit(); 
  } 
}

function drawPhosphoros() { 
  const render = (count, containerId) => { 
    const container = document.getElementById(containerId); 
    if(!container) return; 
    container.innerHTML = ''; 
    const fullGroups = Math.floor(count / 5); 
    const remainder = count % 5; 
    const getGroupSVG = (n) => { 
      let paths = ''; 
      const fosforo = (tipX, tipY, endX, endY) => { 
        const dx = endX - tipX; 
        const dy = endY - tipY; 
        const len = Math.sqrt(dx*dx + dy*dy); 
        const rot = Math.atan2(dy, dx) * 180 / Math.PI; 
        return `<g transform="translate(${tipX}, ${tipY}) rotate(${rot})"><defs><linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#deb887"/><stop offset="50%" style="stop-color:#f5deb3"/><stop offset="100%" style="stop-color:#c4a574"/></linearGradient><linearGradient id="tipGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#ff6666"/><stop offset="40%" style="stop-color:#ff4444"/><stop offset="100%" style="stop-color:#cc0000"/></linearGradient><filter id="fosforoShadow"><feDropShadow dx="1" dy="2" stdDeviation="1" flood-opacity="0.3"/></filter></defs><g filter="url(#fosforoShadow)"><ellipse cx="0" cy="0" rx="3.5" ry="2.5" fill="url(#tipGrad)"/><ellipse cx="-0.5" cy="-0.5" rx="1.5" ry="1" fill="rgba(255,255,255,0.4)"/><rect x="2" y="-2" width="${len-4}" height="4" rx="2" fill="url(#bodyGrad)"/></g></g>`; 
      }; 
      if(n >= 1) paths += fosforo(8, 8, 8, 32); 
      if(n >= 2) paths += fosforo(32, 8, 8, 8); 
      if(n >= 3) paths += fosforo(32, 32, 32, 8); 
      if(n >= 4) paths += fosforo(8, 32, 32, 32); 
      if(n >= 5) paths += fosforo(8, 8, 32, 32); 
      return `<svg class="fosforo-group" viewBox="0 0 40 40">${paths}</svg>`; 
    }; 
    const limitFirstHalf = Math.min(3, fullGroups); 
    for(let i=0; i<limitFirstHalf; i++) container.innerHTML += getGroupSVG(5); 
    if(fullGroups < 3 && remainder > 0) container.innerHTML += getGroupSVG(remainder); 
    if(count > 15) { 
      container.innerHTML += `<div class="buenas-divider"></div>`; 
      for(let i=3; i<fullGroups; i++) container.innerHTML += getGroupSVG(5); 
      if(fullGroups >= 3 && remainder > 0) container.innerHTML += getGroupSVG(remainder);
    }
  };
  render(trucoState.puntosNos, 'areaNos');
  render(trucoState.puntosEllos, 'areaEllos');
}
