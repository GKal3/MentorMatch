***********************************************************************************
PROGETTO MENTORMATCH
SVILUPPO E TECNOLOGIE WEB, CORSO DI LAUREA TRIENNALE IN INFORMATICA
UNIVERSITA' DEGLI STUDI DELL'INSUBRIA

PROGETTO REALIZZATO DA:
GIULIA KALEMI, MATRICOLA 756143
CHIARA LEONE, MATRICOLA 759095
Sede di COMO
***********************************************************************************
MentorMatch è una piattaforma web sviluppata per facilitare il mentoring
tra professionisti esperti e giovani in cerca di orientamento lavorativo.
La piattaforma permette ai mentor di offrire sessioni 1:1 (gratuite o a pagamento)
e ai mentee di prenotarle in base alla disponibilità.

Le funzionalita' principali includono:
- Registrazione e autenticazione utenti (JWT + Google OAuth)
- Ricerca e filtro mentor per settore, lingua e disponibilita'
- Prenotazione sessioni con generazione automatica di link Google Meet
- Gestione pagamenti
- Sistema di notifiche e messaggistica interna
- Recensioni e valutazioni dei mentor

Tecnologie utilizzate:
- Backend          : Node.js + Express.js
- Database         : PostgreSQL
- Autenticazione   : JWT + Google OAuth 2.0
- Video Call       : Google Calendar API (Meet)
- Containeriz.     : Docker + Docker Compose
- CI/CD            : Render.com (auto-deploy da GitHub)
- Cloud Deploy     : Render.com

***********************************************************************************
++ REQUISITI ++
***********************************************************************************
  - Node.js          v18 o superiore
  - PostgreSQL       v15 o superiore
  - Docker

***********************************************************************************
++ AVVIARE L'APPLICAZIONE ++
***********************************************************************************
---[ OPZIONE 1: AVVIO CON RENDER (consigliato) ]---

  Accedere da browser al link:
  https://mentormatch-7ten.onrender.com

  Nota: con il piano gratuito di Render, il servizio va in sleep dopo 15 minuti
  di inattività. Al primo accesso potrebbe impiegare circa 30 secondi per
  avviarsi.


---[ OPZIONE 2: AVVIO CON DOCKER ]---

  1. Clonare il repository:
     git clone https://github.com/GKal3/MentorMatch.git
     cd MentorMatch

  2. Creare il file .env nella root del progetto (vedere sezione CONFIGURAZIONE)

  3. Avviare tutti i servizi con Docker Compose:
     docker-compose up

  4. L'applicazione sara' disponibile su:
     http://localhost:3000

***********************************************************************************
++ CONFIGURAZIONE VARIABILI D'AMBIENTE ++
***********************************************************************************

Creare un file .env nella root del progetto con le seguenti variabili:

  # Applicazione
  NODE_ENV=production
  PORT=3000

  # Database
  DATABASE_URL=postgresql://mentormatch_wauj_user:hmWspXaV3CSYHy9uHvqcok0mEbF9zWIn@dpg-d689rour433s73cguh90-a/mentormatch_wauj

  # JWT
  JWT_SECRET=your_jwt_secret
  JWT_EXPIRES_IN=7d

  # Google OAuth
  GOOGLE_CLIENT_ID=your_google_client_id
  GOOGLE_CLIENT_SECRET=your_google_client_secret
  GOOGLE_REDIRECT_URL=http://localhost:3000/api/v1/auth/google/callback

  # Email
  EMAIL_HOST=smtp.gmail.com
  EMAIL_PORT=587
  EMAIL_USER=your_email@gmail.com
  EMAIL_PASSWORD=your_app_password

  # Pagamenti
  PAYPAL_CLIENT_ID=your_paypal_client_id
  PAYPAL_CLIENT_SECRET=your_paypal_client_secret
  STRIPE_SECRET_KEY=your_stripe_secret

***********************************************************************************
++ DEPLOY IN PRODUZIONE ++
***********************************************************************************

Il progetto e' deployato su Render.com con deploy automatico ad ogni push
sul branch master.

  URL di produzione:
  https://mentormatch-7ten.onrender.com

  Ad ogni git push su master, Render:
  1. Rileva automaticamente il cambiamento
  2. Costruisce l'immagine Docker
  3. Deploya la nuova versione (zero downtime)
