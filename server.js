const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const { db, init } = require("./db");

init();

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// --- API

// En la sección de API, reemplaza todo desde "// --- API" hasta "// Servir frontend"

// --- API

// Obtener resumen de clientes con deuda_total y fecha_ultimo_pago
app.get("/api/clients", async (req, res) => {
  try {
    const sql = `
      SELECT c.id, c.name,
      COALESCE(SUM((m.cantidad*m.precio)-m.pago), 0) as deuda_total,
      (SELECT MAX(fecha) FROM movimientos m2 
       WHERE m2.cliente_id = c.id AND m2.pago > 0) as fecha_ultimo_pago
      FROM clients c
      LEFT JOIN movimientos m ON m.cliente_id = c.id
      GROUP BY c.id, c.name
      ORDER BY c.name
    `;
    const { rows } = await db.pool.query(sql);
    const out = rows.map((r) => ({
      id: r.id,
      name: r.name,
      deuda_total: (Math.round(Number(r.deuda_total) * 100) / 100).toFixed(2),
      fecha_ultimo_pago: r.fecha_ultimo_pago || null,
    }));
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener movimientos de un cliente
app.get("/api/clients/:id/movements", async (req, res) => {
  try {
    const clienteId = req.params.id;
    const sql = `
      SELECT id, cliente_id, producto, cantidad, precio, pago, fecha, 
      ((cantidad*precio) - pago) as movimiento
      FROM movimientos
      WHERE cliente_id = $1
      ORDER BY fecha DESC
    `;
    const { rows } = await db.pool.query(sql, [clienteId]);
    const out = rows.map((r) => ({
      ...r,
      cantidad: Number(r.cantidad),
      precio: Number(r.precio),
      pago: Number(r.pago),
      movimiento: Number(r.movimiento).toFixed(2),
    }));
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Agregar venta
app.post("/api/clients/:id/sale", async (req, res) => {
  try {
    const clienteId = req.params.id;
    const { producto, cantidad, precio, fecha } = req.body;
    const fechaFinal = fecha || new Date().toLocaleDateString("en-CA");
    const cant = Number(cantidad) || 0;
    const prec = Number(precio) || 0;
    const pago = 0;

    const sql = `
      INSERT INTO movimientos (cliente_id, producto, cantidad, precio, pago, fecha) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING id
    `;
    const { rows } = await db.pool.query(sql, [
      clienteId, 
      producto || "Venta", 
      cant, 
      prec, 
      pago, 
      fechaFinal
    ]);
    res.json({ id: rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Agregar pago
app.post("/api/clients/:id/payment", async (req, res) => {
  try {
    const clienteId = req.params.id;
    const { monto, fecha } = req.body;
    const fechaFinal = fecha || new Date().toLocaleDateString("en-CA");
    const pago = Number(monto) || 0;

    const sql = `
      INSERT INTO movimientos (cliente_id, producto, cantidad, precio, pago, fecha) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING id
    `;
    const { rows } = await db.pool.query(sql, [
      clienteId, 
      "Pago", 
      0, 
      0, 
      pago, 
      fechaFinal
    ]);
    res.json({ id: rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Crear nuevo cliente
app.post("/api/clients", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "El nombre es requerido" });
    
    const sql = `INSERT INTO clients (name) VALUES ($1) RETURNING id`;
    const { rows } = await db.pool.query(sql, [name]);
    res.json({ id: rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Actualizar cliente
app.put("/api/clients/:id", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Nombre requerido" });

    const sql = "UPDATE clients SET name = $1 WHERE id = $2";
    await db.pool.query(sql, [name, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Eliminar cliente
app.delete("/api/clients/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await db.pool.query("DELETE FROM clients WHERE id = $1", [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Actualizar movimiento
app.put("/api/movimientos/:id", async (req, res) => {
  try {
    const { producto, cantidad, precio, pago, fecha } = req.body;
    const sql = `
      UPDATE movimientos
      SET producto = $1, cantidad = $2, precio = $3, pago = $4, fecha = $5
      WHERE id = $6
    `;
    await db.pool.query(sql, [
      producto,
      Number(cantidad),
      Number(precio),
      Number(pago),
      fecha,
      req.params.id
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Eliminar movimiento
app.delete("/api/movimientos/:id", async (req, res) => {
  try {
    const sql = "DELETE FROM movimientos WHERE id = $1";
    await db.pool.query(sql, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname)));

// Servir frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Servidor escuchando en http://localhost:${PORT}`)
);

app.put("/api/movimientos/:id/campo", async (req, res) => {
  try {
    const { campo, valor } = req.body;
    const allowed = ["producto", "cantidad", "precio", "pago", "fecha"];

    if (!allowed.includes(campo)) {
      return res.status(400).json({ error: "Campo no permitido" });
    }

    const sql = `UPDATE movimientos SET ${campo} = $1 WHERE id = $2`;
    await db.pool.query(sql, [valor, req.params.id]);

    res.json({ ok: true });
  } catch (err) {
  console.error(err);
  res.status(500).json([]); // SIEMPRE un array
  }
});

