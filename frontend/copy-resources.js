import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourcePath = 'D:\\HOMER\\brain\\Mappa_Risorse.json';
const destPath = path.join(__dirname, 'public', 'Mappa_Risorse.json');

try {
    console.log(`[Copy Resources] Lettura di: ${sourcePath}`);
    const data = fs.readFileSync(sourcePath, 'utf8');
    
    // Verifichiamo che sia JSON valido prima di scriverlo
    JSON.parse(data);
    
    console.log(`[Copy Resources] Scrittura su: ${destPath}`);
    fs.writeFileSync(destPath, data, 'utf8');
    console.log('[Copy Resources] Copia completata con successo!');
} catch (error) {
    console.error('[Copy Resources] ERRORE durante la copia di Mappa_Risorse.json:', error);
    process.exit(1);
}
