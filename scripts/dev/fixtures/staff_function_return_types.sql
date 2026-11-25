-- Fixture minima per scripts/dev/check-staff-function-return-types.sh.
-- Non è una migration. Tipi delle colonne lette da
-- get_campagne_programmazione_with_counts allineati al catalogo di
-- produzione (2026-11-10): nome varchar, descrizione text, emittenti.nome
-- text, programmazioni_count bigint, stato enum.
-- Le altre tabelle coprono solo le colonne citate dalle 5 funzioni scalari,
-- con i tipi del catalogo / di db/init, così una chiamata staff non fallisce
-- per una colonna assente.

CREATE TYPE public.stato_iscrizione AS ENUM ('attivo', 'sospeso', 'cessato');
CREATE TYPE public.tipo_opera AS ENUM ('film', 'serie_tv', 'animazione');
CREATE TYPE public.stato_campagna AS ENUM (
  'pianificata', 'in_corso', 'completata', 'annullata',
  'bozza', 'in review', 'approvata', 'individuata',
  'uploading', 'deleting', 'error', 'in_review'
);
CREATE TYPE public.stato_individuazione AS ENUM ('individuato', 'validato', 'respinto', 'dubbioso');
CREATE TYPE public.stato_ripartizione AS ENUM ('pianificata', 'calcolata', 'approvata', 'distribuita');
CREATE TYPE public.ruolo_utente AS ENUM ('admin', 'operatore', 'artista', 'readonly');

DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END
$roles$;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  raw_app_meta_data jsonb
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT (
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.ruolo_utente
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ruolo text;
BEGIN
  SELECT u.raw_app_meta_data ->> 'ruolo'
    INTO v_ruolo
  FROM auth.users u
  WHERE u.id = auth.uid();

  IF v_ruolo IS NULL OR v_ruolo NOT IN ('admin', 'operatore', 'artista', 'readonly') THEN
    RETURN NULL;
  END IF;

  RETURN v_ruolo::public.ruolo_utente;
END;
$$;

-- Overload a un argomento citato dall'asserzione di #60: non deve
-- contenere il guard 42501. Non è fra le funzioni sotto test.
CREATE OR REPLACE FUNCTION public.delete_campagna_individuazione_safe(p_campagna_individuazione_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN jsonb_build_object('success', false, 'error_code', 'STUB');
END;
$$;

INSERT INTO auth.users (id, raw_app_meta_data)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '{"ruolo":"admin"}'::jsonb
);

CREATE TABLE public.emittenti (
  id uuid PRIMARY KEY,
  nome text NOT NULL
);

CREATE TABLE public.campagne_programmazione (
  id uuid PRIMARY KEY,
  nome character varying NOT NULL,
  descrizione text,
  emittente_id uuid,
  anno integer,
  stato public.stato_campagna,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  processing_by uuid,
  processing_started_at timestamptz,
  programmazioni_count bigint
);

CREATE TABLE public.artisti (
  id uuid PRIMARY KEY,
  codice_ipn text,
  nome character varying(100),
  cognome character varying,
  stato public.stato_iscrizione,
  imdb_nconst character varying,
  data_nascita date,
  codice_fiscale character varying,
  data_inizio_mandato date,
  data_fine_mandato date,
  created_at timestamptz
);

CREATE TABLE public.opere (
  id uuid PRIMARY KEY,
  titolo character varying(500),
  titolo_originale character varying(500),
  tipo public.tipo_opera,
  has_episodes boolean,
  anno_produzione integer,
  anno_produzione_fine integer,
  regista character varying[],
  alias_titoli text[],
  codice_isan character varying,
  imdb_tconst character varying,
  created_at timestamptz
);

CREATE TABLE public.episodi (
  id uuid PRIMARY KEY
);

CREATE TABLE public.partecipazioni (
  id uuid PRIMARY KEY
);

CREATE TABLE public.ruoli_tipologie (
  id uuid PRIMARY KEY,
  nome character varying(100)
);

CREATE TABLE public.campagne_individuazione (
  id uuid PRIMARY KEY,
  nome character varying(200),
  stato public.stato_campagna,
  campagne_programmazione_id uuid,
  statistiche jsonb,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE public.individuazioni (
  id uuid PRIMARY KEY,
  campagna_individuazioni_id uuid,
  artista_id uuid,
  opera_id uuid,
  ruolo_id uuid,
  punteggio_matching numeric,
  dettagli_matching jsonb,
  stato public.stato_individuazione,
  created_at timestamptz
);

CREATE TABLE public.campagne_ripartizione (
  id uuid PRIMARY KEY,
  stato public.stato_ripartizione,
  importo_totale_disponibile numeric
);

CREATE TABLE public.programmazioni (
  id uuid PRIMARY KEY,
  campagna_programmazione_id uuid,
  data_trasmissione date,
  ora_inizio time,
  titolo text,
  titolo_episodio text,
  processato boolean,
  created_at timestamptz
);

CREATE TABLE public.campagne_individuazione_episode_alerts (
  id uuid PRIMARY KEY,
  campagne_individuazione_id uuid,
  programmazione_id uuid,
  opera_id uuid,
  tipo_alert text,
  numero_stagione integer,
  numero_episodio integer,
  titolo text,
  titolo_originale text,
  titolo_episodio text
);

INSERT INTO public.emittenti (id, nome)
VALUES ('11111111-1111-1111-1111-111111111111', 'Rai 1');

INSERT INTO public.campagne_programmazione (
  id, nome, descrizione, emittente_id, anno, stato, created_by,
  created_at, updated_at, processing_by, processing_started_at, programmazioni_count
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Campagna prova',
  'Descrizione',
  '11111111-1111-1111-1111-111111111111',
  2026,
  'in_corso',
  '44444444-4444-4444-4444-444444444444',
  '2026-11-01 10:00:00+00',
  '2026-11-02 10:00:00+00',
  NULL,
  NULL,
  1
);

INSERT INTO public.artisti (
  id, codice_ipn, nome, cognome, stato, imdb_nconst, data_nascita,
  codice_fiscale, data_inizio_mandato, data_fine_mandato, created_at
) VALUES (
  '66666666-6666-6666-6666-666666666666',
  'IPN1', 'Ada', 'Lovelace', 'attivo', 'nm0000001', '1990-01-01',
  'RSSMRA80A01H501U', '2020-01-01', NULL, '2026-11-01 09:00:00+00'
);

INSERT INTO public.opere (
  id, titolo, titolo_originale, tipo, has_episodes, anno_produzione,
  anno_produzione_fine, regista, alias_titoli, codice_isan, imdb_tconst, created_at
) VALUES (
  '55555555-5555-5555-5555-555555555555',
  'Film prova', 'Original title', 'film', false, 2024,
  NULL, NULL, NULL, NULL, 'tt0000001', '2026-11-01 09:30:00+00'
);

INSERT INTO public.ruoli_tipologie (id, nome)
VALUES ('77777777-7777-7777-7777-777777777777', 'Attore');

INSERT INTO public.campagne_individuazione (
  id, nome, stato, campagne_programmazione_id, statistiche, created_at, updated_at
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'Run prova',
  'completata',
  '22222222-2222-2222-2222-222222222222',
  '{"programmazioni_totali":1,"programmazioni_processate":1,"programmazioni_con_match":1}'::jsonb,
  '2026-11-01 11:00:00+00',
  '2026-11-02 11:00:00+00'
);

INSERT INTO public.programmazioni (
  id, campagna_programmazione_id, data_trasmissione, ora_inizio, titolo,
  titolo_episodio, processato, created_at
) VALUES (
  '88888888-8888-8888-8888-888888888888',
  '22222222-2222-2222-2222-222222222222',
  '2026-11-03',
  '20:30',
  'Titolo palinsesto',
  'Episodio',
  true,
  '2026-11-03 20:30:00+00'
);

INSERT INTO public.individuazioni (
  id, campagna_individuazioni_id, artista_id, opera_id, ruolo_id,
  punteggio_matching, dettagli_matching, stato, created_at
) VALUES (
  '99999999-9999-9999-9999-999999999999',
  '33333333-3333-3333-3333-333333333333',
  '66666666-6666-6666-6666-666666666666',
  '55555555-5555-5555-5555-555555555555',
  '77777777-7777-7777-7777-777777777777',
  0.91,
  '{}'::jsonb,
  'individuato',
  '2026-11-03 21:00:00+00'
);

INSERT INTO public.campagne_ripartizione (id, stato, importo_totale_disponibile)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'distribuita', 12.50);

INSERT INTO public.campagne_individuazione_episode_alerts (
  id, campagne_individuazione_id, programmazione_id, opera_id, tipo_alert,
  numero_stagione, numero_episodio, titolo, titolo_originale, titolo_episodio
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '33333333-3333-3333-3333-333333333333',
  '88888888-8888-8888-8888-888888888888',
  '55555555-5555-5555-5555-555555555555',
  'catalog_episode_not_censito',
  1,
  2,
  'Titolo alert',
  'Original alert',
  'Episodio alert'
);

INSERT INTO public.episodi (id)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc');

INSERT INTO public.partecipazioni (id)
VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd');
