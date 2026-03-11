# 🚨 Fix Rapido: "Missing Supabase environment variables"

Questa è una guida rapida per risolvere l'errore durante il deploy su Vercel.

## ✅ Checklist Veloce

- [ ] Accedi a Vercel Dashboard
- [ ] Vai su Settings → Environment Variables
- [ ] Verifica/aggiungi `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Verifica/aggiungi `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Verifica/aggiungi `SUPABASE_SERVICE_ROLE_KEY` (consigliato)
- [ ] Assicurati che tutte le variabili siano abilitate per Production, Preview, Development
- [ ] Rigenera il deploy

## 📋 Passo-Passo Dettagliato

### 1. Accedi a Vercel Dashboard
Vai su: https://vercel.com/dashboard

### 2. Seleziona il Progetto
Clicca sul progetto `rasi` (o il nome del tuo progetto)

### 3. Vai alle Environment Variables
- Clicca su **Settings** (sulla barra superiore)
- Clicca su **Environment Variables** (nel menu laterale sinistro)

### 4. Aggiungi/Verifica le Variabili

#### Variabile 1: `NEXT_PUBLIC_SUPABASE_URL`
- **Nome**: `NEXT_PUBLIC_SUPABASE_URL`
- **Valore**: La URL del tuo progetto Supabase (es. `https://xxxxx.supabase.co`)
- **Dove trovarla**: Supabase Dashboard → Settings → API → Project URL
- **Ambienti**: ✅ Production, ✅ Preview, ✅ Development

#### Variabile 2: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Nome**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Valore**: La chiave anon pubblica di Supabase
- **Dove trovarla**: Supabase Dashboard → Settings → API → Project API keys → `anon` `public`
- **Ambienti**: ✅ Production, ✅ Preview, ✅ Development

#### Variabile 3: `SUPABASE_SERVICE_ROLE_KEY` (Consigliato)
- **Nome**: `SUPABASE_SERVICE_ROLE_KEY`
- **Valore**: La chiave di servizio segreta di Supabase
- **Dove trovarla**: Supabase Dashboard → Settings → API → Project API keys → `service_role` `secret`
- **Ambienti**: ✅ Production, ✅ Preview, ✅ Development
- **Nota**: Questa è una chiave segreta, non esporla mai nel client

### 5. Come Aggiungere una Variabile

1. Clicca su **Add New**
2. Inserisci il **Key** (nome della variabile)
3. Inserisci il **Value** (valore)
4. **Seleziona gli ambienti**:
   - ☑️ Production
   - ☑️ Preview
   - ☑️ Development
5. Clicca **Save**

### 6. Come Modificare una Variabile Esistente

1. Trova la variabile nella lista
2. Clicca su **Edit** (o sui tre puntini ⋯ → Edit)
3. Modifica il valore se necessario
4. **Verifica che tutti gli ambienti siano selezionati**
5. Clicca **Save**

### 7. Rigenera il Deploy

⚠️ **IMPORTANTE**: Dopo aver modificato le variabili, devi rigenerare il deploy!

**Metodo A - Redeploy dall'interfaccia**:
1. Vai su **Deployments** (sulla barra superiore)
2. Trova l'ultimo deployment (anche se fallito)
3. Clicca sui **tre puntini** (⋯) accanto al deployment
4. Seleziona **Redeploy**
5. Attendi che il deploy completi (2-5 minuti)

**Metodo B - Nuovo deploy automatico**:
1. Fai un commit vuoto su GitHub:
   ```bash
   git commit --allow-empty -m "Trigger rebuild after env vars update"
   git push
   ```
2. Vercel triggererà automaticamente un nuovo deploy

## 🔍 Verifica che Funzioni

1. Dopo il redeploy, vai su **Deployments**
2. Controlla che lo stato del deployment sia **Ready** (non Failed)
3. Clicca sul deployment per vedere i log
4. Se vedi "Build Successful", il problema è risolto!
5. Visita l'URL della produzione (es. `https://traerasi7kb7.vercel.app/`)

## ❓ Problemi Comuni

### "La variabile esiste già ma il deploy fallisce ancora"
- Verifica che la variabile sia abilitata per **tutti gli ambienti** (Production, Preview, Development)
- Verifica che il valore non sia vuoto o contenga solo spazi
- Fai un **Redeploy** dopo aver modificato le variabili

### "Non so dove trovare i valori di Supabase"
1. Vai su https://app.supabase.com/
2. Seleziona il tuo progetto
3. Clicca su **Settings** (⚙️) nella barra laterale sinistra
4. Clicca su **API**
5. Troverai tutti i valori necessari in questa pagina

### "Il deploy è ancora in corso"
- I deploy su Vercel possono richiedere 2-5 minuti
- Puoi seguire il progresso nella sezione **Deployments**
- Non chiudere la pagina durante il deploy

## 📚 Documentazione Completa

Per informazioni più dettagliate, consulta `DEPLOYMENT.md`.


















