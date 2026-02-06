/* ===================== STATS ===================== */
function buildPenasByMonthSeries(penasData) {
  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const byMonth = {};

  (penasData || []).forEach(p => {
    if (!p || !p.fecha) return;
    const parts = p.fecha.split('-');
    if (parts.length < 2) return;
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    byMonth[key] = (byMonth[key] || 0) + 1;
  });

  const monthKeys = Object.keys(byMonth).sort();
  if (!monthKeys.length) return [];

  const first = monthKeys[0].split('-');
  const last = monthKeys[monthKeys.length - 1].split('-');
  const firstYear = Number(first[0]);
  const firstMonth = Number(first[1]);
  const lastYear = Number(last[0]);
  const lastMonth = Number(last[1]);

  const series = [];
  let year = firstYear;
  let month = firstMonth;

  while (year < lastYear || (year === lastYear && month <= lastMonth)) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    series.push({
      key,
      label: `${monthNames[month - 1]}-${year}`,
      value: byMonth[key] || 0
    });
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return series;
}

function renderPenasLineChart(series) {
  if (!series.length) {
    return '<div style="text-align:center;color:var(--text-muted);padding:20px">Sin datos</div>';
  }

  const width = 340;
  const height = 190;
  const padding = { top: 18, right: 16, bottom: 38, left: 30 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxValue = Math.max(...series.map(s => s.value), 1);
  const stepX = series.length > 1 ? chartW / (series.length - 1) : 0;
  const points = series.map((s, i) => {
    const x = series.length > 1 ? padding.left + i * stepX : padding.left + chartW / 2;
    const y = padding.top + chartH - (s.value / maxValue) * chartH;
    return { ...s, x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${(padding.top + chartH).toFixed(2)} L ${points[0].x.toFixed(2)} ${(padding.top + chartH).toFixed(2)} Z`;
  const yTicks = 4;

  const grid = Array.from({ length: yTicks + 1 }).map((_, i) => {
    const y = padding.top + (chartH * i) / yTicks;
    const tickValue = Math.round(maxValue - (maxValue * i) / yTicks);
    return `
      <line x1="${padding.left}" y1="${y.toFixed(2)}" x2="${(padding.left + chartW).toFixed(2)}" y2="${y.toFixed(2)}" class="stats-linechart-grid" />
      <text x="${(padding.left - 6).toFixed(2)}" y="${(y + 4).toFixed(2)}" class="stats-linechart-y-label">${tickValue}</text>
    `;
  }).join('');

  const labelStep = Math.max(1, Math.ceil(series.length / 6));
  const xLabels = points.map((p, i) => {
    const show = i === 0 || i === points.length - 1 || i % labelStep === 0;
    if (!show) return '';
    return `<text x="${p.x.toFixed(2)}" y="${(height - 14).toFixed(2)}" class="stats-linechart-x-label">${p.label}</text>`;
  }).join('');

  const dots = points.map(p => `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="3.6" class="stats-linechart-dot" />`).join('');

  const maxPoint = points.reduce((best, p) => (p.value > best.value ? p : best), points[0]);

  return `
    <div class="stats-linechart-card">
      <svg viewBox="0 0 ${width} ${height}" class="stats-linechart-svg" preserveAspectRatio="none" aria-label="Peñas por mes">
        ${grid}
        <path d="${areaPath}" class="stats-linechart-area"/>
        <path d="${linePath}" class="stats-linechart-line"/>
        ${dots}
        ${xLabels}
        <text x="${maxPoint.x.toFixed(2)}" y="${(maxPoint.y - 10).toFixed(2)}" class="stats-linechart-max">${maxPoint.value}</text>
      </svg>
    </div>
  `;
}

async function stats(){
  setActiveTab('#btnStats');
  toggleHeroSection(false);
  app.innerHTML = '<div style="text-align:center;padding:40px"><div class="spinner"></div></div>';
  try{
    const [asistData, trucoPlayers, trucoMatches, penasData] = await Promise.all([
       supaFetch('vw_asistencias?select=nombre,_count&order=_count.desc').then(r=>r.json()),
       supaFetch('truco_jugadores?select=participante_id,equipo,partido_id,participantes(nombre)').then(r=>r.json()),
       supaFetch('truco_partidos?select=id,ganador').then(r=>r.json()),
       supaFetch('penas?select=sede,fecha&deleted_at=is.null').then(r=>r.json())
    ]);
    let html = '';
    if(asistData && asistData.length){ 
      const max = Math.max(...asistData.map(r=>r._count || 0));
      html += `<div class="stats-header">ASISTENCIA</div>` + asistData.map((r,i)=>{
        const v = r._count || 0; const w = max ? Math.round((v/max)*100) : 0; const rankClass = i < 3 ? 'top-rank' : '';
        return `<div class="stat-row ${rankClass}"><div style="width:30px;font-weight:bold;color:var(--text-muted);font-size:12px">#${i+1}</div><div style="width:100px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:15px">${r.nombre}</div><div class="stat-bar-track"><div class="stat-bar-fill" style="width:${w}%"></div></div><div style="width:24px;text-align:right;font-weight:bold;color:var(--gold)">${v}</div></div>`;
      }).join('');
    } else { html += '<div style="text-align:center;color:var(--text-muted);padding:20px">Sin datos</div>'; }
    
    const trucoStats = {};
    const matchesMap = {};
    trucoMatches.forEach(m => matchesMap[m.id] = m.ganador);
    trucoPlayers.forEach(tp => { 
      const pid = tp.participante_id; 
      const nombre = tp.participantes.nombre; 
      const ganadorPartido = matchesMap[tp.partido_id]; 
      if(!trucoStats[pid]) trucoStats[pid] = { nombre, jugados: 0, ganados: 0 }; 
      trucoStats[pid].jugados++; 
      if(ganadorPartido && tp.equipo === ganadorPartido) trucoStats[pid].ganados++; 
    });
    const trucoArray = Object.values(trucoStats).map(s => ({ ...s, pct: s.jugados > 0 ? (s.ganados / s.jugados * 100) : 0 })).sort((a,b) => { if(b.pct !== a.pct) return b.pct - a.pct; return b.ganados - a.ganados; });
    
    html += `<div class="stats-header" style="margin-top:30px">TRUCO</div>`;
    if(trucoArray.length > 0) {
      html += `<div style="display:flex;padding:0 12px 8px 12px;font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase"><div style="flex:2">Jugador</div><div style="flex:1;text-align:center">PJ</div><div style="flex:1;text-align:center">PG</div><div style="flex:1;text-align:right">% Vic</div></div>`;
      html += trucoArray.map((s, i) => `<div class="stat-row ${i < 3 ? 'top-rank' : ''}" style="padding:8px 12px"><div style="flex:2;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:15px"><span style="color:var(--text-muted);font-size:11px;margin-right:6px">#${i+1}</span> ${s.nombre}</div><div style="flex:1;text-align:center;color:var(--text-muted)">${s.jugados}</div><div style="flex:1;text-align:center;color:#fff">${s.ganados}</div><div style="flex:1;text-align:right;color:var(--gold);font-weight:bold">${Math.round(s.pct)}%</div></div>`).join('');
    } else { html += '<div style="text-align:center;color:var(--text-muted);padding:20px">Sin datos</div>'; }
    
    const sedeStats = {};
    penasData.forEach(p => { sedeStats[p.sede] = (sedeStats[p.sede] || 0) + 1; });
    const totalSedes = Object.values(sedeStats).reduce((a,b) => a+b, 0);
    const sedesArray = Object.entries(sedeStats).sort((a,b) => b[1] - a[1]);
    const colors = ['#75AADB', '#F4B942', '#ff6b6b', '#4ade80', '#a78bfa'];
    let startAngle = 0;
    const donutSegments = sedesArray.map(([sede, count], i) => {
      const pct = count / totalSedes;
      const angle = pct * 360;
      const endAngle = startAngle + angle;
      const x1 = 50 + 40 * Math.cos(Math.PI * startAngle / 180);
      const y1 = 50 + 40 * Math.sin(Math.PI * startAngle / 180);
      const x2 = 50 + 40 * Math.cos(Math.PI * endAngle / 180);
      const y2 = 50 + 40 * Math.sin(Math.PI * endAngle / 180);
      const largeArc = angle > 180 ? 1 : 0;
      const path = `<path d="M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${colors[i % colors.length]}"/>`;
      startAngle = endAngle;
      return path;
    }).join('');
    const legend = sedesArray.map(([sede, count], i) => `<div style="display:flex;align-items:center;margin-bottom:4px;font-size:13px"><div style="width:12px;height:12px;border-radius:50%;background:${colors[i % colors.length]};margin-right:8px"></div><div style="flex:1">${sede}</div><div style="font-weight:bold;color:var(--gold)">${Math.round(count/totalSedes*100)}%</div></div>`).join('');
    
    html += `<div class="stats-header" style="margin-top:30px">SEDES MÁS USADAS</div>`;
    html += `<div style="display:flex;align-items:center;justify-content:center;gap:20px;padding:20px"><div style="position:relative;width:120px;height:120px"><svg viewBox="0 0 100 100" style="width:100%;height:100%">${donutSegments}<circle cx="50" cy="50" r="25" fill="var(--bg)"/></svg><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center"><div style="font-size:24px;font-weight:bold;color:var(--gold)">${totalSedes}</div><div style="font-size:10px;color:var(--text-muted)">TOTAL</div></div></div><div style="flex:1;max-width:160px">${legend}</div></div>`;

    const penasByMonth = buildPenasByMonthSeries(penasData);
    html += `<div class="stats-header" style="margin-top:30px">PEÑAS POR MES</div>`;
    html += renderPenasLineChart(penasByMonth);
    
    app.innerHTML = html;
  }catch(e){ console.warn(e); app.innerHTML = '<div style="text-align:center;padding:40px;color:#ff6b6b">Error cargando estadísticas</div>'; }
}
