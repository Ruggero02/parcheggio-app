const express = require('express');
const { Pool } = require('pg'); // CAMBIATO: Usiamo 'pg' al posto di 'sqlite3'
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; 

// --- Configurazione della Connessione al Database ---

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Necessario per le connessioni a Render
    }
});

// Funzione per creare la tabella se non esiste
const createTable = async () => {
    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS parcheggi (
        id SERIAL PRIMARY KEY,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );`;
    try {
        await pool.query(createTableQuery);
        console.log("Tabella 'parcheggi' verificata/creata con successo.");
    } catch (err) {
        console.error("Errore durante la creazione della tabella:", err);
    }
};
createTable(); // Eseguiamo la funzione all'avvio del server

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- API Routes ---

// GET: Recupera TUTTI i parcheggi
app.get('/api/parcheggi', async (req, res) => {
    try {
        // La sintassi SQL è quasi identica
        const result = await pool.query('SELECT * FROM parcheggi ORDER BY timestamp DESC');
        res.json({
            message: "success",
            data: result.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ "error": "Errore nel recuperare i parcheggi" });
    }
});

// POST: Salva un nuovo parcheggio
app.post('/api/parcheggio', async (req, res) => {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
        return res.status(400).json({ "error": "Coordinate mancanti" });
    }
    
    try {
        // Manteniamo solo l'ultima posizione: rimuoviamo eventuali righe precedenti
        // e inseriamo la nuova posizione. In alternativa si può usare UPSERT.
        await pool.query('DELETE FROM parcheggi');

        const insertQuery = 'INSERT INTO parcheggi (latitude, longitude) VALUES ($1, $2) RETURNING *';
        const result = await pool.query(insertQuery, [latitude, longitude]);

        res.status(201).json({
            message: "success",
            data: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ "error": "Errore nel salvare il parcheggio" });
    }
});

// --- Avvio del Server ---
app.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});