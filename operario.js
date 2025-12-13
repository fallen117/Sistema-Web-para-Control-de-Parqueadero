document.addEventListener('DOMContentLoaded', () => {

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => { window.location.href = 'index.html'; });

  const state = { autosTot: 0, motosTot: 0, autosDisp: 0, motosDisp: 0, registros: [] };

  const autosTotEl  = document.getElementById('autosTot');
  const autosDispEl = document.getElementById('autosDisp');
  const motosTotEl  = document.getElementById('motosTot');
  const motosDispEl = document.getElementById('motosDisp');

  const entradaForm = document.getElementById('entradaForm');
  const salidaForm  = document.getElementById('salidaForm');

  const entMsg = document.getElementById('entradaMsg');
  const salMsg = document.getElementById('salidaMsg');

  const tablaEntradasBody = document.querySelector('#tablaEntradas tbody');
  const tablaSalidasBody  = document.querySelector('#tablaSalidas tbody');

  const btnGenerarTicket = document.getElementById('btnGenerarTicket');
  const ticketContainer = document.getElementById('ticketContainer');

  function renderCupos() {
    autosTotEl.textContent  = state.autosTot;
    autosDispEl.textContent = state.autosDisp;
    motosTotEl.textContent  = state.motosTot;
    motosDispEl.textContent = state.motosDisp;
  }

  function renderEntradas() {
    tablaEntradasBody.innerHTML = '';
    const data = state.registros.filter(r => r.estado === 'EN_CURSO');
    if (data.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="3" style="text-align:center; color:var(--muted);">Registros vacíos</td>`;
      tablaEntradasBody.appendChild(tr);
      return;
    }
    data.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.placa}</td>
        <td>${r.tipo}</td>
        <td>${formatDateTime(r.fecha_hora_entrada)}</td>
      `;
      tablaEntradasBody.appendChild(tr);
    });
  }

  function renderSalidas() {
    tablaSalidasBody.innerHTML = '';
    state.registros.filter(r => r.estado === 'FINALIZADO').forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.placa}</td>
        <td>${r.tipo}</td>
        <td>${formatDateTime(r.fecha_hora_entrada)}</td>
        <td>${formatDateTime(r.fecha_hora_salida)}</td>
        <td>${r.minutos_totales}</td>
        <td>$${r.valor_calculado}</td>
      `;
      tablaSalidasBody.appendChild(tr);
    });
  }

  function formatDateTime(date) { if (!date) return ''; return new Date(date).toLocaleString('es-CO'); }

  function generarTicket(reg) {
    if (!reg) return;
    ticketContainer.innerHTML = `
      <div class="ticket-title">✔ Ticket de Salida</div>
      <div class="ticket-row"><strong>Placa:</strong> ${reg.placa}</div>
      <div class="ticket-row"><strong>Hora entrada:</strong> ${formatDateTime(reg.fecha_hora_entrada)}</div>
      <div class="ticket-row"><strong>Hora salida:</strong> ${formatDateTime(reg.fecha_hora_salida)}</div>
      <div class="ticket-row"><strong>Tiempo total:</strong> ${reg.minutos_totales} min</div>
      <div class="ticket-row"><strong>Valor total:</strong> $${reg.valor_calculado}</div>
    `;
    ticketContainer.classList.remove('hidden');
    const btnImp = document.getElementById('btnImprimirTicket');
    if (btnImp) btnImp.addEventListener('click', imprimirTicket);
  }

  function imprimirTicket() {
    const contenido = ticketContainer.innerHTML;
    const ventana = window.open('', '_blank', 'width=320,height=600');
    ventana.document.write(`
      <html><head><title>Ticket</title><link rel="stylesheet" href="styles.css"><style>body{font-family:Roboto,sans-serif;padding:20px}.ticket{width:260px}button{display:none!important}</style></head><body><div class="ticket">${contenido}</div><script>window.onload=function(){window.print();window.close();}</script></body></html>`);
    ventana.document.close();
  }

  // --- API interactions ---
  const API_BASE = (location.hostname === '127.0.0.1' && location.port === '5500') ? 'http://localhost:3000' : location.origin;

  async function safeJson(response) {
    const text = await response.text();
    try { return text ? JSON.parse(text) : {}; } catch (e) { return { _raw: text }; }
  }

  async function loadRegistros() {
    try {
      const res = await fetch(`${API_BASE}/api/registros`);
      const rows = await safeJson(res);
      if (!res.ok) { console.error('loadRegistros error', rows); return; }
      state.registros = rows;
      // try to get espacios to compute cupos
      try {
        const espRes = await fetch(`${API_BASE}/api/espacios`);
        const esp = await safeJson(espRes);
        if (!espRes.ok) { throw new Error('espacios error'); }
        const autosTot = esp.filter(e => e.TIPOS_VEHICULO_id === 1).length || 0;
        const motosTot = esp.filter(e => e.TIPOS_VEHICULO_id === 2).length || 0;
        state.autosTot = autosTot; state.motosTot = motosTot;
        const enCursoAutos = state.registros.filter(r => r.estado === 'EN_CURSO' && (r.TIPOS_VEHICULO_id === 1 || r.tipo === 'sedan')).length;
        const enCursoMotos = state.registros.filter(r => r.estado === 'EN_CURSO' && (r.TIPOS_VEHICULO_id === 2 || r.tipo === 'moto')).length;
        state.autosDisp = Math.max(0, state.autosTot - enCursoAutos);
        state.motosDisp = Math.max(0, state.motosTot - enCursoMotos);
      } catch (err) {
        // fallback counts
        state.autosTot = 30; state.motosTot = 15;
        state.autosDisp = state.autosTot - state.registros.filter(r => r.estado === 'EN_CURSO' && r.tipo !== 'moto').length;
        state.motosDisp = state.motosTot - state.registros.filter(r => r.estado === 'EN_CURSO' && r.tipo === 'moto').length;
      }
      renderCupos(); renderEntradas(); renderSalidas();
    } catch (err) { console.error('loadRegistros', err); }
  }

  entradaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const placa = document.getElementById('entPlaca').value.trim().toUpperCase();
    const tipo  = document.getElementById('entTipo').value;
    if (!placa) { entMsg.textContent = 'Ingrese la placa.'; return; }
    if (tipo === 'moto' && state.motosDisp <= 0) { entMsg.textContent = 'No hay cupos disponibles para motos.'; return; }
    if (tipo !== 'moto' && state.autosDisp <= 0) { entMsg.textContent = 'No hay cupos disponibles para autos.'; return; }
    try {
      const res = await fetch(`${API_BASE}/api/registros`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ placa, tipo }) });
      if (!res.ok) { const err = await safeJson(res); throw new Error(err.error || 'Error registrando entrada'); }
      entMsg.textContent = `Entrada registrada: ${placa}`;
      entradaForm.reset();
      await loadRegistros();
    } catch (err) { console.error(err); entMsg.textContent = 'Error registrando entrada'; }
  });

  salidaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const placa = document.getElementById('salPlaca').value.trim().toUpperCase();
    if (!placa) { salMsg.textContent = 'Ingrese la placa.'; return; }
    const reg = state.registros.find(r => r.placa === placa && r.estado === 'EN_CURSO');
    if (!reg) { salMsg.textContent = 'No se encontró registro activo con esa placa.'; return; }
    try {
      const res = await fetch(`${API_BASE}/api/registros/${reg.id}/salida`, { method: 'POST' });
      if (!res.ok) { const err = await safeJson(res); throw new Error(err.error || 'Error registrando salida'); }
      salMsg.textContent = `Salida registrada: ${placa}`;
      await loadRegistros();
      const updated = state.registros.find(r => r.id === reg.id);
      generarTicket(updated);
      salidaForm.reset();
    } catch (err) { console.error(err); salMsg.textContent = 'Error registrando salida'; }
  });

  if (btnGenerarTicket) {
    btnGenerarTicket.addEventListener('click', () => {
      const placa = document.getElementById('salPlaca').value.trim().toUpperCase();
      if (!placa) { salMsg.textContent = 'Ingrese la placa para buscar su ticket.'; return; }
      const reg = state.registros.find(r => r.placa === placa && r.estado === 'FINALIZADO');
      if (!reg) { salMsg.textContent = 'No existe un registro finalizado con esa placa.'; return; }
      generarTicket(reg);
    });
  }

  // initial load + polling
  loadRegistros();
  setInterval(loadRegistros, 3000);

});
