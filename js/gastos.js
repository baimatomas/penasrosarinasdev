/* ===================== GASTOS ===================== */
async function gastosInit() {
  setActiveTab('#btnGastos');
  toggleHeroSection(false);
  app.innerHTML = '<div style="text-align:center;padding:40px"><div class="spinner"></div></div>';
  try {
    const [penas, allParts] = await Promise.all([
      supaFetch('penas?select=id,fecha,sede,pena_participantes(participantes(id,nombre))&order=fecha.desc&limit=5').then(r=>r.json()),
      supaFetch('participantes?select=id,nombre,alias&order=nombre.asc').then(r=>r.json())
    ]);
    
    if (!Array.isArray(penas)) throw new Error('Error cargando peñas');

    gastosState = { 
      penaId: penas[0]?.id || null, 
      penas: penas,
      expenses: [], 
      participants: penas[0]?.pena_participantes ? penas[0].pena_participantes.map(pp => ({ 
        id: pp.participantes?.id, 
        nombre: pp.participantes?.nombre 
      })).filter(p => p.id) : [],
      allParts: allParts, 
      currentSplitSelection: [],
      editingExpenseId: null
    };
    if (gastosState.penaId) await fetchExpenses();
    renderGastosUI();
  } catch(e) { console.error(e); alertMsg('Error cargando datos: ' + e.message, 'error'); }
}

async function fetchExpenses() {
    if (!gastosState.penaId) return;
    try {
        const res = await supaFetch(`gastos?pena_id=eq.${gastosState.penaId}&select=id,pagador_id,monto,descripcion,gasto_participantes(participante_id)`);
        const data = await res.json();
        
        if (!Array.isArray(data)) {
            console.error('Supabase error:', data);
            gastosState.expenses = [];
            return;
        }

        gastosState.expenses = data.map(g => ({
            id: g.id,
            payerId: g.pagador_id,
            payerName: gastosState.allParts.find(x => x.id == g.pagador_id)?.nombre || 'Desconocido',
            amount: parseFloat(g.monto),
            desc: g.descripcion || '',
            involvedIds: g.gasto_participantes ? g.gasto_participantes.map(gp => gp.participante_id) : []
        }));
    } catch (e) {
        console.error('fetchExpenses error:', e);
        gastosState.expenses = [];
    }
}

function renderGastosUI() {
    const penas = gastosState.penas;
    const penasOpts = penas.map(p => `<option value="${p.id}" ${p.id==gastosState.penaId?'selected':''}>${formatDateSafe(p.fecha)} - ${p.sede}</option>`).join('');
    const payerOpts = gastosState.allParts.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
    
    if(gastosState.currentSplitSelection.length === 0 && gastosState.participants.length > 0) {
        gastosState.currentSplitSelection = gastosState.participants.map(p => p.id);
    }
    
    const splitChips = `<div class="chips-container" id="splitChips">
        <div id="chip-todos" class="chip split-chip ${gastosState.currentSplitSelection.length === gastosState.participants.length ? 'selected':''}" onclick="toggleSplitAll()">TODOS</div>
        ${gastosState.participants.map(p => `<div data-id="${p.id}" class="chip split-chip split-part-chip ${gastosState.currentSplitSelection.includes(p.id) && gastosState.currentSplitSelection.length !== gastosState.participants.length ? 'selected':''}" onclick="toggleSplitOne('${p.id}')">${p.nombre}</div>`).join('')}
    </div>`;

    const hasExpenses = gastosState.expenses.length > 0;
    const calcularDisabled = !hasExpenses ? 'disabled style="opacity:0.5;cursor:not-allowed"' : '';
    const calcularText = !hasExpenses ? 'AGREGA UN GASTO PARA CALCULAR' : 'CALCULAR 💰';

    const formTitle = gastosState.editingExpenseId ? '📝 EDITAR GASTO' : '💰 NUEVO GASTO';
    const btnText = gastosState.editingExpenseId ? 'ACTUALIZAR GASTO' : 'AGREGAR GASTO';

    app.innerHTML = `
    <div style="padding-top:20px; animation:fadeIn 0.4s ease">
        <div class="form-group" style="margin-bottom:20px">
            <label class="form-label">SELECCIONAR PEÑA</label>
            <select class="pena-selector" onchange="changeGastosPena(this.value)">${penasOpts}</select>
        </div>
    
        <div class="item" style="padding:16px; background:var(--surface)">
            <h4 id="gastoFormTitle" style="margin:0 0 16px 0; color:var(--gold); font-size:15px; text-transform:uppercase; font-weight:800">${formTitle}</h4>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px">
                <select id="gastoPayer" class="pena-selector">${payerOpts}</select>
                <input id="gastoAmount" type="number" placeholder="$" class="pena-selector" />
            </div>
            <input id="gastoDesc" placeholder="Descripción (opcional)" class="pena-selector" style="margin-bottom:10px" />
            <div style="margin-bottom:14px">
                <label class="form-label" style="margin-bottom:6px">DIVIDIR ENTRE:</label>
                ${splitChips}
            </div>
            <div style="display:flex; gap:10px">
                <button id="btnAddExpense" onclick="addExpense()" class="btn-main" style="flex:2; padding:10px; font-size:14px; background:var(--gold); color:#000; box-shadow:0 4px 15px rgba(244,185,66,0.3)">${btnText}</button>
                ${gastosState.editingExpenseId ? `<button onclick="cancelEditExpense()" class="btn-main" style="flex:1; padding:10px; font-size:14px; background:rgba(255,255,255,0.1); color:var(--text)">CANCELAR</button>` : ''}
            </div>
        </div>

        <div id="expensesList"></div>
        <div id="partialTotal"></div>

        <button onclick="calculateSplit()" class="btn-main btn-save" style="margin-top:0; width:100%; padding:16px; font-size:16px" ${calcularDisabled}>${calcularText}</button>
        <div id="splitResult" style="margin-top:24px"></div>
    </div>`;
    renderExpensesList();
    updateCalcularButton();
}

async function changeGastosPena(id) { 
  const p = gastosState.penas.find(x => x.id == id); 
  if(p) { 
    gastosState.penaId = id; 
    gastosState.participants = p.pena_participantes ? p.pena_participantes.map(pp => ({ 
      id: pp.participantes?.id, 
      nombre: pp.participantes?.nombre 
    })).filter(part => part.id) : []; 
    gastosState.currentSplitSelection = []; 
    gastosState.editingExpenseId = null;
    await fetchExpenses();
    renderGastosUI(); 
  } 
}

function maybeAddExpense(event) {
    if (event.key === 'Enter' || event.type === 'keyup') {
        const amount = parseFloat($('#gastoAmount').value);
        if (amount && amount > 0) {
            addExpense();
        }
    }
}

function toggleSplitAll() { 
  gastosState.currentSplitSelection = gastosState.participants.map(p => p.id); 
  updateSplitUI(); 
}

function toggleSplitOne(id) { 
  if(gastosState.currentSplitSelection.length === gastosState.participants.length) {
    gastosState.currentSplitSelection = [];
  }
  const idx = gastosState.currentSplitSelection.indexOf(id); 
  if(idx > -1) gastosState.currentSplitSelection.splice(idx, 1); 
  else gastosState.currentSplitSelection.push(id); 
  
  if(gastosState.currentSplitSelection.length === 0) toggleSplitAll(); 
  else updateSplitUI(); 
}

function updateSplitUI() { 
  const allSelected = gastosState.currentSplitSelection.length === gastosState.participants.length; 
  const todosChip = $('#chip-todos');
  if(todosChip) todosChip.classList.toggle('selected', allSelected);

  $$('.split-part-chip').forEach(c => {
    const id = c.dataset.id;
    c.classList.toggle('selected', !allSelected && gastosState.currentSplitSelection.includes(id));
  });
}

async function addExpense() {
  const payerId = $('#gastoPayer').value; 
  const amount = parseFloat($('#gastoAmount').value); 
  const desc = $('#gastoDesc').value.trim() || 'Varios';
  const involvedIds = [...gastosState.currentSplitSelection];
  
  if(!amount || amount <= 0) return alertMsg('Ingresá un monto válido', 'warning');
  if(involvedIds.length === 0) return alertMsg('Seleccioná al menos un participante', 'warning');

  const btn = $('#btnAddExpense');
  btn.disabled = true;
  btn.textContent = 'GUARDANDO...';

  try {
    const gastoData = {
        pena_id: gastosState.penaId,
        pagador_id: payerId,
        monto: amount,
        descripcion: desc
    };

    let gastoId = gastosState.editingExpenseId;

    if (gastoId) {
        await supaFetch(`gastos?id=eq.${gastoId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gastoData)
        });
        await supaFetch(`gasto_participantes?gasto_id=eq.${gastoId}`, { method: 'DELETE' });
    } else {
        const res = await supaFetch('gastos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
            body: JSON.stringify(gastoData)
        });
        const created = await res.json();
        if (!created || !created[0]) throw new Error('Error al crear gasto');
        gastoId = created[0].id;
    }

    const participantsData = involvedIds.map(pid => ({
        gasto_id: gastoId,
        participante_id: pid
    }));
    
    await supaFetch('gasto_participantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(participantsData)
    });

    gastosState.editingExpenseId = null;
    await fetchExpenses();
    
    // Reset form
    $('#gastoAmount').value = ''; 
    $('#gastoDesc').value = ''; 
    gastosState.currentSplitSelection = gastosState.participants.map(p => p.id);
    
    renderGastosUI(); // Full re-render to clean up
  } catch (e) {
    console.error(e);
    alertMsg('Error al guardar el gasto', 'error');
  } finally {
    btn.disabled = false;
  }
}

function renderExpensesList() {
  const container = $('#expensesList');

  if(!gastosState.expenses.length) {
    container.innerHTML = '';
    return;
  }
  
  let html = `
    <div style="background:var(--surface); border-radius:16px; overflow:hidden; border:1px solid rgba(255,255,255,0.05); margin-top:20px">
        <div style="display:grid; grid-template-columns: 1fr 1.2fr 1.2fr 0.7fr 70px; gap:0; background:rgba(117,170,219,0.08); padding:12px 14px; border-bottom:1px solid rgba(255,255,255,0.08)">
            <span style="font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:var(--celeste); font-weight:700">Emisor</span>
            <span style="font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:var(--celeste); font-weight:700">Descripción</span>
            <span style="font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:var(--celeste); font-weight:700">Dividir entre</span>
            <span style="font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:var(--celeste); font-weight:700; text-align:right">Monto</span>
            <span></span>
        </div>`;
  
  gastosState.expenses.forEach((e) => {
    const isAll = e.involvedIds.length === gastosState.participants.length;
    const involvedNames = isAll ? 'Todos' : e.involvedIds.map(id => {
      const p = gastosState.allParts.find(x => x.id == id);
      return p ? p.nombre : '';
    }).filter(n => n).join(', ');
    
    html += `
        <div style="display:grid; grid-template-columns: 1fr 1.2fr 1.2fr 0.7fr 70px; gap:0; padding:14px; border-bottom:1px solid rgba(255,255,255,0.03); transition:background 0.2s; align-items:center">
            <span style="font-size:13px; color:var(--text); font-weight:600">${e.payerName}</span>
            <span style="font-size:13px; color:var(--text-muted)">${e.desc}</span>
            <span style="font-size:12px; color:var(--text-muted); opacity:0.8">${involvedNames}</span>
            <span style="color:var(--gold); font-weight:700; font-size:14px; text-align:right">$${e.amount}</span>
            <div style="display:flex; gap:10px; justify-content:flex-end">
                <span style="color:var(--celeste); cursor:pointer; font-size:14px; opacity:0.6" onclick="prepareEditExpense('${e.id}')">✏️</span>
                <span style="color:#ff6b6b; cursor:pointer; font-weight:bold; font-size:14px; opacity:0.6" onclick="removeExpense('${e.id}')">✕</span>
            </div>
        </div>`;
  });
  
  html += `</div>`;
  container.innerHTML = html;
}

function renderPartialTotal() {
  const container = $('#partialTotal');
  if (!container) return;
  
  if (!gastosState.expenses.length) {
    container.innerHTML = '';
    return;
  }
  
  let total = 0;
  gastosState.expenses.forEach(e => { total += e.amount; });
  
  container.innerHTML = `
    <div style="background:rgba(244,185,66,0.05); border:1px solid rgba(244,185,66,0.15); border-radius:12px; padding:14px; margin-bottom:20px; margin-top:20px; animation:fadeIn 0.3s ease">
      <div style="display:flex; justify-content:space-between; align-items:center">
        <span style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); font-weight:700">Total</span>
        <span style="font-size:18px; font-weight:800; color:var(--gold)">$${total}</span>
      </div>
    </div>
  `;
}

function updateCalcularButton() {
  const btn = $('button[onclick="calculateSplit()"]');
  if (!btn) return;
  const hasExpenses = gastosState.expenses.length > 0;
  btn.disabled = !hasExpenses;
  btn.style.opacity = hasExpenses ? '1' : '0.5';
  btn.style.cursor = hasExpenses ? 'pointer' : 'not-allowed';
  btn.textContent = hasExpenses ? 'CALCULAR 💰' : 'AGREGA UN GASTO PARA CALCULAR';
}

function prepareEditExpense(id) {
    const e = gastosState.expenses.find(x => x.id === id);
    if (!e) return;
    
    gastosState.editingExpenseId = id;
    renderGastosUI(); // Re-render with editing state
    
    $('#gastoPayer').value = e.payerId;
    $('#gastoAmount').value = e.amount;
    $('#gastoDesc').value = e.desc;
    gastosState.currentSplitSelection = [...e.involvedIds];
    
    updateSplitUI();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEditExpense() {
    gastosState.editingExpenseId = null;
    gastosState.currentSplitSelection = gastosState.participants.map(p => p.id);
    renderGastosUI();
}

async function removeExpense(id) { 
  if(!await confirmMsg('¿Estás seguro de eliminar este gasto?')) return;
  try {
      await supaFetch(`gastos?id=eq.${id}`, { method: 'DELETE' });
      await fetchExpenses();
      renderGastosUI();
  } catch(e) {
      console.error(e);
      alertMsg('Error al eliminar gasto', 'error');
  }
}

function calculateSplit() {
  if(!gastosState.expenses.length) return alertMsg('No hay gastos', 'warning');
  let balances = {}; 
  gastosState.participants.forEach(p => balances[p.id] = { name: p.nombre, balance: 0, alias: gastosState.allParts.find(ap=>ap.id===p.id)?.alias || '' });
  let total = 0;
  gastosState.expenses.forEach(e => {
    total += e.amount;
    if(balances[e.payerId]) balances[e.payerId].balance += e.amount;
    const share = e.amount / e.involvedIds.length;
    e.involvedIds.forEach(id => { if(balances[id]) balances[id].balance -= share; });
  });

  let debtors = [], creditors = [];
  for (const [id, data] of Object.entries(balances)) {
    if (data.balance < -0.01) debtors.push({ id, name: data.name, amount: data.balance });
    else if (data.balance > 0.01) creditors.push({ id, name: data.name, amount: data.balance, alias: data.alias });
  }
  debtors.sort((a,b) => a.amount - b.amount); creditors.sort((a,b) => b.amount - a.amount);

  let transactions = []; let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    let debtor = debtors[i]; let creditor = creditors[j];
    let amount = Math.min(Math.abs(debtor.amount), creditor.amount);
    const aliasText = creditor.alias ? `<br><span style="font-size:11px;color:var(--text-muted);font-weight:400">Alias: ${creditor.alias}</span>` : '';
    transactions.push(`<div style="margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:8px"><b>${debtor.name}</b> paga a <b>${creditor.name}</b>: <span style="color:var(--gold);font-weight:bold;float:right">$${Math.round(amount)}</span>${aliasText}</div>`);
    debtor.amount += amount; creditor.amount -= amount;
    if (Math.abs(debtor.amount) < 0.01) i++; if (creditor.amount < 0.01) j++;
  }

  const resDiv = $('#splitResult');
  resDiv.innerHTML = `
    <div id="ticketResult">
      <h3 style="margin:0 0 15px 0; color:var(--text); text-align:center; text-transform:uppercase; letter-spacing:2px">Resumen de Gastos</h3>
      <div style="display:flex; justify-content:center; margin-bottom:15px; font-size:16px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px">
        <span>Total Gastado: <b style="color:var(--gold)">$${total}</b></span>
      </div>
      <div style="display:flex; flex-direction:column; gap:4px; font-size:14px">
        ${transactions.join('')}
      </div>
      <div class="ticket-brand">
        <span style="font-size:12px;font-weight:700;color:var(--celeste)">GENERADO POR PEÑAS ROSARINAS APP</span>
      </div>
    </div>
    <button onclick="shareTicket()" class="btn-main" style="background:var(--surface-light); color:var(--celeste); margin-top:15px">Compartir Imagen 📸</button>
  `;
  resDiv.scrollIntoView({behavior: "smooth"});
}

function shareTicket() {
  const element = $('#ticketResult');
  html2canvas(element, { backgroundColor: '#1c2b38', scale: 2 }).then(canvas => {
    canvas.toBlob(blob => {
      const file = new File([blob], "gastos_pena.png", { type: "image/png" });
      if (navigator.share) {
        navigator.share({ files: [file], title: 'Gastos Peña', text: 'Resumen de gastos.' }).catch(console.error);
      } else {
        const link = document.createElement('a'); link.download = 'gastos.png'; link.href = canvas.toDataURL(); link.click();
      }
    });
  });
}
