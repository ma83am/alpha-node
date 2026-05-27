import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Server, 
  Cpu, 
  Folder, 
  Play, 
  Square, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  Smartphone, 
  Laptop, 
  Globe,
  Loader2,
  Terminal,
  FolderOpen
} from 'lucide-react';

// Rilevamento della modalità di compilazione (VITE_APP_MODE = 'web' o 'local')
const isWebMode = import.meta.env.VITE_APP_MODE === 'web';

// Determinazione intelligente dell'indirizzo del Backend:
// Se siamo sulla porta 3000 (Vite Dev Server), puntiamo all'host corrente sulla porta 5000.
// Se siamo in produzione (build statica), le chiamate saranno relative.
const API_BASE = window.location.port === '3000' 
  ? `http://${window.location.hostname}:5000` 
  : '';

function App() {
  // Stati principali
  const [risorse, setRisorse] = useState(null);
  const [pm2Servizi, setPm2Servizi] = useState([]);
  const [dockerContainers, setDockerContainers] = useState([]);
  const [activeTab, setActiveTab] = useState(isWebMode ? 'applicazioni' : 'homer');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({}); // Per tracciare i caricamenti dei singoli pulsanti
  
  // Rilevamento Device: verifica se aperto localmente o da IP esterno (sempre remoto/falso se in modalità Web/GitHub)
  const [isLocal, setIsLocal] = useState(false);
  
  // Toast notifications
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Verifica localhost (disattivata in modalità Web per forzare lo stato remote)
  useEffect(() => {
    if (isWebMode) {
      setIsLocal(false);
    } else {
      const hostname = window.location.hostname;
      const isLocalIP = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
      setIsLocal(isLocalIP);
    }
  }, []);

  // Fetch dei dati iniziali e polling
  const fetchData = async () => {
    try {
      // In modalità Web, leggiamo il JSON statico copiato nella cartella public.
      // In modalità Locale, interroghiamo l'API dinamica del backend Express.
      const fetchUrl = isWebMode ? './Mappa_Risorse.json' : `${API_BASE}/api/risorse`;
      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error("Errore nel recupero delle risorse");
      const data = await res.json();
      setRisorse(data);
    } catch (err) {
      console.error(err);
      addToast(
        isWebMode 
          ? "Impossibile caricare il database statico delle risorse." 
          : "Impossibile connettersi al database delle risorse locali.", 
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    if (isWebMode) return; // Nessun polling dello stato nella versione web statica
    
    try {
      // Fetch PM2 Status
      const pm2Res = await fetch(`${API_BASE}/api/stato-servizi`);
      if (pm2Res.ok) {
        const pm2Data = await pm2Res.json();
        setPm2Servizi(pm2Data);
      }
      
      // Fetch Docker Status
      const dockerRes = await fetch(`${API_BASE}/api/stato-docker`);
      if (dockerRes.ok) {
        const dockerData = await dockerRes.json();
        setDockerContainers(dockerData);
      }
    } catch (err) {
      console.warn("Errore durante il polling degli stati:", err);
    }
  };

  // Caricamento iniziale
  useEffect(() => {
    fetchData();
    
    if (!isWebMode) {
      fetchStatus();
      // Polling degli stati locali ogni 5 secondi
      const interval = setInterval(fetchStatus, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  // Funzioni d'azione per localhost
  const apriCartella = async (percorso, id) => {
    if (isWebMode) return;
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`${API_BASE}/api/risorse/apri-cartella`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percorso })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore sconosciuto");
      addToast("Cartella aperta sul PC!", "success");
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const avviaEseguibile = async (percorso, eseguibile, id) => {
    if (isWebMode) return;
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`${API_BASE}/api/risorse/avvia-eseguibile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percorso, eseguibile })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore sconosciuto");
      addToast("Applicazione avviata correttamente!", "success");
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const controlloDocker = async (containerName, azione, id) => {
    if (isWebMode) return;
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`${API_BASE}/api/docker/controllo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ container: containerName, azione })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nell'operazione docker");
      addToast(`Container ${azione === 'start' ? 'avviato' : 'fermato'} con successo!`, "success");
      // Forza aggiornamento immediato
      fetchStatus();
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // Funzione di copia percorso per smartphone
  const copiaPercorso = (percorso) => {
    navigator.clipboard.writeText(percorso)
      .then(() => {
        addToast("Percorso copiato negli appunti!", "success");
      })
      .catch(() => {
        addToast("Impossibile copiare il percorso automaticamente.", "error");
      });
  };

  // Mappatori di stato
  const getPM2Status = (nomePM2) => {
    if (!nomePM2) return { status: 'stopped', text: 'Non gestito PM2' };
    const found = pm2Servizi.find(s => s.name === nomePM2);
    if (!found) return { status: 'stopped', text: 'spento' };
    
    // PM2 status mapping
    if (found.status === 'online') return { status: 'online', text: 'online', details: found };
    if (found.status === 'errored') return { status: 'error', text: 'errore', details: found };
    return { status: 'stopped', text: found.status, details: found };
  };

  const getDockerStatus = (containerName) => {
    if (!containerName) return { status: 'stopped', text: 'spento' };
    const found = dockerContainers.find(c => c.Names === containerName);
    if (!found) return { status: 'stopped', text: 'spento' };

    const state = (found.State || '').toLowerCase();
    const status = (found.Status || '').toLowerCase();

    if (state === 'running') {
      if (status.includes('unhealthy')) {
        return { status: 'error', text: 'unhealthy' };
      }
      return { status: 'online', text: 'attivo (Up)' };
    }
    return { status: 'stopped', text: found.Status || 'spento' };
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p style={{ color: '#94a3b8', fontSize: '1rem', fontStyle: 'italic' }}>
          Inizializzazione Alpha Node {isWebMode ? 'Web' : ''} in corso...
        </p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <Activity size={24} color="#fff" />
          </div>
          <div>
            <h1>Alpha Node {isWebMode ? 'Web' : ''}</h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
              H.O.M.E.R. Ecosystem {isWebMode ? 'Remote Viewer' : 'Dashboard'}
            </p>
          </div>
        </div>

        {/* Badge Stato Connessione / Rilevamento Device */}
        <div className={`device-badge ${isLocal ? 'local' : 'remote'}`}>
          {isWebMode ? (
            <>
              <Globe size={15} />
              <span>🌐 Versione Web Statica</span>
            </>
          ) : isLocal ? (
            <>
              <Laptop size={15} />
              <span>🖥️ PC Locale - Controlli Attivi</span>
            </>
          ) : (
            <>
              <Smartphone size={15} />
              <span>📱 Smartphone Wi-Fi - Sola Lettura</span>
            </>
          )}
        </div>
      </header>

      {/* Tabs Navigation */}
      <nav className="tabs-navigation">
        {!isWebMode && (
          <>
            <button 
              className={`tab-btn ${activeTab === 'homer' ? 'active' : ''}`}
              onClick={() => setActiveTab('homer')}
            >
              <Activity size={18} />
              Servizi H.O.M.E.R.
            </button>
            <button 
              className={`tab-btn ${activeTab === 'docker' ? 'active' : ''}`}
              onClick={() => setActiveTab('docker')}
            >
              <Server size={18} />
              Servizi Docker
            </button>
          </>
        )}
        <button 
          className={`tab-btn ${activeTab === 'applicazioni' ? 'active' : ''}`}
          onClick={() => setActiveTab('applicazioni')}
        >
          <Cpu size={18} />
          Applicazioni Locali
        </button>
        <button 
          className={`tab-btn ${activeTab === 'web' ? 'active' : ''}`}
          onClick={() => setActiveTab('web')}
        >
          <Globe size={18} />
          Risorse Web
        </button>
      </nav>

      {/* Tab Panels */}
      <main className="tab-content">
        
        {/* TAB 1: SERVIZI H.O.M.E.R. (Escluso in versione Web) */}
        {activeTab === 'homer' && !isWebMode && (
          <div className="cards-grid">
            {risorse?.servizi_homer?.map(servizio => {
              const pmState = getPM2Status(servizio.nome_pm2);
              return (
                <div key={servizio.id} className="glass-card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <Terminal size={18} className="card-icon" />
                      {servizio.nome}
                    </h3>
                    <div className="status-indicator">
                      <span className={`status-dot ${pmState.status}`}></span>
                      <span>{pmState.text}</span>
                    </div>
                  </div>
                  
                  <div className="card-body">
                    <p>{servizio.descrizione}</p>
                    <div className="card-meta">
                      <div className="meta-item">
                        <span>Percorso:</span>
                        <span>{servizio.percorso}</span>
                      </div>
                      {servizio.eseguibile && (
                        <div className="meta-item">
                          <span>Eseguibile:</span>
                          <span>{servizio.eseguibile}</span>
                        </div>
                      )}
                      <div className="meta-item">
                        <span>Tipo Avvio:</span>
                        <span>{servizio.tipo_avvio || servicio.tipo || 'N/A'}</span>
                      </div>
                      {pmState.details && (
                        <div className="meta-item">
                          <span>PM2 Monit:</span>
                          <span>CPU: {pmState.details.cpu}% | MEM: {(pmState.details.memory / 1024 / 1024).toFixed(1)}MB</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="card-actions">
                    {isLocal ? (
                      <>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => apriCartella(servizio.percorso, `${servizio.id}-folder`)}
                          disabled={actionLoading[`${servizio.id}-folder`]}
                        >
                          {actionLoading[`${servizio.id}-folder`] ? <Loader2 className="spinner" size={14} /> : <FolderOpen size={14} />}
                          Apri Cartella
                        </button>
                        {servizio.nome_pm2 && (
                          <button 
                            className={`btn ${pmState.status === 'online' ? 'btn-danger' : 'btn-primary'}`}
                            onClick={() => controlloDocker(servizio.nome_pm2, pmState.status === 'online' ? 'stop' : 'start', `${servizio.id}-toggle`)}
                            disabled={actionLoading[`${servizio.id}-toggle`]}
                          >
                            {actionLoading[`${servizio.id}-toggle`] ? <Loader2 className="spinner" size={14} /> : (pmState.status === 'online' ? <Square size={14} /> : <Play size={14} />)}
                            {pmState.status === 'online' ? 'Ferma' : 'Avvia'}
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="mobile-copy-area">
                        <div className="path-preview-box">
                          <span>{servizio.percorso}</span>
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', flex: 'none' }} onClick={() => copiaPercorso(servizio.percorso)}>
                            <Copy size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: SERVIZI DOCKER (Escluso in versione Web) */}
        {activeTab === 'docker' && !isWebMode && (
          <div className="cards-grid">
            {risorse?.servizi_docker?.map(container => {
              const dockState = getDockerStatus(container.container_name);
              return (
                <div key={container.id} className="glass-card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <Server size={18} className="card-icon" />
                      {container.nome}
                    </h3>
                    <div className="status-indicator">
                      <span className={`status-dot ${dockState.status}`}></span>
                      <span>{dockState.text}</span>
                    </div>
                  </div>

                  <div className="card-body">
                    <p>{container.descrizione}</p>
                    <div className="card-meta">
                      <div className="meta-item">
                        <span>Container Name:</span>
                        <span>{container.container_name}</span>
                      </div>
                      {container.url && (
                        <div className="meta-item">
                          <span>URL locale:</span>
                          <span>{container.url}</span>
                        </div>
                      )}
                      <div className="meta-item">
                        <span>Tipo:</span>
                        <span>{container.tipo}</span>
                      </div>
                    </div>
                  </div>

                  <div className="card-actions" style={{ gap: '0.5rem' }}>
                    {isLocal ? (
                      <>
                        <button 
                          className={`btn ${dockState.status === 'online' ? 'btn-danger' : 'btn-primary'}`}
                          onClick={() => controlloDocker(container.container_name, dockState.status === 'online' ? 'stop' : 'start', `${container.id}-docker`)}
                          disabled={actionLoading[`${container.id}-docker`]}
                          style={{ flex: 2 }}
                        >
                          {actionLoading[`${container.id}-docker`] ? <Loader2 className="spinner" size={14} /> : (dockState.status === 'online' ? <Square size={14} /> : <Play size={14} />)}
                          {dockState.status === 'online' ? 'Ferma Container' : 'Avvia Container'}
                        </button>
                        {container.url && (
                          <a 
                            href={container.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn btn-secondary"
                            style={{ flex: 1, textDecoration: 'none' }}
                          >
                            <ExternalLink size={14} />
                            Apri Link
                          </a>
                        )}
                      </>
                    ) : (
                      <div className="mobile-copy-area">
                        {container.url ? (
                          <a 
                            href={container.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn btn-primary"
                            style={{ width: '100%', textDecoration: 'none', display: 'flex', gap: '0.5rem' }}
                          >
                            <ExternalLink size={14} />
                            Visita Servizio (Wi-Fi)
                          </a>
                        ) : (
                          <div className="path-preview-box">
                            <span>{container.container_name}</span>
                            <button className="btn btn-secondary" style={{ padding: '4px 8px', flex: 'none' }} onClick={() => copiaPercorso(container.container_name)}>
                              <Copy size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: APPLICAZIONI LOCALI */}
        {activeTab === 'applicazioni' && (
          <div className="cards-grid">
            {risorse?.applicazioni?.concat(risorse?.technogarage || [])?.map(app => (
              <div key={app.id} className="glass-card">
                <div className="card-header">
                  <h3 className="card-title">
                    <Folder size={18} className="card-icon" />
                    {app.nome}
                  </h3>
                  <div className="status-indicator">
                    <span>Pronto</span>
                  </div>
                </div>

                <div className="card-body">
                  <p>{app.descrizione || "Cartella risorse o applicazione per TechnoGarage"}</p>
                  <div className="card-meta">
                    <div className="meta-item">
                      <span>Percorso:</span>
                      <span>{app.percorso}</span>
                    </div>
                    {app.eseguibile && (
                      <div className="meta-item">
                        <span>Eseguibile:</span>
                        <span>{app.eseguibile}</span>
                      </div>
                    )}
                    {app.tipo && (
                      <div className="meta-item">
                        <span>Tipo Risorsa:</span>
                        <span>{app.tipo}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card-actions">
                  {isLocal ? (
                    <>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => apriCartella(app.percorso, `${app.id}-folder`)}
                        disabled={actionLoading[`${app.id}-folder`]}
                      >
                        {actionLoading[`${app.id}-folder`] ? <Loader2 className="spinner" size={14} /> : <FolderOpen size={14} />}
                        Apri Cartella
                      </button>
                      {app.eseguibile && (
                        <button 
                          className="btn btn-primary"
                          onClick={() => avviaEseguibile(app.percorso, app.eseguibile, `${app.id}-run`)}
                          disabled={actionLoading[`${app.id}-run`]}
                        >
                          {actionLoading[`${app.id}-run`] ? <Loader2 className="spinner" size={14} /> : <Play size={14} />}
                          Esegui
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="mobile-copy-area">
                      <div className="path-preview-box">
                        <span>{app.percorso}</span>
                        <button className="btn btn-secondary" style={{ padding: '4px 8px', flex: 'none' }} onClick={() => copiaPercorso(app.percorso)}>
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: RISORSE WEB */}
        {activeTab === 'web' && (
          <div className="cards-grid">
            {risorse?.risorse_web?.map(ris => (
              <a 
                key={ris.id} 
                href={ris.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="glass-card web-card"
              >
                <div className="card-header">
                  <h3 className="card-title">
                    <Globe size={18} className="card-icon" />
                    {ris.nome}
                  </h3>
                  <div className="status-indicator" style={{ color: 'var(--accent-cyan)' }}>
                    <span>Link Web</span>
                  </div>
                </div>

                <div className="card-body">
                  <p>{ris.descrizione}</p>
                  <div className="card-meta">
                    <div className="meta-item">
                      <span>URL Collegamento:</span>
                      <span>{ris.url}</span>
                    </div>
                    <div className="meta-item">
                      <span>Percorso Locale:</span>
                      <span>{ris.percorso}</span>
                    </div>
                  </div>
                </div>

                <div className="card-actions" style={{ marginTop: 'auto' }}>
                  <div className="btn btn-primary" style={{ pointerEvents: 'none' }}>
                    <ExternalLink size={14} />
                    Apri nel Browser
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

      </main>

      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.type === 'success' ? <Check size={18} color="var(--status-online)" /> : <span style={{ color: 'var(--status-stopped)' }}>⚠️</span>}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
