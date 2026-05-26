"""Genera PDF non tecnico per il cliente: criticita individuazioni e piano di risoluzione."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak,
    Table,
    TableStyle,
    KeepTogether,
)
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT, TA_CENTER

OUTPUT = "/Users/matteo/rasi/docs/Individuazioni_Criticita_e_Piano_Cliente.pdf"

# --- Styles ---
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    "TitleCustom",
    parent=styles["Title"],
    fontName="Helvetica-Bold",
    fontSize=22,
    leading=26,
    textColor=colors.HexColor("#1a365d"),
    alignment=TA_LEFT,
    spaceAfter=6,
)
subtitle_style = ParagraphStyle(
    "Subtitle",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=11,
    leading=14,
    textColor=colors.HexColor("#4a5568"),
    alignment=TA_LEFT,
    spaceAfter=18,
)
h1 = ParagraphStyle(
    "H1",
    parent=styles["Heading1"],
    fontName="Helvetica-Bold",
    fontSize=15,
    leading=19,
    textColor=colors.HexColor("#1a365d"),
    spaceBefore=16,
    spaceAfter=8,
)
h2 = ParagraphStyle(
    "H2",
    parent=styles["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=12,
    leading=16,
    textColor=colors.HexColor("#2d3748"),
    spaceBefore=10,
    spaceAfter=5,
)
body = ParagraphStyle(
    "Body",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=10.5,
    leading=15,
    alignment=TA_JUSTIFY,
    spaceAfter=8,
    textColor=colors.HexColor("#1a202c"),
)
bullet = ParagraphStyle(
    "Bullet",
    parent=body,
    leftIndent=14,
    bulletIndent=2,
    spaceAfter=4,
)
callout_style = ParagraphStyle(
    "Callout",
    parent=body,
    backColor=colors.HexColor("#fefcbf"),
    borderColor=colors.HexColor("#d69e2e"),
    borderWidth=0.6,
    borderPadding=10,
    leftIndent=0,
    rightIndent=0,
    spaceBefore=6,
    spaceAfter=12,
    fontSize=10.5,
    leading=15,
)
info_style = ParagraphStyle(
    "Info",
    parent=body,
    backColor=colors.HexColor("#ebf8ff"),
    borderColor=colors.HexColor("#3182ce"),
    borderWidth=0.6,
    borderPadding=10,
    spaceBefore=6,
    spaceAfter=12,
)
small = ParagraphStyle(
    "Small",
    parent=body,
    fontSize=9,
    leading=12,
    textColor=colors.HexColor("#4a5568"),
)

def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#718096"))
    canvas.drawString(2 * cm, 1.2 * cm, "RASI - Individuazioni | Documento per il cliente")
    canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f"Pagina {doc.page}")
    canvas.setStrokeColor(colors.HexColor("#cbd5e0"))
    canvas.setLineWidth(0.4)
    canvas.line(2 * cm, 1.6 * cm, A4[0] - 2 * cm, 1.6 * cm)
    canvas.restoreState()

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=2 * cm,
    rightMargin=2 * cm,
    topMargin=2 * cm,
    bottomMargin=2.2 * cm,
    title="Individuazioni - Criticita e piano di risoluzione",
    author="Team RASI",
)

story = []

# --- Cover block ---
story.append(Paragraph("Individuazioni: criticita rilevata e piano di risoluzione", title_style))
story.append(Paragraph(
    "Spiegazione non tecnica del problema segnalato, delle sue cause e degli interventi previsti.",
    subtitle_style,
))

# --- 1. In breve ---
story.append(Paragraph("1. In breve", h1))
story.append(Paragraph(
    "Quando un palinsesto contiene piu passaggi (utilizzi) della stessa opera, il sistema oggi "
    "riesce a identificare solo una parte di questi passaggi. Le altre trasmissioni, pur essendo "
    "presenti, non vengono collegate al catalogo e quindi non generano individuazioni. "
    "Il problema <b>non e una perdita di dati</b>: le righe di palinsesto restano in archivio. "
    "Manca invece il <b>collegamento automatico</b> tra la riga del palinsesto e l'opera/episodio "
    "corrispondente nel catalogo.",
    body,
))
story.append(Paragraph(
    "<b>Impatto:</b> sottostima del numero di passaggi individuati per serie TV e per alcune opere, "
    "con ricadute su reportistica e ripartizioni.",
    callout_style,
))

# --- 2. Cosa vuol dire individuare ---
story.append(Paragraph("2. Cosa significa \u201cindividuare un passaggio\u201d", h1))
story.append(Paragraph(
    "Ogni riga del palinsesto dell'emittente descrive una trasmissione: titolo, data, ora, eventuale "
    "stagione e numero di episodio. Il nostro sistema deve capire <b>quale opera</b> del catalogo corrisponde "
    "a quella trasmissione e, nel caso di serie TV, <b>quale episodio</b> e andato effettivamente in onda. "
    "Solo a quel punto e possibile associare gli artisti coinvolti e generare le individuazioni utili per "
    "le ripartizioni.",
    body,
))

# --- 3. Dove si crea la falla ---
story.append(Paragraph("3. Dove nasce il problema", h1))
story.append(Paragraph(
    "La falla non e nel codice del sistema, ma in una <b>differenza di linguaggio</b> tra il palinsesto "
    "dell'emittente e il catalogo interno. I due parlano degli stessi contenuti in modo diverso, e il "
    "sistema non ha tutti gli strumenti per tradurre.",
    body,
))

story.append(Paragraph("I tre punti critici", h2))

crit_data = [
    ["#", "Punto critico", "Effetto pratico"],
    [
        "1",
        "Numerazione episodi diversa",
        "L'emittente numera gli episodi in modo continuo (1, 2, 3\u2026 fino a migliaia). Il catalogo li numera invece dentro ogni stagione (S1E1, S1E2\u2026). I due riferimenti non combaciano.",
    ],
    [
        "2",
        "Informazioni parziali dal palinsesto",
        "In molte righe manca la stagione: il sistema vede solo un numero episodio e non sa a quale stagione riferirlo.",
    ],
    [
        "3",
        "Regola attuale troppo rigida",
        "Quando il collegamento all'episodio non e certo, la regola attuale scarta silenziosamente il passaggio. L'utilizzo non viene individuato e non resta traccia del motivo.",
    ],
]
crit_tbl = Table(crit_data, colWidths=[0.8 * cm, 5.2 * cm, 10.5 * cm], repeatRows=1)
crit_tbl.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a365d")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9.5),
    ("ALIGN", (0, 0), (0, -1), "CENTER"),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ("TOPPADDING", (0, 0), (-1, -1), 7),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7fafc")]),
    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e0")),
]))
story.append(crit_tbl)
story.append(Spacer(1, 10))

# --- 4. Esempio concreto ---
story.append(Paragraph("4. Un esempio concreto", h1))
story.append(Paragraph(
    "Prendiamo una serie molto frequente nei palinsesti: <b>Un posto al sole</b>.",
    body,
))

ex_data = [
    ["Dato", "Valore osservato"],
    ["Passaggi totali nel palinsesto (campagna piu recente)", "23.645"],
    ["Passaggi con solo numero episodio, senza stagione", "23.230 (circa il 98%)"],
    ["Numeri di episodio usati dall'emittente", "da 1 a 6.601"],
    ["Numeri di episodio presenti nel catalogo", "da 1 a 487 (ripartiti in 5 stagioni)"],
    ["Passaggi effettivamente individuati", "2.783 (circa il 12%)"],
]
ex_tbl = Table(ex_data, colWidths=[9.5 * cm, 7 * cm], repeatRows=1)
ex_tbl.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2d3748")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 10),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7fafc")]),
    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e0")),
]))
story.append(ex_tbl)
story.append(Spacer(1, 8))
story.append(Paragraph(
    "<b>Traduzione in parole semplici:</b> l'emittente dice \"episodio 3.214\", ma nel catalogo non "
    "esiste un episodio 3.214, perche la numerazione si ferma a 487 ed e divisa per stagioni. "
    "Senza una tabella di traduzione, il sistema non riesce ad abbinare quel passaggio.",
    info_style,
))

# --- 5. Perche e una falla logica, non un bug ---
story.append(Paragraph("5. E un errore di programmazione?", h1))
story.append(Paragraph(
    "No. Il software funziona esattamente come e stato progettato. Il limite e nelle <b>regole di matching</b> "
    "(cioe le regole che decidono quando un passaggio corrisponde a un'opera). Queste regole erano pensate "
    "per un caso semplice (un emittente, una convenzione) e non gestiscono in modo elastico le differenze "
    "tra palinsesti diversi. E piu corretto parlare quindi di <b>falla logica</b>: la struttura regge, ma le "
    "regole sono troppo strette per la varieta dei dati reali.",
    body,
))

story.append(PageBreak())

# --- 6. Piano ---
story.append(Paragraph("6. Come intendiamo risolverlo", h1))
story.append(Paragraph(
    "L'obiettivo e rendere il sistema <b>tollerante alle differenze</b> tra emittenti, senza dover "
    "riscrivere ogni volta le regole. Il piano e organizzato in cinque interventi progressivi, "
    "ciascuno indipendente e verificabile.",
    body,
))

plan_data = [
    ["#", "Intervento", "Cosa cambia in pratica", "Beneficio atteso"],
    [
        "1",
        "Profilo dell'emittente",
        "Per ogni emittente registriamo \u201cle sue abitudini\u201d: come numera gli episodi, come scrive i titoli, quali campi usa. Sono regole modificabili dall'amministratore, senza toccare il codice.",
        "Onboarding di un nuovo emittente diventa una configurazione, non uno sviluppo.",
    ],
    [
        "2",
        "Traduzione automatica",
        "Al momento dell'import, il palinsesto viene arricchito con i campi mancanti ricavati dalle regole del profilo (es. \u201cepisodio 500 equivale a Stagione 2, Episodio 250\u201d).",
        "Il palinsesto parla finalmente la stessa lingua del catalogo.",
    ],
    [
        "3",
        "Catalogo episodi piu ricco",
        "Arricchiamo il catalogo con informazioni utili al matching: numerazione continua di riferimento, titoli alternativi, varianti linguistiche.",
        "Il sistema ha piu appigli per riconoscere lo stesso episodio in palinsesti diversi.",
    ],
    [
        "4",
        "Matching a piu strategie",
        "Invece di una sola regola, il sistema prova in sequenza piu criteri (stagione+episodio, numerazione continua, titolo episodio, titoli alternativi) e classifica ogni risultato come certo, probabile o ambiguo.",
        "Piu passaggi individuati e, soprattutto, nessuno piu scartato silenziosamente.",
    ],
    [
        "5",
        "Diagnostica e revisione",
        "Nuova area nella dashboard che mostra qualita del matching per emittente e per serie, con strumenti per correggere in blocco i casi ambigui. Le correzioni umane diventano nuove regole automatiche.",
        "Il sistema migliora nel tempo e il cliente vede dove stanno i margini di recupero.",
    ],
]
plan_tbl = Table(plan_data, colWidths=[0.8 * cm, 3.8 * cm, 7.4 * cm, 4.5 * cm], repeatRows=1)
plan_tbl.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a365d")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("ALIGN", (0, 0), (0, -1), "CENTER"),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7fafc")]),
    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e0")),
]))
story.append(plan_tbl)
story.append(Spacer(1, 10))

# --- 7. Risultato atteso ---
story.append(Paragraph("7. Risultato atteso", h1))
bullets = [
    "<b>Nessun passaggio sparisce in silenzio.</b> Ogni riga del palinsesto genera un esito esplicito: individuato, ambiguo o non identificabile.",
    "<b>Percentuale di individuazione molto piu alta</b> su serie con molti passaggi (stima per \u201cUn posto al sole\u201d: dal ~12% attuale a oltre l'80% atteso).",
    "<b>Onboarding di nuovi emittenti in giornate, non settimane.</b> Basta compilare il profilo.",
    "<b>Visibilita sulla qualita del dato</b> con report per emittente e per serie.",
    "<b>Miglioramento continuo</b>: le correzioni manuali consolidano regole automatiche e riducono nel tempo i casi ambigui.",
]
for b in bullets:
    story.append(Paragraph("\u2022 " + b, bullet))

# --- 8. Tempistiche indicative ---
story.append(Paragraph("8. Tempistiche indicative", h1))
time_data = [
    ["Fase", "Attivita", "Tempistica indicativa"],
    ["A", "Profili emittente + traduzione automatica (interventi 1 e 2)", "Prima release utile"],
    ["B", "Catalogo arricchito + matching multi-strategia (interventi 3 e 4)", "Release successiva"],
    ["C", "Dashboard diagnostica e revisione assistita (intervento 5)", "Rilascio incrementale"],
]
time_tbl = Table(time_data, colWidths=[1.4 * cm, 10.6 * cm, 5 * cm], repeatRows=1)
time_tbl.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2d3748")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 10),
    ("ALIGN", (0, 0), (0, -1), "CENTER"),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7fafc")]),
    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e0")),
]))
story.append(time_tbl)
story.append(Spacer(1, 8))
story.append(Paragraph(
    "Le tempistiche puntuali verranno concordate in base alle priorita e alla disponibilita di dati "
    "di riferimento da parte degli emittenti (es. conferma delle convenzioni di numerazione).",
    small,
))

# --- 9. Garanzie ---
story.append(Paragraph("9. Garanzie operative", h1))
garanzie = [
    "<b>Nessun dato storico viene perso.</b> Il dato grezzo del palinsesto resta sempre intatto.",
    "<b>Retrocompatibilita.</b> Le campagne gia elaborate non vengono alterate; eventuale rielaborazione e una scelta esplicita.",
    "<b>Verifica prima del rilascio.</b> Ogni fase viene misurata su campagne reali e confrontata con il comportamento attuale.",
    "<b>Possibilita di rollback.</b> Le nuove regole possono essere attivate/disattivate senza impatti.",
]
for g in garanzie:
    story.append(Paragraph("\u2022 " + g, bullet))

story.append(Spacer(1, 14))
story.append(Paragraph(
    "Per qualsiasi chiarimento o approfondimento, il team tecnico e a disposizione per una sessione dedicata.",
    small,
))

doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(f"PDF generato: {OUTPUT}")
