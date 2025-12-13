/* admin.js — edición de tarifa para las dos categorías: Automóvil y Moto
   Permite modificar: modalidad (POR_MINUTO / POR_HORA / POR_DIA / FRACCION) y valor.
   No permite crear ni eliminar.
*/

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => window.location.href = 'index.html');

  const tarifasTableBody = document.querySelector('#tarifasTable tbody');
  const tarifaForm = document.getElementById('tarifaForm');
  const tarNombre = document.getElementById('tarNombre');
  const tarTipoCobro = document.getElementById('tarTipoCobro');
  const tarValor = document.getElementById('tarValor');
  const tarGuardar = document.getElementById('tarGuardar');
  const tarCancelar = document.getElementById('tarCancelar');

  let tarifas = [];
  let tarifaEditando = null;

  function formatTipo(tipo) {
    switch (tipo) {
      case 'POR_MINUTO': return 'Por minuto';
      case 'POR_HORA': return 'Por hora';
      case 'POR_DIA': return 'Por día';
      case 'FRACCION': return 'Fracción';
      default: return tipo;
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>\"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" })[c]);
  }

  async function loadTarifas() {
    try {
      const res = await fetch('/api/tarifas');
      tarifas = await res.json();
      renderTarifas();
    } catch (err) { console.error(err); }
  }

  function renderTarifas() {
    tarifasTableBody.innerHTML = '';
    tarifas.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(t.nombre)}</td>
        <td>${formatTipo(t.tipo_cobro || t.tipo)}</td>
        <td>${t.valor}</td>
        <td>
          <button class="btn-editar" data-id="${t.id}">Editar</button>
          <button class="btn-borrar" data-id="${t.id}">Eliminar</button>
        </td>
      `;
      tarifasTableBody.appendChild(tr);
    });
  }

  tarifasTableBody.addEventListener('click', async (ev) => {
    const id = ev.target.dataset.id;
    if (!id) return;
    if (ev.target.classList.contains('btn-editar')) {
      const t = tarifas.find(x => x.id == id);
      tarifaEditando = t;
      tarNombre.value = t.nombre || '';
      tarTipoCobro.value = t.tipo_cobro || t.tipo || 'POR_HORA';
      tarValor.value = t.valor || 0;
      tarifaForm.classList.remove('hidden');
      tarifaForm.setAttribute('aria-hidden', 'false');
      tarValor.focus();
    }
    if (ev.target.classList.contains('btn-borrar')) {
      if (!confirm('¿Eliminar tarifa?')) return;
      try {
        await fetch(`/api/tarifas/${id}`, { method: 'DELETE' });
        await loadTarifas();
      } catch (err) { console.error(err); }
    }
  });

  tarifaForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!tarifaEditando) return;
    const payload = {
      tipo_cobro: tarTipoCobro.value,
      valor: Number(tarValor.value),
      nombre: tarNombre.value,
      activo: 1
    };
    try {
      await fetch(`/api/tarifas/${tarifaEditando.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      tarifaForm.reset();
      tarifaForm.classList.add('hidden');
      tarifaForm.setAttribute('aria-hidden', 'true');
      tarifaEditando = null;
      await loadTarifas();
    } catch (err) { console.error(err); }
  });

  tarCancelar.addEventListener('click', (ev) => {
    ev.preventDefault();
    tarifaForm.reset();
    tarifaForm.classList.add('hidden');
    tarifaForm.setAttribute('aria-hidden', 'true');
    tarifaEditando = null;
  });

  // load on start
  loadTarifas();
});
