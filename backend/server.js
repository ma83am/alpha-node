const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const RISORSE_DB_PATH = process.env.RISORSE_DB_PATH || 'D:\\HOMER\\brain\\Mappa_Risorse.json';

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Log middleware for all requests
app.use((req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} from ${clientIp}`);
    next();
});

// Middleware to protect dangerous POST endpoints (Localhost Only)
const checkLocalhost = (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    const isLocalIp = clientIp === '127.0.0.1' || 
                      clientIp === '::1' || 
                      clientIp === '::ffff:127.0.0.1' ||
                      clientIp.endsWith('127.0.0.1');
    
    // Sicurezza aggiuntiva per impedire il bypass tramite tunnel pubblici (es. localtunnel)
    const host = req.headers.host || '';
    const isLocalHost = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('[::1]');
    
    // Se c'è un header proxy, o l'IP non è locale, o l'host non appartiene a localhost, blocca la richiesta
    const hasProxyHeader = req.headers['x-forwarded-for'] || 
                           req.headers['x-forwarded-host'] || 
                           req.headers['x-forwarded-proto'] ||
                           req.headers['x-tunnel-id'];

    if (!isLocalIp || !isLocalHost || hasProxyHeader) {
        console.warn(`[SECURITY WARNING] Blocked unauthorized POST request to ${req.originalUrl}. Host: ${host}, IP: ${clientIp}, Proxy: ${!!hasProxyHeader}`);
        return res.status(403).json({ 
            error: "Accesso Negato: Questa operazione fisica può essere eseguita esclusivamente sul PC locale (localhost)." 
        });
    }
    next();
};

// 1. GET /api/risorse - Legge e restituisce il contenuto completo di Mappa_Risorse.json
app.get('/api/risorse', async (req, res) => {
    try {
        const data = await fs.readFile(RISORSE_DB_PATH, 'utf8');
        const json = JSON.parse(data);
        res.json(json);
    } catch (error) {
        console.error("Errore nella lettura del database delle risorse:", error);
        res.status(500).json({ error: "Impossibile caricare il database delle risorse." });
    }
});

// 2. GET /api/stato-servizi - Legge PM2 e mappa lo stato dei bot H.O.M.E.R.
app.get('/api/stato-servizi', (req, res) => {
    // Utilizziamo pm2.cmd per Windows per evitare i blocchi della Execution Policy di PowerShell
    exec('pm2.cmd jlist', (error, stdout, stderr) => {
        if (error) {
            console.error("Errore durante l'esecuzione di pm2.cmd:", error);
            // In caso di errore o se PM2 non è installato/avviato, restituiamo un array vuoto
            return res.json([]);
        }

        try {
            // Estrae solo la parte di array JSON dall'output, escludendo eventuali log/warning iniziali di PM2
            const firstBracket = (stdout || '').indexOf('[');
            const lastBracket = (stdout || '').lastIndexOf(']');
            let cleanStdout = '[]';
            if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
                cleanStdout = stdout.slice(firstBracket, lastBracket + 1);
            }
            
            const pm2List = JSON.parse(cleanStdout);
            // Estraiamo solo i dati salienti per ciascun servizio registrato
            const statusMap = pm2List.map(proc => ({
                name: proc.name,
                status: proc.pm2_env ? proc.pm2_env.status : 'stopped',
                cpu: proc.monit ? proc.monit.cpu : 0,
                memory: proc.monit ? proc.monit.memory : 0
            }));
            res.json(statusMap);
        } catch (parseError) {
            console.error("Errore nel parsing dell'output PM2:", parseError);
            res.status(500).json({ error: "Errore durante l'elaborazione dei dati di PM2." });
        }
    });
});

// 3. GET /api/stato-docker - Esegue docker ps -a ed estrae gli stati censiti
app.get('/api/stato-docker', (req, res) => {
    exec('docker ps -a --format "{{json .}}"', (error, stdout, stderr) => {
        if (error) {
            console.error("Errore durante l'esecuzione di docker ps:", error);
            return res.json([]);
        }

        try {
            const lines = stdout.trim().split('\n').filter(line => line.trim().length > 0);
            const containers = lines.map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    return null;
                }
            }).filter(Boolean);

            res.json(containers);
        } catch (parseError) {
            console.error("Errore nel parsing dell'output Docker:", parseError);
            res.status(500).json({ error: "Errore durante l'elaborazione dei dati Docker." });
        }
    });
});

// 4. POST /api/risorse/apri-cartella (PROTETTO - Solo localhost)
app.post('/api/risorse/apri-cartella', checkLocalhost, (req, res) => {
    const { percorso } = req.body;
    if (!percorso) {
        return res.status(400).json({ error: "Percorso non fornito." });
    }

    console.log(`[Apertura Cartella] Esecuzione explorer.exe per il percorso: ${percorso}`);
    
    // Esecuzione di explorer.exe in modo sicuro
    exec(`explorer.exe "${percorso}"`, (error) => {
        if (error) {
            console.error(`Errore nell'apertura della cartella:`, error);
            return res.status(500).json({ error: "Impossibile aprire la cartella." });
        }
        res.json({ success: true, message: "Cartella aperta correttamente." });
    });
});

// 5. POST /api/risorse/avvia-eseguibile (PROTETTO - Solo localhost)
app.post('/api/risorse/avvia-eseguibile', checkLocalhost, (req, res) => {
    const { percorso, eseguibile } = req.body;
    if (!percorso || !eseguibile) {
        return res.status(400).json({ error: "Dati mancanti (percorso o eseguibile)." });
    }

    console.log(`[Avvio Applicazione] Lancio di: ${eseguibile} in CWD: ${percorso}`);

    // Utilizziamo cmd.exe /c start "" per lanciare in background con l'associazione corretta di Windows
    exec(`cmd.exe /c start "" "${eseguibile}"`, { cwd: percorso }, (error) => {
        if (error) {
            console.error(`Errore nel lancio dell'eseguibile:`, error);
            return res.status(500).json({ error: "Impossibile lanciare l'applicazione." });
        }
        res.json({ success: true, message: "Applicazione avviata correttamente." });
    });
});

// 6. POST /api/docker/controllo (PROTETTO - Solo localhost)
app.post('/api/docker/controllo', checkLocalhost, (req, res) => {
    const { container, azione } = req.body; // azione: 'start' | 'stop'
    
    if (!container || !['start', 'stop'].includes(azione)) {
        return res.status(400).json({ error: "Parametri non validi (container o azione)." });
    }

    console.log(`[Docker Controllo] Container: ${container} -> Azione: ${azione}`);

    exec(`docker ${azione} ${container}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Errore nel comando docker ${azione} per ${container}:`, error);
            return res.status(500).json({ error: `Impossibile ${azione === 'start' ? 'avviare' : 'fermare'} il container.` });
        }
        res.json({ success: true, stdout: stdout.trim(), message: `Container ${azione === 'start' ? 'avviato' : 'fermato'} con successo.` });
    });
});

// --- Servizio Frontend Statico ---
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// SPA Routing: Per tutte le altre richieste GET, restituisci index.html
app.get('*', (req, res) => {
    if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ error: 'Endpoint API non esistente' });
    }
    
    res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
        if (err) {
            // Se non è ancora stato buildato, mostra una pagina di cortesia
            res.status(200).send(`
                <html>
                    <head>
                        <title>Alpha Node - API Backend</title>
                        <style>
                            body { background: #0b0c10; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; text-align: center; }
                            div { padding: 40px; background: rgba(22,22,37,0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); backdrop-filter: blur(8px); }
                            h1 { color: #8b5cf6; margin-bottom: 10px; font-weight: 300; }
                            p { color: #94a3b8; font-size: 1.1em; }
                        </style>
                    </head>
                    <body>
                        <div>
                            <h1>🚀 Alpha Node Backend è Online!</h1>
                            <p>Le API sono pronte. La build statica del frontend React non è ancora stata caricata.</p>
                        </div>
                    </body>
                </html>
            `);
        }
    });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 Alpha Node Server attivo su http://localhost:${PORT}`);
    console.log(`🌐 Disponibile in rete locale su http://0.0.0.0:${PORT}`);
    console.log(`=======================================================`);
});
