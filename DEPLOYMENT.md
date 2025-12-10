# Guida al Deploy su Vercel

Questa guida spiega come fare il deploy dell'applicazione RASI su Vercel e come risolvere problemi comuni.

## 📋 Prerequisiti

- Account Vercel con accesso al progetto `rasi`
- Repository GitHub connesso a Vercel
- Variabili d'ambiente configurate correttamente

## 🔧 Configurazione Variabili d'Ambiente su Vercel

Le seguenti variabili d'ambiente **devono** essere configurate nel progetto Vercel:

1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il progetto `rasi`
3. Vai su **Settings** → **Environment Variables**
4. Aggiungi/verifica le seguenti variabili:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Opzionali** (per operazioni server-side avanzate):
```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### ⚠️ Importante
- Assicurati che le variabili siano configurate per **Production**, **Preview** e **Development**
- Dopo aver modificato le variabili, è necessario **rigenerare il deploy** (vedi sezione successiva)

## 🚀 Come Fare il Deploy

### Metodo 1: Deploy Automatico (Consigliato)

Il deploy automatico avviene quando:
- Fai push di commit su `main` o `master`
- Fai merge di una Pull Request

**Per triggerare un nuovo deploy:**
1. Vai su GitHub
2. Fai un push vuoto o modifica un file (es. README.md)
3. Oppure vai su Vercel Dashboard → **Deployments** → **Redeploy** dell'ultimo deployment

### Metodo 2: Deploy Manuale con Vercel CLI

Se hai accesso al terminale e hai installato Vercel CLI:

```bash
# Installa Vercel CLI (se non già installato)
npm i -g vercel

# Login a Vercel
vercel login

# Deploy in produzione
vercel --prod
```

### Metodo 3: Redeploy dall'Interfaccia Vercel

1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il progetto `rasi`
3. Vai su **Deployments**
4. Trova l'ultimo deployment (anche se fallito)
5. Clicca sui **tre puntini** (⋯) accanto al deployment
6. Seleziona **Redeploy**

## 🔍 Risoluzione Problemi Comuni

### ❌ Errore: "Missing Supabase environment variables"

**Causa**: Le variabili d'ambiente non sono configurate correttamente su Vercel.

**Soluzione**:
1. Verifica che `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` siano presenti
2. Assicurati che siano configurate per tutti gli ambienti (Production, Preview, Development)
3. Rigenera il deploy dopo aver modificato le variabili

### ❌ Errore TypeScript durante la build

**Causa**: Errori di tipo TypeScript nel codice.

**Soluzione**:
1. Verifica la build localmente: `npm run build`
2. Se la build locale funziona ma Vercel fallisce, controlla:
   - Versione di Node.js (deve essere 18.17+)
   - Versione di TypeScript
   - Che tutti i cast `as any` siano presenti dove necessario

### ❌ Errore: "Build failed"

**Causa**: Vari errori possibili durante la compilazione.

**Soluzione**:
1. Controlla i **Build Logs** su Vercel per vedere l'errore specifico
2. Verifica che tutte le dipendenze siano installate correttamente:
   ```bash
   npm install
   ```
3. Testa la build localmente:
   ```bash
   npm run build
   ```

## 📊 Verifica del Deploy

Dopo il deploy, verifica che tutto funzioni:

1. **Controlla lo stato del deployment** su Vercel Dashboard
2. **Visita l'URL** della produzione (es. `https://traerasi7kb7.vercel.app/`)
3. **Testa le funzionalità principali**:
   - Login/Logout
   - Visualizzazione dashboard
   - Navigazione tra le pagine
   - Operazioni CRUD (crea/modifica/elimina)

## 🔄 Aggiornare il Deploy dopo Modifiche

1. **Fai commit e push** delle modifiche su GitHub
2. **Attendi il deploy automatico** (solitamente 2-5 minuti)
3. **Verifica i log** su Vercel per eventuali errori
4. Se necessario, **rigenera manualmente** il deploy (vedi Metodo 3 sopra)

## 🌐 URL del Progetto

- **Production**: https://traerasi7kb7.vercel.app/
- **Dashboard Vercel**: https://vercel.com/dashboard (accesso necessario)

## 📝 Note Aggiuntive

- Il deploy automatico è configurato per la branch `main` o `master`
- Ogni commit crea automaticamente un preview deployment
- I deployment possono richiedere 2-5 minuti per completarsi
- Se un deployment fallisce, puoi sempre fare "Redeploy" dell'ultimo commit che funzionava

## 🆘 Supporto

Se riscontri problemi:
1. Controlla i **Build Logs** su Vercel per errori specifici
2. Verifica che la build locale funzioni: `npm run build`
3. Controlla che le variabili d'ambiente siano configurate correttamente
4. Verifica che il repository GitHub sia sincronizzato con Vercel

