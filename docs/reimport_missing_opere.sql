-- ============================================================
-- SCRIPT DI REIMPORTAZIONE OPERE MANCANTI
-- Generato: 2026-06-11
-- Artisti: BROWNING, LASARDO, PARÈ, SEAGAL
-- ============================================================

BEGIN;

-- ============================================================
-- BROWNING CHRISTOPHER JAY (artista_id: baa9624c-7338-45be-ad4d-6fa317f635ad)
-- Missing operas: 76
-- Missing episodes on existing operas: 0
-- ============================================================

-- Opera: THE LOST ROOM (2008)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('52dc2030-8319-4e67-b1d5-d7960a65dfee', 'THE LOST ROOM', 'THE LOST ROOM', 2008, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('ab580b63-e43f-4fb9-b791-5e555959cc4a', '52dc2030-8319-4e67-b1d5-d7960a65dfee', 1, 1, 'THE KEY AND THE CLOCK', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '52dc2030-8319-4e67-b1d5-d7960a65dfee', 'ab580b63-e43f-4fb9-b791-5e555959cc4a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: NELLA VALLE DI ELAH (2007)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('896d3987-29fd-4b21-a53d-7dabed25df97', 'NELLA VALLE DI ELAH', 'NELLA VALLE DI ELAH', 2007, 'film'::tipo_opera, '0000-0001-BEC3-0000-2-0000-0000-V', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '896d3987-29fd-4b21-a53d-7dabed25df97', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: WILDFIRE (2008)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('64b89f97-d8ed-49ee-9b98-55c86a3d2817', 'WILDFIRE', 'WILDFIRE', 2008, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('27dec14f-39ca-4376-84b0-33a1cce38b70', '64b89f97-d8ed-49ee-9b98-55c86a3d2817', 4, 1, 'THE MORE THINGS CHANGE: PART 1', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '64b89f97-d8ed-49ee-9b98-55c86a3d2817', '27dec14f-39ca-4376-84b0-33a1cce38b70', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: LINEWATCH - LA SCELTA (2008)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('ac1c46a4-303c-4fac-af5b-53c7fbf47201', 'LINEWATCH - LA SCELTA', 'LINEWATCH', 2008, 'film'::tipo_opera, '0000-0001-DA00-0000-F-0000-0000-T', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'ac1c46a4-303c-4fac-af5b-53c7fbf47201', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: CLAIM 24: A DARK FAIRYTALE (2008)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('9b426ad0-9174-4291-a2f7-c7d0c2abaf1b', 'CLAIM 24: A DARK FAIRYTALE', 'CLAIM 24: A DARK FAIRYTALE', 2008, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '9b426ad0-9174-4291-a2f7-c7d0c2abaf1b', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: SHOOT FIRST AND PRAY YOU LIVE (BECAUSE LUCK HAS NOTHING TO DO WITH IT) (2008)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('49636092-08e3-4101-90da-bfe542d27898', 'SHOOT FIRST AND PRAY YOU LIVE (BECAUSE LUCK HAS NOTHING TO DO WITH IT)', 'SHOOT FIRST AND PRAY YOU LIVE (BECAUSE LUCK HAS NOTHING TO DO WITH IT)', 2008, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '49636092-08e3-4101-90da-bfe542d27898', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: TERMINATOR SALVATION (2009)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('4cec4b49-7443-4b87-99ed-4f6b1e7d4de6', 'TERMINATOR SALVATION', 'TERMINATOR SALVATION', 2009, 'film'::tipo_opera, '0000-0001-EE66-0000-P-0000-0000-0', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '4cec4b49-7443-4b87-99ed-4f6b1e7d4de6', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: IN PLAIN SIGHT - PROTEZIONE TESTIMONI (2009)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('e2ccde69-c9a3-42e9-bd2c-d958e58c27a1', 'IN PLAIN SIGHT - PROTEZIONE TESTIMONI', 'IN PLAIN SIGHT', 2009, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('2b68d850-44c4-4964-bcb5-d482536b6f80', 'e2ccde69-c9a3-42e9-bd2c-d958e58c27a1', 2, 8, 'A FROND IN NEED', '0000-0002-8D05-000F-O-0000-0000-2', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'e2ccde69-c9a3-42e9-bd2c-d958e58c27a1', '2b68d850-44c4-4964-bcb5-d482536b6f80', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: EASY MONEY (2008)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('89e6a2b5-ad2d-4efe-88b8-c95b37a45476', 'EASY MONEY', 'EASY MONEY', 2008, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('8032c6e3-244f-4672-8f99-331af577acb3', '89e6a2b5-ad2d-4efe-88b8-c95b37a45476', 1, 1, 'DNA', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '89e6a2b5-ad2d-4efe-88b8-c95b37a45476', '8032c6e3-244f-4672-8f99-331af577acb3', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('4ec34d56-d612-4f07-8d21-0c1ff5d6eccc', '89e6a2b5-ad2d-4efe-88b8-c95b37a45476', 1, 2, 'SUB-PRIME', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '89e6a2b5-ad2d-4efe-88b8-c95b37a45476', '4ec34d56-d612-4f07-8d21-0c1ff5d6eccc', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('452978cd-de5b-4843-adc2-783879c22d3f', '89e6a2b5-ad2d-4efe-88b8-c95b37a45476', 1, 3, 'COLLATERAL DAMAGE', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '89e6a2b5-ad2d-4efe-88b8-c95b37a45476', '452978cd-de5b-4843-adc2-783879c22d3f', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('2fdb1ce4-f22a-4b00-8b1d-200f1cc4d311', '89e6a2b5-ad2d-4efe-88b8-c95b37a45476', 1, 4, 'CHOCK FULL O''NUTS', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '89e6a2b5-ad2d-4efe-88b8-c95b37a45476', '2fdb1ce4-f22a-4b00-8b1d-200f1cc4d311', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: EASY MONEY (2009)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('8696cf93-499b-406e-a420-fe835ace5d53', 'EASY MONEY', 'EASY MONEY', 2009, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('bab767ea-d019-46cf-abcd-98548c036505', '8696cf93-499b-406e-a420-fe835ace5d53', 1, 5, 'EXTRA MAYO', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '8696cf93-499b-406e-a420-fe835ace5d53', 'bab767ea-d019-46cf-abcd-98548c036505', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('c07030bb-b7bc-4ab8-8cd8-a0c12ed3093d', '8696cf93-499b-406e-a420-fe835ace5d53', 1, 8, 'BAGS, BANGLES AND BOOTY', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '8696cf93-499b-406e-a420-fe835ace5d53', 'c07030bb-b7bc-4ab8-8cd8-a0c12ed3093d', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: COLD CASE - DELITTI IRRISOLTI (2009)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('cbe40131-69e6-4c3c-a8cf-22e864c7fcd0', 'COLD CASE - DELITTI IRRISOLTI', 'COLD CASE', 2009, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('949dec34-94da-44c2-bcea-a7b7a11dd908', 'cbe40131-69e6-4c3c-a8cf-22e864c7fcd0', 7, 2, 'HOOD RATS', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'cbe40131-69e6-4c3c-a8cf-22e864c7fcd0', '949dec34-94da-44c2-bcea-a7b7a11dd908', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: DARK COUNTRY (2009)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('5929bcbe-26fb-428b-bf17-24472c0b4069', 'DARK COUNTRY', 'THE DARK COUNTRY', 2009, 'film'::tipo_opera, '0000-0001-DE0B-0000-2-0000-0000-V', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '5929bcbe-26fb-428b-bf17-24472c0b4069', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: CODICE GENESI (2010)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('e3037cce-4d37-46c8-b466-1464ab56a68b', 'CODICE GENESI', 'THE BOOK OF ELI', 2010, 'film'::tipo_opera, '0000-0002-63EE-0000-I-0000-0000-K', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'e3037cce-4d37-46c8-b466-1464ab56a68b', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: FRIENDSHIP! (2010)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('684b1eb9-8785-4793-bce7-e3d1ef7de821', 'FRIENDSHIP!', 'FRIENDSHIP!', 2010, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '684b1eb9-8785-4793-bce7-e3d1ef7de821', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: WAKE (2010)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('163335ef-f1f2-49c0-a010-b5c33336fd08', 'WAKE', 'BENEATH THE DARK', 2010, 'film'::tipo_opera, '0000-0003-AF54-0000-U-0000-0000-L', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '163335ef-f1f2-49c0-a010-b5c33336fd08', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: SCOUNDRELS (2010)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('704a3a02-9a8c-47f1-be60-3997de546b46', 'SCOUNDRELS', 'SCOUNDRELS', 2010, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('c4b7587a-1b34-46c7-a49b-e61084f5760a', '704a3a02-9a8c-47f1-be60-3997de546b46', 1, 4, 'WHERE HAVE YOU BEEN, CHARMING BILLY?', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '704a3a02-9a8c-47f1-be60-3997de546b46', 'c4b7587a-1b34-46c7-a49b-e61084f5760a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: PASSION PLAY (2010)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('e5c743bf-259b-4399-85f9-6d2649eb933e', 'PASSION PLAY', 'PASSION PLAY', 2010, 'film'::tipo_opera, '0000-0004-E11E-0000-R-0000-0000-U', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'e5c743bf-259b-4399-85f9-6d2649eb933e', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: BLOOD STORY (2010)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('1aeffcb4-0b61-433b-ae01-3242847bc9ea', 'BLOOD STORY', 'LET ME IN', 2010, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '1aeffcb4-0b61-433b-ae01-3242847bc9ea', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: THE PURPLE HAT (2010)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('4fb0221f-88d2-4660-b6f2-1a86a0e1bd2a', 'THE PURPLE HAT', 'THE PURPLE HAT', 2010, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '4fb0221f-88d2-4660-b6f2-1a86a0e1bd2a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: COWBOYS & ALIENS (2011)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('6d2c3581-c949-4778-84d0-49ee2c62d67c', 'COWBOYS & ALIENS', 'COWBOYS & ALIENS', 2011, 'film'::tipo_opera, '0000-0002-E463-0000-X-0000-0000-C', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '6d2c3581-c949-4778-84d0-49ee2c62d67c', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: IL RISOLUTORE (2012)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('23bbddc5-cb6a-474e-8224-3b0e0d84055a', 'IL RISOLUTORE', 'THE FINDER', 2012, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('678b476d-055a-47b0-92f8-7540b0357fa8', '23bbddc5-cb6a-474e-8224-3b0e0d84055a', 1, 11, 'THE INHERITANCE', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '23bbddc5-cb6a-474e-8224-3b0e0d84055a', '678b476d-055a-47b0-92f8-7540b0357fa8', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: PHILLY KID (2012)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('eb3ec2a1-ff86-434c-b2f3-966dc40b9e8a', 'PHILLY KID', 'THE PHILLY KID', 2012, 'film'::tipo_opera, '0000-0003-7842-0000-J-0000-0000-H', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'eb3ec2a1-ff86-434c-b2f3-966dc40b9e8a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: SONS OF ANARCHY (2012)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('f8c3e70b-7be0-4ffe-b6c0-f45e64e7f8e0', 'SONS OF ANARCHY', 'SONS OF ANARCHY', 2012, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('b3f3c407-c560-4945-bb3a-003490c74f50', 'f8c3e70b-7be0-4ffe-b6c0-f45e64e7f8e0', 5, 1, 'SOVEREIGN', '0000-0002-2409-0048-5-0000-0000-M', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'f8c3e70b-7be0-4ffe-b6c0-f45e64e7f8e0', 'b3f3c407-c560-4945-bb3a-003490c74f50', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('fd4db14e-514b-4295-8530-d76d2887fdb3', 'f8c3e70b-7be0-4ffe-b6c0-f45e64e7f8e0', 5, 2, 'AUTHORITY VESTED', '0000-0002-2409-0049-3-0000-0000-S', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'f8c3e70b-7be0-4ffe-b6c0-f45e64e7f8e0', 'fd4db14e-514b-4295-8530-d76d2887fdb3', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('ee7c5fe5-8b1d-452d-aa2d-cad57ea89e5a', 'f8c3e70b-7be0-4ffe-b6c0-f45e64e7f8e0', 5, 3, 'LAYING PIPE', '0000-0002-2409-004A-1-0000-0000-Y', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'f8c3e70b-7be0-4ffe-b6c0-f45e64e7f8e0', 'ee7c5fe5-8b1d-452d-aa2d-cad57ea89e5a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('00ad66d9-a3ed-4b16-8fbe-5c86a3639b31', 'f8c3e70b-7be0-4ffe-b6c0-f45e64e7f8e0', 5, 4, 'STOLEN HUFFY', '0000-0002-2409-004B-0-0000-0000-3', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'f8c3e70b-7be0-4ffe-b6c0-f45e64e7f8e0', '00ad66d9-a3ed-4b16-8fbe-5c86a3639b31', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('223a96b5-b4b7-48a2-91cd-6f8158128e52', 'f8c3e70b-7be0-4ffe-b6c0-f45e64e7f8e0', 5, 5, 'ORCA SHRUGGED', '0000-0002-2409-004C-Y-0000-0000-9', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'f8c3e70b-7be0-4ffe-b6c0-f45e64e7f8e0', '223a96b5-b4b7-48a2-91cd-6f8158128e52', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('e03c2b0b-5bd9-44b7-9e03-241cf20aa616', 'f8c3e70b-7be0-4ffe-b6c0-f45e64e7f8e0', 5, 6, 'SMALL WORLD', '0000-0002-2409-004D-W-0000-0000-F', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'f8c3e70b-7be0-4ffe-b6c0-f45e64e7f8e0', 'e03c2b0b-5bd9-44b7-9e03-241cf20aa616', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('712fbe7d-5305-43e5-992f-54acacbc2c70', 'f8c3e70b-7be0-4ffe-b6c0-f45e64e7f8e0', 5, 7, 'TOAD''S WILD RIDE', '0000-0002-2409-004E-U-0000-0000-L', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'f8c3e70b-7be0-4ffe-b6c0-f45e64e7f8e0', '712fbe7d-5305-43e5-992f-54acacbc2c70', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: THE LAST STAND - L'ULTIMA SFIDA (2013)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('cac907d1-e0df-4212-ba98-0b2100114ce2', 'THE LAST STAND - L''ULTIMA SFIDA', 'THE LAST STAND', 2013, 'film'::tipo_opera, '0000-0003-701F-0000-M-0000-0000-8', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'cac907d1-e0df-4212-ba98-0b2100114ce2', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: THE BRIDGE (2013)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('f8171fee-bb77-470c-a3d9-1366af038bea', 'THE BRIDGE', 'THE BRIDGE', 2013, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('b67f172d-a5c6-450f-ba33-6f6fabb1259c', 'f8171fee-bb77-470c-a3d9-1366af038bea', 1, 7, 'DESTINO', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'f8171fee-bb77-470c-a3d9-1366af038bea', 'b67f172d-a5c6-450f-ba33-6f6fabb1259c', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('6a027546-a26e-4839-8910-92221114744c', 'f8171fee-bb77-470c-a3d9-1366af038bea', 1, 8, 'VENDETTA', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'f8171fee-bb77-470c-a3d9-1366af038bea', '6a027546-a26e-4839-8910-92221114744c', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: THE WELL (2013)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('e76b632d-2af7-4687-b6ea-5f2175693a70', 'THE WELL', 'THE WELL', 2013, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'e76b632d-2af7-4687-b6ea-5f2175693a70', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: ROMULUS (2013)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('2907e296-3477-46e3-bc2f-0295578a9894', 'ROMULUS', 'ROMULUS', 2013, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '2907e296-3477-46e3-bc2f-0295578a9894', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: BONES (2014)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('b78d07d4-8a40-490a-9e02-e481aaffe3cc', 'BONES', 'BONES', 2014, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('37fc7e71-f62e-4a11-92ff-ee72432ce26d', 'b78d07d4-8a40-490a-9e02-e481aaffe3cc', 9, 16, 'THE SOURCE IN THE SLUDGE', '0000-0002-2B79-00C3-C-0000-0000-1', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'b78d07d4-8a40-490a-9e02-e481aaffe3cc', '37fc7e71-f62e-4a11-92ff-ee72432ce26d', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: ROAD TO PALOMA (2014)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('ed3d8e7b-ae55-4eaa-873c-bafcff62dfaa', 'ROAD TO PALOMA', 'ROAD TO PALOMA', 2014, 'film'::tipo_opera, '0000-0004-E1BC-0000-G-0000-0000-Q', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'ed3d8e7b-ae55-4eaa-873c-bafcff62dfaa', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: CASTLE (2014)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('8a45d71b-9249-404c-905b-fc4fd6531c95', 'CASTLE', 'CASTLE', 2014, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('c67b52b7-643e-4231-8f56-40101eeffa65', '8a45d71b-9249-404c-905b-fc4fd6531c95', 6, 23, 'FOR BETTER OR WORSE', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '8a45d71b-9249-404c-905b-fc4fd6531c95', 'c67b52b7-643e-4231-8f56-40101eeffa65', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: GRACELAND (2014)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('db720838-8b04-4a02-858c-a07d506afc40', 'GRACELAND', 'GRACELAND', 2014, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('40726d51-2bd0-425f-a463-d9f59d0f129c', 'db720838-8b04-4a02-858c-a07d506afc40', 2, 8, 'THE ENDS', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'db720838-8b04-4a02-858c-a07d506afc40', '40726d51-2bd0-425f-a463-d9f59d0f129c', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('239c1f20-7219-441d-90ef-beae2e5acbad', 'db720838-8b04-4a02-858c-a07d506afc40', 2, 13, 'FAITH 7', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'db720838-8b04-4a02-858c-a07d506afc40', '239c1f20-7219-441d-90ef-beae2e5acbad', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: MERCY (2014)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('0f480e77-0aaf-4575-b676-7d3847d0036f', 'MERCY', 'MERCY', 2014, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '0f480e77-0aaf-4575-b676-7d3847d0036f', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: CSI - SCENA DEL CRIMINE (2014)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('c498887b-52e8-48d6-94ba-098de79f7ca4', 'CSI - SCENA DEL CRIMINE', 'CSI: CRIME SCENE INVESTIGATION', 2014, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('ede18a7f-03b3-42df-ab93-b28b525aaca5', 'c498887b-52e8-48d6-94ba-098de79f7ca4', 15, 7, 'ROAD TO RECOVERY', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'c498887b-52e8-48d6-94ba-098de79f7ca4', 'ede18a7f-03b3-42df-ab93-b28b525aaca5', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: HIDDEN IN THE WOODS (2014)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('ca302e04-980b-4cb9-8eae-860eee0d67f4', 'HIDDEN IN THE WOODS', 'HIDDEN IN THE WOODS', 2014, 'film'::tipo_opera, '0000-0003-B1F4-0000-S-0000-0000-R', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'ca302e04-980b-4cb9-8eae-860eee0d67f4', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: JOKER - WILD CARD (2015)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('806f3a62-128f-4e15-915b-ec4f2dc617a4', 'JOKER - WILD CARD', 'WILD CARD', 2015, 'film'::tipo_opera, '0000-0003-EDE3-0000-3-0000-0000-S', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '806f3a62-128f-4e15-915b-ec4f2dc617a4', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: THE COURIER (2015)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('e363e6fe-ba64-44a8-89d4-d374fe77ab2f', 'THE COURIER', 'THE COURIER', 2015, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'e363e6fe-ba64-44a8-89d4-d374fe77ab2f', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: RAY DONOVAN (2015)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('4a216b27-2f60-4370-90dd-94f6e1b202be', 'RAY DONOVAN', 'RAY DONOVAN', 2015, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('d387137d-ccda-4566-a61f-04445c4701d2', '4a216b27-2f60-4370-90dd-94f6e1b202be', 3, 1, 'THE KALAMAZOO', '0000-0003-9F04-0021-E-0000-0000-W', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '4a216b27-2f60-4370-90dd-94f6e1b202be', 'd387137d-ccda-4566-a61f-04445c4701d2', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: MAJOR CRIMES (2015)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('aaf18358-2521-4852-abbf-baea17677e63', 'MAJOR CRIMES', 'MAJOR CRIMES', 2015, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('8834af23-8595-4324-91c1-121222f39c48', 'aaf18358-2521-4852-abbf-baea17677e63', 4, 7, 'TARGETS OF OPPORTUNITY', '0000-0006-25FE-001F-O-0000-0000-2', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'aaf18358-2521-4852-abbf-baea17677e63', '8834af23-8595-4324-91c1-121222f39c48', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: DAL TRAMONTO ALL'ALBA - LA SERIE (2015)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('61851ea0-cdbf-467d-8b6e-aaf44c512fe3', 'DAL TRAMONTO ALL''ALBA - LA SERIE', 'FROM DUSK TILL DAWN: THE SERIES', 2015, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('6bb5b0a1-9cab-4e1d-aa5a-da8b20bea70d', '61851ea0-cdbf-467d-8b6e-aaf44c512fe3', 2, 3, 'ATTACK OF THE 50-FT. SEX MACHINE', '0000-0004-70DF-000D-Q-0000-0000-X', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '61851ea0-cdbf-467d-8b6e-aaf44c512fe3', '6bb5b0a1-9cab-4e1d-aa5a-da8b20bea70d', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('1ef94376-3984-49ab-8713-b352769587c3', '61851ea0-cdbf-467d-8b6e-aaf44c512fe3', 2, 4, 'THE BEST LITTLE HORROR HOUSE IN TEXAS', '0000-0004-70DF-000E-O-0000-0000-2', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '61851ea0-cdbf-467d-8b6e-aaf44c512fe3', '1ef94376-3984-49ab-8713-b352769587c3', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('3d12bfa2-d17b-478c-b3b6-dc980d3f597b', '61851ea0-cdbf-467d-8b6e-aaf44c512fe3', 2, 5, 'BONDAGE', '0000-0004-70DF-000F-M-0000-0000-8', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '61851ea0-cdbf-467d-8b6e-aaf44c512fe3', '3d12bfa2-d17b-478c-b3b6-dc980d3f597b', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: OPERATION: NEIGHBORHOOD WATCH! (2015)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('20cb0708-b639-4602-bee4-550be910eb2f', 'OPERATION: NEIGHBORHOOD WATCH!', 'OPERATION: NEIGHBORHOOD WATCH!', 2015, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '20cb0708-b639-4602-bee4-550be910eb2f', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: LIFT ME UP (2015)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('f1b586cd-0c8d-4ad1-94bf-8f3fa4519a39', 'LIFT ME UP', 'LIFT ME UP', 2015, 'film'::tipo_opera, '0000-0005-522E-0000-J-0000-0000-H', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'f1b586cd-0c8d-4ad1-94bf-8f3fa4519a39', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: SUPERGIRL (2015)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('176158ca-8335-4f9f-8355-47c0d0c393d7', 'SUPERGIRL', 'SUPERGIRL', 2015, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('c395af4d-dc50-4201-9c3c-f789bef9d5f6', '176158ca-8335-4f9f-8355-47c0d0c393d7', 1, 3, 'FIGHT OR FLIGHT', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '176158ca-8335-4f9f-8355-47c0d0c393d7', 'c395af4d-dc50-4201-9c3c-f789bef9d5f6', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: AGENT CARTER (2016)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('68d44793-4fc7-4b8b-8548-7758371b3ccb', 'AGENT CARTER', 'AGENT CARTER', 2016, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('925cf8c6-fee0-4bb4-ad2b-e8d99e0a4e35', '68d44793-4fc7-4b8b-8548-7758371b3ccb', 2, 2, 'A VIEW IN THE DARK', '0000-0006-F4C0-0010-R-0000-0000-U', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '68d44793-4fc7-4b8b-8548-7758371b3ccb', '925cf8c6-fee0-4bb4-ad2b-e8d99e0a4e35', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('7c8d65eb-d50f-40d5-9437-7318e9bc7933', '68d44793-4fc7-4b8b-8548-7758371b3ccb', 2, 3, 'BETTER ANGELS', '0000-0006-F4C0-0009-D-0000-0000-Z', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '68d44793-4fc7-4b8b-8548-7758371b3ccb', '7c8d65eb-d50f-40d5-9437-7318e9bc7933', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('00fe3520-5d9b-4641-bea5-34282c3f3a8e', '68d44793-4fc7-4b8b-8548-7758371b3ccb', 2, 4, 'SMOKE & MIRRORS', '0000-0006-F4C0-0011-P-0000-0000-0', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '68d44793-4fc7-4b8b-8548-7758371b3ccb', '00fe3520-5d9b-4641-bea5-34282c3f3a8e', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: WESTWORLD - DOVE TUTTO È CONCESSO (2016)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('de8a7994-ff46-497d-a8d9-b7dd208e34b7', 'WESTWORLD - DOVE TUTTO È CONCESSO', 'WESTWORLD', 2016, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('33c3e4b7-5c23-462e-8ab5-448bd8def847', 'de8a7994-ff46-497d-a8d9-b7dd208e34b7', 1, 3, 'THE STRAY', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'de8a7994-ff46-497d-a8d9-b7dd208e34b7', '33c3e4b7-5c23-462e-8ab5-448bd8def847', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('c2aea687-ec64-47e1-8eb0-416372d338c1', 'de8a7994-ff46-497d-a8d9-b7dd208e34b7', 1, 4, 'DISSONANCE THEORY', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'de8a7994-ff46-497d-a8d9-b7dd208e34b7', 'c2aea687-ec64-47e1-8eb0-416372d338c1', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: TIMELESS (2016)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('ad7d6a7e-beac-4666-8972-6fd058c7ea95', 'TIMELESS', 'TIMELESS', 2016, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('a25eb826-b464-476f-a747-b96db2968332', 'ad7d6a7e-beac-4666-8972-6fd058c7ea95', 1, 5, 'THE ALAMO', '0000-0004-5A7B-0005-D-0000-0000-Z', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'ad7d6a7e-beac-4666-8972-6fd058c7ea95', 'a25eb826-b464-476f-a747-b96db2968332', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: THE BLACK RIDERS (2016)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('da073ee0-cd7e-4035-9bc8-7c13e6104448', 'THE BLACK RIDERS', 'THE BLACK RIDERS', 2016, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'da073ee0-cd7e-4035-9bc8-7c13e6104448', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: LA FRATELLANZA (2017)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('8046beae-6337-4fce-a72d-e73011ecb4e6', 'LA FRATELLANZA', 'SHOT CALLER', 2017, 'film'::tipo_opera, '0000-0004-9150-0000-J-0000-0000-H', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '8046beae-6337-4fce-a72d-e73011ecb4e6', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: LAST RAMPAGE: THE ESCAPE OF GARY TISON (2017)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('0aafd3fb-39d6-467b-b22d-0dbde25ca941', 'LAST RAMPAGE: THE ESCAPE OF GARY TISON', 'LAST RAMPAGE: THE ESCAPE OF GARY TISON', 2017, 'film'::tipo_opera, '0000-0005-54AB-0000-I-0000-0000-K', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '0aafd3fb-39d6-467b-b22d-0dbde25ca941', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: BRIGHT (2017)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('1db56766-d469-4080-a926-a8e831fdc552', 'BRIGHT', 'BRIGHT', 2017, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '1db56766-d469-4080-a926-a8e831fdc552', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: SEARCHERS (2017)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('c4604d74-a151-4dbc-95a0-364c1690ab99', 'SEARCHERS', 'SEARCHERS', 2017, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'c4604d74-a151-4dbc-95a0-364c1690ab99', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: IL COMBATTENTE - DONNYBROOK (2018)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('c10d0f40-1c5e-48d6-9f0f-98484d4b7314', 'IL COMBATTENTE - DONNYBROOK', 'DONNYBROOK', 2018, 'film'::tipo_opera, '0000-0004-CF9A-0000-S-0000-0000-R', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'c10d0f40-1c5e-48d6-9f0f-98484d4b7314', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: SOLO MIA (2019)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('1fa4ff1d-7293-49d7-90a2-a25bb843d513', 'SOLO MIA', 'ONLY MINE', 2019, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '1fa4ff1d-7293-49d7-90a2-a25bb843d513', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: BOSCH (2019)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('bdec8e57-4664-4118-825a-f9ea4c283dbe', 'BOSCH', 'BOSCH', 2019, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('dcdb7bc5-24fc-4aa4-927c-7135fe6b5704', 'bdec8e57-4664-4118-825a-f9ea4c283dbe', 5, 1, 'TWO KINDS OF TRUTH', '0000-0007-8F0C-0029-2-0000-0000-V', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'bdec8e57-4664-4118-825a-f9ea4c283dbe', 'dcdb7bc5-24fc-4aa4-927c-7135fe6b5704', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('b05da70a-ff7e-4373-8d7f-b67c2ebf55b1', 'bdec8e57-4664-4118-825a-f9ea4c283dbe', 5, 5, 'TUNNEL VISION', '0000-0007-8F0C-002B-X-0000-0000-C', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'bdec8e57-4664-4118-825a-f9ea4c283dbe', 'b05da70a-ff7e-4373-8d7f-b67c2ebf55b1', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('184034a6-45ba-453f-a3a8-e73d0a51e9f5', 'bdec8e57-4664-4118-825a-f9ea4c283dbe', 5, 6, 'THE SPACE BETWEEN THE STARS', '0000-0007-8F0C-0031-E-0000-0000-W', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'bdec8e57-4664-4118-825a-f9ea4c283dbe', '184034a6-45ba-453f-a3a8-e73d0a51e9f5', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('ce04e9c8-7818-4f91-afee-4a807ece8c91', 'bdec8e57-4664-4118-825a-f9ea4c283dbe', 5, 7, 'THE WISDOM OF THE DESERT', '0000-0007-8F0C-0032-C-0000-0000-1', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'bdec8e57-4664-4118-825a-f9ea4c283dbe', 'ce04e9c8-7818-4f91-afee-4a807ece8c91', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('9f7c8fe4-8a3b-4125-9002-47713c61676a', 'bdec8e57-4664-4118-825a-f9ea4c283dbe', 5, 9, 'HOLD BACK THE NIGHT', '0000-0007-8F0C-0030-G-0000-0000-Q', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'bdec8e57-4664-4118-825a-f9ea4c283dbe', '9f7c8fe4-8a3b-4125-9002-47713c61676a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: THE 100 (2014)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('8e854167-8888-44f8-8d8d-effd08f41a58', 'THE 100', 'THE 100', 2014, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('b4540e09-901c-44e6-add4-ce3cb98ef2c5', '8e854167-8888-44f8-8d8d-effd08f41a58', 1, 3, 'EARTH KILLS', '0000-0007-69B8-0023-P-0000-0000-0', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '8e854167-8888-44f8-8d8d-effd08f41a58', 'b4540e09-901c-44e6-add4-ce3cb98ef2c5', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('691c9b55-7db6-4f63-b41d-5a8f61c081f3', '8e854167-8888-44f8-8d8d-effd08f41a58', 1, 8, 'DAY TRIP', '0000-0007-69B8-0028-F-0000-0000-T', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '8e854167-8888-44f8-8d8d-effd08f41a58', '691c9b55-7db6-4f63-b41d-5a8f61c081f3', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('83e7bcb4-e6db-4ade-8c12-7a269c8b7753', '8e854167-8888-44f8-8d8d-effd08f41a58', 6, 7, 'NEVERMIND', '0000-0007-69B8-0061-D-0000-0000-Z', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '8e854167-8888-44f8-8d8d-effd08f41a58', '83e7bcb4-e6db-4ade-8c12-7a269c8b7753', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: GREENLIGHT (2019)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('025fe822-aad5-4b82-a322-b4d70b84c2da', 'GREENLIGHT', 'GREENLIGHT', 2019, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '025fe822-aad5-4b82-a322-b4d70b84c2da', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: CLARITY (2020)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('f58b8d57-dd68-4ff4-9027-a5381605708b', 'CLARITY', 'CLARITY', 2020, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'f58b8d57-dd68-4ff4-9027-a5381605708b', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: THE UNHEALER - IL POTERE DEL MALE (2020)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('e32f464b-7c88-49bf-8080-13d067911401', 'THE UNHEALER - IL POTERE DEL MALE', 'THE UNHEALER', 2020, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'e32f464b-7c88-49bf-8080-13d067911401', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: THE TUTOR (2021)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('a9b423f9-7b16-4281-85cf-27c6be1cea17', 'THE TUTOR', 'THE TUTOR', 2021, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'a9b423f9-7b16-4281-85cf-27c6be1cea17', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: TAKE BACK (2021)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('32f6bd0c-936e-4f3d-a7bc-b22cc5a6b2b6', 'TAKE BACK', 'TAKE BACK', 2021, 'film'::tipo_opera, '0000-0006-3DF7-0000-B-0000-0000-4', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '32f6bd0c-936e-4f3d-a7bc-b22cc5a6b2b6', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: S.W.A.T. (2021)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('29ce8fb3-f8ba-45b8-be87-12df212b4562', 'S.W.A.T.', 'S.W.A.T.', 2021, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('9626bbe7-d22e-4e02-a4ba-2ca857416366', '29ce8fb3-f8ba-45b8-be87-12df212b4562', 4, 13, 'SINS OF THE FATHERS', '0000-0004-CA67-0050-B-0000-0000-4', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '29ce8fb3-f8ba-45b8-be87-12df212b4562', '9626bbe7-d22e-4e02-a4ba-2ca857416366', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: WHY? (2021)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('b2d04de3-41e0-4c60-9b04-6dc0a5a33efd', 'WHY?', 'WHY?', 2021, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'b2d04de3-41e0-4c60-9b04-6dc0a5a33efd', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: NCIS - UNITÀ ANTICRIMINE (2021)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('dd0f2d8f-c970-49d7-a376-607c159fc0e8', 'NCIS - UNITÀ ANTICRIMINE', 'NCIS: NAVAL CRIMINAL INVESTIGATIVE SERVICE', 2021, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('3a0aaed1-154e-4f10-a948-c22c1a3a293d', 'dd0f2d8f-c970-49d7-a376-607c159fc0e8', 18, 15, 'BLOWN AWAY', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'dd0f2d8f-c970-49d7-a376-607c159fc0e8', '3a0aaed1-154e-4f10-a948-c22c1a3a293d', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: AGNES (2021)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('c88475f5-5e95-4144-bd5f-8a91e15de08d', 'AGNES', 'AGNES', 2021, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'c88475f5-5e95-4144-bd5f-8a91e15de08d', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: ESCAPE FROM AREA 51 (2021)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('aa44bdce-7363-4143-bfee-4468db8fba57', 'ESCAPE FROM AREA 51', 'ESCAPE FROM AREA 51', 2021, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'aa44bdce-7363-4143-bfee-4468db8fba57', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: DARK WOODS (2021)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('93cb3d5c-c0d5-4a8e-9dbd-c838f43c1625', 'DARK WOODS', 'DARK WOODS', 2021, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('d897cc1b-63d4-44dd-92a8-612672b780af', '93cb3d5c-c0d5-4a8e-9dbd-c838f43c1625', 1, 2, 'UPSTREAM', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '93cb3d5c-c0d5-4a8e-9dbd-c838f43c1625', 'd897cc1b-63d4-44dd-92a8-612672b780af', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('2903c4be-47e0-46cf-8f52-a510561a49d5', '93cb3d5c-c0d5-4a8e-9dbd-c838f43c1625', 1, 3, 'EULOGY', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '93cb3d5c-c0d5-4a8e-9dbd-c838f43c1625', '2903c4be-47e0-46cf-8f52-a510561a49d5', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: CSI: VEGAS (2022)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('48d4f3f8-3148-4798-84ad-8509c256d0ba', 'CSI: VEGAS', 'CSI - VEGAS', 2022, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('6dbe44d3-9534-49d2-86c4-cf44c0028a06', '48d4f3f8-3148-4798-84ad-8509c256d0ba', 1, 7, 'IN THE BLOOD', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '48d4f3f8-3148-4798-84ad-8509c256d0ba', '6dbe44d3-9534-49d2-86c4-cf44c0028a06', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: NATIONAL TREASURE: EDGE OF HISTORY (2022)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('5ba6aa79-5fbd-4852-85d0-058e870115ef', 'NATIONAL TREASURE: EDGE OF HISTORY', 'NATIONAL TREASURE: EDGE OF HISTORY', 2022, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('dc64f8a8-26ee-499e-ba06-8440cf0ed2f2', '5ba6aa79-5fbd-4852-85d0-058e870115ef', 1, 2, 'THE TREASURE MAP', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '5ba6aa79-5fbd-4852-85d0-058e870115ef', 'dc64f8a8-26ee-499e-ba06-8440cf0ed2f2', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: NATIONAL TREASURE: EDGE OF HISTORY (2023)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('d6f963fb-476c-4536-a837-43f9eb20acb1', 'NATIONAL TREASURE: EDGE OF HISTORY', 'NATIONAL TREASURE: EDGE OF HISTORY', 2023, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('5f47ef40-db03-4848-90ad-85c9ed808ded', 'd6f963fb-476c-4536-a837-43f9eb20acb1', 1, 7, 'POINT OF NO RETURN', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'd6f963fb-476c-4536-a837-43f9eb20acb1', '5f47ef40-db03-4848-90ad-85c9ed808ded', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: INVITO A UN OMICIDIO (2023)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('06f2ac7a-567e-4778-833c-4a4de38fe546', 'INVITO A UN OMICIDIO', 'INVITATION TO A MURDER', 2023, 'film'::tipo_opera, '0000-0006-DAAA-0000-R-0000-0000-U', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '06f2ac7a-567e-4778-833c-4a4de38fe546', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: AVVOCATO DI DIFESA (2022)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('e92de126-9157-428b-9725-62a6c4911aa8', 'AVVOCATO DI DIFESA', 'THE LINCOLN LAWYER', 2022, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('6f8448ec-3222-43ae-87b9-41c0d701b5dc', 'e92de126-9157-428b-9725-62a6c4911aa8', 1, 5, 'TWELVE LEMMINGS IN A BOX', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'e92de126-9157-428b-9725-62a6c4911aa8', '6f8448ec-3222-43ae-87b9-41c0d701b5dc', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('58b00028-fd65-4f70-957f-3b51f09a0435', 'e92de126-9157-428b-9725-62a6c4911aa8', 1, 7, 'LEMMING NUMBER SEVEN', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'e92de126-9157-428b-9725-62a6c4911aa8', '58b00028-fd65-4f70-957f-3b51f09a0435', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('1831f9bf-c2bc-4344-bcf5-1e0dba3c38ad', 'e92de126-9157-428b-9725-62a6c4911aa8', 1, 10, 'THE BRASS VERDICT', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'e92de126-9157-428b-9725-62a6c4911aa8', '1831f9bf-c2bc-4344-bcf5-1e0dba3c38ad', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: AVVOCATO DI DIFESA (2023)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('1de29011-6356-4c7e-8aff-ca5511afdda1', 'AVVOCATO DI DIFESA', 'THE LINCOLN LAWYER', 2023, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('68b0261b-0304-4401-885a-f9a2e205b77a', '1de29011-6356-4c7e-8aff-ca5511afdda1', 2, 1, 'THE RULES OF PROFESSIONAL CONDUCT', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '1de29011-6356-4c7e-8aff-ca5511afdda1', '68b0261b-0304-4401-885a-f9a2e205b77a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('7082798e-bb83-4edf-b9fa-99dc642dfa52', '1de29011-6356-4c7e-8aff-ca5511afdda1', 2, 2, 'OBLIGATIONS', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '1de29011-6356-4c7e-8aff-ca5511afdda1', '7082798e-bb83-4edf-b9fa-99dc642dfa52', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('174dda0f-968d-46cf-b919-02b317aa24a4', '1de29011-6356-4c7e-8aff-ca5511afdda1', 2, 5, 'SUSPICIOUS MINDS', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '1de29011-6356-4c7e-8aff-ca5511afdda1', '174dda0f-968d-46cf-b919-02b317aa24a4', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: HEELS (2023)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('d05189b0-bc7c-4711-8bb2-532302077610', 'HEELS', 'HEELS', 2023, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('0a6f712f-5ced-45ce-8a8e-08642d85a8df', 'd05189b0-bc7c-4711-8bb2-532302077610', 2, 4, 'HEAVY HEADS', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'd05189b0-bc7c-4711-8bb2-532302077610', '0a6f712f-5ced-45ce-8a8e-08642d85a8df', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: THE OUTLAW JOHNNY BLACK (2023)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('260ec6ae-23cb-4fa1-9019-8d97653259b1', 'THE OUTLAW JOHNNY BLACK', 'OUTLAW JOHNNY BLACK', 2023, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '260ec6ae-23cb-4fa1-9019-8d97653259b1', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: ANGEL BABY (2023)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('5ef0c758-7e93-4f1e-891d-0f592c86c71c', 'ANGEL BABY', 'ANGEL BABY', 2023, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '5ef0c758-7e93-4f1e-891d-0f592c86c71c', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: BOSCH: LEGACY (2023)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('dd71281c-b9a3-4274-9033-b261dd6bb6a2', 'BOSCH: LEGACY', 'BOSCH: LEGACY', 2023, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('bc65259f-9390-4a74-8151-ec44b92aa62c', 'dd71281c-b9a3-4274-9033-b261dd6bb6a2', 2, 10, 'A STEP AHEAD', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', 'dd71281c-b9a3-4274-9033-b261dd6bb6a2', 'bc65259f-9390-4a74-8151-ec44b92aa62c', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: BOSCH: LEGACY (2025)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('498d9401-8e36-4813-8954-33eaf36e0e5a', 'BOSCH: LEGACY', 'BOSCH: LEGACY', 2025, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('65ed96a3-5bac-4eb4-b44b-b7a5dd6faf24', '498d9401-8e36-4813-8954-33eaf36e0e5a', 3, 2, 'BOSCHING BOSCH', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '498d9401-8e36-4813-8954-33eaf36e0e5a', '65ed96a3-5bac-4eb4-b44b-b7a5dd6faf24', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('7cdaade4-7d1c-4547-9f42-219f373fcaf9', '498d9401-8e36-4813-8954-33eaf36e0e5a', 3, 3, 'BLANKIE', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '498d9401-8e36-4813-8954-33eaf36e0e5a', '7cdaade4-7d1c-4547-9f42-219f373fcaf9', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('db935208-d136-4be2-bd51-22f89804b7c2', '498d9401-8e36-4813-8954-33eaf36e0e5a', 3, 4, 'WHIPPOORWILLS', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'baa9624c-7338-45be-ad4d-6fa317f635ad', '498d9401-8e36-4813-8954-33eaf36e0e5a', 'db935208-d136-4be2-bd51-22f89804b7c2', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- ============================================================
-- LASARDO ROBERT ALFRED (artista_id: 5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7)
-- Missing operas: 136
-- Missing episodes on existing operas: 0
-- ============================================================

-- Opera: CHINA GIRL (1987)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('f6605f57-2240-4335-8c30-4301a298b7c6', 'CHINA GIRL', 'CHINA GIRL', 1987, 'film'::tipo_opera, '0000-0000-EF82-0000-H-0000-0000-N', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'f6605f57-2240-4335-8c30-4301a298b7c6', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: UN FOLLE TRASLOCO (1988)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('720e3a53-51c7-4880-b7e4-f2c7df47dc1c', 'UN FOLLE TRASLOCO', 'MOVING', 1988, 'film'::tipo_opera, '0000-0003-7C2D-0000-S-0000-0000-R', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '720e3a53-51c7-4880-b7e4-f2c7df47dc1c', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: CORTO CIRCUITO 2 (1988)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('1eca316d-9eeb-4864-af1f-a5ad9f76550a', 'CORTO CIRCUITO 2', 'SHORT CIRCUIT 2', 1988, 'film'::tipo_opera, '0000-0000-7010-0000-3-0000-0000-S', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1eca316d-9eeb-4864-af1f-a5ad9f76550a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: LEI, IO E LUI (1988)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('0f0b749d-c189-498d-aa03-653be4496fd1', 'LEI, IO E LUI', 'ICH UND ER', 1988, 'film'::tipo_opera, '0000-0001-6170-0000-C-0000-0000-1', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '0f0b749d-c189-498d-aa03-653be4496fd1', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: COMBACT DANCE - A COLPI DI MUSICA (1989)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('330b26a9-22b8-4b5c-be51-ed49dc9cbef7', 'COMBACT DANCE - A COLPI DI MUSICA', 'ROOFTOPS', 1989, 'film'::tipo_opera, '0000-0000-6A69-0000-0-0000-0000-3', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '330b26a9-22b8-4b5c-be51-ed49dc9cbef7', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: TRUE BLOOD (1989)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('f1d2dc85-d128-49a0-a24d-2fedb5fe1899', 'TRUE BLOOD', 'TRUE BLOOD', 1989, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'f1d2dc85-d128-49a0-a24d-2fedb5fe1899', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: FACCIA DI RAME (1989)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('794d7479-53cd-4aae-945d-b8005aad0495', 'FACCIA DI RAME', 'RENEGADES', 1989, 'film'::tipo_opera, '0000-0000-65A0-0000-5-0000-0000-M', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '794d7479-53cd-4aae-945d-b8005aad0495', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: CON LA MORTE NON SI SCHERZA (1989)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('b91fb2f5-b150-4b2d-b11f-922befa987bb', 'CON LA MORTE NON SI SCHERZA', 'PENN & TELLER GET KILLED', 1989, 'film'::tipo_opera, '0000-0000-7092-0000-J-0000-0000-H', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'b91fb2f5-b150-4b2d-b11f-922befa987bb', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: DURO DA UCCIDERE (1990)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('4a9bb9d3-fa5e-4d56-9910-bb43369d5911', 'DURO DA UCCIDERE', 'HARD TO KILL', 1990, 'film'::tipo_opera, '0000-0000-79B9-0000-W-0000-0000-F', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '4a9bb9d3-fa5e-4d56-9910-bb43369d5911', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: CHINA BEACH (1989)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('323d930f-37e1-4436-9a31-b8419353708d', 'CHINA BEACH', 'CHINA BEACH', 1989, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('819cc511-9e8f-49d2-b69f-92ddab85160a', '323d930f-37e1-4436-9a31-b8419353708d', 3, 9, 'HOW TO STAY ALIVE IN VIETNAM: PART 1', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '323d930f-37e1-4436-9a31-b8419353708d', '819cc511-9e8f-49d2-b69f-92ddab85160a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('149603f6-4d46-4e56-9e6f-9d8a3e16f086', '323d930f-37e1-4436-9a31-b8419353708d', 3, 10, 'HOW TO STAY ALIVE IN VIETNAM: PART 2', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '323d930f-37e1-4436-9a31-b8419353708d', '149603f6-4d46-4e56-9e6f-9d8a3e16f086', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: CHINA BEACH (1990)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('7f0bb0ab-2352-42dc-bf50-49f06cc2f7cb', 'CHINA BEACH', 'CHINA BEACH', 1990, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('f5a8e67e-cae0-498f-ab0e-0e7ec3de5411', '7f0bb0ab-2352-42dc-bf50-49f06cc2f7cb', 3, 15, 'A RUMOR OF PEACE', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '7f0bb0ab-2352-42dc-bf50-49f06cc2f7cb', 'f5a8e67e-cae0-498f-ab0e-0e7ec3de5411', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('601aef80-d169-495c-a05a-ae4e104702f0', '7f0bb0ab-2352-42dc-bf50-49f06cc2f7cb', 3, 16, 'WARRIORS', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '7f0bb0ab-2352-42dc-bf50-49f06cc2f7cb', '601aef80-d169-495c-a05a-ae4e104702f0', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('dc23e5af-da63-4ce5-ac4f-76b7c8a82dcd', '7f0bb0ab-2352-42dc-bf50-49f06cc2f7cb', 3, 18, 'SKYLARK', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '7f0bb0ab-2352-42dc-bf50-49f06cc2f7cb', 'dc23e5af-da63-4ce5-ac4f-76b7c8a82dcd', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: KING OF NEW YORK (1990)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('49406c37-603f-4a47-a4fb-c380c599f727', 'KING OF NEW YORK', 'KING OF NEW YORK', 1990, 'film'::tipo_opera, '0000-0000-CEF5-0000-2-0000-0000-V', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '49406c37-603f-4a47-a4fb-c380c599f727', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: GIUSTIZIA A TUTTI I COSTI (1991)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('ae27f8c2-9caf-4531-b96a-c98a89638790', 'GIUSTIZIA A TUTTI I COSTI', 'OUT FOR JUSTICE', 1991, 'film'::tipo_opera, '0000-0000-708D-0000-R-0000-0000-U', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'ae27f8c2-9caf-4531-b96a-c98a89638790', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: LAW & ORDER - I DUE VOLTI DELLA GIUSTIZIA (1991)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('4ca1d076-5568-42d2-8ef5-241d3b1c2634', 'LAW & ORDER - I DUE VOLTI DELLA GIUSTIZIA', 'LAW & ORDER', 1991, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('9e664975-0de5-4889-8781-6f12f3bb13a6', '4ca1d076-5568-42d2-8ef5-241d3b1c2634', 2, 9, 'RENUNCIATION', '0000-0001-6295-0113-M-0000-0000-8', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '4ca1d076-5568-42d2-8ef5-241d3b1c2634', '9e664975-0de5-4889-8781-6f12f3bb13a6', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: HARRY E GLI HENDERSON (1993)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('acd96eb1-46b9-4562-b28e-1bd147c8e47d', 'HARRY E GLI HENDERSON', 'HARRY AND THE HENDERSONS', 1993, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('a9c44b57-df28-4be8-a85e-a8ad026ac86a', 'acd96eb1-46b9-4562-b28e-1bd147c8e47d', 3, 23, 'THEM BONES', '0000-0000-C390-000B-X-0000-0000-C', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'acd96eb1-46b9-4562-b28e-1bd147c8e47d', 'a9c44b57-df28-4be8-a85e-a8ad026ac86a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: DREAM ON (1993)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('5d261697-f375-4432-9f14-f8ad446077aa', 'DREAM ON', 'DREAM ON', 1993, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('8f4042d6-2d2d-49a1-92b6-b4c62b323182', '5d261697-f375-4432-9f14-f8ad446077aa', 4, 11, 'PORTRAIT BY THE ARTIST ON THE YOUNG MAN', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '5d261697-f375-4432-9f14-f8ad446077aa', '8f4042d6-2d2d-49a1-92b6-b4c62b323182', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: JIMMY HOLLYWOOD (1994)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('779a4ee4-2182-4e94-9b7e-7ce4c87b25fb', 'JIMMY HOLLYWOOD', 'JIMMY HOLLYWOOD', 1994, 'film'::tipo_opera, '0000-0000-059A-0000-R-0000-0000-U', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '779a4ee4-2182-4e94-9b7e-7ce4c87b25fb', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: LÉON (1994)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('2dd81e45-131f-4c94-8a39-2f2ef19d861b', 'LÉON', 'LÉON', 1994, 'film'::tipo_opera, '0000-0001-9FB7-0000-Q-0000-0000-X', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '2dd81e45-131f-4c94-8a39-2f2ef19d861b', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: BLOOD RUN - UNA LUNGA STRISCIA DI SANGUE (1994)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('8561109b-9275-45dd-87f7-7b48555883ad', 'BLOOD RUN - UNA LUNGA STRISCIA DI SANGUE', 'BLOOD RUN', 1994, 'film'::tipo_opera, '0000-0000-EFB2-0000-K-0000-0000-E', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '8561109b-9275-45dd-87f7-7b48555883ad', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: OMICIDIO NEL VUOTO (1994)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('08f8396e-8626-44a3-8b16-35b4b5276a75', 'OMICIDIO NEL VUOTO', 'DROP ZONE', 1994, 'film'::tipo_opera, '0000-0000-00D1-0000-X-0000-0000-C', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '08f8396e-8626-44a3-8b16-35b4b5276a75', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: WATERWORLD (1995)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('419670e7-9426-46c7-960f-9103640863b7', 'WATERWORLD', 'WATERWORLD', 1995, 'film'::tipo_opera, '0000-0000-570B-0000-Y-0000-0000-9', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '419670e7-9426-46c7-960f-9103640863b7', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: L'ULTIMO BERSAGLIO (1995)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('50dff553-49f4-441d-8ecb-c028645d40e2', 'L''ULTIMO BERSAGLIO', 'LAST MAN STANDING', 1995, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '50dff553-49f4-441d-8ecb-c028645d40e2', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: NATIONAL LAMPOON'S FAVORITE DEADLY SIN (1995)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('0b83df31-d1a8-49c5-b439-2ba568470844', 'NATIONAL LAMPOON''S FAVORITE DEADLY SIN', 'NATIONAL LAMPOON''S FAVORITE DEADLY SIN', 1995, 'film'::tipo_opera, '0000-0002-6998-0000-Q-0000-0000-X', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '0b83df31-d1a8-49c5-b439-2ba568470844', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: THE REAL THING (1996)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('e59e3f90-3fda-4622-8444-10715f30914a', 'THE REAL THING', 'LIVERS AIN''T CHEAP', 1996, 'film'::tipo_opera, '0000-0000-F884-0000-1-0000-0000-Y', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'e59e3f90-3fda-4622-8444-10715f30914a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: FACCIA DA BASTARDO (1996)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('769c7801-43f5-435e-ab3f-e72f5a87478d', 'FACCIA DA BASTARDO', 'ONE TOUGH BASTARD', 1996, 'film'::tipo_opera, '0000-0000-0117-0000-5-0000-0000-M', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '769c7801-43f5-435e-ab3f-e72f5a87478d', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: PRONTO A COLPIRE (1996)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('d7a448f2-453f-49fb-bef2-d80d3a09ab05', 'PRONTO A COLPIRE', 'TIGER HEART', 1996, 'film'::tipo_opera, '0000-0000-28EC-0000-K-0000-0000-E', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'd7a448f2-453f-49fb-bef2-d80d3a09ab05', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: ALTA MAREA (1996)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('464fc946-3497-4f36-bd03-5f9a1383908e', 'ALTA MAREA', 'HIGH TIDE', 1996, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('ba50588f-1926-4da7-a591-b57e6a501e2f', '464fc946-3497-4f36-bd03-5f9a1383908e', 2, 18, 'CODE NAME: SCORPION', '0000-0000-FAD9-001A-L-0000-0000-B', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '464fc946-3497-4f36-bd03-5f9a1383908e', 'ba50588f-1926-4da7-a591-b57e6a501e2f', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: SENTINEL (1997)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('0801b6a3-3c20-47d1-9046-99021117d250', 'SENTINEL', 'THE SENTINEL', 1997, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('9f1ff7c2-8c74-4003-b288-fee63fe81877', '0801b6a3-3c20-47d1-9046-99021117d250', 2, 12, 'BLIND MAN''S STUFF', '0000-0000-D0D4-000F-U-0000-0000-L', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '0801b6a3-3c20-47d1-9046-99021117d250', '9f1ff7c2-8c74-4003-b288-fee63fe81877', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: NIGHTWATCH - IL GUARDIANO DI NOTTE (1997)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('13cc0c0e-ebb8-4ff6-8880-9e0eb6b331af', 'NIGHTWATCH - IL GUARDIANO DI NOTTE', 'NIGHTWATCH', 1997, 'film'::tipo_opera, '0000-0001-4DB7-0000-U-0000-0000-L', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '13cc0c0e-ebb8-4ff6-8880-9e0eb6b331af', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: RENEGADE (1994)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('8d34263a-6687-49aa-9b28-40d9c3a6fc57', 'RENEGADE', 'RENEGADE', 1994, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('64ff196e-48ca-4e42-91fe-d848bf274c45', '8d34263a-6687-49aa-9b28-40d9c3a6fc57', 2, 20, 'MURDERER''S ROW', '0000-0001-5785-0006-4-0000-0000-P', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '8d34263a-6687-49aa-9b28-40d9c3a6fc57', '64ff196e-48ca-4e42-91fe-d848bf274c45', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('71bdc762-ee16-4b49-b033-ea522a434ca3', '8d34263a-6687-49aa-9b28-40d9c3a6fc57', 2, 21, 'MURDERER''S ROW: PART TWO', '0000-0001-5785-000C-R-0000-0000-U', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '8d34263a-6687-49aa-9b28-40d9c3a6fc57', '71bdc762-ee16-4b49-b033-ea522a434ca3', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: RENEGADE (1995)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('173d9423-39cd-4029-8896-af4f6d3c0882', 'RENEGADE', 'RENEGADE', 1995, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('ddcd49a6-1bc5-44c7-9c1f-afd557ff792a', '173d9423-39cd-4029-8896-af4f6d3c0882', 4, 4, 'MOST WANTED', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '173d9423-39cd-4029-8896-af4f6d3c0882', 'ddcd49a6-1bc5-44c7-9c1f-afd557ff792a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: RENEGADE (1997)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('642f7295-31d9-4582-b8fa-c14d130b7425', 'RENEGADE', 'RENEGADE', 1997, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('3e6501e5-4729-41c1-89f1-e1b67ccb1bd9', '642f7295-31d9-4582-b8fa-c14d130b7425', 5, 21, 'THE MALTESE INDIAN', '0000-0001-572A-000E-P-0000-0000-0', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '642f7295-31d9-4582-b8fa-c14d130b7425', '3e6501e5-4729-41c1-89f1-e1b67ccb1bd9', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: MURDER ONE (1997)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('b833bff8-1216-4603-bfc8-ebeddb3a0f1c', 'MURDER ONE', 'MURDER ONE', 1997, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('f17112fd-0e7c-466e-8a75-2ffb8c90f14d', 'b833bff8-1216-4603-bfc8-ebeddb3a0f1c', 2, 14, 'CHAPTER FOURTEEN, YEAR TWO', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'b833bff8-1216-4603-bfc8-ebeddb3a0f1c', 'f17112fd-0e7c-466e-8a75-2ffb8c90f14d', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('b290f47f-5096-489e-8b85-cb37f72101b0', 'b833bff8-1216-4603-bfc8-ebeddb3a0f1c', 2, 18, 'CHAPTER EIGHTEEN, YEAR TWO', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'b833bff8-1216-4603-bfc8-ebeddb3a0f1c', 'b290f47f-5096-489e-8b85-cb37f72101b0', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: DOUBLE TAP (1997)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('eb9079f6-e232-49a5-b228-033640e68181', 'DOUBLE TAP', 'DOUBLE TAP', 1997, 'film'::tipo_opera, '0000-0000-51C1-0000-V-0000-0000-I', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'eb9079f6-e232-49a5-b228-033640e68181', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: TRAGICO ERRORE (1997)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('bd186949-883d-430d-bdc6-83867bf21d25', 'TRAGICO ERRORE', 'UNDER OATH', 1997, 'film'::tipo_opera, '0000-0000-53B1-0000-E-0000-0000-W', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'bd186949-883d-430d-bdc6-83867bf21d25', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: ISTINTI CRIMINALI (1997)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('fe933609-b7b9-4cbe-bda9-d98f10945ea0', 'ISTINTI CRIMINALI', 'GANG RELATED', 1997, 'film'::tipo_opera, '0000-0000-6059-0000-L-0000-0000-B', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'fe933609-b7b9-4cbe-bda9-d98f10945ea0', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: MURDER ONE: DIARY OF A SERIAL KILLER (1997)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('68992285-a39e-4c91-ae84-b4834817c6d8', 'MURDER ONE: DIARY OF A SERIAL KILLER', 'MURDER ONE: DIARY OF A SERIAL KILLER', 1997, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('b3f86f11-fa4c-4380-9091-2fe9a0d7c258', '68992285-a39e-4c91-ae84-b4834817c6d8', 1, 1, 'EPISODIO #1.1', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '68992285-a39e-4c91-ae84-b4834817c6d8', 'b3f86f11-fa4c-4380-9091-2fe9a0d7c258', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('0a3bb14d-cae7-40aa-9a16-47d1bae1bbbb', '68992285-a39e-4c91-ae84-b4834817c6d8', 1, 2, 'EPISODIO #1.2', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '68992285-a39e-4c91-ae84-b4834817c6d8', '0a3bb14d-cae7-40aa-9a16-47d1bae1bbbb', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('db0b1b23-0490-4ded-864e-9a88264f350a', '68992285-a39e-4c91-ae84-b4834817c6d8', 1, 3, 'EPISODIO #1.3', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '68992285-a39e-4c91-ae84-b4834817c6d8', 'db0b1b23-0490-4ded-864e-9a88264f350a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('0a73b96a-eff0-4823-b0db-09fbeeec0b45', '68992285-a39e-4c91-ae84-b4834817c6d8', 1, 4, 'EPISODIO #1.4', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '68992285-a39e-4c91-ae84-b4834817c6d8', '0a73b96a-eff0-4823-b0db-09fbeeec0b45', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('67d73886-ae7b-451a-b57e-4423252f6c7b', '68992285-a39e-4c91-ae84-b4834817c6d8', 1, 5, 'EPISODIO #1.5', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '68992285-a39e-4c91-ae84-b4834817c6d8', '67d73886-ae7b-451a-b57e-4423252f6c7b', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('4aa627dd-6174-4a67-9ae3-0ab0450f8cd4', '68992285-a39e-4c91-ae84-b4834817c6d8', 1, 6, 'EPISODIO #1.6', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '68992285-a39e-4c91-ae84-b4834817c6d8', '4aa627dd-6174-4a67-9ae3-0ab0450f8cd4', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: LOVE KILLS - AMORE E PALLOTTOLE (1998)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('36841d0b-3857-4264-aeba-95e25a63a264', 'LOVE KILLS - AMORE E PALLOTTOLE', 'LOVE KILLS', 1998, 'film'::tipo_opera, '0000-0000-5870-0000-W-0000-0000-F', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '36841d0b-3857-4264-aeba-95e25a63a264', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: CARNIVAL OF SOULS (1998)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('35c3f8c8-b298-4ece-9d09-659a56c2d0c1', 'CARNIVAL OF SOULS', 'WES CRAVEN PRESENTS CARNIVAL OF SOULS', 1998, 'film'::tipo_opera, '0000-0000-230F-0000-2-0000-0000-V', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '35c3f8c8-b298-4ece-9d09-659a56c2d0c1', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: BUDDY FARO (1998)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('502a6638-0e8f-4d0d-a3f6-25b1c8f91700', 'BUDDY FARO', 'BUDDY FARO', 1998, 'film'::tipo_opera, '0000-0000-C830-0001-V-0000-0000-I', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '502a6638-0e8f-4d0d-a3f6-25b1c8f91700', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: CROSSFIRE (1998)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('025b7ae4-d8a4-4670-bdf2-ff460f3a5a61', 'CROSSFIRE', 'CROSSFIRE', 1998, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '025b7ae4-d8a4-4670-bdf2-ff460f3a5a61', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: STRANGELAND (1998)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('38ce19c2-4cc1-4d5a-9976-64c6b60c0181', 'STRANGELAND', 'STRANGELAND', 1998, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '38ce19c2-4cc1-4d5a-9976-64c6b60c0181', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: L.A. DOCTORS (1998)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('2555f143-364a-462e-8b37-d0a0e2d8904a', 'L.A. DOCTORS', 'L.A. DOCTORS', 1998, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('67f8477f-c40e-4090-83fa-4028df20fa2f', '2555f143-364a-462e-8b37-d0a0e2d8904a', 1, 4, 'FEAR OF FLYING', '0000-0000-C5DE-0015-8-0000-0000-D', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '2555f143-364a-462e-8b37-d0a0e2d8904a', '67f8477f-c40e-4090-83fa-4028df20fa2f', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: UNA DONNA IN FUGA (1998)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('5a6c363c-7db8-401c-a5ed-eba915a0559c', 'UNA DONNA IN FUGA', 'RUNNING WOMAN', 1998, 'film'::tipo_opera, '0000-0000-23D2-0000-3-0000-0000-S', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '5a6c363c-7db8-401c-a5ed-eba915a0559c', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: WISHMASTER 2 - IL MALE NON MUORE MAI (1999)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('c491787e-011f-4712-9d6d-c3f5f85a304e', 'WISHMASTER 2 - IL MALE NON MUORE MAI', 'WISHMASTER 2: EVIL NEVER DIES', 1999, 'film'::tipo_opera, '0000-0000-5367-0000-V-0000-0000-I', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'c491787e-011f-4712-9d6d-c3f5f85a304e', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: PIÙ FORTE RAGAZZI (1999)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('431a827a-13cc-48de-83f9-074a23b45390', 'PIÙ FORTE RAGAZZI', 'MARTIAL LAW', 1999, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('9a9580ba-5a92-4c2e-889b-998ec48d63ee', '431a827a-13cc-48de-83f9-074a23b45390', 1, 21, 'REQUIEM', '0000-0000-E389-0003-S-0000-0000-R', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '431a827a-13cc-48de-83f9-074a23b45390', '9a9580ba-5a92-4c2e-889b-998ec48d63ee', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('b0e68391-aae2-4408-8625-1d5dec6f9ab8', '431a827a-13cc-48de-83f9-074a23b45390', 1, 22, 'END GAME', '0000-0000-E389-0015-K-0000-0000-E', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '431a827a-13cc-48de-83f9-074a23b45390', 'b0e68391-aae2-4408-8625-1d5dec6f9ab8', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: IN TOO DEEP (1999)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('08c031a2-978f-4a83-89ad-7dc58f092f3f', 'IN TOO DEEP', 'IN TOO DEEP', 1999, 'film'::tipo_opera, '0000-0000-2C0B-0000-E-0000-0000-W', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '08c031a2-978f-4a83-89ad-7dc58f092f3f', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: DA LADRO A POLIZIOTTO (1999)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('b19d611f-2ebb-4d04-9bc4-f23c263fd856', 'DA LADRO A POLIZIOTTO', 'BLUE STREAK', 1999, 'film'::tipo_opera, '0000-0000-2408-0000-O-0000-0000-2', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'b19d611f-2ebb-4d04-9bc4-f23c263fd856', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: X-FILES (2000)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('e5c5d259-0f15-45aa-a85b-cb2ae99822e5', 'X-FILES', 'THE X-FILES', 2000, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('f67b8e6e-8174-480b-99fe-d5a007e63ce5', 'e5c5d259-0f15-45aa-a85b-cb2ae99822e5', 7, 8, 'THE AMAZING MALEENI', '0000-0000-EBC2-00DA-G-0000-0000-Q', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'e5c5d259-0f15-45aa-a85b-cb2ae99822e5', 'f67b8e6e-8174-480b-99fe-d5a007e63ce5', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: PACIFIC BLUE (1997)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('f0cd3ca5-cf22-4536-a773-147a6dfac9da', 'PACIFIC BLUE', 'PACIFIC BLUE', 1997, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('0aaa2ea5-38fb-4351-8560-f36b7cdf1f68', 'f0cd3ca5-cf22-4536-a773-147a6dfac9da', 1, 1, 'PILOT', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'f0cd3ca5-cf22-4536-a773-147a6dfac9da', '0aaa2ea5-38fb-4351-8560-f36b7cdf1f68', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: PACIFIC BLUE (2000)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('9560cd76-8482-4f0d-9db0-e410932bd255', 'PACIFIC BLUE', 'PACIFIC BLUE', 2000, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('9bffb626-8aab-4eb6-b27f-50238e31d1d8', '9560cd76-8482-4f0d-9db0-e410932bd255', 5, 20, 'KIDNAPPED', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '9560cd76-8482-4f0d-9db0-e410932bd255', '9bffb626-8aab-4eb6-b27f-50238e31d1d8', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: NASH BRIDGES (1996)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('7d917d34-c9d2-4a60-a4b4-ea2d69346116', 'NASH BRIDGES', 'NASH BRIDGES', 1996, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('ec41fc34-676c-4a3e-856e-f559d478098d', '7d917d34-c9d2-4a60-a4b4-ea2d69346116', 1, 3, 'SKIRT CHASERS', '0000-0000-CF82-0034-S-0000-0000-R', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '7d917d34-c9d2-4a60-a4b4-ea2d69346116', 'ec41fc34-676c-4a3e-856e-f559d478098d', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: NASH BRIDGES (2000)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('8d4c16fc-c21f-4c66-a2cb-9b181d4db37b', 'NASH BRIDGES', 'NASH BRIDGES', 2000, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('4f9ee6ff-db93-44f0-9ea2-b6c99ff96f20', '8d4c16fc-c21f-4c66-a2cb-9b181d4db37b', 5, 21, 'JACKPOT: PART 1', '0000-0000-CF82-002B-I-0000-0000-K', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '8d4c16fc-c21f-4c66-a2cb-9b181d4db37b', '4f9ee6ff-db93-44f0-9ea2-b6c99ff96f20', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: MERCY STREETS (2000)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('42b5bd0e-cffa-450b-8e9f-fd660bd0d33a', 'MERCY STREETS', 'MERCY STREETS', 2000, 'film'::tipo_opera, '0000-0002-35BC-0000-4-0000-0000-P', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '42b5bd0e-cffa-450b-8e9f-fd660bd0d33a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: THE LONE GUNMEN (2001)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('cbf0b3b3-7af4-44bc-8428-c8cdd03a3c5b', 'THE LONE GUNMEN', 'THE LONE GUNMEN', 2001, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('8eaa90d5-1603-430f-9a63-0f243d899bf8', 'cbf0b3b3-7af4-44bc-8428-c8cdd03a3c5b', 1, 8, 'MAXIMUM BYERS', '0000-0000-EBCE-0002-1-0000-0000-Y', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'cbf0b3b3-7af4-44bc-8428-c8cdd03a3c5b', '8eaa90d5-1603-430f-9a63-0f243d899bf8', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: ROAD TO JUSTICE - IL GIUSTIZIERE (2000)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('0fe5e6e5-7fa0-471e-9250-9ed690a384f1', 'ROAD TO JUSTICE - IL GIUSTIZIERE', '18 WHEELS OF JUSTICE', 2000, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('0bfa946f-50fb-4d85-85f4-6c7dc70bea23', '0fe5e6e5-7fa0-471e-9250-9ed690a384f1', 1, 15, 'THE ROAD TO HELL', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '0fe5e6e5-7fa0-471e-9250-9ed690a384f1', '0bfa946f-50fb-4d85-85f4-6c7dc70bea23', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: ROAD TO JUSTICE - IL GIUSTIZIERE (2001)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('101368ed-cb7b-4998-a30c-f1cbe6a9b665', 'ROAD TO JUSTICE - IL GIUSTIZIERE', '18 WHEELS OF JUSTICE', 2001, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('5a3c2ad1-fa02-44b0-b38b-65f7f1b02a03', '101368ed-cb7b-4998-a30c-f1cbe6a9b665', 2, 22, 'THE INTERROGATION', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '101368ed-cb7b-4998-a30c-f1cbe6a9b665', '5a3c2ad1-fa02-44b0-b38b-65f7f1b02a03', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: BUBBLE BOY (2001)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('009dc4a5-c42c-4dca-98fc-92e929bd980b', 'BUBBLE BOY', 'BUBBLE BOY', 2001, 'film'::tipo_opera, '0000-0001-0A92-0000-J-0000-0000-H', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '009dc4a5-c42c-4dca-98fc-92e929bd980b', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: DEAD LAST (2001)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('42849ce7-f5a0-4b12-bfb2-101ac379680c', 'DEAD LAST', 'DEAD LAST', 2001, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('88f76b50-96da-4778-b27d-3ccb9364f187', '42849ce7-f5a0-4b12-bfb2-101ac379680c', 1, 5, 'THE PROBLEM WITH CORRUPTION', '0000-0001-53AB-0009-5-0000-0000-M', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '42849ce7-f5a0-4b12-bfb2-101ac379680c', '88f76b50-96da-4778-b27d-3ccb9364f187', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: UC: UNDERCOVER (2001)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('b6b5e8a6-69ff-4e5c-9877-f0d3cc34b428', 'UC: UNDERCOVER', 'UC: UNDERCOVER', 2001, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('dab28332-5aa6-4aa9-b635-94aecdd5a581', 'b6b5e8a6-69ff-4e5c-9877-f0d3cc34b428', 1, 8, 'THE SIEGE', '0000-0000-C8F1-0003-4-0000-0000-P', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'b6b5e8a6-69ff-4e5c-9877-f0d3cc34b428', 'dab28332-5aa6-4aa9-b635-94aecdd5a581', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: PHILLY (2001)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('af8401af-a5b7-4754-bc6d-204ba8b1676e', 'PHILLY', 'PHILLY', 2001, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('3de25e2c-a7dd-4872-86a6-c2e447e0a3bf', 'af8401af-a5b7-4754-bc6d-204ba8b1676e', 1, 10, 'FORK YOU VERY MUCH', '0000-0000-CF81-0009-N-0000-0000-5', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'af8401af-a5b7-4754-bc6d-204ba8b1676e', '3de25e2c-a7dd-4872-86a6-c2e447e0a3bf', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: V.I.P. VALLERY IRONS PROTECTION (1999)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('e0291814-b74e-4c48-b55a-4aa19fda67c9', 'V.I.P. VALLERY IRONS PROTECTION', 'V.I.P.', 1999, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('34ba1f02-4c4a-42d8-86ec-85ebb32c6604', 'e0291814-b74e-4c48-b55a-4aa19fda67c9', 2, 6, 'VALMA AND LOUISE', '0000-0001-54D9-0033-8-0000-0000-D', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'e0291814-b74e-4c48-b55a-4aa19fda67c9', '34ba1f02-4c4a-42d8-86ec-85ebb32c6604', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: V.I.P. VALLERY IRONS PROTECTION (2000)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('7373ff26-57b6-42eb-bb4e-23b82ec44896', 'V.I.P. VALLERY IRONS PROTECTION', 'V.I.P.', 2000, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('3eda77df-04be-4c92-8dcf-9d1fb1c40b3d', '7373ff26-57b6-42eb-bb4e-23b82ec44896', 3, 4, 'V.I.P., R.I.P.', '0000-0001-54D9-0012-I-0000-0000-K', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '7373ff26-57b6-42eb-bb4e-23b82ec44896', '3eda77df-04be-4c92-8dcf-9d1fb1c40b3d', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: V.I.P. VALLERY IRONS PROTECTION (2002)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('233dcf43-2bfd-4967-8870-ee3bd9c948eb', 'V.I.P. VALLERY IRONS PROTECTION', 'V.I.P.', 2002, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('65971993-a6fb-43e3-8c1e-c1e020f29963', '233dcf43-2bfd-4967-8870-ee3bd9c948eb', 4, 20, 'TRUE VAL STORY', '0000-0001-54D9-0029-Z-0000-0000-6', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '233dcf43-2bfd-4967-8870-ee3bd9c948eb', '65971993-a6fb-43e3-8c1e-c1e020f29963', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: THE SHIELD (2002)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('dad4fa50-4c40-49a0-9972-26f429dbd22c', 'THE SHIELD', 'THE SHIELD', 2002, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('7d52cd9c-108e-4a80-96d7-cbadb9a8327c', 'dad4fa50-4c40-49a0-9972-26f429dbd22c', 1, 12, 'TWO DAYS OF BLOOD', '0000-0000-FB0B-0016-Z-0000-0000-6', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'dad4fa50-4c40-49a0-9972-26f429dbd22c', '7d52cd9c-108e-4a80-96d7-cbadb9a8327c', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: FASTLANE (2002)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('4e199443-87d3-4b44-8eaa-f4eceb3f2cb2', 'FASTLANE', 'FASTLANE', 2002, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('5fa94427-3975-43b9-b23c-f82627baf5c0', '4e199443-87d3-4b44-8eaa-f4eceb3f2cb2', 1, 4, 'THINGS DONE CHANGED', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '4e199443-87d3-4b44-8eaa-f4eceb3f2cb2', '5fa94427-3975-43b9-b23c-f82627baf5c0', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: PANDEMONIUM (2002)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('9803950c-2c3c-4068-9866-86e4081076bd', 'PANDEMONIUM', 'PANDEMONIUM', 2002, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '9803950c-2c3c-4068-9866-86e4081076bd', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: FOUR FACES OF GOD (2002)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('e0fba017-5052-449b-9b41-5531390de1af', 'FOUR FACES OF GOD', 'FOUR FACES OF GOD', 2002, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'e0fba017-5052-449b-9b41-5531390de1af', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: IL TOCCO DI UN ANGELO (2003)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('07698489-546a-4928-a08d-40589b265955', 'IL TOCCO DI UN ANGELO', 'TOUCHED BY AN ANGEL', 2003, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('1ab4c2b6-3792-4287-b376-2075bfceb136', '07698489-546a-4928-a08d-40589b265955', 9, 15, 'AS IT IS IN HEAVEN', '0000-0000-C4D6-007F-D-0000-0000-Z', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '07698489-546a-4928-a08d-40589b265955', '1ab4c2b6-3792-4287-b376-2075bfceb136', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: BOOMTOWN (2003)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('ac253024-0de8-4681-9500-2506935e4b22', 'BOOMTOWN', 'BOOMTOWN', 2003, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('d6fd3350-9ac2-4d44-ac6b-e1cd8c6fb2da', 'ac253024-0de8-4681-9500-2506935e4b22', 1, 14, 'EXECUTION', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'ac253024-0de8-4681-9500-2506935e4b22', 'd6fd3350-9ac2-4d44-ac6b-e1cd8c6fb2da', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: HELL - ESPLODE LA FURIA (2003)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('38f909e5-96d4-4efa-a83c-e59ee4e68520', 'HELL - ESPLODE LA FURIA', 'HELL', 2003, 'film'::tipo_opera, '0000-0000-F257-0000-E-0000-0000-W', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '38f909e5-96d4-4efa-a83c-e59ee4e68520', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: NEW POLICE DEPARTMENT (1993)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('c86ee27e-2331-4475-86a7-47ef51355ed1', 'NEW POLICE DEPARTMENT', 'NYPD BLUE', 1993, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('41c3088a-de98-4e58-a13c-269194fc062c', 'c86ee27e-2331-4475-86a7-47ef51355ed1', 1, 6, 'PERSONAL FOUL', '0000-0000-E382-002B-6-0000-0000-J', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'c86ee27e-2331-4475-86a7-47ef51355ed1', '41c3088a-de98-4e58-a13c-269194fc062c', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('674dfa04-0e8c-49f8-98ff-37db08b34394', 'c86ee27e-2331-4475-86a7-47ef51355ed1', 1, 8, 'TEMPEST IN A C-CUP', '0000-0000-E382-0010-W-0000-0000-F', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'c86ee27e-2331-4475-86a7-47ef51355ed1', '674dfa04-0e8c-49f8-98ff-37db08b34394', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: NEW POLICE DEPARTMENT (1999)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('ea585036-a6c4-447c-a3fb-66de96f3e206', 'NEW POLICE DEPARTMENT', 'NYPD BLUE', 1999, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('067d5ed9-9cff-489e-bc1d-838aae59b589', 'ea585036-a6c4-447c-a3fb-66de96f3e206', 6, 10, 'SHOW & TELL', '0000-0000-E382-00D0-H-0000-0000-N', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'ea585036-a6c4-447c-a3fb-66de96f3e206', '067d5ed9-9cff-489e-bc1d-838aae59b589', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: NEW POLICE DEPARTMENT (2001)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('6f2c7c24-946d-4cfb-bb58-8a62f86c7436', 'NEW POLICE DEPARTMENT', 'NYPD BLUE', 2001, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('46644747-286e-4c5b-aa19-0a037bcf9227', '6f2c7c24-946d-4cfb-bb58-8a62f86c7436', 9, 2, 'JOHNNY GOT HIS GOLD', '0000-0000-E382-0067-X-0000-0000-C', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '6f2c7c24-946d-4cfb-bb58-8a62f86c7436', '46644747-286e-4c5b-aa19-0a037bcf9227', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: NEW POLICE DEPARTMENT (2003)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('84c9ad1e-b3df-48fb-86c9-61b31b2326ba', 'NEW POLICE DEPARTMENT', 'NYPD BLUE', 2003, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('a804e0c4-6695-4c9c-b105-9cf723108432', '84c9ad1e-b3df-48fb-86c9-61b31b2326ba', 11, 3, 'SHEAR STUPIDITY', '0000-0000-E382-00F1-7-0000-0000-G', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '84c9ad1e-b3df-48fb-86c9-61b31b2326ba', 'a804e0c4-6695-4c9c-b105-9cf723108432', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: COLD CASE - DELITTI IRRISOLTI (2004)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('b80c2bfb-6032-4a73-b28d-c67331ffcf80', 'COLD CASE - DELITTI IRRISOLTI', 'COLD CASE', 2004, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('d0b572d1-379d-4a6a-88cc-431c7338ba2b', 'b80c2bfb-6032-4a73-b28d-c67331ffcf80', 1, 11, 'HUBRIS', '0000-0001-571C-0010-J-0000-0000-H', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'b80c2bfb-6032-4a73-b28d-c67331ffcf80', 'd0b572d1-379d-4a6a-88cc-431c7338ba2b', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: LATIN DRAGON (2004)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('52f59c3d-340f-4969-b32a-55f2afd5e810', 'LATIN DRAGON', 'LATIN DRAGON', 2004, 'film'::tipo_opera, '0000-0001-476C-0000-S-0000-0000-R', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '52f59c3d-340f-4969-b32a-55f2afd5e810', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: GIUDICE AMY (2005)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('930d5183-11ec-4eac-b605-c05d81906c82', 'GIUDICE AMY', 'JUDGING AMY', 2005, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('037c7484-daf8-4693-a6b9-eb88a5ffe103', '930d5183-11ec-4eac-b605-c05d81906c82', 6, 14, 'HAPPY BIRTHDAY', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '930d5183-11ec-4eac-b605-c05d81906c82', '037c7484-daf8-4693-a6b9-eb88a5ffe103', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: EYES (2005)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('5c2c8e2e-5067-4d6d-859b-3d9e96852640', 'EYES', 'EYES', 2005, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('49d8d9e9-5fba-4800-9091-b838dc4c70fc', '5c2c8e2e-5067-4d6d-859b-3d9e96852640', 1, 5, 'SHOTS', '0000-0001-542C-000D-J-0000-0000-H', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '5c2c8e2e-5067-4d6d-859b-3d9e96852640', '49d8d9e9-5fba-4800-9091-b838dc4c70fc', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: BLIND JUSTICE (2005)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('e609e45d-e171-4f40-9a35-3ec88944a97c', 'BLIND JUSTICE', 'BLIND JUSTICE', 2005, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('e0e51dd8-9d39-439e-a8f3-3aacc5b196c8', 'e609e45d-e171-4f40-9a35-3ec88944a97c', 1, 10, 'DOGGONE', '0000-0000-D0B3-0004-R-0000-0000-U', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'e609e45d-e171-4f40-9a35-3ec88944a97c', 'e0e51dd8-9d39-439e-a8f3-3aacc5b196c8', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: WANTED (2006)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('30c23e5d-67ad-4b6e-9e79-55ec52f32b25', 'WANTED', 'WANTED', 2006, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('778cf866-5868-44a2-a375-8766d049c55c', '30c23e5d-67ad-4b6e-9e79-55ec52f32b25', 1, 1, 'PILOT', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '30c23e5d-67ad-4b6e-9e79-55ec52f32b25', '778cf866-5868-44a2-a375-8766d049c55c', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: SEX, LOVE & SECRETS (2005)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('683e258d-b73e-4ef4-90a0-bf65a0a0667f', 'SEX, LOVE & SECRETS', 'SEX, LOVE & SECRETS', 2005, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('74a92d4d-3d78-4d9f-831c-74c293f7fe1a', '683e258d-b73e-4ef4-90a0-bf65a0a0667f', 1, 1, 'SECRETS', '0000-0002-A609-0001-C-0000-0000-1', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '683e258d-b73e-4ef4-90a0-bf65a0a0667f', '74a92d4d-3d78-4d9f-831c-74c293f7fe1a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('0f9591f3-6cfe-4769-86e3-3eb1c3b0c187', '683e258d-b73e-4ef4-90a0-bf65a0a0667f', 1, 2, 'AMBUSH', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '683e258d-b73e-4ef4-90a0-bf65a0a0667f', '0f9591f3-6cfe-4769-86e3-3eb1c3b0c187', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('b74dab84-6ae2-466f-96a6-4a0712ebd816', '683e258d-b73e-4ef4-90a0-bf65a0a0667f', 1, 6, 'FEAR', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '683e258d-b73e-4ef4-90a0-bf65a0a0667f', 'b74dab84-6ae2-466f-96a6-4a0712ebd816', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: DIRTY (2005)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('6a90e01b-33c7-4e83-a2bc-5204bdf9f3a5', 'DIRTY', 'DIRTY', 2005, 'film'::tipo_opera, '0000-0001-9226-0000-L-0000-0000-B', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '6a90e01b-33c7-4e83-a2bc-5204bdf9f3a5', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: GHOST WHISPERER - PRESENZE (2005)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('2adfe6c3-e02d-43d0-b139-182c3d809e30', 'GHOST WHISPERER - PRESENZE', 'GHOST WHISPERER', 2005, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('f3f97893-4016-4fd7-a061-a55de5b5d063', '2adfe6c3-e02d-43d0-b139-182c3d809e30', 1, 7, 'HOPE AND MERCY', '0000-0005-4E1A-000B-H-0000-0000-N', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '2adfe6c3-e02d-43d0-b139-182c3d809e30', 'f3f97893-4016-4fd7-a061-a55de5b5d063', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('6a7a1871-f350-4df9-94e9-cb1c3f223bab', '2adfe6c3-e02d-43d0-b139-182c3d809e30', 1, 8, 'ON THE WINGS OF A DOVE', '0000-0005-4E1A-000C-F-0000-0000-T', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '2adfe6c3-e02d-43d0-b139-182c3d809e30', '6a7a1871-f350-4df9-94e9-cb1c3f223bab', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: BONES (2006)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('150b757f-3b3f-45d5-a0c5-f90cddc15181', 'BONES', 'BONES', 2006, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('842e1822-0a3a-4670-858a-0440268fc027', '150b757f-3b3f-45d5-a0c5-f90cddc15181', 1, 13, 'THE WOMAN IN THE GARDEN', '0000-0002-2B79-006A-M-0000-0000-8', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '150b757f-3b3f-45d5-a0c5-f90cddc15181', '842e1822-0a3a-4670-858a-0440268fc027', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: MIND OF MENCIA (2006)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('8d88042a-b621-425f-aea5-64f6d2143ea7', 'MIND OF MENCIA', 'MIND OF MENCIA', 2006, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('c5179704-890e-46b4-9632-b4ed3ac9cdf4', '8d88042a-b621-425f-aea5-64f6d2143ea7', 2, 6, 'THE SERRANOS', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '8d88042a-b621-425f-aea5-64f6d2143ea7', 'c5179704-890e-46b4-9632-b4ed3ac9cdf4', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: GENERAL HOSPITAL (2006)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('58394417-9a87-4c9e-876a-626820236892', 'GENERAL HOSPITAL', 'GENERAL HOSPITAL', 2006, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('5afcc5bb-b0af-4507-a829-dd5c2fb11629', '58394417-9a87-4c9e-876a-626820236892', 1, 10903, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '58394417-9a87-4c9e-876a-626820236892', '5afcc5bb-b0af-4507-a829-dd5c2fb11629', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('8610df87-a7d7-46b6-aab3-e6528698f777', '58394417-9a87-4c9e-876a-626820236892', 1, 10904, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '58394417-9a87-4c9e-876a-626820236892', '8610df87-a7d7-46b6-aab3-e6528698f777', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('847bc2fa-9800-4f1b-b90e-35e641a2a3da', '58394417-9a87-4c9e-876a-626820236892', 1, 10916, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '58394417-9a87-4c9e-876a-626820236892', '847bc2fa-9800-4f1b-b90e-35e641a2a3da', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('960718da-fbc7-4f3d-9aee-7a0f56248042', '58394417-9a87-4c9e-876a-626820236892', 1, 10917, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '58394417-9a87-4c9e-876a-626820236892', '960718da-fbc7-4f3d-9aee-7a0f56248042', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('4cc19f39-9975-416f-80ba-b89391eaffaa', '58394417-9a87-4c9e-876a-626820236892', 1, 10969, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '58394417-9a87-4c9e-876a-626820236892', '4cc19f39-9975-416f-80ba-b89391eaffaa', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('93c60f87-47ce-412a-bdcf-21925db4b032', '58394417-9a87-4c9e-876a-626820236892', 1, 11199, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '58394417-9a87-4c9e-876a-626820236892', '93c60f87-47ce-412a-bdcf-21925db4b032', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('7949a16f-338f-40b9-b535-58fa8f57c739', '58394417-9a87-4c9e-876a-626820236892', 1, 11200, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '58394417-9a87-4c9e-876a-626820236892', '7949a16f-338f-40b9-b535-58fa8f57c739', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('7c1e796c-b197-452b-83ae-033e153461dc', '58394417-9a87-4c9e-876a-626820236892', 1, 11201, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '58394417-9a87-4c9e-876a-626820236892', '7c1e796c-b197-452b-83ae-033e153461dc', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('39184821-8ec8-4e19-ad0e-9b1ccd9a840a', '58394417-9a87-4c9e-876a-626820236892', 1, 11202, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '58394417-9a87-4c9e-876a-626820236892', '39184821-8ec8-4e19-ad0e-9b1ccd9a840a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('7553c0ea-a7de-4da9-9e12-4edcc71906e0', '58394417-9a87-4c9e-876a-626820236892', 1, 11203, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '58394417-9a87-4c9e-876a-626820236892', '7553c0ea-a7de-4da9-9e12-4edcc71906e0', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('ca7f5af3-5a9b-4e4e-87a5-ed11c6a2364b', '58394417-9a87-4c9e-876a-626820236892', 1, 11204, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '58394417-9a87-4c9e-876a-626820236892', 'ca7f5af3-5a9b-4e4e-87a5-ed11c6a2364b', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: GENERAL HOSPITAL (2007)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('1c6c521f-1510-4836-809d-257411ae9ea9', 'GENERAL HOSPITAL', 'GENERAL HOSPITAL', 2007, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('dbf11497-a20d-4054-82a7-c8d26a0732ca', '1c6c521f-1510-4836-809d-257411ae9ea9', 1, 11210, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1c6c521f-1510-4836-809d-257411ae9ea9', 'dbf11497-a20d-4054-82a7-c8d26a0732ca', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('ea6f998d-dc83-40d5-8dbe-b45a4132b31b', '1c6c521f-1510-4836-809d-257411ae9ea9', 1, 11211, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1c6c521f-1510-4836-809d-257411ae9ea9', 'ea6f998d-dc83-40d5-8dbe-b45a4132b31b', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('479f8070-d45d-448b-80ee-4cfe1fa2058c', '1c6c521f-1510-4836-809d-257411ae9ea9', 1, 11212, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1c6c521f-1510-4836-809d-257411ae9ea9', '479f8070-d45d-448b-80ee-4cfe1fa2058c', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('ad71d29a-0db4-47d3-822f-67e72824a42a', '1c6c521f-1510-4836-809d-257411ae9ea9', 1, 11213, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1c6c521f-1510-4836-809d-257411ae9ea9', 'ad71d29a-0db4-47d3-822f-67e72824a42a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('8cfa567c-375e-4105-b93b-c909d5eb67df', '1c6c521f-1510-4836-809d-257411ae9ea9', 1, 11217, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1c6c521f-1510-4836-809d-257411ae9ea9', '8cfa567c-375e-4105-b93b-c909d5eb67df', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('0a2a9c76-4f92-4636-81fc-1900cb66c9b5', '1c6c521f-1510-4836-809d-257411ae9ea9', 1, 11220, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1c6c521f-1510-4836-809d-257411ae9ea9', '0a2a9c76-4f92-4636-81fc-1900cb66c9b5', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('0f09c4cc-83db-457c-8153-c0046e700c05', '1c6c521f-1510-4836-809d-257411ae9ea9', 1, 11227, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1c6c521f-1510-4836-809d-257411ae9ea9', '0f09c4cc-83db-457c-8153-c0046e700c05', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('b29cdd50-b2fb-4fda-bbeb-36dece0aeba4', '1c6c521f-1510-4836-809d-257411ae9ea9', 1, 11228, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1c6c521f-1510-4836-809d-257411ae9ea9', 'b29cdd50-b2fb-4fda-bbeb-36dece0aeba4', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('7417b938-2008-455b-a36c-9646db5e2b79', '1c6c521f-1510-4836-809d-257411ae9ea9', 1, 11229, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1c6c521f-1510-4836-809d-257411ae9ea9', '7417b938-2008-455b-a36c-9646db5e2b79', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('1e859e34-61f7-4872-91a9-8764ab36b66d', '1c6c521f-1510-4836-809d-257411ae9ea9', 1, 11230, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1c6c521f-1510-4836-809d-257411ae9ea9', '1e859e34-61f7-4872-91a9-8764ab36b66d', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('ab0824f2-909b-43fd-b6f4-d27ae751559b', '1c6c521f-1510-4836-809d-257411ae9ea9', 1, 11231, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1c6c521f-1510-4836-809d-257411ae9ea9', 'ab0824f2-909b-43fd-b6f4-d27ae751559b', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('0179b77a-a825-4e00-9b1d-0cbdd507618b', '1c6c521f-1510-4836-809d-257411ae9ea9', 1, 11232, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1c6c521f-1510-4836-809d-257411ae9ea9', '0179b77a-a825-4e00-9b1d-0cbdd507618b', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('2d668208-d491-4331-b57a-c234c68a40f8', '1c6c521f-1510-4836-809d-257411ae9ea9', 1, 11233, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1c6c521f-1510-4836-809d-257411ae9ea9', '2d668208-d491-4331-b57a-c234c68a40f8', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('e9289632-85db-447b-b68d-24dba707b190', '1c6c521f-1510-4836-809d-257411ae9ea9', 1, 11234, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1c6c521f-1510-4836-809d-257411ae9ea9', 'e9289632-85db-447b-b68d-24dba707b190', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('562acc6f-3e0f-42a6-9f70-75cbf33816d0', '1c6c521f-1510-4836-809d-257411ae9ea9', 1, 11235, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1c6c521f-1510-4836-809d-257411ae9ea9', '562acc6f-3e0f-42a6-9f70-75cbf33816d0', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('a125a097-3c75-4816-bf1a-8d9644c64c1c', '1c6c521f-1510-4836-809d-257411ae9ea9', 1, 11236, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1c6c521f-1510-4836-809d-257411ae9ea9', 'a125a097-3c75-4816-bf1a-8d9644c64c1c', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('44268cfa-528c-4a0a-9462-e9c01b846d2f', '1c6c521f-1510-4836-809d-257411ae9ea9', 1, 11237, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1c6c521f-1510-4836-809d-257411ae9ea9', '44268cfa-528c-4a0a-9462-e9c01b846d2f', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('0d29fbab-1a82-414b-981c-e57613bc1a3b', '1c6c521f-1510-4836-809d-257411ae9ea9', 1, 11238, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1c6c521f-1510-4836-809d-257411ae9ea9', '0d29fbab-1a82-414b-981c-e57613bc1a3b', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('41f28ac6-e30c-450a-9e78-2776c28cf3a1', '1c6c521f-1510-4836-809d-257411ae9ea9', 1, 11239, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1c6c521f-1510-4836-809d-257411ae9ea9', '41f28ac6-e30c-450a-9e78-2776c28cf3a1', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('93056cb3-9d6c-4485-bb23-58fbb7af66e4', '1c6c521f-1510-4836-809d-257411ae9ea9', 1, 11241, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1c6c521f-1510-4836-809d-257411ae9ea9', '93056cb3-9d6c-4485-bb23-58fbb7af66e4', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('122381c8-0f76-4e12-afdc-3d2505c4fe26', '1c6c521f-1510-4836-809d-257411ae9ea9', 1, 11248, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1c6c521f-1510-4836-809d-257411ae9ea9', '122381c8-0f76-4e12-afdc-3d2505c4fe26', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: INFILTRATO SPECIALE 2 (2007)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('02f0c680-4a47-4532-afdf-5619a7c42abf', 'INFILTRATO SPECIALE 2', 'HALF PAST DEAD 2', 2007, 'film'::tipo_opera, '0000-0001-951F-0000-A-0000-0000-7', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '02f0c680-4a47-4532-afdf-5619a7c42abf', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: TORTURED (2007)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('aeafe9fa-e9e8-4cfa-8c95-598d092b25d1', 'TORTURED', 'TORTURED', 2007, 'film'::tipo_opera, '0000-0001-E572-0000-F-0000-0000-T', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'aeafe9fa-e9e8-4cfa-8c95-598d092b25d1', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: SHARK - GIUSTIZIA A TUTTI I COSTI (2007)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('b2fbabb7-6225-4e7b-9c9e-af9c635af6b2', 'SHARK - GIUSTIZIA A TUTTI I COSTI', 'SHARK', 2007, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('7795afbe-b36c-449f-8076-31ba0cbc8ada', 'b2fbabb7-6225-4e7b-9c9e-af9c635af6b2', 2, 2, 'FOR WHOM THE SKEL ROLLS', '0000-0002-8E6A-0017-U-0000-0000-L', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'b2fbabb7-6225-4e7b-9c9e-af9c635af6b2', '7795afbe-b36c-449f-8076-31ba0cbc8ada', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: LIFE (2007)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('f09437dd-2e0b-4bac-9111-9d9decf9a3b6', 'LIFE', 'LIFE', 2007, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('88338b9e-85c3-47aa-a8f4-94da1a08790f', 'f09437dd-2e0b-4bac-9111-9d9decf9a3b6', 1, 3, 'LET HER GO', '0000-0002-93E7-0019-C-0000-0000-1', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'f09437dd-2e0b-4bac-9111-9d9decf9a3b6', '88338b9e-85c3-47aa-a8f4-94da1a08790f', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: NEVER DOWN (2007)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('68363b8e-7a12-4a05-ba6f-7e6d32cc098a', 'NEVER DOWN', 'NEVER DOWN', 2007, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '68363b8e-7a12-4a05-ba6f-7e6d32cc098a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: CSI - SCENA DEL CRIMINE (2008)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('1547eb4c-f01f-466e-91d5-22e3011eb583', 'CSI - SCENA DEL CRIMINE', 'CSI: CRIME SCENE INVESTIGATION', 2008, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('8ac332fd-de15-4831-af58-a92c1cba0659', '1547eb4c-f01f-466e-91d5-22e3011eb583', 8, 12, 'GRISSOM''S DIVINE COMEDY', '0000-0000-DC79-014C-1-0000-0000-Y', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1547eb4c-f01f-466e-91d5-22e3011eb583', '8ac332fd-de15-4831-af58-a92c1cba0659', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: THE CLEANER (2008)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('cd3e7d1a-cbb6-4ff0-b6f0-2b44fd8518a7', 'THE CLEANER', 'THE CLEANER', 2008, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('5308ad35-074e-4ed8-9b17-be0df7ba9153', 'cd3e7d1a-cbb6-4ff0-b6f0-2b44fd8518a7', 1, 5, 'HERE COMES THE BOOM', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'cd3e7d1a-cbb6-4ff0-b6f0-2b44fd8518a7', '5308ad35-074e-4ed8-9b17-be0df7ba9153', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: DEATH RACE (2008)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('10c125ad-88f8-4728-b41f-ac22f3ae85e7', 'DEATH RACE', 'DEATH RACE', 2008, 'film'::tipo_opera, '0000-0001-DDE1-0000-8-0000-0007-0', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '10c125ad-88f8-4728-b41f-ac22f3ae85e7', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: AUTOPSY (2008)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('9a6095e1-2ef2-49ce-8d89-f06ae50afd04', 'AUTOPSY', 'AUTOPSY', 2008, 'film'::tipo_opera, '0000-0002-7CA8-0000-3-0000-0000-S', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '9a6095e1-2ef2-49ce-8d89-f06ae50afd04', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: NIP/TUCK (2003)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('3f73e3ad-3474-4b3f-ae63-f80a5ca64dec', 'NIP/TUCK', 'NIP/TUCK', 2003, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('a53b5df5-9c7a-441b-a658-f0293d6507ca', '3f73e3ad-3474-4b3f-ae63-f80a5ca64dec', 1, 1, 'PILOT', '0000-0001-56E8-0011-S-0000-0000-R', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '3f73e3ad-3474-4b3f-ae63-f80a5ca64dec', 'a53b5df5-9c7a-441b-a658-f0293d6507ca', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('fdbc19b0-0b88-4101-96b7-14156c2ebb9b', '3f73e3ad-3474-4b3f-ae63-f80a5ca64dec', 1, 12, 'ANTONIA RAMOS', '0000-0001-56E8-001C-6-0000-0000-J', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '3f73e3ad-3474-4b3f-ae63-f80a5ca64dec', 'fdbc19b0-0b88-4101-96b7-14156c2ebb9b', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('c2042692-2aa1-4357-907c-a24146f6c59c', '3f73e3ad-3474-4b3f-ae63-f80a5ca64dec', 1, 13, 'ESCOBAR GALLARDO', '0000-0001-56E8-001D-4-0000-0000-P', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '3f73e3ad-3474-4b3f-ae63-f80a5ca64dec', 'c2042692-2aa1-4357-907c-a24146f6c59c', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: NIP/TUCK (2004)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('855c9488-b75f-4615-91d7-8d39cfcaf701', 'NIP/TUCK', 'NIP/TUCK', 2004, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('5eae36b6-0787-491f-bbac-0e7872c247b8', '855c9488-b75f-4615-91d7-8d39cfcaf701', 2, 16, 'JOAN RIVERS', '0000-0001-56E8-0009-G-0000-0000-Q', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '855c9488-b75f-4615-91d7-8d39cfcaf701', '5eae36b6-0787-491f-bbac-0e7872c247b8', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: NIP/TUCK (2006)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('9eba67c1-3b37-4794-9100-906c8d1bf805', 'NIP/TUCK', 'NIP/TUCK', 2006, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('1dc1554d-5d09-4f1e-aec4-1c5d3f16a2d5', '9eba67c1-3b37-4794-9100-906c8d1bf805', 4, 4, 'SHARI NOBLE', '0000-0001-56E8-0030-M-0000-0000-8', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '9eba67c1-3b37-4794-9100-906c8d1bf805', '1dc1554d-5d09-4f1e-aec4-1c5d3f16a2d5', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('19e46bda-fd25-4187-94d5-d1f7b7137b6d', '9eba67c1-3b37-4794-9100-906c8d1bf805', 4, 6, 'FAITH WOLPER, PHD', '0000-0001-56E8-0032-I-0000-0000-K', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '9eba67c1-3b37-4794-9100-906c8d1bf805', '19e46bda-fd25-4187-94d5-d1f7b7137b6d', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('d5936241-3b75-46f1-9d95-bf5697c53e9f', '9eba67c1-3b37-4794-9100-906c8d1bf805', 4, 10, 'MERRIL BOBOLIT', '0000-0001-56E8-0036-A-0000-0000-7', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '9eba67c1-3b37-4794-9100-906c8d1bf805', 'd5936241-3b75-46f1-9d95-bf5697c53e9f', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('afec9d0f-9736-407d-83d9-c7a10db1e512', '9eba67c1-3b37-4794-9100-906c8d1bf805', 4, 14, 'WILLY WARD', '0000-0001-56E8-003A-2-0000-0000-V', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '9eba67c1-3b37-4794-9100-906c8d1bf805', 'afec9d0f-9736-407d-83d9-c7a10db1e512', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('5bd43af3-bc7e-4ec6-86b1-8dbab2328677', '9eba67c1-3b37-4794-9100-906c8d1bf805', 4, 15, 'GALA GALLARDO', '0000-0001-56E8-003B-Z-0000-0000-6', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '9eba67c1-3b37-4794-9100-906c8d1bf805', '5bd43af3-bc7e-4ec6-86b1-8dbab2328677', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: NIP/TUCK (2010)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('02b0db2a-c66c-412b-9479-c35911f7a994', 'NIP/TUCK', 'NIP/TUCK', 2010, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('95e8b237-2c2b-4760-b29a-597ef955d1b7', '02b0db2a-c66c-412b-9479-c35911f7a994', 6, 15, 'VIRGINIA HAYES', '0000-0001-56E8-0060-A-0000-0000-7', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '02b0db2a-c66c-412b-9479-c35911f7a994', '95e8b237-2c2b-4760-b29a-597ef955d1b7', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: CHASE (2010)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('dc52eda6-4f76-46cd-8ce7-2deb423ae4c1', 'CHASE', 'CHASE', 2010, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('fcdbc1b7-c501-4ad8-b13a-9e53f407b9c4', 'dc52eda6-4f76-46cd-8ce7-2deb423ae4c1', 1, 2, 'REPO', '0000-0003-AE17-0002-8-0000-0000-D', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'dc52eda6-4f76-46cd-8ce7-2deb423ae4c1', 'fcdbc1b7-c501-4ad8-b13a-9e53f407b9c4', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: THE WRATH OF CAIN (2010)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('88d88489-f5a1-40a9-baa4-bddcb42ccc5a', 'THE WRATH OF CAIN', 'THE WRATH OF CAIN', 2010, 'film'::tipo_opera, '0000-0002-A3C7-0000-R-0000-0000-U', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '88d88489-f5a1-40a9-baa4-bddcb42ccc5a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: CRIMINAL MINDS: SUSPECT BEHAVIOR (2011)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('9567909c-77ce-4254-bfe6-4dec0607178f', 'CRIMINAL MINDS: SUSPECT BEHAVIOR', 'CRIMINAL MINDS: SUSPECT BEHAVIOR', 2011, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('44ce7521-3b12-42fd-87dc-aafadd99e9ec', '9567909c-77ce-4254-bfe6-4dec0607178f', 1, 11, 'STRAYS', '0000-0006-F418-000A-K-0000-0000-E', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '9567909c-77ce-4254-bfe6-4dec0607178f', '44ce7521-3b12-42fd-87dc-aafadd99e9ec', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: FEMME FATALE: SESSO E CRIMINI (2011)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('3e100552-7105-49c9-bad8-4f72c573bca1', 'FEMME FATALE: SESSO E CRIMINI', 'FEMME FATALE', 2011, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('8d78be81-be5c-443c-8c1b-07a6714a5de2', '3e100552-7105-49c9-bad8-4f72c573bca1', 1, 2, 'BAD MEDICINE', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '3e100552-7105-49c9-bad8-4f72c573bca1', '8d78be81-be5c-443c-8c1b-07a6714a5de2', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: POOLBOY: DROWING OUT THE FURY (2011)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('37dcd130-f51a-4deb-9acc-83f22252b6ca', 'POOLBOY: DROWING OUT THE FURY', 'POOLBOY: DROWING OUT THE FURY', 2011, 'film'::tipo_opera, '0000-0002-E597-0000-T-0000-0000-O', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '37dcd130-f51a-4deb-9acc-83f22252b6ca', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: DOUBLE TAP (2011)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('a84f8d44-3df0-45cf-8503-ebc472b9ae08', 'DOUBLE TAP', 'DOUBLE TAP', 2011, 'film'::tipo_opera, '0000-0005-ED57-0000-J-0000-0000-H', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'a84f8d44-3df0-45cf-8503-ebc472b9ae08', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: CSI: MIAMI (2006)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('92fd67fe-0363-49bb-bf07-9ef2f98aeef4', 'CSI: MIAMI', 'CSI: MIAMI', 2006, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('54c46e96-8e6b-414f-8aff-e5de3f8e08b0', '92fd67fe-0363-49bb-bf07-9ef2f98aeef4', 4, 24, 'RAMPAGE', '0000-0000-DC7A-0067-K-0000-0000-E', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '92fd67fe-0363-49bb-bf07-9ef2f98aeef4', '54c46e96-8e6b-414f-8aff-e5de3f8e08b0', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('c1f2b516-88fd-4dde-b9ec-6fc95421eeb5', '92fd67fe-0363-49bb-bf07-9ef2f98aeef4', 4, 25, 'ONE OF OUR OWN', '0000-0000-DC7A-0068-I-0000-0000-K', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '92fd67fe-0363-49bb-bf07-9ef2f98aeef4', 'c1f2b516-88fd-4dde-b9ec-6fc95421eeb5', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: CSI: MIAMI (2010)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('d7f3922d-279e-4742-8d6f-c3ac3c601652', 'CSI: MIAMI', 'CSI: MIAMI', 2010, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('08382d12-9653-4706-8e2b-ef08c9a238ce', 'd7f3922d-279e-4742-8d6f-c3ac3c601652', 9, 4, 'MANHUNT', '0000-0000-DC7A-00AD-R-0000-0000-U', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'd7f3922d-279e-4742-8d6f-c3ac3c601652', '08382d12-9653-4706-8e2b-ef08c9a238ce', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: CSI: MIAMI (2011)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('e31579ee-0791-4762-bbea-b861ac3a3412', 'CSI: MIAMI', 'CSI: MIAMI', 2011, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('1f75efa3-8b3b-4fd7-8619-23088a59eff9', 'e31579ee-0791-4762-bbea-b861ac3a3412', 9, 13, 'LAST STAND', '0000-0000-DC7A-00AC-T-0000-0000-O', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'e31579ee-0791-4762-bbea-b861ac3a3412', '1f75efa3-8b3b-4fd7-8619-23088a59eff9', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('b0509ad0-4ee5-473b-a58a-b2c2edba5554', 'e31579ee-0791-4762-bbea-b861ac3a3412', 10, 5, 'KILLER REGRETS', '0000-0000-DC7A-009A-2-0000-0000-V', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'e31579ee-0791-4762-bbea-b861ac3a3412', 'b0509ad0-4ee5-473b-a58a-b2c2edba5554', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: IN PLAIN SIGHT - PROTEZIONE TESTIMONI (2011)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('0adceef9-d975-4920-a69e-26ee6e8247cb', 'IN PLAIN SIGHT - PROTEZIONE TESTIMONI', 'IN PLAIN SIGHT - PROTEZIONE TESTIMONI', 2011, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('36354baf-7fd5-43d7-aa2e-6ac0f71b9a85', '0adceef9-d975-4920-a69e-26ee6e8247cb', 4, 10, 'GIRLS, INTERRUPTED', '0000-0002-8D05-0027-W-0000-0000-F', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '0adceef9-d975-4920-a69e-26ee6e8247cb', '36354baf-7fd5-43d7-aa2e-6ac0f71b9a85', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: IN PLAIN SIGHT - PROTEZIONE TESTIMONI (2012)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('e69df3fe-f6fe-42f0-9500-e9f0ec36c14b', 'IN PLAIN SIGHT - PROTEZIONE TESTIMONI', 'IN PLAIN SIGHT - PROTEZIONE TESTIMONI', 2012, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('4a6e1056-2453-4871-9c4a-1e68c2d76c1b', 'e69df3fe-f6fe-42f0-9500-e9f0ec36c14b', 5, 2, 'FOUR MARSHALS AND A BABY', '0000-0002-8D05-002B-O-0000-0000-2', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'e69df3fe-f6fe-42f0-9500-e9f0ec36c14b', '4a6e1056-2453-4871-9c4a-1e68c2d76c1b', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: JUNKIE (2012)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('c1f83808-8367-4102-9abd-e344f6d3cb6e', 'JUNKIE', 'JUNKIE', 2012, 'film'::tipo_opera, '0000-0004-E001-0000-6-0000-0000-J', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'c1f83808-8367-4102-9abd-e344f6d3cb6e', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: TOMORROW YOU'RE GONE (2012)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('9a3c3b42-c51e-4486-9337-988cfb4372ed', 'TOMORROW YOU''RE GONE', 'TOMORROW YOU''RE GONE', 2012, 'film'::tipo_opera, '0000-0003-A3E6-0000-S-0000-0000-R', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '9a3c3b42-c51e-4486-9337-988cfb4372ed', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: BAD SAMARITANS (2013)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('93fa9863-157b-4c7b-b109-c4eb7b76a993', 'BAD SAMARITANS', 'BAD SAMARITANS', 2013, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('70309729-0716-4f90-9486-668b482ab106', '93fa9863-157b-4c7b-b109-c4eb7b76a993', 1, 1, 'PILOT', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '93fa9863-157b-4c7b-b109-c4eb7b76a993', '70309729-0716-4f90-9486-668b482ab106', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('84fa0c98-8a43-495e-9dfd-68bdca117483', '93fa9863-157b-4c7b-b109-c4eb7b76a993', 1, 2, 'DOG POUND', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '93fa9863-157b-4c7b-b109-c4eb7b76a993', '84fa0c98-8a43-495e-9dfd-68bdca117483', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('64a38c90-03b4-4da1-b0e2-57c98e40a703', '93fa9863-157b-4c7b-b109-c4eb7b76a993', 1, 3, 'TRASH MOUNTAIN', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '93fa9863-157b-4c7b-b109-c4eb7b76a993', '64a38c90-03b4-4da1-b0e2-57c98e40a703', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('044d79c1-0311-4f54-9c5c-655e0cc9c93c', '93fa9863-157b-4c7b-b109-c4eb7b76a993', 1, 4, 'MIDDLE SCHOOL DETENTION', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '93fa9863-157b-4c7b-b109-c4eb7b76a993', '044d79c1-0311-4f54-9c5c-655e0cc9c93c', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('8460662c-3ee7-445b-bc76-d01ecf8c6698', '93fa9863-157b-4c7b-b109-c4eb7b76a993', 1, 5, 'WENDELL''S PARTY', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '93fa9863-157b-4c7b-b109-c4eb7b76a993', '8460662c-3ee7-445b-bc76-d01ecf8c6698', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: BACK IN THE GAME (2013)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('93a48325-792e-4811-b4b7-69f5326d6092', 'BACK IN THE GAME', 'BACK IN THE GAME', 2013, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('9e7c7f17-3508-4c2f-9563-3e8bf94eac11', '93a48325-792e-4811-b4b7-69f5326d6092', 1, 2, 'STAY IN OR BAIL OUT', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '93a48325-792e-4811-b4b7-69f5326d6092', '9e7c7f17-3508-4c2f-9563-3e8bf94eac11', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: A CERTAIN JUSTICE (2014)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('265167d9-67c6-4be1-bb9b-40422810478f', 'A CERTAIN JUSTICE', 'A CERTAIN JUSTICE', 2014, 'film'::tipo_opera, '0000-0003-CABE-0000-9-0000-0000-A', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '265167d9-67c6-4be1-bb9b-40422810478f', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: JURASSIC CITY (2015)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('fa072787-7b91-4b00-98f2-d0352f28f6a4', 'JURASSIC CITY', 'JURASSIC CITY', 2015, 'film'::tipo_opera, '0000-0005-0F67-0000-F-0000-0000-T', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'fa072787-7b91-4b00-98f2-d0352f28f6a4', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: PARLOR (2015)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('185cad73-a16d-41d3-904f-fed34b6be708', 'PARLOR', 'PARLOR', 2015, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '185cad73-a16d-41d3-904f-fed34b6be708', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: HUMAN CENTIPEDE III: FINAL SEQUENCE (2015)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('dd4551b1-5fca-47c5-87bf-e289d2afef53', 'HUMAN CENTIPEDE III: FINAL SEQUENCE', 'THE HUMAN CENTIPEDE III (FINAL SEQUENCE)', 2015, 'film'::tipo_opera, '0000-0004-2439-0000-9-0000-0000-A', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'dd4551b1-5fca-47c5-87bf-e289d2afef53', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: EVERLASTING (2016)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('d49848ae-464c-4391-b600-870ff4edf7f6', 'EVERLASTING', 'EVERLASTING', 2016, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'd49848ae-464c-4391-b600-870ff4edf7f6', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: TIME (2016)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('12631159-b87d-46b7-b875-1f96b6068a53', 'TIME', 'TIME', 2016, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '12631159-b87d-46b7-b875-1f96b6068a53', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: NIGHTBLADE (2016)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('1c40a5fd-f614-4312-8ea4-5dc7fd4c8db5', 'NIGHTBLADE', 'NIGHTBLADE', 2016, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1c40a5fd-f614-4312-8ea4-5dc7fd4c8db5', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: CALICO SKIES (2016)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('77ac300a-0c1c-4d0b-a6d1-4ad636f1a3d0', 'CALICO SKIES', 'CALICO SKIES', 2016, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '77ac300a-0c1c-4d0b-a6d1-4ad636f1a3d0', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: SECRETS OF DECEPTION (2017)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('27a99d05-2a79-49b5-a565-2eb918e38fdf', 'SECRETS OF DECEPTION', 'SECRETS OF DECEPTION', 2017, 'film'::tipo_opera, '0000-0004-91AC-0000-N-0000-0000-5', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '27a99d05-2a79-49b5-a565-2eb918e38fdf', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: THE KROKODIL CHRONICLES (2017)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('534fa33f-0627-4027-a6f8-8bfcb04a8104', 'THE KROKODIL CHRONICLES', 'THE KROKODIL CHRONICLES', 2017, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '534fa33f-0627-4027-a6f8-8bfcb04a8104', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: HENRI: FOR THE SAKE OF LOVE AND JUSTICE (2017)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('baac8a4c-85f3-42a5-ac50-e18c5d6d5be0', 'HENRI: FOR THE SAKE OF LOVE AND JUSTICE', 'HENRI: FOR THE SAKE OF LOVE AND JUSTICE', 2017, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'baac8a4c-85f3-42a5-ac50-e18c5d6d5be0', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: PSYCH: THE MOVIE (2017)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('8c7f76bb-7fd1-4ca5-b159-287c7e6ee159', 'PSYCH: THE MOVIE', 'PSYCH: THE MOVIE', 2017, 'film'::tipo_opera, '0000-0004-7F40-0000-7-0000-0000-G', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '8c7f76bb-7fd1-4ca5-b159-287c7e6ee159', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: BLOOD CIRCUS (2017)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('d395bd90-c121-47ae-bd33-7d09d18b3253', 'BLOOD CIRCUS', 'BLOOD CIRCUS', 2017, 'film'::tipo_opera, '0000-0005-8403-0000-F-0000-0000-T', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'd395bd90-c121-47ae-bd33-7d09d18b3253', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: JASON'S LETTER (2017)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('36b03ae1-dd0d-46d4-8f31-1a4f8356910f', 'JASON''S LETTER', 'JASON''S LETTER', 2017, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '36b03ae1-dd0d-46d4-8f31-1a4f8356910f', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: DISILLUSIONED (2018)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('a42ef545-6edf-440c-a665-b9fc30f4f708', 'DISILLUSIONED', 'DISILLUSIONED', 2018, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'a42ef545-6edf-440c-a665-b9fc30f4f708', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: CYNTHIA (2018)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('59eb276e-9ee1-4ead-874c-cd2ed2f5b77f', 'CYNTHIA', 'CYNTHIA', 2018, 'film'::tipo_opera, '0000-0006-C5DD-0000-6-0000-0000-J', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '59eb276e-9ee1-4ead-874c-cd2ed2f5b77f', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: SILENCER (2018)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('832b8ac3-2a01-464e-aff8-f8c5d5064976', 'SILENCER', 'SILENCER', 2018, 'film'::tipo_opera, '0000-0004-E63D-0000-V-0000-0000-I', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '832b8ac3-2a01-464e-aff8-f8c5d5064976', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: ALMOST HOME (2018)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('1d1a42b5-226c-4d7e-afaf-ae3bf5f37c39', 'ALMOST HOME', 'ALMOST HOME', 2018, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '1d1a42b5-226c-4d7e-afaf-ae3bf5f37c39', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: IL CORRIERE - THE MULE (2018)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('d3d47c12-a7c6-418b-9ddd-cd113e959774', 'IL CORRIERE - THE MULE', 'THE MULE', 2018, 'film'::tipo_opera, '0000-0005-0819-0000-W-0000-0000-F', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', 'd3d47c12-a7c6-418b-9ddd-cd113e959774', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: MERCY MANOR (2019)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('462673a5-c6c1-4878-8d52-6847725cc7aa', 'MERCY MANOR', 'MERCY MANOR', 2019, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('622febe6-57a5-410c-bc19-ada4effbbfa7', '462673a5-c6c1-4878-8d52-6847725cc7aa', 1, 1, 'PILOT', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '5b26234d-fc63-4096-ad4c-d6e2f5d4a2d7', '462673a5-c6c1-4878-8d52-6847725cc7aa', '622febe6-57a5-410c-bc19-ada4effbbfa7', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- ============================================================
-- PARÈ MICHAEL (artista_id: 985b029b-e721-49a5-9e63-6d2f7dd0164d)
-- Missing operas: 16
-- Missing episodes on existing operas: 51
-- ============================================================

-- Opera: DR. HOUSE - MEDICAL DIVISION (2011)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('4e3aee4f-9e60-4d95-8118-6d5d63ef4e9b', 'DR. HOUSE - MEDICAL DIVISION', 'HOUSE M.D.', 2011, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('38b0605f-ea4b-4685-a973-ba74b7c381b2', '4e3aee4f-9e60-4d95-8118-6d5d63ef4e9b', 8, 1, 'TWENTY VICODIN', '0000-0002-7BAE-009A-T-0000-0000-O', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '4e3aee4f-9e60-4d95-8118-6d5d63ef4e9b', '38b0605f-ea4b-4685-a973-ba74b7c381b2', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: THE LAST BIG SAVE (None)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('5a75df59-f97c-4549-a2d9-54a0e6447610', 'THE LAST BIG SAVE', 'THE LAST BIG SAVE', NULL, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '5a75df59-f97c-4549-a2d9-54a0e6447610', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: STARHUNTER REDUX (2018)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('c5e9ba7f-dd39-45b5-809b-48b8b8b3f86f', 'STARHUNTER REDUX', 'STARHUNTER REDUX', 2018, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('8661e09f-95e1-4728-ae52-724a25bcadc4', 'c5e9ba7f-dd39-45b5-809b-48b8b8b3f86f', 1, NULL, 'STAR CROSSED', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'c5e9ba7f-dd39-45b5-809b-48b8b8b3f86f', '8661e09f-95e1-4728-ae52-724a25bcadc4', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('7fd6fd5f-8fe9-41a2-9502-54031cb716e7', 'c5e9ba7f-dd39-45b5-809b-48b8b8b3f86f', 1, NULL, 'THE DIVINITY CLUSTER', '0000-0000-C5E4-000A-0-0000-0000-3', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'c5e9ba7f-dd39-45b5-809b-48b8b8b3f86f', '7fd6fd5f-8fe9-41a2-9502-54031cb716e7', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('83c929db-7da7-4c3a-8783-4c0432b68639', 'c5e9ba7f-dd39-45b5-809b-48b8b8b3f86f', 2, NULL, 'REBIRTH', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'c5e9ba7f-dd39-45b5-809b-48b8b8b3f86f', '83c929db-7da7-4c3a-8783-4c0432b68639', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: STARHUNTER (2001)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('8db07353-7c01-4ce4-9c91-501eb4602d35', 'STARHUNTER', 'STARHUNTER', 2001, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('422c672d-f8be-41e5-b9e7-7fedeaf0961f', '8db07353-7c01-4ce4-9c91-501eb4602d35', 1, NULL, 'CELL GAME', '0000-0000-C5E4-0014-7-0000-0000-G', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '8db07353-7c01-4ce4-9c91-501eb4602d35', '422c672d-f8be-41e5-b9e7-7fedeaf0961f', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('f874a0ce-0e0f-444d-865a-21de37a3f33a', '8db07353-7c01-4ce4-9c91-501eb4602d35', 1, NULL, 'BLACK LIGHT', '0000-0000-C5E4-0016-3-0000-0000-S', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '8db07353-7c01-4ce4-9c91-501eb4602d35', 'f874a0ce-0e0f-444d-865a-21de37a3f33a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('6a24c7bd-eea4-4251-ac73-90cacb59054e', '8db07353-7c01-4ce4-9c91-501eb4602d35', 1, NULL, 'GOODBYE, SO LONG', '0000-0000-C5E4-0004-B-0000-0000-4', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '8db07353-7c01-4ce4-9c91-501eb4602d35', '6a24c7bd-eea4-4251-ac73-90cacb59054e', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('6fd92cc3-0eba-49c4-812a-cfa6968a22a3', '8db07353-7c01-4ce4-9c91-501eb4602d35', 1, NULL, 'THE MOST WANTED MAN', '0000-0000-C5E4-0010-F-0000-0000-T', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '8db07353-7c01-4ce4-9c91-501eb4602d35', '6fd92cc3-0eba-49c4-812a-cfa6968a22a3', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('aa190c4b-488a-4aeb-96e5-f01a912939b6', '8db07353-7c01-4ce4-9c91-501eb4602d35', 1, NULL, 'HALF DENSE PLAYERS', '0000-0000-C5E4-0011-D-0000-0000-Z', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '8db07353-7c01-4ce4-9c91-501eb4602d35', 'aa190c4b-488a-4aeb-96e5-f01a912939b6', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('0f538401-1f4b-49fa-bfc0-4c9fb36e3c9c', '8db07353-7c01-4ce4-9c91-501eb4602d35', 1, NULL, 'DARK AND STORMY NIGHT', '0000-0000-C5E4-0002-F-0000-0000-T', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '8db07353-7c01-4ce4-9c91-501eb4602d35', '0f538401-1f4b-49fa-bfc0-4c9fb36e3c9c', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('35c6e67a-9a12-4c44-9656-27f48007f1b8', '8db07353-7c01-4ce4-9c91-501eb4602d35', 1, NULL, 'SUPER MAX', '0000-0000-C5E4-0009-1-0000-0000-Y', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '8db07353-7c01-4ce4-9c91-501eb4602d35', '35c6e67a-9a12-4c44-9656-27f48007f1b8', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('9c27a43f-df93-4d62-94cd-bccec77c4f1b', '8db07353-7c01-4ce4-9c91-501eb4602d35', 1, NULL, 'A TWIST IN TIME', '0000-0000-C5E4-0006-7-0000-0000-G', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '8db07353-7c01-4ce4-9c91-501eb4602d35', '9c27a43f-df93-4d62-94cd-bccec77c4f1b', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('851666c3-0e18-45f2-bfb6-76569056f8be', '8db07353-7c01-4ce4-9c91-501eb4602d35', 1, NULL, 'EAT SIN', '0000-0000-C5E4-0013-9-0000-0000-A', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '8db07353-7c01-4ce4-9c91-501eb4602d35', '851666c3-0e18-45f2-bfb6-76569056f8be', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('d174e4bc-4f8f-45ae-bd4d-c46984b99257', '8db07353-7c01-4ce4-9c91-501eb4602d35', 1, NULL, 'BAD GIRLS', '0000-0000-C5E4-0001-H-0000-0000-N', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '8db07353-7c01-4ce4-9c91-501eb4602d35', 'd174e4bc-4f8f-45ae-bd4d-c46984b99257', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('bb3268dc-4612-4c6e-9a35-7f864ae3f074', '8db07353-7c01-4ce4-9c91-501eb4602d35', 1, NULL, 'BAD SEED', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '8db07353-7c01-4ce4-9c91-501eb4602d35', 'bb3268dc-4612-4c6e-9a35-7f864ae3f074', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('65af3f79-1436-482f-a20b-7aed17686a03', '8db07353-7c01-4ce4-9c91-501eb4602d35', 1, NULL, 'TRAVIS', '0000-0000-C5E4-0007-5-0000-0000-M', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '8db07353-7c01-4ce4-9c91-501eb4602d35', '65af3f79-1436-482f-a20b-7aed17686a03', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('6da9308b-2852-4f5b-bb72-3682cdf448f6', '8db07353-7c01-4ce4-9c91-501eb4602d35', 1, NULL, 'RESURRECTION', '0000-0000-C5E4-000C-W-0000-0000-F', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '8db07353-7c01-4ce4-9c91-501eb4602d35', '6da9308b-2852-4f5b-bb72-3682cdf448f6', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: STARHUNTER (2003)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('260e0b4a-935d-4fd6-b8ba-b06c2678fb4e', 'STARHUNTER', 'STARHUNTER', 2003, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('0caa976b-f8be-4935-8a5d-41af8eba0b76', '260e0b4a-935d-4fd6-b8ba-b06c2678fb4e', 2, NULL, 'REBIRTH', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '260e0b4a-935d-4fd6-b8ba-b06c2678fb4e', '0caa976b-f8be-4935-8a5d-41af8eba0b76', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('ce7f6140-c14d-4660-8acc-05a7e0a032d0', '260e0b4a-935d-4fd6-b8ba-b06c2678fb4e', 2, NULL, 'SUPERMAX REDUX', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '260e0b4a-935d-4fd6-b8ba-b06c2678fb4e', 'ce7f6140-c14d-4660-8acc-05a7e0a032d0', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('5453231c-9408-46bb-bceb-3130f9a22db0', '260e0b4a-935d-4fd6-b8ba-b06c2678fb4e', 2, NULL, 'THE PRISONER', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '260e0b4a-935d-4fd6-b8ba-b06c2678fb4e', '5453231c-9408-46bb-bceb-3130f9a22db0', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: SEVEN DAYS (2019)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('613e4243-57e0-467f-879f-ef9ae4f2a258', 'SEVEN DAYS', 'SEVEN DAYS', 2019, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('f9340782-1306-4c8f-9c33-61ef006ed499', '613e4243-57e0-467f-879f-ef9ae4f2a258', 1, 1, NULL, NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '613e4243-57e0-467f-879f-ef9ae4f2a258', 'f9340782-1306-4c8f-9c33-61ef006ed499', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: RALPH SUPERMAXI EROE (1981)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('9468272d-d9d7-42eb-8193-5502725d30ab', 'RALPH SUPERMAXI EROE', 'THE GREATEST AMERICAN HERO', 1981, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('401b24e7-de69-4888-b6e6-dbc53214d0af', '9468272d-d9d7-42eb-8193-5502725d30ab', 1, NULL, 'THE GREATEST AMERICAN HERO', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '9468272d-d9d7-42eb-8193-5502725d30ab', '401b24e7-de69-4888-b6e6-dbc53214d0af', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('a3da771d-ce64-4e0d-8f79-69019d4de873', '9468272d-d9d7-42eb-8193-5502725d30ab', 1, NULL, 'THE HIT CAR', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '9468272d-d9d7-42eb-8193-5502725d30ab', 'a3da771d-ce64-4e0d-8f79-69019d4de873', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('5f36381a-6708-46cd-a0db-42254217d117', '9468272d-d9d7-42eb-8193-5502725d30ab', 1, NULL, 'HERE''S LOOKING AT YOU, KID', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '9468272d-d9d7-42eb-8193-5502725d30ab', '5f36381a-6708-46cd-a0db-42254217d117', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('24c75d1b-dc74-4cb0-b77c-bbe4be21c1bf', '9468272d-d9d7-42eb-8193-5502725d30ab', 1, NULL, 'SATURDAY NIGHT ON SUNSET BOULEVARD', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '9468272d-d9d7-42eb-8193-5502725d30ab', '24c75d1b-dc74-4cb0-b77c-bbe4be21c1bf', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('22080f5c-9510-4b11-9b94-c380b6dcef0e', '9468272d-d9d7-42eb-8193-5502725d30ab', 1, NULL, 'MY HEROES HAVE ALWAYS BEEN COWBOYS', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '9468272d-d9d7-42eb-8193-5502725d30ab', '22080f5c-9510-4b11-9b94-c380b6dcef0e', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('8dd67de2-16e4-4f94-8094-d9ea0950e9d3', '9468272d-d9d7-42eb-8193-5502725d30ab', 1, NULL, 'FIRE MAN', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '9468272d-d9d7-42eb-8193-5502725d30ab', '8dd67de2-16e4-4f94-8094-d9ea0950e9d3', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('59ff2bfa-319a-4808-96d6-35ad3b4fc2cc', '9468272d-d9d7-42eb-8193-5502725d30ab', 1, NULL, 'THE BEST DESK SCENARIO', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '9468272d-d9d7-42eb-8193-5502725d30ab', '59ff2bfa-319a-4808-96d6-35ad3b4fc2cc', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('1c6db074-0fa6-47ab-8e92-37ca336ab49a', '9468272d-d9d7-42eb-8193-5502725d30ab', 2, NULL, 'THE TWO-HUNDRED-MILE-AN-HOUR FAST BALL', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '9468272d-d9d7-42eb-8193-5502725d30ab', '1c6db074-0fa6-47ab-8e92-37ca336ab49a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('39914bd9-3ab3-44d2-a546-c62b79bb549d', '9468272d-d9d7-42eb-8193-5502725d30ab', 2, NULL, 'OPERATION SPOILSPORT', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '9468272d-d9d7-42eb-8193-5502725d30ab', '39914bd9-3ab3-44d2-a546-c62b79bb549d', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('ec174648-0047-4284-9257-e73bbaa6ce91', '9468272d-d9d7-42eb-8193-5502725d30ab', 2, NULL, 'DON''T MESS AROUND WITH JIM', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '9468272d-d9d7-42eb-8193-5502725d30ab', 'ec174648-0047-4284-9257-e73bbaa6ce91', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('91b822bb-c627-4c69-af6a-ecc1c22250ea', '9468272d-d9d7-42eb-8193-5502725d30ab', 2, NULL, 'HOG WILD', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '9468272d-d9d7-42eb-8193-5502725d30ab', '91b822bb-c627-4c69-af6a-ecc1c22250ea', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('d3476392-4135-459a-8070-e2df99a3fad6', '9468272d-d9d7-42eb-8193-5502725d30ab', 2, NULL, 'CLASSICAL GAS', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '9468272d-d9d7-42eb-8193-5502725d30ab', 'd3476392-4135-459a-8070-e2df99a3fad6', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('c955351d-297b-41fa-821f-33a712e98a43', '9468272d-d9d7-42eb-8193-5502725d30ab', 2, NULL, 'THE BEAST IN THE BLACK', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '9468272d-d9d7-42eb-8193-5502725d30ab', 'c955351d-297b-41fa-821f-33a712e98a43', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('23e89aaf-8ce4-45b4-a96c-3452f08184e1', '9468272d-d9d7-42eb-8193-5502725d30ab', 2, NULL, 'THE LOST DIABLO', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '9468272d-d9d7-42eb-8193-5502725d30ab', '23e89aaf-8ce4-45b4-a96c-3452f08184e1', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: RALPH SUPERMAXI EROE (1982)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('591ef398-b263-4dbd-b3db-4e7f34a5c3c6', 'RALPH SUPERMAXI EROE', 'THE GREATEST AMERICAN HERO', 1982, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('4abb5703-8370-4c70-854b-ffa258489a4a', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', 2, NULL, 'PLAGUE', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', '4abb5703-8370-4c70-854b-ffa258489a4a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('4fbf1b99-8de8-46d8-a83f-4dc16dd6b6ee', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', 2, NULL, 'TRAIN OF THOUGHT', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', '4fbf1b99-8de8-46d8-a83f-4dc16dd6b6ee', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('7169f3c3-69f8-47ce-9b83-e55626515d01', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', 2, NULL, 'NOW YOU SEE IT', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', '7169f3c3-69f8-47ce-9b83-e55626515d01', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('a70a3b17-959e-4e4d-b373-e66c73b2b222', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', 2, NULL, 'THE HAND-PAINTED THAI', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', 'a70a3b17-959e-4e4d-b373-e66c73b2b222', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('40dc538f-2cb2-4484-b77c-2ce541b3c146', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', 2, NULL, 'JUST ANOTHER THREE-RING CIRCUS', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', '40dc538f-2cb2-4484-b77c-2ce541b3c146', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('1981946a-cbfc-4cdf-9d3f-03384c75a5b8', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', 2, NULL, 'THE SHOCK WILL KILL YOU', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', '1981946a-cbfc-4cdf-9d3f-03384c75a5b8', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('90410a75-6819-4d97-906d-bae0ddaba0bc', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', 2, NULL, 'A CHICKEN IN EVERY PLOT', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', '90410a75-6819-4d97-906d-bae0ddaba0bc', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('4083fa66-b674-40ff-81f3-8fafb1448f89', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', 2, NULL, 'THE DEVIL AND THE DEEP BLUE SEA', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', '4083fa66-b674-40ff-81f3-8fafb1448f89', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('9307728d-68e4-4d5c-ae30-83048ebae602', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', 2, NULL, 'IT''S ALL DOWNHILL FROM HERE', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', '9307728d-68e4-4d5c-ae30-83048ebae602', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('b37a75ea-4efd-41fd-96ca-e4cfeafc8f40', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', 2, NULL, 'DREAMS', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', 'b37a75ea-4efd-41fd-96ca-e4cfeafc8f40', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('a8a90357-7fcd-4916-89b4-bfa704039143', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', 2, NULL, 'THERE''S JUST NO ACCOUNTING..', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', 'a8a90357-7fcd-4916-89b4-bfa704039143', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('2f9d2ffa-5036-4b28-9bdd-ce8a71a73792', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', 2, NULL, 'THE GOOD SAMARITAN', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', '2f9d2ffa-5036-4b28-9bdd-ce8a71a73792', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('0fd16e53-7ec4-4eff-97da-b2ce07681900', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', 2, NULL, 'CAPTAIN BELLYBUSTER AND THE SPEED FACTORY', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', '0fd16e53-7ec4-4eff-97da-b2ce07681900', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('2e831ba6-dcc8-44b4-972a-f01701dee173', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', 2, NULL, 'WHO''S WOO IN AMERICA', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', '2e831ba6-dcc8-44b4-972a-f01701dee173', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('12b0ed48-7105-4f31-b9c2-528fbf7d317e', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', 2, NULL, 'LILACS, MR. MAXWELL', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '591ef398-b263-4dbd-b3db-4e7f34a5c3c6', '12b0ed48-7105-4f31-b9c2-528fbf7d317e', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: RALPH SUPERMAXI EROE (1983)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('40df52ad-0d80-4d17-bea5-f85efdd28ee8', 'RALPH SUPERMAXI EROE', 'THE GREATEST AMERICAN HERO', 1983, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('07b9478a-36fd-4d82-ab37-ee59bbad6b45', '40df52ad-0d80-4d17-bea5-f85efdd28ee8', 3, NULL, 'THE NEWLYWED GAME', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '40df52ad-0d80-4d17-bea5-f85efdd28ee8', '07b9478a-36fd-4d82-ab37-ee59bbad6b45', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: ONCE UPON A TIME IN DEADWOOD (None)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('dd4eee52-efd3-436e-9d2b-a82b0ae7a1cb', 'ONCE UPON A TIME IN DEADWOOD', 'ONCE UPON A TIME IN DEADWOOD', NULL, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'dd4eee52-efd3-436e-9d2b-a82b0ae7a1cb', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: MAKING A DEAL WITH THE DEVIL (None)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('62fd9c88-dce1-4af0-bb93-b475eca62dbb', 'MAKING A DEAL WITH THE DEVIL', 'MAKING A DEAL WITH THE DEVIL', NULL, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '62fd9c88-dce1-4af0-bb93-b475eca62dbb', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: HOUSTON KNIGHTS (1988)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('35350c1e-1848-4e43-9137-6a7f391bfcfe', 'HOUSTON KNIGHTS', 'HOUSTON KNIGHTS', 1988, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('51ab0399-68bf-44f2-afe7-04416331c287', '35350c1e-1848-4e43-9137-6a7f391bfcfe', 2, NULL, 'THERE''S ONE BORN EVERY MINUTE', '0000-0000-C4BD-0016-X-0000-0000-C', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '35350c1e-1848-4e43-9137-6a7f391bfcfe', '51ab0399-68bf-44f2-afe7-04416331c287', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('03aa4ee1-d224-4705-9ef5-ad6ec3ea3078', '35350c1e-1848-4e43-9137-6a7f391bfcfe', 2, NULL, 'VIGILANTE', '0000-0000-C4BD-0015-Z-0000-0000-6', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '35350c1e-1848-4e43-9137-6a7f391bfcfe', '03aa4ee1-d224-4705-9ef5-ad6ec3ea3078', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('71ce571d-9233-4f86-8617-f955901148df', '35350c1e-1848-4e43-9137-6a7f391bfcfe', 2, NULL, 'THE WHITE HAND', '0000-0000-C4BD-0014-2-0000-0000-V', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '35350c1e-1848-4e43-9137-6a7f391bfcfe', '71ce571d-9233-4f86-8617-f955901148df', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('7524aca7-efa4-4694-b9ee-cdad8864eadf', '35350c1e-1848-4e43-9137-6a7f391bfcfe', 2, NULL, 'SINS OF THE FATHER', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '35350c1e-1848-4e43-9137-6a7f391bfcfe', '7524aca7-efa4-4694-b9ee-cdad8864eadf', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('3c30b5d7-02a1-4583-8c68-989c1c37a403', '35350c1e-1848-4e43-9137-6a7f391bfcfe', 2, NULL, 'CRIME SPREE', '0000-0000-C4BD-001A-P-0000-0000-0', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '35350c1e-1848-4e43-9137-6a7f391bfcfe', '3c30b5d7-02a1-4583-8c68-989c1c37a403', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('532c41cd-4244-4ca9-87cd-6109c16155b1', '35350c1e-1848-4e43-9137-6a7f391bfcfe', 2, NULL, 'CAJUN SPICE', '0000-0000-C4BD-0019-R-0000-0000-U', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '35350c1e-1848-4e43-9137-6a7f391bfcfe', '532c41cd-4244-4ca9-87cd-6109c16155b1', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('7dbe6eb1-8423-47e1-b6d1-ba0b0bb8bd0c', '35350c1e-1848-4e43-9137-6a7f391bfcfe', 2, NULL, 'THE STONE', '0000-0000-C4BD-0018-T-0000-0000-O', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '35350c1e-1848-4e43-9137-6a7f391bfcfe', '7dbe6eb1-8423-47e1-b6d1-ba0b0bb8bd0c', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('80838190-2abc-4170-bc1c-a6f6e8dd388e', '35350c1e-1848-4e43-9137-6a7f391bfcfe', 2, NULL, 'BURNOUT', '0000-0000-C4BD-001E-H-0000-0000-N', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '35350c1e-1848-4e43-9137-6a7f391bfcfe', '80838190-2abc-4170-bc1c-a6f6e8dd388e', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('b9237e29-e39d-4cd9-b6e8-f0cc8fddb24f', '35350c1e-1848-4e43-9137-6a7f391bfcfe', 2, NULL, 'LOVE HURTS', '0000-0000-C4BD-000A-T-0000-0000-O', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '35350c1e-1848-4e43-9137-6a7f391bfcfe', 'b9237e29-e39d-4cd9-b6e8-f0cc8fddb24f', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('225bbb74-e0c1-43f2-88bf-947cb197ea4d', '35350c1e-1848-4e43-9137-6a7f391bfcfe', 2, NULL, 'BAD PAPER', '0000-0000-C4BD-0001-C-0000-0000-1', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '35350c1e-1848-4e43-9137-6a7f391bfcfe', '225bbb74-e0c1-43f2-88bf-947cb197ea4d', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('3be3f815-8c2b-4ea0-b64d-ea2e3783fcda', '35350c1e-1848-4e43-9137-6a7f391bfcfe', 2, NULL, 'FOR CAROLINE', '0000-0000-C4BD-001C-L-0000-0000-B', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '35350c1e-1848-4e43-9137-6a7f391bfcfe', '3be3f815-8c2b-4ea0-b64d-ea2e3783fcda', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('bdbe3ded-7a7f-448b-adec-303033e43615', '35350c1e-1848-4e43-9137-6a7f391bfcfe', 2, NULL, 'THE JUNGLE FIGHTER', '0000-0000-C4BD-0017-V-0000-0000-I', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '35350c1e-1848-4e43-9137-6a7f391bfcfe', 'bdbe3ded-7a7f-448b-adec-303033e43615', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: GIUSTIZIA PRIVATA (1986)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('3f6548c9-3ef0-489f-8d62-a6def6dc98e3', 'GIUSTIZIA PRIVATA', 'GIUSTIZIA PRIVATA', 1986, 'film'::tipo_opera, '0000-0000-3FA0-0000-B-0000-0000-4', NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '3f6548c9-3ef0-489f-8d62-a6def6dc98e3', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: EMERALD RUN (2019)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('5f427540-c5e4-459c-b359-4e6b93748995', 'EMERALD RUN', 'EMERALD RUN', 2019, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '5f427540-c5e4-459c-b359-4e6b93748995', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: COLD CASE - DELITTI IRRISOLTI (2004)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('d9d75b5e-1fc5-492d-8974-60ccb1032d3e', 'COLD CASE - DELITTI IRRISOLTI', 'COLD CASE', 2004, 'serie_tv'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('29e5bae6-f834-47f6-b1c7-e3e6f5fe329c', 'd9d75b5e-1fc5-492d-8974-60ccb1032d3e', 1, NULL, 'GREED', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'd9d75b5e-1fc5-492d-8974-60ccb1032d3e', '29e5bae6-f834-47f6-b1c7-e3e6f5fe329c', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Opera: TRAPPOLA DI FAMIGLIA (2021)
INSERT INTO opere (id, titolo, titolo_originale, anno_produzione, tipo, codice_isan, created_at, updated_at)
  VALUES ('168f4e96-35c2-4406-8661-c0cff5c2cd83', 'TRAPPOLA DI FAMIGLIA', 'MOMMY''S DEADLY CON ARTIST', 2021, 'film'::tipo_opera, NULL, NOW(), NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '168f4e96-35c2-4406-8661-c0cff5c2cd83', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

-- Extra episodes on existing operas for PARÈ MICHAEL
-- Episode 1xNone of STARHUNTER REDUX
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('2fe04369-2374-4f96-afd0-0f46cbf75f00', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 1, NULL, 'TRUST', '0000-0000-C5E4-0008-3-0000-0000-S', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', '2fe04369-2374-4f96-afd0-0f46cbf75f00', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER REDUX
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('fc0d9aa8-0f18-4e74-ad2b-b97a222d4e7e', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 1, NULL, 'FAMILY VALUES', '0000-0000-C5E4-0003-D-0000-0000-Z', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 'fc0d9aa8-0f18-4e74-ad2b-b97a222d4e7e', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER REDUX
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('2fa20d7d-bb85-425b-b27b-f1f023fc367c', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 1, NULL, 'SIREN''S SONG', '0000-0000-C5E4-000B-Y-0000-0000-9', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', '2fa20d7d-bb85-425b-b27b-f1f023fc367c', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER REDUX
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('026b93fc-351e-4484-988a-a00c15b1e80c', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 1, NULL, 'THE MAN WHO SOLD THE WORLD', '0000-0000-C5E4-0005-9-0000-0000-A', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', '026b93fc-351e-4484-988a-a00c15b1e80c', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER REDUX
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('1272842a-1c02-4f44-bb0d-b74f087903d9', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 1, NULL, 'PEER PRESSURE', '0000-0000-C5E4-000D-U-0000-0000-L', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', '1272842a-1c02-4f44-bb0d-b74f087903d9', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER REDUX
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('9056f5e3-ba26-43f6-99c6-34d71684c25d', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 1, NULL, 'FROZEN', '0000-0000-C5E4-0012-B-0000-0000-4', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', '9056f5e3-ba26-43f6-99c6-34d71684c25d', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER REDUX
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('92b81081-3544-45f1-accb-e2ae35d317a7', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 1, NULL, 'ORDER', '0000-0000-C5E4-000F-Q-0000-0000-X', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', '92b81081-3544-45f1-accb-e2ae35d317a7', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER REDUX
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('648ccf41-d361-4dfe-961b-2efe4bc4cda3', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 1, NULL, 'CELL GAME', '0000-0000-C5E4-0014-7-0000-0000-G', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', '648ccf41-d361-4dfe-961b-2efe4bc4cda3', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER REDUX
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('53faf599-7662-4f89-a65b-c6be09fea2ab', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 1, NULL, 'PAST LIVES', '0000-0000-C5E4-000E-S-0000-0000-R', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', '53faf599-7662-4f89-a65b-c6be09fea2ab', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER REDUX
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('c9c3019b-7a52-4daa-a6de-310167eeee51', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 1, NULL, 'BLACK LIGHT', '0000-0000-C5E4-0016-3-0000-0000-S', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 'c9c3019b-7a52-4daa-a6de-310167eeee51', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER REDUX
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('f35877bf-8a66-419a-81c9-cb7c94015b3d', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 1, NULL, 'GOODBYE SO LONG', '0000-0000-C5E4-0004-B-0000-0000-4', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 'f35877bf-8a66-419a-81c9-cb7c94015b3d', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER REDUX
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('95bff683-68e9-4454-b50f-e092b8f1b035', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 1, NULL, 'THE MOST WANTED MAN', '0000-0000-C5E4-0010-F-0000-0000-T', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', '95bff683-68e9-4454-b50f-e092b8f1b035', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER REDUX
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('4ac22a4b-821f-4b08-a4e0-3b25ae5ecbca', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 1, NULL, 'HALF DENSE PLAYERS', '0000-0000-C5E4-0011-D-0000-0000-Z', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', '4ac22a4b-821f-4b08-a4e0-3b25ae5ecbca', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER REDUX
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('6d7efe51-6724-408a-b6e2-93911581ee86', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 1, NULL, 'DARK AND STORMY NIGHT', '0000-0000-C5E4-0002-F-0000-0000-T', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', '6d7efe51-6724-408a-b6e2-93911581ee86', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER REDUX
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('8c21abd7-5d6f-4c52-8f3c-8b828cca3a8a', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 1, NULL, 'SUPER MAX', '0000-0000-C5E4-0009-1-0000-0000-Y', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', '8c21abd7-5d6f-4c52-8f3c-8b828cca3a8a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER REDUX
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('fcb9838d-04e2-4571-9e4a-627f00838289', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 1, NULL, 'EAT SIN', '0000-0000-C5E4-0013-9-0000-0000-A', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 'fcb9838d-04e2-4571-9e4a-627f00838289', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER REDUX
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('aa351ac5-a827-4368-8f2a-b2195257e4f5', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 1, NULL, 'A TWIST IN TIME', '0000-0000-C5E4-0006-7-0000-0000-G', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 'aa351ac5-a827-4368-8f2a-b2195257e4f5', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER REDUX
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('38a1b9c4-257d-4c50-88fd-14fc9a6f7c43', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 1, NULL, 'BAD GIRLS', '0000-0000-C5E4-0001-H-0000-0000-N', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', '38a1b9c4-257d-4c50-88fd-14fc9a6f7c43', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER REDUX
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('9d64b715-a654-4cd3-891c-a3d94b29a445', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 1, NULL, 'TRAVIS', '0000-0000-C5E4-0007-5-0000-0000-M', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', '9d64b715-a654-4cd3-891c-a3d94b29a445', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER REDUX
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('ca317203-8885-4c1e-a0e4-539780712183', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 1, NULL, 'BAD SEED', '0000-0000-C5E4-0015-5-0000-0000-M', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 'ca317203-8885-4c1e-a0e4-539780712183', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER REDUX
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('8602facb-8ff7-4fe9-b7e5-64d1ab37fb0a', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', 1, NULL, 'RESURRECTION', '0000-0000-C5E4-000C-W-0000-0000-F', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'ca7f70a9-37d1-40b3-a35f-50263eb37cb0', '8602facb-8ff7-4fe9-b7e5-64d1ab37fb0a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('85396564-ccf7-4a1f-9406-3a528dc078fa', 'b273e05e-80ee-459e-900e-420be5d1c79e', 1, NULL, 'THE DIVINITY CLUSTER', '0000-0000-C5E4-000A-0-0000-0000-3', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'b273e05e-80ee-459e-900e-420be5d1c79e', '85396564-ccf7-4a1f-9406-3a528dc078fa', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('20ed538f-96d9-47f4-b8b8-2166a866a01e', 'b273e05e-80ee-459e-900e-420be5d1c79e', 1, NULL, 'TRUST', '0000-0000-C5E4-0008-3-0000-0000-S', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'b273e05e-80ee-459e-900e-420be5d1c79e', '20ed538f-96d9-47f4-b8b8-2166a866a01e', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('280eaade-ffce-4a4d-a8c0-11c39bc2e484', 'b273e05e-80ee-459e-900e-420be5d1c79e', 1, NULL, 'FAMILY VALUES', '0000-0000-C5E4-0003-D-0000-0000-Z', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'b273e05e-80ee-459e-900e-420be5d1c79e', '280eaade-ffce-4a4d-a8c0-11c39bc2e484', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('af13a6b9-f362-4ccb-b12c-96cd8b6bb8d9', 'b273e05e-80ee-459e-900e-420be5d1c79e', 1, NULL, 'SIREN''S SONG', '0000-0000-C5E4-000B-Y-0000-0000-9', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'b273e05e-80ee-459e-900e-420be5d1c79e', 'af13a6b9-f362-4ccb-b12c-96cd8b6bb8d9', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('96f21759-5086-44b7-8da9-d4f511fd9375', 'b273e05e-80ee-459e-900e-420be5d1c79e', 1, NULL, 'THE MAN WHO SOLD THE WORLD', '0000-0000-C5E4-0005-9-0000-0000-A', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'b273e05e-80ee-459e-900e-420be5d1c79e', '96f21759-5086-44b7-8da9-d4f511fd9375', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('d625168c-44e2-45a2-8f8a-98f74b6b1f66', 'b273e05e-80ee-459e-900e-420be5d1c79e', 1, NULL, 'PEER PRESSURE', '0000-0000-C5E4-000D-U-0000-0000-L', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'b273e05e-80ee-459e-900e-420be5d1c79e', 'd625168c-44e2-45a2-8f8a-98f74b6b1f66', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('755019a8-b43f-4dbc-8d92-f642c2bbf580', 'b273e05e-80ee-459e-900e-420be5d1c79e', 1, NULL, 'FROZEN', '0000-0000-C5E4-0012-B-0000-0000-4', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'b273e05e-80ee-459e-900e-420be5d1c79e', '755019a8-b43f-4dbc-8d92-f642c2bbf580', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('c042e1bf-d3f6-4a6d-b7c5-431fef348823', 'b273e05e-80ee-459e-900e-420be5d1c79e', 1, NULL, 'PAST LIVES', '0000-0000-C5E4-000E-S-0000-0000-R', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'b273e05e-80ee-459e-900e-420be5d1c79e', 'c042e1bf-d3f6-4a6d-b7c5-431fef348823', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of STARHUNTER
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('178b9e7d-ecd4-4f5e-9899-4bd8f626566b', 'b273e05e-80ee-459e-900e-420be5d1c79e', 1, NULL, 'ORDER', '0000-0000-C5E4-000F-Q-0000-0000-X', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'b273e05e-80ee-459e-900e-420be5d1c79e', '178b9e7d-ecd4-4f5e-9899-4bd8f626566b', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 2xNone of MEMPHIS BEAT
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('96f66417-547e-4673-a935-9a34c1630eaf', 'd9ef1dec-a860-48b1-806a-714322df07ca', 2, NULL, 'THE THINGS WE CARRY', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'd9ef1dec-a860-48b1-806a-714322df07ca', '96f66417-547e-4673-a935-9a34c1630eaf', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 4xNone of LEVERAGE - CONSULENZE ILLEGALI
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('b454fa34-1ed6-4899-a172-0a4735780337', '49108954-f7a4-4f13-9130-95857aa0f2a3', 4, NULL, 'THE RADIO JOB', '0000-0003-EB82-003B-C-0000-0000-1', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '49108954-f7a4-4f13-9130-95857aa0f2a3', 'b454fa34-1ed6-4899-a172-0a4735780337', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of HOUSTON KNIGHTS
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('b8b70af2-24ea-471d-bd61-37e0561de5f1', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 1, NULL, 'MIRRORS', '0000-0000-C4BD-0010-A-0000-0000-7', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 'b8b70af2-24ea-471d-bd61-37e0561de5f1', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of HOUSTON KNIGHTS
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('a52e8ce3-b37f-477f-a461-c27825a29580', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 1, NULL, 'NORTH OF THE BORDER', '0000-0000-C4BD-0005-4-0000-0000-P', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 'a52e8ce3-b37f-477f-a461-c27825a29580', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of HOUSTON KNIGHTS
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('18b429c6-9a41-454c-aba9-65f232daf4e6', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 1, NULL, 'HOUSTON''S HERO', '0000-0000-C4BD-0011-8-0000-0000-D', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'd6954285-9228-478c-ad4c-ecd94dcd6310', '18b429c6-9a41-454c-aba9-65f232daf4e6', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of HOUSTON KNIGHTS
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('720f5a20-0130-40b1-9700-84b7319c3210', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 1, NULL, 'SINGLE IN HEAVEN', '0000-0000-C4BD-0003-8-0000-0000-D', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'd6954285-9228-478c-ad4c-ecd94dcd6310', '720f5a20-0130-40b1-9700-84b7319c3210', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of HOUSTON KNIGHTS
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('dd294c22-85bc-4967-b27e-3ed89609a967', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 1, NULL, 'YESTERDAY''S GONE', '0000-0000-C4BD-0002-A-0000-0000-7', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 'dd294c22-85bc-4967-b27e-3ed89609a967', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of HOUSTON KNIGHTS
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('49d8e757-383b-485d-9003-06c4fd65d594', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 1, NULL, 'BAD GIRL', '0000-0000-C4BD-0013-4-0000-0000-P', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'd6954285-9228-478c-ad4c-ecd94dcd6310', '49d8e757-383b-485d-9003-06c4fd65d594', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of HOUSTON KNIGHTS
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('1acf7214-b2f1-48a9-a555-0d9621abeee5', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 1, NULL, 'COLT', '0000-0000-C4BD-0012-6-0000-0000-J', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'd6954285-9228-478c-ad4c-ecd94dcd6310', '1acf7214-b2f1-48a9-a555-0d9621abeee5', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of HOUSTON KNIGHTS
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('476f5669-7f6b-4625-9647-35314a1a131f', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 1, NULL, 'MOVING VIOLATION', '0000-0000-C4BD-0006-2-0000-0000-V', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'd6954285-9228-478c-ad4c-ecd94dcd6310', '476f5669-7f6b-4625-9647-35314a1a131f', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of HOUSTON KNIGHTS
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('6ccfbb68-2dad-4467-bfb8-1429cef95b5a', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 1, NULL, 'HEADS I WIN, TAILS YOU LOSE', '0000-0000-C4BD-000D-N-0000-0000-5', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'd6954285-9228-478c-ad4c-ecd94dcd6310', '6ccfbb68-2dad-4467-bfb8-1429cef95b5a', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of HOUSTON KNIGHTS
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('a825319e-933a-484c-98d2-c4f9e3f3da5d', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 1, NULL, 'DESPERADO', '0000-0000-C4BD-001B-N-0000-0000-5', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 'a825319e-933a-484c-98d2-c4f9e3f3da5d', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of HOUSTON KNIGHTS
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('49fd9549-cde2-41db-b504-a7871e325b95', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 1, NULL, 'GUN SHY', '0000-0000-C4BD-000E-L-0000-0000-B', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'd6954285-9228-478c-ad4c-ecd94dcd6310', '49fd9549-cde2-41db-b504-a7871e325b95', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of HOUSTON KNIGHTS
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('74fc0425-0cb2-4d06-941c-2eee8cbcd043', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 1, NULL, 'LADY SMOKE', '0000-0000-C4BD-000B-R-0000-0000-U', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'd6954285-9228-478c-ad4c-ecd94dcd6310', '74fc0425-0cb2-4d06-941c-2eee8cbcd043', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of HOUSTON KNIGHTS
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('fbea3b38-2805-48b0-99b6-37230d707065', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 1, NULL, 'GOD''S WILL', '0000-0000-C4BD-000F-J-0000-0000-H', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 'fbea3b38-2805-48b0-99b6-37230d707065', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of HOUSTON KNIGHTS
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('b600c679-478f-44e1-ac45-4a942bf32637', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 1, NULL, 'DIMINISHED CAPACITY', '0000-0000-C4BD-001D-J-0000-0000-H', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 'b600c679-478f-44e1-ac45-4a942bf32637', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of HOUSTON KNIGHTS
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('97d77af8-726b-4d08-ad24-bb12c20925b3', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 1, NULL, 'HOME IS WHERE THE HEART IS', '0000-0000-C4BD-000C-P-0000-0000-0', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'd6954285-9228-478c-ad4c-ecd94dcd6310', '97d77af8-726b-4d08-ad24-bb12c20925b3', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of HOUSTON KNIGHTS
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('9b64aea4-03f5-4791-859e-76c56a42d51f', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 1, NULL, 'SECRETS', '0000-0000-C4BD-0009-V-0000-0000-I', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'd6954285-9228-478c-ad4c-ecd94dcd6310', '9b64aea4-03f5-4791-859e-76c56a42d51f', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of HOUSTON KNIGHTS
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('d9d7de30-5d4c-4616-8436-08b7cd86ea6b', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 1, NULL, 'SOMEBODY TO LOVE', '0000-0000-C4BD-0007-Z-0000-0000-6', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 'd9d7de30-5d4c-4616-8436-08b7cd86ea6b', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of HOUSTON KNIGHTS
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('add5b35e-522d-402f-8b33-7eaa350833ff', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 1, NULL, 'SCARECROW', '0000-0000-C4BD-0004-6-0000-0000-J', NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', 'd6954285-9228-478c-ad4c-ecd94dcd6310', 'add5b35e-522d-402f-8b33-7eaa350833ff', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;
-- Episode 1xNone of DOGWOOD PASS
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  VALUES ('7dc00899-84a0-4071-b6f8-a93744e8bb32', '88989a07-43a4-4043-a558-279df0bc102c', 1, NULL, 'BE ALL MY SINS REMEMBERED', NULL, NOW())
  ON CONFLICT DO NOTHING;
INSERT INTO partecipazioni (id, artista_id, opera_id, episodio_id, ruolo_id, created_at, updated_at)
  VALUES (gen_random_uuid(), '985b029b-e721-49a5-9e63-6d2f7dd0164d', '88989a07-43a4-4043-a558-279df0bc102c', '7dc00899-84a0-4071-b6f8-a93744e8bb32', '9ca14cb4-6a86-4b17-9f24-7453fe74b0fc', NOW(), NOW())
  ON CONFLICT DO NOTHING;

COMMIT;
-- ============================================================
-- SEAGAL STEVEN (artista_id: c08189c5-e0c3-4a28-a803-2090b9529c79)
-- ============================================================

-- TRUE JUSTICE S1 – DEADLY CROSSING: PART 1
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT '9961db53-ef92-4dd0-950d-a752c89dfee5', o.id, 1, NULL, 'DEADLY CROSSING: PART 1', '0000-0004-1BE6-0006-H-0000-0000-N', NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

-- TRUE JUSTICE S1 – FROM RUSSIA WITH DRUGS
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT '7f448b29-fdd2-4ad7-ba50-2b6f96367e59', o.id, 1, NULL, 'FROM RUSSIA WITH DRUGS', NULL, NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

-- TRUE JUSTICE S1 – TOXIC E
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT '07a02cca-f168-4bf7-9001-3a68f285630b', o.id, 1, NULL, 'TOXIC E', NULL, NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

-- TRUE JUSTICE S1 – BLACK MAGIC
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT 'c1edfcbf-e36c-4582-9fa3-828cc7cc6727', o.id, 1, NULL, 'BLACK MAGIC', NULL, NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

-- TRUE JUSTICE S1 – DARK VENGEANCE: PART 2
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT '733016ee-7c30-4d41-8085-f7ab0728d911', o.id, 1, NULL, 'DARK VENGEANCE: PART 2', '0000-0004-1BE6-0007-F-0000-0000-T', NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

-- TRUE JUSTICE S1 – STREET WARS: PART 2
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT 'f9761156-9565-4402-b9c7-408d1e14f67c', o.id, 1, NULL, 'STREET WARS: PART 2', '0000-0002-C211-0000-1-0000-0000-Y', NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

-- TRUE JUSTICE S1 – LETHAL JUSTICE: PART 1
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT 'b246a378-51e6-4a37-b16c-dd7828c922b4', o.id, 1, NULL, 'LETHAL JUSTICE: PART 1', '0000-0002-EA79-0000-I-0000-0000-K', NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

-- TRUE JUSTICE S1 – LETHAL JUSTICE: PART 2
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT '0d09e0cb-c625-43d7-93a2-249cb4170772', o.id, 1, NULL, 'LETHAL JUSTICE: PART 2', '0000-0002-EA79-0000-I-0000-0000-K', NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

-- TRUE JUSTICE S1 – YAKUZA
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT '2a71b8ad-594e-4a39-a4dc-eaa71c4ba11f', o.id, 1, NULL, 'YAKUZA', NULL, NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

-- TRUE JUSTICE S1 – BROTHERHOOD: PART 2
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT '8db98307-a7da-40bb-9667-2af5ceb40a0d', o.id, 1, NULL, 'BROTHERHOOD: PART 2', '0000-0002-F392-0000-4-0000-0000-P', NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

-- TRUE JUSTICE S1 – URBAN WARFARE: PART 1
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT '167dc863-6246-4720-9e2a-79960d8951eb', o.id, 1, NULL, 'URBAN WARFARE: PART 1', '0000-0002-F8B2-0000-N-0000-0000-5', NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

-- TRUE JUSTICE S1 – DIAMONDS IN THE ROUGH
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT '7df229e1-280c-4d0d-9e6c-d1dd671852b6', o.id, 1, NULL, 'DIAMONDS IN THE ROUGH', NULL, NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

-- TRUE JUSTICE S1 – PAYBACK
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT 'e9980432-1207-475a-bc61-620fb00a51d9', o.id, 1, NULL, 'PAYBACK', NULL, NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

-- TRUE JUSTICE S2 – VENGEANCE IS MINE
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT 'ec180a74-7380-4484-9113-c5b9f08024b0', o.id, 2, NULL, 'VENGEANCE IS MINE', '0000-0004-1BE6-0001-R-0000-0000-U', NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

-- TRUE JUSTICE S2 – BLOOD ALLEY
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT '576768e1-a01c-4279-bbd6-08ece2fc9875', o.id, 2, NULL, 'BLOOD ALLEY', '0000-0004-1BE6-0002-P-0000-0000-0', NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

-- TRUE JUSTICE S2 – ALL IN
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT '8feeebd9-6748-440e-8b9b-794d16987839', o.id, 2, NULL, 'ALL IN', NULL, NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

-- TRUE JUSTICE S2 – DIRTY MONEY
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT '4ede49c2-5017-4875-9a89-bc467360c7dc', o.id, 2, NULL, 'DIRTY MONEY', '0000-0004-1BE6-000A-9-0000-0000-A', NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

-- TRUE JUSTICE S2 – VIOLENCE OF ACTION
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT '30278437-72db-4c65-8c85-2747fd0498c3', o.id, 2, NULL, 'VIOLENCE OF ACTION', '0000-0004-1BE6-0010-P-0000-0000-0', NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

-- TRUE JUSTICE S2 – TOYS IN THE ATTIC
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT '3dbf5d20-e5af-4821-b900-5b8f0d652cae', o.id, 2, NULL, 'TOYS IN THE ATTIC', '0000-0004-1BE6-000B-7-0000-0000-G', NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

-- TRUE JUSTICE S2 – ANGEL OF DEATH
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT 'a79d616c-08c5-4d40-94af-bfe4f4a2eda9', o.id, 2, NULL, 'ANGEL OF DEATH', '0000-0004-1BE6-0011-N-0000-0000-5', NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

-- TRUE JUSTICE S2 – THE CONVERSATION
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT '67d8afc5-d053-4b54-a13d-f264b32fccfa', o.id, 2, NULL, 'THE CONVERSATION', '0000-0004-1BE6-000C-5-0000-0000-M', NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

-- TRUE JUSTICE S2 – DEAD DROP 2
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT '0460d343-9c56-4d52-83ed-a0f0b31a1f64', o.id, 2, NULL, 'DEAD DROP 2', '0000-0004-1BE6-0012-L-0000-0000-B', NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

-- TRUE JUSTICE S2 – THE CUT-OUT MAN
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT '95de8993-7199-4877-b812-3bd7b7b2303c', o.id, 2, NULL, 'THE CUT-OUT MAN', '0000-0004-1BE6-000D-3-0000-0000-S', NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

-- TRUE JUSTICE S2 – FIRED
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT '836d89bb-9666-457f-b249-98079574cd87', o.id, 2, NULL, 'FIRED', '0000-0004-1BE6-000E-1-0000-0000-Y', NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

-- TRUE JUSTICE S2 – THE SHOT
INSERT INTO episodi (id, opera_id, numero_stagione, numero_episodio, titolo_episodio, codice_isan, created_at)
  SELECT '6cca0c8f-092e-4f62-9927-22cfb91140c6', o.id, 2, NULL, 'THE SHOT', '0000-0004-1BE6-000F-0-0000-0000-3', NOW()
  FROM opere o WHERE UPPER(o.titolo) = 'TRUE JUSTICE' AND o.anno_produzione = 2010
  ON CONFLICT DO NOTHING;

COMMIT;
