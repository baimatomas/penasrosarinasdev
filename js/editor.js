async function start(prefill){
  toggleNavTabs(false);
  toggleHeroSection(false);
  window.history.pushState({ screen: 'editor' }, '', '#editor');
  
  const [partJson, sedJson] = await Promise.all([
    supaFetch('participantes?select=nombre&order=nombre.asc').then(r => r.json()),
    supaFetch('sedes?select=nombre&order=nombre.asc').then(r => r.json())
  ]);
  
  const part = Array.isArray(partJson) ? partJson.map(x => x.nombre) : [];
  const sed = Array.isArray(sedJson) ? sedJson.map(x => x.nombre) : [];
  const all = [...new Set([...part, ...sed])].sort();

  const preSede = prefill?.sede || '';
  const preParticipantes = new Set(prefill?.participantes || []);
  const preFecha = prefill?.fecha || new Date().toLocaleDateString('en-CA');
  
  editorExistingPhotos = prefill?.existingPhotos || [];
  selectedPhotoFiles = [];

  app.innerHTML=`
    <div style="padding-top:10px; animation: fadeIn 0.3s ease">
      <div class="form-header-row"><button class="btn-back-circle" onclick="cancelStart()">←</button><h2 style="margin:0;color:var(--text);font-size:24px">${editingPenaId ? 'Editar Peña' : 'Nueva Peña'}</h2></div>
      <div class="form-group"><label class="form-label">FECHA</label><input id="penaFecha" type="date" value="${preFecha}" /></div>
      <div class="form-group"><label class="form-label">SEDE</label><div class="chips-container" id="sedes">${all.map(s=>`<div class="chip" data-sede="${s}">${s}</div>`).join('')}</div><div class="chips-container" style="flex-wrap:nowrap"><input id="newSede" placeholder="Agregar nueva sede..." style="padding:10px;font-size:14px" /><button id="addSedeBtn" class="btn-small">+</button></div></div>
      <div class="form-group"><label class="form-label">ASISTENTES</label><div class="chips-container" id="participantes">${part.map(p=>`<div class="chip" data-nombre="${p}">${p}</div>`).join('')}</div><div class="chips-container" style="flex-wrap:nowrap"><input id="newParticipante" placeholder="Agregar nuevo..." style="padding:10px;font-size:14px" /><button id="addParticipanteBtn" class="btn-small">+</button></div></div>
      <div class="form-group"><label class="form-label">FOTOS</label><div style="display:flex; gap:12px; margin-bottom: 12px"><label for="fotoCam" class="upload-box" style="flex:1; padding:20px 10px; border-style:solid; background:rgba(117,170,219,0.05)"><div style="font-size:24px;margin-bottom:6px">📷</div><div style="font-size:12px;font-weight:700;color:var(--celeste)">CÁMARA</div></label><label for="foto" class="upload-box" style="flex:1; padding:20px 10px"><div style="font-size:24px;margin-bottom:6px">🖼️</div><div style="font-size:12px;font-weight:700">GALERÍA</div></label></div><input id="foto" type="file" accept="image/*" multiple style="display:none" /><input id="fotoCam" type="file" accept="image/*" capture="environment" style="display:none" /><div id="fotoPreview" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px"></div></div>
      <div class="form-group"><label class="form-label">COMENTARIOS</label><div class="chips-container" style="flex-wrap:nowrap;margin-bottom:10px"><input id="newComment" placeholder="Escribir nota..." style="padding:10px;font-size:14px" /><button id="addCommentBtn" class="btn-small">+</button></div><div id="commentsList" style="display:flex;flex-direction:column;gap:8px"></div></div>
      <div class="form-footer"><button onclick="cancelStart()" class="btn-main btn-cancel">Cancelar</button><button id="saveBtn" onclick="save()" class="btn-main btn-save"><span class="spinner" style="display:none"></span><span class="btn-text">Guardar</span></button></div>
    </div>`;

  document.querySelectorAll('#sedes .chip').forEach(p=>{ p.onclick=()=>{document.querySelectorAll('#sedes .chip').forEach(x=>x.classList.remove('selected'));p.classList.add('selected');}; if(preSede && p.dataset.sede===preSede) p.classList.add('selected'); });
  document.querySelectorAll('#participantes .chip').forEach(p=>{ p.onclick=()=>p.classList.toggle('selected'); if(preParticipantes.has(p.dataset.nombre)) p.classList.add('selected'); });
  
  const handleFiles = (files) => { 
    [...files].forEach(f => selectedPhotoFiles.push(f)); 
    renderPhotoPreview();
  };
  
  document.getElementById('foto').onchange = e => { handleFiles(e.target.files); e.target.value = ''; }; 
  document.getElementById('fotoCam').onchange = e => { handleFiles(e.target.files); e.target.value = ''; };
  
  renderPhotoPreview();

  penaComments = prefill?.comentarios ? (Array.isArray(prefill.comentarios)? [...prefill.comentarios] : [prefill.comentarios]) : [];
  const renderComments = () => { const list = app.querySelector('#commentsList'); if(!list) return; list.innerHTML = penaComments.map((c,i)=>`<div style="background:var(--surface-light);padding:12px;border-radius:10px;font-size:14px;display:flex;justify-content:space-between;align-items:center"><span>${c}</span><span style="color:#ff6b6b;font-weight:bold;margin-left:10px;cursor:pointer;padding:4px" onclick="removeComment(${i})">✕</span></div>`).join(''); };
  window.removeComment = function(i){ penaComments.splice(i,1); renderComments(); }; document.getElementById('addCommentBtn').onclick = () => { const v = document.getElementById('newComment').value.trim(); if(!v) return; penaComments.push(v); document.getElementById('newComment').value = ''; renderComments(); }; renderComments();
  document.getElementById('addSedeBtn').onclick = () => { const input = document.getElementById('newSede'); const val = input.value.trim(); if(!val) return; const container = document.getElementById('sedes'); let chip = [...container.querySelectorAll('.chip')].find(x => x.dataset.sede === val); if(!chip){ chip = document.createElement('div'); chip.className = 'chip'; chip.dataset.sede = val; chip.textContent = val; chip.onclick = () => { container.querySelectorAll('.chip').forEach(x=>x.classList.remove('selected')); chip.classList.add('selected'); }; container.appendChild(chip); } container.querySelectorAll('.chip').forEach(x=>x.classList.remove('selected')); chip.classList.add('selected'); input.value = ''; };
  document.getElementById('addParticipanteBtn').onclick = () => { const input = document.getElementById('newParticipante'); const val = input.value.trim(); if(!val) return; const container = document.getElementById('participantes'); let chip = [...container.querySelectorAll('.chip')].find(x => x.dataset.nombre === val); if(!chip){ chip = document.createElement('div'); chip.className = 'chip'; chip.dataset.nombre = val; chip.textContent = val; chip.onclick = () => chip.classList.toggle('selected'); container.appendChild(chip); } chip.classList.add('selected'); input.value = ''; };
}

function renderPhotoPreview() {
    const preview = app.querySelector('#fotoPreview'); 
    if(!preview) return; 
    preview.innerHTML = '';

    // Render Existing Photos with Delete Button
    editorExistingPhotos.forEach((url, i) => {
        const div = document.createElement('div'); 
        div.className = 'preview-wrapper';
        
        const img = document.createElement('img');
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,0.1)';
        loadImageWithAuth(url, null, img, null, 'penas-fotos');
        
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'btn-delete-photo';
        deleteBtn.textContent = '✕';
        deleteBtn.onclick = () => removeExistingPhoto(i);
        
        div.appendChild(img);
        div.appendChild(deleteBtn);
        preview.appendChild(div);
    });

    // Render New Files with Delete Button
    selectedPhotoFiles.forEach((f, i) => {
        const div = document.createElement('div'); 
        div.className = 'preview-wrapper';
        const url = URL.createObjectURL(f);
        div.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;border:1px solid var(--celeste)">
                         <div class="btn-delete-photo" onclick="removeNewFile(${i})">✕</div>`;
        preview.appendChild(div);
    });
}
window.removeExistingPhoto = function(i) { editorExistingPhotos.splice(i, 1); renderPhotoPreview(); }
window.removeNewFile = function(i) { selectedPhotoFiles.splice(i, 1); renderPhotoPreview(); }

function cancelStart(){ 
  editingPenaId=null; 
  penaComments = []; 
  editorExistingPhotos = []; 
  selectedPhotoFiles = []; 
  app.innerHTML=''; 
  toggleNavTabs(true);
  toggleHeroSection(true);
  if (history.state && history.state.screen === 'editor') {
    history.back();
  }
  load(); 
}

async function save(){
  const sede = $('#sedes .chip.selected')?.dataset.sede; 
  const participantesNombres = [...$$('#participantes .chip.selected')].map(p => p.dataset.nombre); 
  const fecha = $('#penaFecha')?.value;
  if(!sede || !participantesNombres.length || !fecha) return alertMsg('Faltan datos obligatorios', 'warning');
  const saveBtn = $('#saveBtn'); 
  const spinner = saveBtn?.querySelector('.spinner'); 
  const textSpan = saveBtn?.querySelector('.btn-text');
  if(saveBtn){ saveBtn.disabled = true; if(spinner) spinner.style.display='inline-block'; if(textSpan) textSpan.textContent = 'Guardando...'; }
  try {
    let pena; 
    const penaData = { sede, fecha, deleted_at: null };
    if(editingPenaId){
      const r = await supaFetch(`penas?id=eq.${editingPenaId}`, {method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(penaData)});
      if(!r.ok) throw new Error('Error update'); 
      pena = (await r.json())[0];
      await Promise.all([ 
        supaFetch(`pena_participantes?pena_id=eq.${editingPenaId}`, { method: 'DELETE' }), 
        supaFetch(`pena_comentarios?pena_id=eq.${editingPenaId}`, { method: 'DELETE' }),
        supaFetch(`pena_fotos?pena_id=eq.${editingPenaId}`, { method: 'DELETE' })
      ]);
    } else {
      const r = await supaFetch('penas', {method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(penaData)});
      if(!r.ok) throw new Error('Error create'); 
      pena = (await r.json())[0];
    }
    const nombresStr = participantesNombres.map(n => `"${n}"`).join(','); 
    const rPart = await supaFetch(`participantes?nombre=in.(${nombresStr})`); 
    const existentes = await rPart.json();
    const existentesNombres = new Set(existentes.map(e => e.nombre)); 
    const nuevosNombres = participantesNombres.filter(n => !existentesNombres.has(n));
    let nuevosIDs = []; 
    if(nuevosNombres.length > 0) { 
      const rNew = await supaFetch('participantes', {method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(nuevosNombres.map(n => ({ nombre: n }))) }); 
      const creados = await rNew.json(); 
      nuevosIDs = creados.map(c => c.id); 
    }
    const todosIDs = [...existentes.map(e => e.id), ...nuevosIDs];
    if(todosIDs.length > 0){ 
      const vinculos = todosIDs.map(pid => ({ pena_id: pena.id, participante_id: pid })); 
      await supaFetch('pena_participantes', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(vinculos)}); 
    }
    
    let finalPhotoUrls = [...editorExistingPhotos];
    if(selectedPhotoFiles.length > 0) {
      const uploadPromises = selectedPhotoFiles.map(async (f) => {
        const name = `pena-${Date.now()}-${Math.random().toString(36).slice(2)}.${f.name.split('.').pop()}`;
        const uploadRes = await supaFetch(`storage/v1/object/penas-fotos/${name}`, {method:'PUT',headers:{'Content-Type':f.type},body:f}, true);
        if(!uploadRes.ok) throw new Error(`Error subiendo foto ${name}: ${uploadRes.statusText}`);
        return name;
      });
      const newNames = await Promise.all(uploadPromises);
      finalPhotoUrls = [...finalPhotoUrls, ...newNames];
    }
    
    if(finalPhotoUrls.length > 0) { 
      const fotosData = finalPhotoUrls.map(url => ({ pena_id: pena.id, foto_url: url })); 
      await supaFetch('pena_fotos', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(fotosData)}); 
    }
    
    if(penaComments.length > 0) { 
      const comentariosData = penaComments.map(c => ({ pena_id: pena.id, comentario: c })); 
      await supaFetch('pena_comentarios', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(comentariosData)}); 
      try { await supaFetch(`penas?id=eq.${pena.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ comentarios: penaComments }) }); } catch(e){} 
    }
    selectedPhotoFiles = []; editorExistingPhotos = []; penaComments = []; editingPenaId = null; app.innerHTML = ''; 
    toggleNavTabs(true);
    toggleHeroSection(true);
    await load(); 
  } catch(err) { console.error('Error detallado:', err); alertMsg('Error: ' + err.message, 'error'); } finally { if(saveBtn){ if(spinner) spinner.style.display='none'; if(textSpan) textSpan.textContent = 'Guardar'; saveBtn.disabled = false; } }
}
