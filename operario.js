

document.addEventListener('DOMContentLoaded', () => {

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  const state = {
    autosTot: 30,
    motosTot: 15,
    autosDisp: 30,
    motosDisp: 15,
    registros: []
  };

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

  const btnGenerarTicket = document.getElementById("btnGenerarTicket");
  const ticketContainer = document.getElementById("ticketContainer");


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
      tr.innerHTML =
        `<td colspan="3" style="text-align:center; color:var(--muted);">Registros vacíos</td>`;
      tablaEntradasBody.appendChild(tr);
      return;
    }

    data.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.placa}</td>
        <td>${r.tipo}</td>
        <td>${formatDateTime(r.entrada)}</td>
      `;
      tablaEntradasBody.appendChild(tr);
    });
  }


  function renderSalidas() {
    tablaSalidasBody.innerHTML = '';
    state.registros
      .filter(r => r.estado === 'FINALIZADO')
      .forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${r.placa}</td>
          <td>${r.tipo}</td>
          <td>${formatDateTime(r.entrada)}</td>
          <td>${formatDateTime(r.salida)}</td>
          <td>${r.minutos}</td>
          <td>$${r.valor}</td>
        `;
        tablaSalidasBody.appendChild(tr);
      });
  }


  function formatDateTime(date) {
    if (!(date instanceof Date)) date = new Date(date);
    return date.toLocaleString('es-CO');
  }


  /* -------------------------------------------------------
     🔵 GENERAR TICKET VISUAL
  ------------------------------------------------------- */
  function generarTicket(reg) {
    ticketContainer.innerHTML = `
      <div class="ticket-title">✔ Ticket de Salida</div>
      <div class="ticket-row"><strong>Placa:</strong> ${reg.placa}</div>
      <div class="ticket-row"><strong>Hora entrada:</strong> ${formatDateTime(reg.entrada)}</div>
      <div class="ticket-row"><strong>Hora salida:</strong> ${formatDateTime(reg.salida)}</div>
      <div class="ticket-row"><strong>Tiempo total:</strong> ${reg.minutos} min</div>
      <div class="ticket-row"><strong>Valor total:</strong> $${reg.valor}</div>

      
    `;

    ticketContainer.classList.remove("hidden");

    /* Activar el botón de impresión */
    document.getElementById("btnImprimirTicket")
      .addEventListener("click", imprimirTicket);
  }


  /* -------------------------------------------------------
     🖨 FUNCIÓN PARA IMPRIMIR SOLO EL TICKET
  ------------------------------------------------------- */
  function imprimirTicket() {
    const contenido = ticketContainer.innerHTML;

    const ventana = window.open("", "_blank", "width=320,height=600");

    ventana.document.write(`
      <html>
        <head>
          <title>Ticket</title>
          <link rel="stylesheet" href="styles.css">
          <style>
            body { font-family: Roboto, sans-serif; padding: 20px; }
            .ticket { width: 260px; }
            button { display: none !important; }
          </style>
        </head>
        <body>
          <div class="ticket">${contenido}</div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);

    ventana.document.close();
  }


  /* -------------------------------------------------------
     REGISTRAR ENTRADA
  ------------------------------------------------------- */
  entradaForm.addEventListener('submit', e => {
    e.preventDefault();

    const placa = document.getElementById('entPlaca').value.trim().toUpperCase();
    const tipo  = document.getElementById('entTipo').value;

    if (!placa) {
      entMsg.textContent = 'Ingrese la placa.';
      return;
    }

    if (tipo === 'moto' && state.motosDisp <= 0) {
      entMsg.textContent = 'No hay cupos disponibles para motos.';
      return;
    }
    if (tipo !== 'moto' && state.autosDisp <= 0) {
      entMsg.textContent = 'No hay cupos disponibles para autos.';
      return;
    }

    state.registros.push({
      placa,
      tipo,
      entrada: new Date(),
      estado: 'EN_CURSO'
    });

    if (tipo === 'moto') state.motosDisp--;
    else state.autosDisp--;

    renderCupos();
    renderEntradas();

    entMsg.textContent = `Entrada registrada: ${placa}`;
    entradaForm.reset();
  });


  /* -------------------------------------------------------
     REGISTRAR SALIDA
  ------------------------------------------------------- */
  salidaForm.addEventListener('submit', e => {
    e.preventDefault();

    const placa = document.getElementById('salPlaca').value.trim().toUpperCase();
    if (!placa) {
      salMsg.textContent = 'Ingrese la placa.';
      return;
    }

    const reg = state.registros.find(r => r.placa === placa && r.estado === 'EN_CURSO');
    if (!reg) {
      salMsg.textContent = 'No se encontró registro activo con esa placa.';
      return;
    }

    const salida = new Date();
    const minutos = Math.ceil((salida - reg.entrada) / 60000);

    const valorHora = reg.tipo === 'moto' ? 1500 : 3000;
    const horas = Math.max(1, Math.ceil(minutos / 60));
    const total = horas * valorHora;

    reg.estado  = 'FINALIZADO';
    reg.salida  = salida;
    reg.minutos = minutos;
    reg.valor   = total;

    if (reg.tipo === 'moto') state.motosDisp++;
    else state.autosDisp++;

    renderCupos();
    renderEntradas();
    renderSalidas();

    salMsg.textContent = `Salida registrada: ${placa} | ${minutos} min | $${total}`;

    generarTicket(reg);
    salidaForm.reset();
  });


  /* -------------------------------------------------------
     BOTÓN MANUAL GENERAR TICKET
  ------------------------------------------------------- */
  btnGenerarTicket.addEventListener("click", () => {
    const placa = document.getElementById('salPlaca').value.trim().toUpperCase();
    if (!placa) {
      salMsg.textContent = 'Ingrese la placa para buscar su ticket.';
      return;
    }

    const reg = state.registros.find(r => r.placa === placa && r.estado === 'FINALIZADO');
    if (!reg) {
      salMsg.textContent = 'No existe un registro finalizado con esa placa.';
      return;
    }

    generarTicket(reg);
  });


  renderCupos();
  renderEntradas();
  renderSalidas();
});
