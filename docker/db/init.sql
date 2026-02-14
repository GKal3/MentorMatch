DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender') THEN
    CREATE TYPE gender AS ENUM ('Female', 'Male', 'Prefer not to say');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
    CREATE TYPE notification_status AS ENUM ('Read', 'Unread');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM ('New Booking', 'Booking Cancellation', 'New Message', 'Payment');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('Credit Card', 'PayPal');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ruolo') THEN
    CREATE TYPE ruolo AS ENUM ('Mentor', 'Mentee');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status') THEN
    CREATE TYPE status AS ENUM ('Accepted', 'Pending', 'Cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."Utenti"
(
    "Id" integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    "Mail" character varying(300) COLLATE pg_catalog."default" NOT NULL,
    "Nome" character varying(300) COLLATE pg_catalog."default" NOT NULL,
    "Cognome" character varying(300) COLLATE pg_catalog."default" NOT NULL,
    "Data_Nascita" date NOT NULL,
    "Genere" gender NOT NULL,
    "Password" character varying(300) COLLATE pg_catalog."default" NOT NULL,
    "Ruolo" ruolo NOT NULL,
    CONSTRAINT "Utenti_pkey" PRIMARY KEY ("Id"),
    CONSTRAINT "Utenti_Mail_key" UNIQUE ("Mail")
);

CREATE TABLE IF NOT EXISTS public."Settore"
(
    "Id" integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    "Campo" character varying(300) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT "Settore_pkey" PRIMARY KEY ("Id")
);

CREATE TABLE IF NOT EXISTS public."Lingue"
(
    "Id" integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    "Lingua" character varying(300) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT "Lingue_pkey" PRIMARY KEY ("Id")
);

CREATE TABLE IF NOT EXISTS public."OAuthTokens"
(
    "Provider" character varying(80) COLLATE pg_catalog."default" NOT NULL,
    "Tokens" jsonb NOT NULL,
    "Updated_At" timestamp with time zone DEFAULT now(),
    CONSTRAINT "OAuthTokens_pkey" PRIMARY KEY ("Provider")
);

CREATE SEQUENCE IF NOT EXISTS public."Mentee_Id_seq"
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

CREATE TABLE IF NOT EXISTS public."Mentee"
(
    "Id" integer NOT NULL DEFAULT nextval('"Mentee_Id_seq"'::regclass),
    "Id_Utente" integer NOT NULL,
    "Occupazione" character varying(50) COLLATE pg_catalog."default" NOT NULL,
    "Bio" character varying(256) COLLATE pg_catalog."default",
    CONSTRAINT "Mentee_pkey" PRIMARY KEY ("Id"),
    CONSTRAINT fk_mentee_utente FOREIGN KEY ("Id_Utente")
        REFERENCES public."Utenti" ("Id") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public."Mentor"
(
    "Id" integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    "Id_Utente" integer NOT NULL,
    "Cv_Url" character varying(300) COLLATE pg_catalog."default" NOT NULL,
    "Prezzo" numeric(6,2) DEFAULT 0.00,
    "Settore" character varying(300) COLLATE pg_catalog."default" NOT NULL,
    "Lingua" character varying(300) COLLATE pg_catalog."default" NOT NULL,
    "Bio" character varying(256) COLLATE pg_catalog."default" NOT NULL,
    "Titolo" character varying(300) COLLATE pg_catalog."default" NOT NULL,
    "Organizzazione" character varying(300) COLLATE pg_catalog."default" NOT NULL,
    "Esperienza" character varying(10) COLLATE pg_catalog."default" NOT NULL,
    "IBAN" character varying(34) COLLATE pg_catalog."default",
    CONSTRAINT "Mentor_pkey" PRIMARY KEY ("Id"),
    CONSTRAINT fk_mentor_utente FOREIGN KEY ("Id_Utente")
        REFERENCES public."Utenti" ("Id") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT chk_mentor_esperienza CHECK ("Esperienza"::text = ANY (ARRAY['1-3'::character varying, '3-5'::character varying, '5-10'::character varying, '10+'::character varying]::text[])),
    CONSTRAINT mentor_iban_uppercase_check CHECK ("IBAN" IS NULL OR "IBAN"::text = upper("IBAN"::text))
);

CREATE TABLE IF NOT EXISTS public."Disponibilita"
(
    "Id" integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    "Id_Utente" integer NOT NULL,
    "Giorno" smallint NOT NULL,
    "Ora_Inizio" time without time zone NOT NULL,
    "Ora_Fine" time without time zone NOT NULL,
    CONSTRAINT "Disponibilita_pkey" PRIMARY KEY ("Id"),
    CONSTRAINT fk_disponibilita_utente FOREIGN KEY ("Id_Utente")
        REFERENCES public."Utenti" ("Id") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT "Disponibilita_Giorno_check" CHECK ("Giorno" >= 1 AND "Giorno" <= 7)
);

CREATE TABLE IF NOT EXISTS public."Prenotazioni"
(
    "Id" integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    "Id_Mentee" integer NOT NULL,
    "Giorno" date NOT NULL,
    "Ora_Inizio" time without time zone NOT NULL,
    "Stato" status NOT NULL,
    "Link" character varying(300) COLLATE pg_catalog."default",
    "Id_Mentor" integer NOT NULL,
    "Ora_Fine" time without time zone NOT NULL,
    CONSTRAINT "Prenotazioni_pkey" PRIMARY KEY ("Id"),
    CONSTRAINT fk_prenotazioni_mentee FOREIGN KEY ("Id_Mentee")
        REFERENCES public."Utenti" ("Id") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT fk_prenotazioni_mentor FOREIGN KEY ("Id_Mentor")
        REFERENCES public."Utenti" ("Id") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public."Pagamenti"
(
    "Id" integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    "Id_Prenot" integer NOT NULL,
    "Importo" numeric(6,2) NOT NULL,
    "Metodo" payment_method NOT NULL,
    "Data" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "Percentuale_Commissione" numeric(5,2),
    "Commissione_Piattaforma" numeric(10,2),
    "Importo_Mentor" numeric(10,2),
    "Iban_Mentor" character varying(34) COLLATE pg_catalog."default",
    "Provider_Payout" character varying(40) COLLATE pg_catalog."default",
    "Payout_Ref" character varying(120) COLLATE pg_catalog."default",
    "Stato_Payout" character varying(30) COLLATE pg_catalog."default" DEFAULT 'Pending'::character varying,
    "Data_Payout" timestamp without time zone,
    CONSTRAINT "Pagamenti_pkey" PRIMARY KEY ("Id"),
    CONSTRAINT fk_pagamenti_prenot FOREIGN KEY ("Id_Prenot")
        REFERENCES public."Prenotazioni" ("Id") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public."Messaggi"
(
    "Id" integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    "Id_D" integer NOT NULL,
    "Id_M" integer NOT NULL,
    "Contenuto" character varying(1000) COLLATE pg_catalog."default",
    "Data_Invio" date NOT NULL,
    "Ora_Invio" time without time zone NOT NULL,
    "Lettura" boolean DEFAULT false,
    CONSTRAINT "Messaggi_pkey" PRIMARY KEY ("Id"),
    CONSTRAINT fk_messaggi_mittente FOREIGN KEY ("Id_M")
        REFERENCES public."Utenti" ("Id") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT fk_messaggi_utente FOREIGN KEY ("Id_D")
        REFERENCES public."Utenti" ("Id") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public."Notifiche"
(
    "Id" integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    "Id_Utente" integer NOT NULL,
    "Tipo" notification_type NOT NULL,
    "Contenuto" text COLLATE pg_catalog."default" NOT NULL,
    "Data" timestamp without time zone NOT NULL,
    "Titolo" character varying(255) COLLATE pg_catalog."default" NOT NULL,
    "Stato" notification_status NOT NULL DEFAULT 'Unread'::notification_status,
    CONSTRAINT "Notifiche_pkey" PRIMARY KEY ("Id"),
    CONSTRAINT fk_notifiche_utente FOREIGN KEY ("Id_Utente")
        REFERENCES public."Utenti" ("Id") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public."Recensioni"
(
    "Id" integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    "Id_Mentee" integer NOT NULL,
    "Voto" smallint DEFAULT 5,
    "Commento" character varying(256) COLLATE pg_catalog."default",
    "Id_Mentor" integer NOT NULL,
    CONSTRAINT "Recensioni_pkey" PRIMARY KEY ("Id"),
    CONSTRAINT fk_recensioni_mentee FOREIGN KEY ("Id_Mentee")
        REFERENCES public."Utenti" ("Id") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT fk_recensioni_mentor FOREIGN KEY ("Id_Mentor")
        REFERENCES public."Utenti" ("Id") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT "Recensioni_Voto_check" CHECK ("Voto" >= 1 AND "Voto" <= 5)
);

CREATE INDEX IF NOT EXISTS idx_utenti_mail ON public."Utenti"("Mail");
CREATE INDEX IF NOT EXISTS idx_mentor_id_utente ON public."Mentor"("Id_Utente");
CREATE INDEX IF NOT EXISTS idx_mentee_id_utente ON public."Mentee"("Id_Utente");
CREATE INDEX IF NOT EXISTS idx_recensioni_mentor ON public."Recensioni"("Id_Mentor");
CREATE INDEX IF NOT EXISTS idx_disponibilita_utente_giorno ON public."Disponibilita"("Id_Utente", "Giorno");
