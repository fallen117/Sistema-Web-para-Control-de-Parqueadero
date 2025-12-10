/* admin.js — edición de tarifa para las dos categorías: Automóvil y Moto
   Permite modificar: modalidad (POR_MINUTO / POR_HORA / POR_DIA / FRACCION) y valor.
   No permite crear ni eliminar.
*/

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => window.location.href = 'index.html');

  // Tarifas fijas iniciales
  const tarifas = [
    { id: "tar-auto", nombre: "Automóvil", tipo: "POR_HORA", valor: 3000 },
    { id: "tar-moto", nombre: "Moto", tipo: "POR_HORA", valor: 1500 }
  ];

  // DOM
  const tarifasTableBody = document.querySelector('#tarifasTable tbody');
  const tarifaForm = document.getElementById('tarifaForm');
  const tarNombre = document.getElementById('tarNombre');
  const tarTipoCobro = document.getElementById('tarTipoCobro');
  const tarValor = document.getElementById('tarValor');
  const tarGuardar = document.getElementById('tarGuardar');
  const tarCancelar = document.getElementById('tarCancelar');

  let tarifaEditando = null;

  // Renderiza la tabla con las dos tarifas
  function renderTarifas() {
    tarifasTableBody.innerHTML = '';
    tarifas.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(t.nombre)}</td>
        <td>${formatTipo(t.tipo)}</td>
        <td>${t.valor}</td>
        <td>
          <button class="btn-editar" data-id="${t.id}">Editar</button>
        </td>
      `;
      tarifasTableBody.appendChild(tr);
    });
  }

  // Formatea el tipo para mostrar texto legible
  function formatTipo(tipo) {
    switch (tipo) {
      case 'POR_MINUTO': return 'Por minuto';
      case 'POR_HORA': return 'Por hora';
      case 'POR_DIA': return 'Por día';
      case 'FRACCION': return 'Fracción';
      default: return tipo;
    }
  }

  // Manejar click en "Editar"
  tarifasTableBody.addEventListener('click', (ev) => {
    const id = ev.target.dataset.id;
    if (!id) return;
    if (!ev.target.classList.contains('btn-editar')) return;

    const t = tarifas.find(x => x.id === id);
    if (!t) return;

    tarifaEditando = t;
    tarNombre.value = t.nombre;
    tarTipoCobro.value = t.tipo;
    tarValor.value = t.valor;

    tarifaForm.classList.remove('hidden');
    tarifaForm.setAttribute('aria-hidden', 'false');
    tarValor.focus();
  });

  // Guardar cambios
  tarifaForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!tarifaEditando) return;

    const nuevoTipo = tarTipoCobro.value;
    const nuevoValor = Number(tarValor.value);

    if (isNaN(nuevoValor) || nuevoValor < 0) {
      alert('Ingresa un valor válido (número >= 0).');
      return;
    }

    tarifaEditando.tipo = nuevoTipo;
    tarifaEditando.valor = nuevoValor;

    // ocultar formulario y refrescar tabla
    tarifaForm.reset();
    tarifaForm.classList.add('hidden');
    tarifaForm.setAttribute('aria-hidden', 'true');
    tarifaEditando = null;
    renderTarifas();
  });

  // Cancelar edición
  tarCancelar.addEventListener('click', (ev) => {
    ev.preventDefault();
    tarifaForm.reset();
    tarifaForm.classList.add('hidden');
    tarifaForm.setAttribute('aria-hidden', 'true');
    tarifaEditando = null;
  });

  // Small helper to avoid XSS
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" })[c]);
  }

  // Inicializar
  renderTarifas();
});
