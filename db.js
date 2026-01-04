const { Pool } = require('pg');
const fs = require('fs');

let pool;

if (process.env.NODE_ENV === 'production') {
  // En producción (Railway) usa PostgreSQL
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  console.log('Conectado a PostgreSQL en Railway');
} else {
  // En desarrollo local usa SQLite
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.resolve(__dirname, 'data.db');
  const db = new sqlite3.Database(dbPath);
  
  // Para mantener compatibilidad con tu código existente
  pool = {
    query: (sql, params) => {
      return new Promise((resolve, reject) => {
        if (sql.includes('CREATE TABLE')) {
          db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ rows: [] });
          });
        } else if (sql.includes('SELECT')) {
          db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve({ rows });
          });
        } else if (sql.includes('INSERT')) {
          db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ rows: [{ id: this.lastID }] });
          });
        } else {
          db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ rows: [] });
          });
        }
      });
    }
  };
  console.log('Conectado a SQLite local');
}

function init() {
  if (process.env.NODE_ENV === 'production') {
    // PostgreSQL - crear tablas si no existen
    const createTables = `
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS movimientos (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        producto TEXT,
        cantidad REAL DEFAULT 0,
        precio REAL DEFAULT 0,
        pago REAL DEFAULT 0,
        fecha TEXT
      );
    `;
    
    return pool.query(createTables).then(() => {
      console.log('Tablas de PostgreSQL creadas/verificadas');
    });
  } else {
    // SQLite - crear tablas si no existen
    return pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      )
    `).then(() => {
      return pool.query(`
        CREATE TABLE IF NOT EXISTS movimientos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cliente_id INTEGER NOT NULL,
          producto TEXT,
          cantidad REAL DEFAULT 0,
          precio REAL DEFAULT 0,
          pago REAL DEFAULT 0,
          fecha TEXT
        )
      `);
    }).then(() => {
      console.log('Tablas de SQLite creadas/verificadas');
    });
  }
}

module.exports = { pool, init };