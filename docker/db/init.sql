CREATE TABLE IF NOT EXISTS "Utenti" (
  "Id" SERIAL PRIMARY KEY,
  "Mail" VARCHAR(255) UNIQUE NOT NULL,
  "Nome" VARCHAR(100) NOT NULL,
  "Cognome" VARCHAR(100) NOT NULL,
  "Data_Nascita" DATE,
  "Genere" VARCHAR(40),
  "Password" TEXT NOT NULL,
  "Ruolo" VARCHAR(20) NOT NULL,
  "Created_At" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Mentor" (
  "Id" SERIAL PRIMARY KEY,
  "Id_Utente" INTEGER UNIQUE NOT NULL REFERENCES "Utenti"("Id") ON DELETE CASCADE,
  "Titolo" VARCHAR(255),
  "Organizzazione" VARCHAR(255),
  "Esperienza" TEXT,
  "Cv_Url" TEXT,
  "Prezzo" NUMERIC(10,2) DEFAULT 0,
  "IBAN" VARCHAR(50),
  "Settore" VARCHAR(120),
  "Lingua" VARCHAR(120),
  "Bio" TEXT,
  "Created_At" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Mentee" (
  "Id" SERIAL PRIMARY KEY,
  "Id_Utente" INTEGER UNIQUE NOT NULL REFERENCES "Utenti"("Id") ON DELETE CASCADE,
  "Occupazione" VARCHAR(255),
  "Bio" TEXT,
  "Created_At" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Recensioni" (
  "Id" SERIAL PRIMARY KEY,
  "Id_Mentee" INTEGER NOT NULL REFERENCES "Utenti"("Id") ON DELETE CASCADE,
  "Id_Mentor" INTEGER NOT NULL REFERENCES "Utenti"("Id") ON DELETE CASCADE,
  "Voto" INTEGER NOT NULL CHECK ("Voto" BETWEEN 1 AND 5),
  "Commento" TEXT,
  "Created_At" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Disponibilita" (
  "Id" SERIAL PRIMARY KEY,
  "Id_Utente" INTEGER NOT NULL REFERENCES "Utenti"("Id") ON DELETE CASCADE,
  "Giorno" INTEGER NOT NULL CHECK ("Giorno" BETWEEN 1 AND 7),
  "Ora_Inizio" TIME NOT NULL,
  "Ora_Fine" TIME NOT NULL,
  "Created_At" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Settore" (
  "Id" SERIAL PRIMARY KEY,
  "Campo" VARCHAR(120) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS "Lingue" (
  "Id" SERIAL PRIMARY KEY,
  "Lingua" VARCHAR(120) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS "OAuthTokens" (
  "Provider" VARCHAR(80) PRIMARY KEY,
  "Tokens" JSONB NOT NULL,
  "Updated_At" TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO "Settore" ("Campo") VALUES
  ('Business'),
  ('Technology'),
  ('Marketing'),
  ('Design'),
  ('Career')
ON CONFLICT ("Campo") DO NOTHING;

INSERT INTO "Lingue" ("Lingua") VALUES
  ('Italian'),
  ('English'),
  ('Spanish'),
  ('French')
ON CONFLICT ("Lingua") DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_utenti_mail ON "Utenti"("Mail");
CREATE INDEX IF NOT EXISTS idx_mentor_id_utente ON "Mentor"("Id_Utente");
CREATE INDEX IF NOT EXISTS idx_mentee_id_utente ON "Mentee"("Id_Utente");
CREATE INDEX IF NOT EXISTS idx_recensioni_mentor ON "Recensioni"("Id_Mentor");
CREATE INDEX IF NOT EXISTS idx_disponibilita_utente_giorno ON "Disponibilita"("Id_Utente", "Giorno");
