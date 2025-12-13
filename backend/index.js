const express = require('express');
const path = require('path');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcrypt');

const app = express();

app.use(cors());
app.use(express.json());

// Serve frontend (parent folder)
app.use(express.static(path.join(__dirname, '..')));

/* ---------- Tariff routes ---------- */
app.get('/api/tarifas', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tarifas');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/tarifas/:id', async (req, res) => {
  const id = req.params.id;
  const { tipo_cobro, valor, nombre, activo } = req.body;
  try {
    await pool.query('UPDATE tarifas SET tipo_cobro = ?, valor = ?, nombre = ?, activo = ? WHERE id = ?', [tipo_cobro, valor, nombre, activo ? 1 : 0, id]);
    // updated
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/tarifas', async (req, res) => {
  try {
    const { nombre, tipo_cobro, valor, activo, TIPOS_VEHICULO_id } = req.body;
    const [result] = await pool.query('INSERT INTO tarifas (nombre, tipo_cobro, valor, activo, TIPOS_VEHICULO_id) VALUES (?, ?, ?, ?, ?)', [nombre, tipo_cobro, valor || 0, activo ? 1 : 0, TIPOS_VEHICULO_id || null]);
    // created
    res.json({ id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/tarifas/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query('DELETE FROM tarifas WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ---------- Registros (entradas/salidas) ---------- */
app.get('/api/registros', async (req, res) => {
  const estado = req.query.estado;
  try {
    let sql = 'SELECT * FROM registros ORDER BY id DESC LIMIT 500';
    const params = [];
    if (estado) { sql = 'SELECT * FROM registros WHERE estado = ? ORDER BY id DESC LIMIT 500'; params.push(estado); }
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Crear entrada
app.post('/api/registros', async (req, res) => {
  try {
    const { placa, tipo, ESPACIOS_id, usuario_entrada_id } = req.body;
    const fecha = new Date();

    // Map tipo string to TIPOS_VEHICULO_id when possible
    let tipoId = null;
    try {
      if (tipo) {
        const like = String(tipo).toLowerCase();
        if (like.includes('moto')) {
          const [rows] = await pool.query("SELECT id FROM tipos_vehiculo WHERE LOWER(nombre) LIKE '%moto%' LIMIT 1");
          if (rows && rows.length) tipoId = rows[0].id;
        } else {
          const [rows] = await pool.query("SELECT id FROM tipos_vehiculo WHERE LOWER(nombre) LIKE '%auto%' OR LOWER(nombre) LIKE '%car%' LIMIT 1");
          if (rows && rows.length) tipoId = rows[0].id;
        }
      }
    } catch (err) { console.warn('tipo lookup error', err); }

    // if still no tipoId, fallback to first tipos_vehiculo available
    if (!tipoId) {
      try {
        const [trows] = await pool.query('SELECT id FROM tipos_vehiculo LIMIT 1');
        if (trows && trows.length) tipoId = trows[0].id;
      } catch (err) { console.warn('tipo fallback error', err); }
    }

    // If ESPACIOS_id not provided, pick one disponible for this tipo
    let espacioId = ESPACIOS_id || null;
    if (!espacioId) {
      try {
        const params = [];
        let q = 'SELECT id FROM espacios WHERE disponible = 1';
        if (tipoId) { q += ' AND TIPOS_VEHICULO_id = ?'; params.push(tipoId); }
        q += ' LIMIT 1';
        const [available] = await pool.query(q, params);
        if (available && available.length) {
          espacioId = available[0].id;
          await pool.query('UPDATE espacios SET disponible = 0 WHERE id = ?', [espacioId]);
        } else {
          return res.status(400).json({ error: 'No hay cupos disponibles' });
        }
      } catch (err) { console.warn('espacio pick error', err); }
    } else {
      try { await pool.query('UPDATE espacios SET disponible = 0 WHERE id = ?', [espacioId]); } catch (e) { /* ignore */ }
    }

    // ensure we have a usuario_entrada_id (DB requires NOT NULL)
    let usuarioId = usuario_entrada_id || null;
    if (!usuarioId) {
      try {
        // prefer an active user with role Operario
        const [urows] = await pool.query("SELECT u.id FROM usuarios u JOIN roles r ON u.ROLES_id = r.id WHERE LOWER(r.nombre) LIKE '%operario%' AND u.activo = 1 LIMIT 1");
        if (urows && urows.length) usuarioId = urows[0].id;
        else {
          // fallback to any active user
          const [any] = await pool.query('SELECT id FROM usuarios WHERE activo = 1 LIMIT 1');
          if (any && any.length) usuarioId = any[0].id;
          else {
            // create a lightweight operario user if none exist
            const [roleRows] = await pool.query("SELECT id FROM roles WHERE LOWER(nombre) LIKE '%operario%' LIMIT 1");
            const roleId = (roleRows && roleRows.length) ? roleRows[0].id : null;
            const hash = await bcrypt.hash('123', 10);
            const [created] = await pool.query('INSERT INTO usuarios (nombre, email, password_hash, activo, fecha_creacion, ROLES_id) VALUES (?, ?, ?, 1, NOW(), ?)', ['Operario Auto', 'operario_auto@local', hash, roleId]);
            usuarioId = created.insertId;
          }
        }
      } catch (err) { console.warn('usuario fallback error', err); }
    }

    // determine TARIFAS_id (required NOT NULL)
    let tarifaId = null;
    try {
      if (tipoId) {
        const [trows] = await pool.query('SELECT id FROM tarifas WHERE TIPOS_VEHICULO_id = ? AND activo = 1 ORDER BY id DESC LIMIT 1', [tipoId]);
        if (trows && trows.length) tarifaId = trows[0].id;
      }
      if (!tarifaId) {
        // try any active tarifa
        const [any] = await pool.query('SELECT id FROM tarifas WHERE activo = 1 LIMIT 1');
        if (any && any.length) tarifaId = any[0].id;
      }
      if (!tarifaId) {
        // create a default tarifa for this tipo (or without tipo)
        const nombre = 'Tarifa por defecto';
        const tipo_cobro = 'POR_HORA';
        const valor = 3000;
        const tipIdForTarifa = tipoId || null;
        const [created] = await pool.query('INSERT INTO tarifas (nombre, tipo_cobro, valor, activo, fecha_inicio, TIPOS_VEHICULO_id) VALUES (?, ?, ?, 1, CURDATE(), ?)', [nombre, tipo_cobro, valor, tipIdForTarifa]);
        tarifaId = created.insertId;
      }
    } catch (err) { console.warn('tarifa lookup/creation error', err); }

    const [result] = await pool.query('INSERT INTO registros (placa, fecha_hora_entrada, estado, TIPOS_VEHICULO_id, ESPACIOS_id, TARIFAS_id, usuario_entrada_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [placa, fecha, 'EN_CURSO', tipoId || 0, espacioId || null, tarifaId || 0, usuarioId || null]);
    res.json({ id: result.insertId, placa, fecha, estado: 'EN_CURSO', ESPACIOS_id: espacioId, usuario_entrada_id: usuarioId, TARIFAS_id: tarifaId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Registrar salida por id
app.post('/api/registros/:id/salida', async (req, res) => {
  const id = req.params.id;
  try {
    // fetch registro
    const [[reg]] = await pool.query('SELECT * FROM registros WHERE id = ?', [id]);
    if (!reg) return res.status(404).json({ error: 'Registro no encontrado' });
    if (reg.estado === 'FINALIZADO') return res.status(400).json({ error: 'Registro ya finalizado' });

    const salida = new Date();
    const entrada = new Date(reg.fecha_hora_entrada);
    const minutos = Math.ceil((salida - entrada) / 60000);

    // calcular valor: intentar buscar tarifa por tipo
    let valor = 0;
    try {
      // try to find a tarifa by tipos_vehiculo id
      const [trows] = await pool.query('SELECT valor FROM tarifas WHERE TIPOS_VEHICULO_id = ? ORDER BY id DESC LIMIT 1', [reg.TIPOS_VEHICULO_id || 0]);
      if (trows && trows.length) {
        // assuming tarifa valor is per hour
        const valorHora = Number(trows[0].valor) || 0;
        const horas = Math.max(1, Math.ceil(minutos / 60));
        valor = horas * valorHora;
      } else {
        // fallback: use defaults
        const v = reg.TIPOS_VEHICULO_id && Number(reg.TIPOS_VEHICULO_id) > 0 ? 3000 : 3000;
        const horas = Math.max(1, Math.ceil(minutos / 60));
        valor = horas * v;
      }
    } catch (err) { console.warn('tarifa calc error', err); valor = 0; }

    await pool.query('UPDATE registros SET fecha_hora_salida = ?, minutos_totales = ?, valor_calculado = ?, estado = ? WHERE id = ?', [salida, minutos, valor, 'FINALIZADO', id]);
    // liberar el espacio asociado si existe
    try {
      if (reg.ESPACIOS_id) await pool.query('UPDATE espacios SET disponible = 1 WHERE id = ?', [reg.ESPACIOS_id]);
    } catch (err) { console.warn('failed to free espacio', err); }
    res.json({ id, minutos, valor, salida });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ---------- Recursos auxiliares simples ---------- */
app.get('/api/espacios', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM espacios');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/tipos_vehiculo', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tipos_vehiculo');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ---------- Usuarios + Auth ---------- */
// Create user (hashes password)
app.post('/api/usuarios', async (req, res) => {
  try {
    const { nombre, email, password, ROLES_id, activo } = req.body;
    if (!email || !password || !nombre) return res.status(400).json({ error: 'nombre, email y password requeridos' });
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query('INSERT INTO usuarios (nombre, email, password_hash, activo, fecha_creacion, ROLES_id) VALUES (?, ?, ?, ?, NOW(), ?)', [nombre, email, hash, activo ? 1 : 0, ROLES_id || null]);
    res.json({ id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// List users (basic)
app.get('/api/usuarios', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT u.id, u.nombre, u.email, u.activo, u.ROLES_id, r.nombre as role_name FROM usuarios u LEFT JOIN roles r ON u.ROLES_id = r.id');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Auth: login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email y password requeridos' });
    const [rows] = await pool.query('SELECT u.id, u.nombre, u.email, u.password_hash, u.activo, u.ROLES_id, r.nombre as role_name FROM usuarios u LEFT JOIN roles r ON u.ROLES_id = r.id WHERE u.email = ?', [email]);
    if (!rows || rows.length === 0) return res.status(401).json({ error: 'Credenciales inválidas' });
    const user = rows[0];
    if (!user.activo || Number(user.activo) === 0) return res.status(403).json({ error: 'Usuario inactivo' });
    const ok = await bcrypt.compare(password, user.password_hash || '');
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });
    // role check (optional)
    const actualRole = (user.role_name || '').toLowerCase();
    if (role) {
      const desired = String(role).toLowerCase();
      if (!(actualRole.includes(desired) || desired.includes(actualRole))) {
        return res.status(403).json({ error: 'Rol inválido para este usuario' });
      }
    }
    const simpleRole = (actualRole.includes('admin') || actualRole.includes('administrador')) ? 'admin' : 'operario';
    return res.json({ ok: true, userId: user.id, role: simpleRole, redirect: simpleRole === 'admin' ? 'admin.html' : 'operario.html' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ---------- Start server ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

process.on('uncaughtException', (err) => { console.error('uncaughtException', err); });
process.on('unhandledRejection', (err) => { console.error('unhandledRejection', err); });

// Ensure demo roles and users exist (run once at startup)
async function ensureDemoAccounts() {
  try {
    // create roles if missing
    const [adminRole] = await pool.query("SELECT id FROM roles WHERE nombre = 'Administrador' LIMIT 1");
    const [opRole] = await pool.query("SELECT id FROM roles WHERE nombre = 'Operario' LIMIT 1");
    let adminRoleId = adminRole && adminRole.length ? adminRole[0].id : null;
    let opRoleId = opRole && opRole.length ? opRole[0].id : null;
    if (!adminRoleId) {
      const [r] = await pool.query("INSERT INTO roles (nombre, descripcion) VALUES ('Administrador','Rol administrador')");
      adminRoleId = r.insertId;
      console.log('Created role Administrador id', adminRoleId);
    }
    if (!opRoleId) {
      const [r] = await pool.query("INSERT INTO roles (nombre, descripcion) VALUES ('Operario','Rol operario')");
      opRoleId = r.insertId;
      console.log('Created role Operario id', opRoleId);
    }

    // create users if missing
    const demoUsers = [
      { email: 'admin@admin', nombre: 'Administrador Demo', roleId: adminRoleId },
      { email: 'operario@admin', nombre: 'Operario Demo', roleId: opRoleId }
    ];

    for (const u of demoUsers) {
      const [rows] = await pool.query('SELECT id FROM usuarios WHERE email = ? LIMIT 1', [u.email]);
      if (!rows || rows.length === 0) {
        const hash = await bcrypt.hash('123', 10);
        const [resu] = await pool.query('INSERT INTO usuarios (nombre, email, password_hash, activo, fecha_creacion, ROLES_id) VALUES (?, ?, ?, 1, NOW(), ?)', [u.nombre, u.email, hash, u.roleId]);
        console.log('Created demo user', u.email, 'id', resu.insertId);
      } else {
        console.log('Demo user exists', u.email);
      }
    }
  } catch (err) { console.error('ensureDemoAccounts error', err); }
}

// call but don't block
ensureDemoAccounts().catch(err => console.error(err));

// Ensure default espacios exist (30 autos, 15 motos) if table empty
async function ensureDefaultEspacios() {
  try {
    const [cntRows] = await pool.query('SELECT COUNT(*) as c FROM espacios');
    const c = (cntRows && cntRows.length) ? Number(cntRows[0].c) : 0;
    if (c > 0) { console.log('espacios exist, skipping default creation'); return; }

    // ensure tipos_vehiculo exist
    let autoId = null, motoId = null;
    try {
      const [a] = await pool.query("SELECT id FROM tipos_vehiculo WHERE LOWER(nombre) LIKE '%auto%' OR LOWER(nombre) LIKE '%car%' LIMIT 1");
      if (a && a.length) autoId = a[0].id;
      const [m] = await pool.query("SELECT id FROM tipos_vehiculo WHERE LOWER(nombre) LIKE '%moto%' LIMIT 1");
      if (m && m.length) motoId = m[0].id;
    } catch (err) { console.warn('tipos lookup error', err); }

    if (!autoId) {
      const [r] = await pool.query("INSERT INTO tipos_vehiculo (nombre, descripcion) VALUES ('Auto','Vehículo particular')");
      autoId = r.insertId;
      console.log('Created tipo_vehiculo Auto id', autoId);
    }
    if (!motoId) {
      const [r] = await pool.query("INSERT INTO tipos_vehiculo (nombre, descripcion) VALUES ('Moto','Motocicleta')");
      motoId = r.insertId;
      console.log('Created tipo_vehiculo Moto id', motoId);
    }

    const vals = [];
    for (let i = 1; i <= 30; i++) vals.push([`A${i}`, 1, autoId]);
    for (let i = 1; i <= 15; i++) vals.push([`M${i}`, 1, motoId]);

    const placeholders = vals.map(() => '(?, ?, ?)').join(', ');
    const flat = vals.flat();
    await pool.query(`INSERT INTO espacios (codigo, disponible, TIPOS_VEHICULO_id) VALUES ${placeholders}`, flat);
    console.log('Inserted default espacios: 30 autos, 15 motos');
  } catch (err) { console.error('ensureDefaultEspacios error', err); }
}

ensureDefaultEspacios().catch(err => console.error(err));
