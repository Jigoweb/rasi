# Guida al Deploy su Vercel

Questa guida spiega come fare il deploy dell'applicazione RASI su Vercel e come risolvere problemi comuni.

## 📋 Prerequisiti

- Account Vercel con accesso al progetto `rasi`
- Repository GitHub connesso a Vercel
- Variabili d'ambiente configurate correttamente

## 🔧 Configurazione Variabili d'Ambiente su Vercel

Le seguenti variabili d'ambiente **devono** essere configurate nel progetto Vercel per far funzionare l'applicazione:

### 📝 Passo-passo per Configurare le Variabili

1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il progetto `rasi`
3. Vai su **Settings** → **Environment Variables**
4. Aggiungi/verifica le seguenti variabili:

### ✅ Variabili Obbligatorie

**1. `NEXT_PUBLIC_SUPABASE_URL`** (obbligatoria)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
```
- Questa è l'URL del tuo progetto Supabase
- Si trova in Supabase Dashboard → Settings → API → Project URL

**2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`** (obbligatoria se non usi SERVICE_ROLE_KEY)
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
- Questa è la chiave pubblica anon di Supabase
- Si trova in Supabase Dashboard → Settings → API → Project API keys → `anon` `public`
- **Attenzione**: È una chiave pubblica, ma deve comunque essere presente per il build

**3. `SUPABASE_SERVICE_ROLE_KEY`** (consigliata per operazioni server-side)
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
- Questa è la chiave privata di servizio per operazioni amministrative
- Si trova in Supabase Dashboard → Settings → API → Project API keys → `service_role` `secret`
- **⚠️ IMPORTANTE**: Questa chiave è segreta e NON deve essere esposta nel client
- Se presente, viene usata al posto di `NEXT_PUBLIC_SUPABASE_ANON_KEY` per le API routes
- Se non presente, l'app usa `NEXT_PUBLIC_SUPABASE_ANON_KEY` come fallback

### 🔄 Configurazione per Tutti gli Ambienti

**⚠️ CRUCIALE**: Quando aggiungi/modifichi una variabile, seleziona per quali ambienti deve essere disponibile:

- ✅ **Production** - per il deploy in produzione
- ✅ **Preview** - per i preview deployment (da pull request)
- ✅ **Development** - per i deploy di sviluppo

**Come fare:**
1. Inserisci il nome della variabile (es. `NEXT_PUBLIC_SUPABASE_URL`)
2. Inserisci il valore
3. **Seleziona tutte e tre le checkbox** (Production, Preview, Development)
4. Clicca **Save**
5. Ripeti per ogni variabile

### ⚠️ Dopo Aver Modificato le Variabili

**IMPORTANTE**: Dopo aver aggiunto o modificato le variabili d'ambiente, devi **rigenerare il deploy**:

1. Vai su **Deployments**
2. Trova l'ultimo deployment (anche se fallito)
3. Clicca sui **tre puntini** (⋯) accanto al deployment
4. Seleziona **Redeploy**

**Oppure** fai un nuovo commit e push su GitHub per triggerare un nuovo deploy automatico.

### 🔍 Come Ottenere i Valori da Supabase

1. Vai su [Supabase Dashboard](https://app.supabase.com/)
2. Seleziona il tuo progetto
3. Vai su **Settings** (⚙️) → **API**
4. Troverai:
   - **Project URL** → copia per `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API keys**:
     - `anon` `public` → copia per `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `service_role` `secret` → copia per `SUPABASE_SERVICE_ROLE_KEY` (consigliato)

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

**Sintomo**: Durante il build su Vercel vedi:
```
Error: Missing Supabase environment variables
    at 65115 (.next/server/app/api/campagne-individuazione/finalize/route.js:1:776)
```

**Causa**: Le variabili d'ambiente non sono configurate correttamente su Vercel o mancano valori.

**Soluzione Dettagliata**:

1. **Verifica le variabili su Vercel**:
   - Vai su Vercel Dashboard → Progetto `rasi` → **Settings** → **Environment Variables**
   - Controlla che ci siano almeno:
     - ✅ `NEXT_PUBLIC_SUPABASE_URL` (deve avere un valore non vuoto)
     - ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (deve avere un valore non vuoto)
     - ✅ Opzionale ma consigliato: `SUPABASE_SERVICE_ROLE_KEY`

2. **Verifica che siano abilitate per tutti gli ambienti**:
   - Ogni variabile deve avere le checkbox ✅ selezionate per:
     - Production
     - Preview
     - Development
   - Se una variabile è presente solo per un ambiente, il build per altri ambienti fallirà

3. **Controlla che i valori non siano vuoti**:
   - Apri ogni variabile e verifica che il valore non sia solo spazi vuoti
   - I valori devono essere stringhe valide (URL o chiavi JWT)

4. **Rigenera il deploy**:
   - Dopo aver modificato le variabili, **devi rigenerare il deploy**
   - Vai su **Deployments** → trova l'ultimo deployment → **⋯** → **Redeploy**
   - **IMPORTANTE**: Le variabili modificate vengono applicate solo ai nuovi deploy

5. **Verifica i valori da Supabase**:
   - Assicurati di aver copiato correttamente i valori da Supabase Dashboard
   - Non devono contenere spazi extra o caratteri di newline

**Debug Avanzato**:
- Se il problema persiste, controlla i **Build Logs** su Vercel
- Cerca eventuali errori di parsing o validazione
- Verifica che i valori delle variabili non contengano caratteri speciali che potrebbero causare problemi

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


