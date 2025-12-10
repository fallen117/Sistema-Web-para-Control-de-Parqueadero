document.addEventListener('DOMContentLoaded', () => {

  /* Botón cerrar sesión */
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  /* -------------------------------------------------------
     ESTADO INICIAL (simulación local)
  ------------------------------------------------------- */
  const state = {
    autosTot: 30,
    motosTot: 15,
    autosDisp: 30,
    motosDisp: 15,

    // registros: { placa, tipo, entrada, salida?, minutos?, valor?, estado }
    registros: []
  };

  /* -------------------------------------------------------
     ELEMENTOS DEL DOM
  ------------------------------------------------------- */

  // Cupos
  const autosTotEl  = document.getElementById('autosTot');
  const autosDispEl = document.getElementById('autosDisp');
  const motosTotEl  = document.getElementById('motosTot');
  const motosDispEl = document.getElementById('motosDisp');

  // Formularios
  const entradaForm = document.getElementById('entradaForm');
  const salidaForm  = document.getElementById('salidaForm');

  // Mensajes
  const entMsg = document.getElementById('entradaMsg');
  const salMsg = document.getElementById('salidaMsg');

  // Historial de Entradas / Salidas
  const tablaEntradasBody = document.querySelector('#tablaEntradas tbody');
  const tablaSalidasBody  = document.querySelector('#tablaSalidas tbody');


  /* -------------------------------------------------------
     RENDER DE CUPOS
  ------------------------------------------------------- */
  function renderCupos() {
    autosTotEl.textContent  = state.autosTot;
    autosDispEl.textContent = state.autosDisp;
    motosTotEl.textContent  = state.motosTot;
    motosDispEl.textContent = state.motosDisp;
  }


  /* -------------------------------------------------------
     HISTORIAL DE ENTRADAS (EN_CURSO)
     SIEMPRE mostrar "Registros vacíos" cuando no haya datos
  ------------------------------------------------------- */
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
        <td>${escapeHtml(r.placa)}</td>
        <td>${escapeHtml(r.tipo)}</td>
        <td>${formatDateTime(r.entrada)}</td>
      `;
      tablaEntradasBody.appendChild(tr);
    });
  }


  /* -------------------------------------------------------
     HISTORIAL DE SALIDAS (FINALIZADO)
     ❗ ESTA TABLA NO CAMBIA — SE MANTIENE ORIGINAL
  ------------------------------------------------------- */
  function renderSalidas() {
    tablaSalidasBody.innerHTML = '';

    state.registros
      .filter(r => r.estado === 'FINALIZADO')
      .forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(r.placa)}</td>
          <td>${escapeHtml(r.tipo)}</td>
          <td>${formatDateTime(r.entrada)}</td>
          <td>${formatDateTime(r.salida)}</td>
          <td>${r.minutos}</td>
          <td>$${r.valor}</td>
        `;
        tablaSalidasBody.appendChild(tr);
      });
  }


  /* -------------------------------------------------------
     FORMATEO DE FECHA / HORA
  ------------------------------------------------------- */
  function formatDateTime(date) {
    if (!(date instanceof Date)) date = new Date(date);
    return date.toLocaleString('es-CO');
  }

  /* Seguridad mínima al mostrar texto */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }


  /* -------------------------------------------------------
     REGISTRAR ENTRADA
  ------------------------------------------------------- */
  entradaForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const placa = document.getElementById('entPlaca').value.trim().toUpperCase();
    const tipo  = document.getElementById('entTipo').value;

    if (!placa) {
      entMsg.textContent = 'Ingrese la placa.';
      return;
    }

    // Validar cupos por tipo
    if (tipo === 'moto' && state.motosDisp <= 0) {
      entMsg.textContent = 'No hay cupos disponibles para motos.';
      return;
    }
    if (tipo !== 'moto' && state.autosDisp <= 0) {
      entMsg.textContent = 'No hay cupos disponibles para autos.';
      return;
    }

    // Registrar entrada
    state.registros.push({
      placa,
      tipo,
      entrada: new Date(),
      estado: 'EN_CURSO'
    });

    // Reducir cupo
    if (tipo === 'moto') state.motosDisp--;
    else state.autosDisp--;

    // Render
    renderCupos();
    renderEntradas();

    entMsg.textContent = `Entrada registrada: ${placa}`;
    entradaForm.reset();
  });


  /* -------------------------------------------------------
     REGISTRAR SALIDA
  ------------------------------------------------------- */
  salidaForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const placa = document.getElementById('salPlaca').value.trim().toUpperCase();
    if (!placa) {
      salMsg.textContent = 'Ingrese la placa.';
      return;
    }

    // Buscar registro activo
    const reg = state.registros.find(r => r.placa === placa && r.estado === 'EN_CURSO');

    if (!reg) {
      salMsg.textContent = 'No se encontró registro activo con esa placa.';
      return;
    }

    // Calcular tiempo
    const salida = new Date();
    const minutos = Math.ceil((salida - reg.entrada) / 60000);

    // Tarifas simuladas
    const valorHora = reg.tipo === 'moto' ? 1500 : 3000;
    const horas = Math.max(1, Math.ceil(minutos / 60));
    const total = horas * valorHora;

    // Actualizar registro
    reg.estado  = 'FINALIZADO';
    reg.salida  = salida;
    reg.minutos = minutos;
    reg.valor   = total;

    // Liberar cupo
    if (reg.tipo === 'moto') state.motosDisp++;
    else state.autosDisp++;

    // Render
    renderCupos();
    renderEntradas(); // actualiza también porque ya no está EN_CURSO
    renderSalidas();

    salMsg.textContent = `Salida registrada: ${placa} | ${minutos} min | $${total}`;
    salidaForm.reset();
  });


  /* -------------------------------------------------------
     INICIALIZAR VISTAS
  ------------------------------------------------------- */
  renderCupos();
  renderEntradas(); // ahora sí muestra "Registros vacíos"
  renderSalidas();  // esta tabla se renderiza sin placeholder
});
