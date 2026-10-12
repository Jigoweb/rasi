-- Nuovi valori enum richiesti dal cliente.
-- File separato: un valore aggiunto con ADD VALUE non è utilizzabile
-- nella stessa transazione in cui viene creato.
--   stato_iscrizione: 'minorenne' (con tutori legali), 'deceduto' (con eredi)
--   tipo_opera: 'musicale' (alert a 70 anni dalla produzione)

ALTER TYPE public.stato_iscrizione ADD VALUE IF NOT EXISTS 'minorenne';
ALTER TYPE public.stato_iscrizione ADD VALUE IF NOT EXISTS 'deceduto';
ALTER TYPE public.tipo_opera ADD VALUE IF NOT EXISTS 'musicale';
