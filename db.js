const { Pool, types } = require("pg");

// Evitar que PostgreSQL DATE se convierta a Date (zona horaria)
types.setTypeParser(1082, val => val);
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

// Crear tablas si no existen
async function init() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS movimientos (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        producto TEXT,
        cantidad NUMERIC,
        precio NUMERIC,
        pago NUMERIC,
        fecha DATE
      );
    `);

    console.log("Tablas verificadas o creadas correctamente.");
  } catch (err) {
    console.error("Error inicializando la base de datos:", err);
  }
}

module.exports = { db: { pool }, init };
