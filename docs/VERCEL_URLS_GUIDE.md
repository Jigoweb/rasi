# 🌐 Guida Completa agli URL di Vercel

Questa guida spiega tutti i tipi di URL disponibili su Vercel e come usarli per staging e production.

## 📋 Tipi di URL su Vercel

### 1. 🟢 **Production URL** (Produzione)

**Cos'è**: L'URL principale della tua applicazione in produzione.

**Formato**: `https://[nome-progetto].vercel.app`

**Esempio**: `https://traerasi7kb7.vercel.app`

**Quando viene aggiornato**:
- ✅ Quando fai push su `main` o `master`
- ✅ Quando fai merge di una Pull Request in `main`
- ✅ Quando fai deploy manuale con `vercel --prod`

**Caratteristiche**:
- 🔒 URL stabile e permanente
- 📊 Usa le variabili d'ambiente di **Production**
- 🌍 È l'URL pubblico che condividi con gli utenti
- ⚡ È sempre disponibile (non viene eliminato)

**Quando usarlo**:
- ✅ Per la versione live dell'applicazione
- ✅ Per testare la versione finale prima del rilascio
- ✅ Per condividere con clienti/utenti finali

---

### 2. 🟡 **Preview URLs** (Anteprima)

**Cos'è**: URL temporanei creati automaticamente per ogni branch e Pull Request.

**Formato**: `https://[nome-progetto]-[hash].vercel.app`

**Esempio**: 
- `https://traerasi7kb7-git-develop-jigoweb.vercel.app`
- `https://traerasi7kb7-abc123xyz.vercel.app`

**Quando viene creato**:
- ✅ Quando fai push su qualsiasi branch (tranne `main`)
- ✅ Quando crei una Pull Request
- ✅ Quando fai commit su `develop`, `feature/*`, `fix/*`, ecc.

**Caratteristiche**:
- ⏱️ Temporaneo (può essere eliminato dopo inattività)
- 📊 Usa le variabili d'ambiente di **Preview**
- 🔄 Si aggiorna automaticamente ad ogni push sul branch
- 🆓 Gratuito (non conta come deployment di produzione)

**Quando usarlo**:
- ✅ Per testare modifiche prima di mergiare in `main`
- ✅ Per mostrare anteprime a colleghi/clienti
- ✅ Per testare feature in sviluppo
- ✅ Per QA (Quality Assurance)

**Nota**: Ogni branch ha il suo preview URL unico!

---

### 3. 🔵 **Custom Domains** (Domini Personalizzati)

**Cos'è**: Domini personalizzati che colleghi al tuo progetto Vercel.

**Esempi**:
- `https://rasi.com`
- `https://app.rasi.com`
- `https://staging.rasi.com`

**Come configurarli**:
1. Vai su Vercel Dashboard → Progetto → **Settings** → **Domains**
2. Aggiungi il tuo dominio
3. Segui le istruzioni per configurare i DNS

**Caratteristiche**:
- 🎯 URL personalizzato e professionale
- 🔒 Può avere SSL/HTTPS automatico
- 📊 Può puntare a Production o Preview
- 💰 Potrebbe richiedere un dominio a pagamento

**Quando usarlo**:
- ✅ Per l'URL pubblico finale dell'applicazione
- ✅ Per avere un brand professionale
- ✅ Per configurare staging.rasi.com vs rasi.com

---

### 4. 🟣 **URL con "main" nel nome**

**Cos'è**: Un tipo speciale di Preview URL che Vercel crea per il branch `main` durante lo sviluppo.

**Formato**: `https://[nome-progetto]-git-main-[team].vercel.app`

**Esempio**: `https://traerasi7kb7-git-main-jigoweb.vercel.app`

**Quando viene creato**:
- Quando fai push su `main` prima che diventi Production
- Durante il processo di build

**Caratteristiche**:
- ⚠️ Temporaneo (scompare quando il deploy diventa Production)
- 📊 Usa le variabili d'ambiente di **Preview** o **Production**
- 🔄 Si trasforma nel Production URL quando il deploy è completato

**Quando usarlo**:
- ⚠️ **Non usarlo!** È solo un URL temporaneo durante il build
- ✅ Usa invece il Production URL finale

---

## 🎯 Strategia Consigliata: Staging vs Production

### 📐 Setup Ideale

```
┌─────────────────────────────────────────────────┐
│  PRODUCTION (Live)                              │
│  URL: https://rasi.com                          │
│  Branch: main                                   │
│  Deploy: Automatico su push a main             │
│  Variabili: Production                          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  STAGING (Test)                                 │
│  URL: https://staging.rasi.com                 │
│  Branch: develop                                │
│  Deploy: Automatico su push a develop          │
│  Variabili: Preview (o Staging se configurate) │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  PREVIEW (Feature Branches)                    │
│  URL: https://traerasi7kb7-[hash].vercel.app   │
│  Branch: feature/*, fix/*, ecc.                │
│  Deploy: Automatico su ogni push               │
│  Variabili: Preview                            │
└─────────────────────────────────────────────────┘
```

### 🔧 Come Configurare Staging

#### Opzione 1: Custom Domain per Staging (Consigliato)

1. **Aggiungi un dominio staging**:
   - Vai su Vercel Dashboard → Progetto → **Settings** → **Domains**
   - Aggiungi: `staging.rasi.com` (o il tuo dominio)
   - Configura i DNS come indicato

2. **Collega il dominio al branch `develop`**:
   - Nelle impostazioni del dominio, seleziona quale branch deve essere deployato
   - Seleziona `develop` per staging

3. **Configura variabili d'ambiente separate** (opzionale):
   - Puoi avere variabili diverse per staging e production
   - Es: database di test per staging, database di produzione per production

#### Opzione 2: Usa Preview URL di `develop`

- Ogni push su `develop` crea automaticamente un Preview URL
- URL formato: `https://traerasi7kb7-git-develop-[team].vercel.app`
- ✅ Gratuito e automatico
- ⚠️ L'URL cambia se il branch viene eliminato/ricreato

---

## 📊 Tabella Comparativa

| Tipo URL | Stabilità | Quando si Aggiorna | Variabili Env | Uso Consigliato |
|----------|-----------|-------------------|---------------|-----------------|
| **Production** | 🔒 Permanente | Push su `main` | Production | Live app |
| **Preview (develop)** | ⚠️ Temporaneo | Push su `develop` | Preview | Staging/Test |
| **Preview (feature)** | ⚠️ Temporaneo | Push su branch | Preview | Feature testing |
| **Custom Domain** | 🔒 Permanente | Come configurato | Production/Preview | URL pubblico |
| **URL con "main"** | ⚠️ Temporaneo | Durante build | Preview/Production | Non usare |

---

## 🚀 Workflow Consigliato

### Per Sviluppo Quotidiano

```bash
# 1. Lavora su develop
git checkout develop
git add .
git commit -m "feat: nuova funzionalità"
git push origin develop

# 2. Vercel crea automaticamente un Preview URL
# URL: https://traerasi7kb7-git-develop-[team].vercel.app

# 3. Testa su questo URL
# 4. Se tutto ok, mergia in main
```

### Per Deploy in Produzione

```bash
# 1. Mergia develop in main
git checkout main
git merge develop
git push origin main

# 2. Vercel deploya automaticamente su Production URL
# URL: https://traerasi7kb7.vercel.app (o custom domain)

# 3. Verifica che tutto funzioni
```

---

## 🔍 Come Vedere Tutti gli URL

### Su Vercel Dashboard

1. Vai su: https://vercel.com/dashboard
2. Seleziona il progetto `rasi`
3. Vai su **Deployments**
4. Clicca su un deployment specifico
5. Vedrai tutti gli URL disponibili per quel deployment:
   - Production URL (se è da `main`)
   - Preview URL (se è da un altro branch)
   - Custom Domains (se configurati)

### Su GitHub

1. Vai su: https://github.com/Jigoweb/rasi
2. Vai su **Pull Requests** o **Branches**
3. Vercel aggiunge automaticamente un commento con il Preview URL

---

## ⚙️ Configurazione Avanzata

### Configurare Branch Specifici

Puoi configurare Vercel per deployare branch specifici su domini specifici:

1. Vai su **Settings** → **Git**
2. Configura **Production Branch**: `main`
3. Configura **Preview Branches**: `develop`, `staging`, ecc.

### Variabili d'Ambiente per Ambiente

Puoi avere variabili diverse per ogni ambiente:

- **Production**: Database di produzione, API keys di produzione
- **Preview**: Database di test, API keys di test
- **Development**: Database locale, API keys di sviluppo

**Come fare**:
1. Vai su **Settings** → **Environment Variables**
2. Quando aggiungi una variabile, seleziona per quali ambienti:
   - ✅ Production (solo per `main`)
   - ✅ Preview (per tutti gli altri branch)
   - ✅ Development (per deploy locali)

---

## ❓ FAQ

### Q: Quale URL devo usare per testare?

**A**: 
- **Staging/Test**: Usa il Preview URL di `develop` o un custom domain staging
- **Production**: Usa il Production URL o custom domain principale

### Q: L'URL con "main" nel nome è quello giusto?

**A**: No, è solo temporaneo durante il build. Usa il Production URL finale.

### Q: Posso avere un URL stabile per staging?

**A**: Sì! Configura un custom domain (es. `staging.rasi.com`) e collegalo al branch `develop`.

### Q: Gli URL Preview vengono eliminati?

**A**: Sì, dopo un periodo di inattività (solitamente 30 giorni) o se elimini il branch.

### Q: Quanti Preview URL posso avere?

**A**: Illimitati! Ogni branch e PR ha il suo Preview URL.

---

## 📝 Checklist Setup

- [ ] Production URL configurato e funzionante
- [ ] Custom domain principale configurato (opzionale ma consigliato)
- [ ] Preview URL di `develop` funzionante per staging
- [ ] Custom domain staging configurato (opzionale)
- [ ] Variabili d'ambiente configurate per Production e Preview
- [ ] Workflow di deploy documentato per il team

---

## 🎯 Raccomandazione Finale

**Per il tuo progetto RASI**:

1. **Production**: 
   - URL: `https://traerasi7kb7.vercel.app` (o custom domain)
   - Branch: `main`
   - Usa per: Versione live

2. **Staging**: 
   - URL: Preview URL di `develop` (automatico)
   - Branch: `develop`
   - Usa per: Test prima del deploy in produzione

3. **Feature Branches**: 
   - URL: Preview URL automatico
   - Branch: `feature/*`, `fix/*`, ecc.
   - Usa per: Test di singole feature

**Non usare mai**: URL con "main" nel nome (sono temporanei durante il build)






