/* script.js — login demo: valida campos y redirige según rol (simulación) */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const pass = form.password.value.trim();
    const role = form.role.value;

    if (!email || !pass) {
      alert('Completa correo y contraseña.');
      return;
    }

    // En una app real aquí iría llamada al backend + bcrypt + sesión.
    // Para demo redirigimos según rol seleccionado.
    if (role === 'admin') {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'operario.html';
    }
  });
});
