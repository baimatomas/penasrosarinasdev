async function load(){
  setActiveTab('#btnLoad');
  toggleHeroSection(true);
  toggleNavTabs(true);
  updateSmokeSourcePosition();
  
  const res = await supaFetch('penas?select=id,fecha,sede,pena_fotos(foto_url),pena_participantes!inner(participantes(nombre)),pena_comentarios(comentario),truco_partidos(id,ganador,puntos_nosotros,puntos_ellos,truco_jugadores(equipo,participantes(nombre))),gastos(monto)&pena_participantes.deleted_at=is.null&deleted_at=is.null&order=fecha.desc');
  const data = await res.json();
  
  if(!data.length){ 
    app.innerHTML=`<div style="text-align:center;margin-top:60px;color:var(--text-muted);opacity:0.6"><div style="font-size:40px;margin-bottom:10px">📭</div>No hay peñas registradas aún</div>`; 
    return; 
  }
  
  const penaHtmls = data.map(p => {
    const fotos = p.pena_fotos || [];
    const parts = (p.pena_participantes || []).map(x => x.participantes.nombre).join(', ');
    const comments = p.pena_comentarios || [];
    const fechaFormatted = formatDateSafe(p.fecha.slice(0,10));
    const fotosList = fotos.map(f => f.foto_url);
    const penaId = p.id;
    const preview = fotos[0]?.foto_url;

    const partidos = p.truco_partidos || [];
    let partidosHtml = '';
    if(partidos.length > 0) {
      const playerStats = {};
      partidos.forEach(match => { 
        match.truco_jugadores.forEach(pl => { 
          const name = pl.participantes.nombre; 
          if(!playerStats[name]) playerStats[name] = { w:0, l:0 }; 
          if(pl.equipo === match.ganador) playerStats[name].w++; 
          else playerStats[name].l++; 
        }); 
      });
      const statsArr = Object.entries(playerStats).map(([name, s]) => ({ name, w: s.w, l: s.l, total: s.w + s.l })).sort((a,b) => (b.w - a.w) || (a.l - b.l));
      partidosHtml = `
        <div class="detail-section">
          <span class="detail-label">Resultados Truco</span>
          <table class="truco-mini-table">
            <thead>
              <tr>
                <th>Jugador</th>
                <th style="text-align:center">PJ</th>
                <th style="text-align:center">PG</th>
                <th style="text-align:center">PP</th>
              </tr>
            </thead>
            <tbody>
              ${statsArr.map(s => `
                <tr>
                  <td class="player-name">${s.name}</td>
                  <td style="text-align:center" class="stat-total">${s.total}</td>
                  <td style="text-align:center" class="stat-win">${s.w}</td>
                  <td style="text-align:center" class="stat-loss">${s.l}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    }
    
    const imagesHtml = fotos.length ? `
      <div class="detail-section">
        <span class="detail-label">Fotos</span>
        <div class="gallery-grid" id="fotosGrid-${penaId}"></div>
        <div class="gallery-dots" id="dots-${penaId}">
          ${fotos.map((_, i) => `<div class="gallery-dot ${i===0?'active':''}"></div>`).join('')}
        </div>
      </div>` : '';
    const commentsHtml = comments.length ? `<div class="detail-section"><span class="detail-label">Notas</span>${comments.map(c=>`<div>• ${c.comentario}</div>`).join('')}</div>` : '';
    
    const gastos = p.gastos || [];
    const totalGastos = gastos.reduce((sum, g) => sum + (g.monto || 0), 0);
    const gastosHtml = totalGastos > 0 ? `<div class="detail-section"><span class="detail-label">Gastos</span><div style="font-size:15px; font-weight:700; color:var(--gold)">Total: $${totalGastos}</div></div>` : '';

    return `<div class="item" onclick="toggleDetail(this)"><div class="pena-header"><div class="thumb" id="thumb-${penaId}">🍺</div><div class="pena-info"><strong>📌 ${p.sede}</strong><div class="pena-date"><span>📅</span> ${fechaFormatted}</div></div><div style="display:flex;gap:6px"><div class="action-icon" onclick="event.stopPropagation();editPena(${p.id})">✏️</div><div class="action-icon" style="color:#ff6b6b" onclick="event.stopPropagation();toggleDeleteConfirm(event,${p.id})">🗑️</div></div></div><div class="pena-detail" style="display:none"><div class="detail-section"><span class="detail-label">Asistentes (${(p.pena_participantes||[]).length})</span><div style="color:var(--text-muted)">${parts}</div></div>${commentsHtml}${gastosHtml}${imagesHtml}${partidosHtml}</div></div>`;
  }).join('');
  
  app.innerHTML = penaHtmls;
  
  data.forEach(p => {
    const fotos = p.pena_fotos || [];
    if(fotos.length > 0) {
      const thumb = $(`#thumb-${p.id}`);
      if(thumb && fotos[0]?.foto_url) {
        loadImageWithAuth(fotos[0].foto_url, thumb, null, '🍺', 'penas-fotos');
      }
      const grid = $(`#fotosGrid-${p.id}`);
      if(grid) {
        const fotosUrls = fotos.map(f => f.foto_url);
        fotos.forEach((f, index) => {
          const img = document.createElement('img');
          img.className = 'gallery-img';
          img.onclick = (e) => { e.stopPropagation(); openGallery(fotosUrls, index); };
          grid.appendChild(img);
          loadImageWithAuth(f.foto_url, null, img, null, 'penas-fotos');
        });

        // Lógica de puntos dinámicos
        grid.addEventListener('scroll', () => {
          const index = Math.round(grid.scrollLeft / grid.offsetWidth);
          const dots = document.querySelectorAll(`#dots-${p.id} .gallery-dot`);
          dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
        });
      }
    }
  });
}

function toggleDeleteConfirm(evt,id){ 
  evt.stopPropagation(); 
  const card = evt.target.closest('.item'); 
  const existing = card.querySelector('.del-confirm'); 
  if(existing){ existing.remove(); return; } 
  const div = document.createElement('div'); 
  div.className = 'del-confirm'; 
  div.style.marginTop = '12px'; 
  div.style.textAlign = 'right'; 
  div.innerHTML = `<button style="background:rgba(255, 77, 77, 0.15);color:#ff4d4d;border:1px solid #ff4d4d;padding:8px 16px;border-radius:12px;font-weight:600;font-size:13px;cursor:pointer">Confirmar Eliminar</button>`; 
  div.firstChild.onclick = async (e)=>{ e.stopPropagation(); await supaFetch(`penas?id=eq.${id}`,{ method:'DELETE' }); load(); }; 
  card.appendChild(div); 
}

async function editPena(id){ 
  const r=await supaFetch(`penas?id=eq.${id}&select=id,sede,fecha,pena_participantes(participantes(nombre)),pena_comentarios(comentario),pena_fotos(foto_url)&pena_participantes.deleted_at=is.null`); 
  const rows=await r.json(); 
  if(!rows.length) return; 
  const p=rows[0]; 
  editingPenaId=id; 
  const participantes=(p.pena_participantes||[]).map(x=>x.participantes.nombre); 
  const comentarios = (p.pena_comentarios||[]).map(x=>x.comentario); 
  const existingPhotos = (p.pena_fotos||[]).map(x=>x.foto_url);
  start({sede:p.sede,participantes,fecha:p.fecha.slice(0,10),comentarios, existingPhotos}); 
}
