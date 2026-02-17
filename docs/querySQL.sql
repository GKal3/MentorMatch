-- =============================================================================
-- PROGETTO MENTORMATCH
-- SVILUPPO E TECNOLOGIE WEB, CORSO DI LAUREA TRIENNALE IN INFORMATICA
-- UNIVERSITA' DEGLI STUDI DELL'INSUBRIA
-- GIULIA KALEMI - CHIARA LEONE
-- =============================================================================
-- SCHEMA DEL DATABASE
-- Questo file contiene tutte le query SQL per ricreare il database da zero.
-- =============================================================================


-- =============================================================================
-- 1. TIPI ENUMERATI (ENUM)
-- =============================================================================

CREATE TYPE public.gender AS ENUM (
    'Male',
    'Female',
    'Prefer not to say'
);

CREATE TYPE public.ruolo AS ENUM (
    'Mentor',
    'Mentee'
);

CREATE TYPE public.status AS ENUM (
    'Pending',
    'Accepted',
    'Cancelled'
);

CREATE TYPE public.notification_type AS ENUM (
    'New Booking',
    'Payment',
    'Booking Cancellation',
    'New Message'
);

CREATE TYPE public.notification_status AS ENUM (
    'Unread',
    'Read'
);

CREATE TYPE public.payment_method AS ENUM (
    'Credit Card',
    'PayPal'
);


-- =============================================================================
-- 2. TABELLE PRINCIPALI
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabella: Utenti
-- Contiene tutti gli utenti registrati (mentor e mentee)
-- -----------------------------------------------------------------------------
CREATE TABLE public."Utenti" (
    "Id"           integer NOT NULL,
    "Mail"         character varying(300) NOT NULL,
    "Nome"         character varying(300) NOT NULL,
    "Cognome"      character varying(300) NOT NULL,
    "Data_Nascita" date NOT NULL,
    "Genere"       public.gender NOT NULL,
    "Password"     character varying(300) NOT NULL,
    "Ruolo"        public.ruolo NOT NULL
);

ALTER TABLE public."Utenti" ALTER COLUMN "Id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."Utenti_Id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


-- -----------------------------------------------------------------------------
-- Tabella: Mentor
-- Contiene i dati professionali dei mentor
-- -----------------------------------------------------------------------------
CREATE TABLE public."Mentor" (
    "Id"             integer NOT NULL,
    "Id_Utente"      integer NOT NULL,
    "Cv_Url"         character varying(300) NOT NULL,
    "Prezzo"         numeric(6,2) DEFAULT 0.00,
    "Settore"        character varying(300) NOT NULL,
    "Lingua"         character varying(300) NOT NULL,
    "Bio"            character varying(256) NOT NULL,
    "Titolo"         character varying(300) NOT NULL,
    "Organizzazione" character varying(300) NOT NULL,
    "Esperienza"     character varying(10) NOT NULL,
    "IBAN"           character varying(300),
    CONSTRAINT chk_mentor_esperienza CHECK (
        ("Esperienza")::text = ANY (
            (ARRAY['1-3'::character varying, '3-5'::character varying,
                   '5-10'::character varying, '10+'::character varying])::text[]
        )
    ),
    CONSTRAINT mentor_iban_uppercase_check CHECK (
        ("IBAN" IS NULL) OR (("IBAN")::text = upper(("IBAN")::text))
    )
);

ALTER TABLE public."Mentor" ALTER COLUMN "Id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."Mentor_Id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


-- -----------------------------------------------------------------------------
-- Tabella: Mentee
-- Contiene i dati dei mentee
-- -----------------------------------------------------------------------------
CREATE TABLE public."Mentee" (
    "Id"          integer NOT NULL,
    "Id_Utente"   integer NOT NULL,
    "Occupazione" character varying(50) NOT NULL,
    "Bio"         character varying(256)
);

CREATE SEQUENCE public."Mentee_Id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public."Mentee_Id_seq" OWNED BY public."Mentee"."Id";

ALTER TABLE ONLY public."Mentee"
    ALTER COLUMN "Id" SET DEFAULT nextval('public."Mentee_Id_seq"'::regclass);


-- -----------------------------------------------------------------------------
-- Tabella: Disponibilita
-- Contiene le fasce orarie di disponibilita' dei mentor
-- Giorno: 1=Lunedi', 2=Martedi', ..., 7=Domenica
-- -----------------------------------------------------------------------------
CREATE TABLE public."Disponibilita" (
    "Id"         integer NOT NULL,
    "Id_Utente"  integer NOT NULL,
    "Giorno"     smallint NOT NULL,
    "Ora_Inizio" time without time zone NOT NULL,
    "Ora_Fine"   time without time zone NOT NULL,
    CONSTRAINT "Disponibilita_Giorno_check" CHECK (
        ("Giorno" >= 1) AND ("Giorno" <= 7)
    )
);

ALTER TABLE public."Disponibilita" ALTER COLUMN "Id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."Disponibilita_Id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


-- -----------------------------------------------------------------------------
-- Tabella: Settore
-- Contiene i settori professionali disponibili
-- -----------------------------------------------------------------------------
CREATE TABLE public."Settore" (
    "Id"    integer NOT NULL,
    "Campo" character varying(300) NOT NULL
);

ALTER TABLE public."Settore" ALTER COLUMN "Id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."Settore_Id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


-- -----------------------------------------------------------------------------
-- Tabella: Lingue
-- Contiene le lingue disponibili per i mentor
-- -----------------------------------------------------------------------------
CREATE TABLE public."Lingue" (
    "Id"     integer NOT NULL,
    "Lingua" character varying(300) NOT NULL
);

ALTER TABLE public."Lingue" ALTER COLUMN "Id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."Lingue_Id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


-- -----------------------------------------------------------------------------
-- Tabella: Prenotazioni
-- Contiene le prenotazioni delle sessioni tra mentor e mentee
-- -----------------------------------------------------------------------------
CREATE TABLE public."Prenotazioni" (
    "Id"         integer NOT NULL,
    "Id_Mentee"  integer NOT NULL,
    "Giorno"     date NOT NULL,
    "Ora_Inizio" time without time zone NOT NULL,
    "Stato"      public.status NOT NULL,
    "Link"       character varying(500),
    "Id_Mentor"  integer NOT NULL,
    "Ora_Fine"   time without time zone NOT NULL
);

ALTER TABLE public."Prenotazioni" ALTER COLUMN "Id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."Prenotazioni_Id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


-- -----------------------------------------------------------------------------
-- Tabella: Pagamenti
-- Contiene i pagamenti effettuati per le sessioni
-- -----------------------------------------------------------------------------
CREATE TABLE public."Pagamenti" (
    "Id"                      integer NOT NULL,
    "Id_Prenot"               integer NOT NULL,
    "Importo"                 numeric(6,2) NOT NULL,
    "Metodo"                  public.payment_method NOT NULL,
    "Data"                    timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "Percentuale_Commissione" numeric(5,2),
    "Commissione_Piattaforma" numeric(6,2),
    "Importo_Mentor"          numeric(6,2),
    "Iban_Mentor"             character varying(300),
    "Provider_Payout"         character varying(100),
    "Payout_Ref"              character varying(300),
    "Stato_Payout"            character varying(30) DEFAULT 'Pending'::character varying,
    "Data_Payout"             timestamp without time zone
);

ALTER TABLE public."Pagamenti" ALTER COLUMN "Id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."Pagamenti_Id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


-- -----------------------------------------------------------------------------
-- Tabella: Recensioni
-- Contiene le recensioni lasciate dai mentee ai mentor
-- Voto: da 1 a 5
-- -----------------------------------------------------------------------------
CREATE TABLE public."Recensioni" (
    "Id"        integer NOT NULL,
    "Id_Mentee" integer NOT NULL,
    "Voto"      smallint DEFAULT 5,
    "Commento"  text,
    "Id_Mentor" integer NOT NULL,
    CONSTRAINT "Recensioni_Voto_check" CHECK (
        ("Voto" >= 1) AND ("Voto" <= 5)
    )
);

ALTER TABLE public."Recensioni" ALTER COLUMN "Id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."Recensioni_Id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


-- -----------------------------------------------------------------------------
-- Tabella: Messaggi
-- Contiene i messaggi scambiati tra utenti
-- Id_D = destinatario, Id_M = mittente
-- -----------------------------------------------------------------------------
CREATE TABLE public."Messaggi" (
    "Id"         integer NOT NULL,
    "Id_D"       integer NOT NULL,
    "Id_M"       integer NOT NULL,
    "Contenuto"  text,
    "Data_Invio" date NOT NULL,
    "Ora_Invio"  time without time zone NOT NULL,
    "Lettura"    boolean DEFAULT false
);

ALTER TABLE public."Messaggi" ALTER COLUMN "Id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."Messaggi_Id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


-- -----------------------------------------------------------------------------
-- Tabella: Notifiche
-- Contiene le notifiche inviate agli utenti
-- -----------------------------------------------------------------------------
CREATE TABLE public."Notifiche" (
    "Id"        integer NOT NULL,
    "Id_Utente" integer NOT NULL,
    "Tipo"      public.notification_type NOT NULL,
    "Contenuto" text NOT NULL,
    "Data"      timestamp without time zone NOT NULL,
    "Titolo"    character varying(255) NOT NULL,
    "Stato"     public.notification_status DEFAULT 'Unread'::public.notification_status NOT NULL
);

ALTER TABLE public."Notifiche" ALTER COLUMN "Id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."Notifiche_Id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


-- =============================================================================
-- 3. CHIAVI PRIMARIE
-- =============================================================================

ALTER TABLE ONLY public."Utenti"
    ADD CONSTRAINT "Utenti_pkey" PRIMARY KEY ("Id");

ALTER TABLE ONLY public."Utenti"
    ADD CONSTRAINT "Utenti_Mail_key" UNIQUE ("Mail");

ALTER TABLE ONLY public."Mentor"
    ADD CONSTRAINT "Mentor_pkey" PRIMARY KEY ("Id");

ALTER TABLE ONLY public."Mentee"
    ADD CONSTRAINT "Mentee_pkey" PRIMARY KEY ("Id");

ALTER TABLE ONLY public."Disponibilita"
    ADD CONSTRAINT "Disponibilita_pkey" PRIMARY KEY ("Id");

ALTER TABLE ONLY public."Settore"
    ADD CONSTRAINT "Settore_pkey" PRIMARY KEY ("Id");

ALTER TABLE ONLY public."Lingue"
    ADD CONSTRAINT "Lingue_pkey" PRIMARY KEY ("Id");

ALTER TABLE ONLY public."Prenotazioni"
    ADD CONSTRAINT "Prenotazioni_pkey" PRIMARY KEY ("Id");

ALTER TABLE ONLY public."Pagamenti"
    ADD CONSTRAINT "Pagamenti_pkey" PRIMARY KEY ("Id");

ALTER TABLE ONLY public."Recensioni"
    ADD CONSTRAINT "Recensioni_pkey" PRIMARY KEY ("Id");

ALTER TABLE ONLY public."Messaggi"
    ADD CONSTRAINT "Messaggi_pkey" PRIMARY KEY ("Id");

ALTER TABLE ONLY public."Notifiche"
    ADD CONSTRAINT "Notifiche_pkey" PRIMARY KEY ("Id");


-- =============================================================================
-- 4. INDICI
-- =============================================================================

CREATE INDEX idx_pagamenti_payout_date
    ON public."Pagamenti" USING btree ("Data_Payout");

CREATE INDEX idx_pagamenti_payout_status
    ON public."Pagamenti" USING btree ("Stato_Payout");


-- =============================================================================
-- 5. CHIAVI ESTERNE (FOREIGN KEYS)
-- =============================================================================

ALTER TABLE ONLY public."Mentor"
    ADD CONSTRAINT fk_mentor_utente
    FOREIGN KEY ("Id_Utente") REFERENCES public."Utenti"("Id");

ALTER TABLE ONLY public."Mentee"
    ADD CONSTRAINT fk_mentee_utente
    FOREIGN KEY ("Id_Utente") REFERENCES public."Utenti"("Id") ON DELETE CASCADE;

ALTER TABLE ONLY public."Disponibilita"
    ADD CONSTRAINT fk_disponibilita_utente
    FOREIGN KEY ("Id_Utente") REFERENCES public."Utenti"("Id") ON DELETE CASCADE;

ALTER TABLE ONLY public."Prenotazioni"
    ADD CONSTRAINT fk_prenotazioni_mentee
    FOREIGN KEY ("Id_Mentee") REFERENCES public."Utenti"("Id") ON DELETE CASCADE;

ALTER TABLE ONLY public."Prenotazioni"
    ADD CONSTRAINT fk_prenotazioni_mentor
    FOREIGN KEY ("Id_Mentor") REFERENCES public."Utenti"("Id") ON DELETE CASCADE;

ALTER TABLE ONLY public."Pagamenti"
    ADD CONSTRAINT fk_pagamenti_prenot
    FOREIGN KEY ("Id_Prenot") REFERENCES public."Prenotazioni"("Id") ON DELETE CASCADE;

ALTER TABLE ONLY public."Recensioni"
    ADD CONSTRAINT fk_recensioni_mentee
    FOREIGN KEY ("Id_Mentee") REFERENCES public."Utenti"("Id") ON DELETE CASCADE;

ALTER TABLE ONLY public."Recensioni"
    ADD CONSTRAINT fk_recensioni_mentor
    FOREIGN KEY ("Id_Mentor") REFERENCES public."Utenti"("Id") ON DELETE CASCADE;

ALTER TABLE ONLY public."Messaggi"
    ADD CONSTRAINT fk_messaggi_utente
    FOREIGN KEY ("Id_D") REFERENCES public."Utenti"("Id") ON DELETE CASCADE;

ALTER TABLE ONLY public."Messaggi"
    ADD CONSTRAINT fk_messaggi_mittente
    FOREIGN KEY ("Id_M") REFERENCES public."Utenti"("Id") ON DELETE CASCADE;

ALTER TABLE ONLY public."Notifiche"
    ADD CONSTRAINT fk_notifiche_utente
    FOREIGN KEY ("Id_Utente") REFERENCES public."Utenti"("Id") ON DELETE CASCADE;


-- =============================================================================
-- FINE SCHEMA
-- =============================================================================
