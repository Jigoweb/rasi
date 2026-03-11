-- Migration: Aggiunge colonna has_episodes alla tabella opere
-- Definisce se un'opera ha episodi (serie TV, animazione seriale, ecc.)
-- Separa la logica "tipo opera" dalla logica "ha episodi"

ALTER TABLE opere ADD COLUMN IF NOT EXISTS has_episodes BOOLEAN NOT NULL DEFAULT false;

-- Valorizza per non perdere lo stato attuale:
-- 1. Tutte le serie_tv hanno episodi
UPDATE opere SET has_episodes = true WHERE tipo = 'serie_tv';

-- 2. Qualsiasi opera che ha già record in episodi deve avere has_episodes = true
--    (copre animazione con episodi, serie_tv, e eventuali casi esistenti)
UPDATE opere SET has_episodes = true
WHERE id IN (SELECT DISTINCT opera_id FROM episodi);

COMMENT ON COLUMN opere.has_episodes IS 'Indica se l''opera ha episodi (serie TV, animazione seriale, ecc.)';
