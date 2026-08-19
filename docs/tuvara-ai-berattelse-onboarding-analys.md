# Tuvara — analys: "AI-tolkad berättelse" vid onboarding av nya piloter

**Datum:** 2026-08-19
**Underlag:** ditt förslag, korsläst mot `docs/context/vision-and-pilots.md`,
`docs/context/product-decisions.md`, `tuvara_ai_assistent_traningsunderlag_v1.md`,
`tuvara_lansering_lovable_och_ai_forkopsassistent.md`, `claude/tuvara-ux-intuitivitet-analys.md`,
samt den faktiska koden (`FirstRunIntro.tsx`, `parse.ts`, `categoryFieldMap.ts`).

**Det här är en analys, inget är byggt.** Förslaget är intressant och pekar
på ett verkligt behov, men det korsar en gräns som redan är medvetet
dragen i projektet av flera skäl samtidigt — jag vill lägga fram dem tydligt
innan något kodas, inte bara ge en optimistisk sammanfattning.

---

## Förslaget, kort sammanfattat

För varje ny pilot: låt entreprenören besvara/skriva fritt om sin
verksamhet, mål, vision, kundtyp, produktkategorier, utmaningar och sig
själv — och låt Tuvara med AI tolka det till en sammanhängande berättelse,
för att bättre förstå användarens verklighet.

## Vad som talar för det

- Det är en genuint mänsklig idé, i linje med produktens uttalade
  kärnprincip ("empowerment", "förstå människan bakom verksamheten") —
  inte en teknik-först-idé som råkar krocka med värderingarna.
- Det skulle kunna ge er (Tushar/teamet) en rikare bild av varje pilot än
  vad ni har idag, särskilt inför support, anpassning eller
  case-study-material till marknadssidan/institutionella ansökningar.
- Det matchar en riktig, redan dokumenterad insikt: soloentreprenörer bär
  hela lasten själva och uppskattar att bli sedda som människor, inte bara
  som konton (samma forskning som ligger bakom "Running it alone doesn't
  mean deciding alone"-principkortet).

## Tre saker som talar emot att bygga det som beskrivet — värda att väga innan ett beslut

### 1. Det korsar en redan medvetet dragen arkitekturgräns

`product-decisions.md` placerar **"real AI/LLM text interpretation"**
explicit under **"Fas 3 — deliberately waiting, don't build without an
explicit new request"** — av tre konkreta skäl som redan är utredda:
det kräver en backend (för att skydda en API-nyckel; en ren klientapp kan
inte hålla en säkert), det kostar pengar per anrop, och det bryter
offline-löftet. Att "tolka en berättelse med AI" är inte en enkel
regel-baserad textbearbetning som `parse.ts` gör idag (nyckelordsmatchning,
ingen språkmodell) — det är precis den typen av uppgift en riktig
språkmodell behövs för. Det betyder i praktiken: **det här förslaget är,
om det byggs som beskrivet, den "explicita nya begäran" som produktbeslut-
loggen redan förutsåg skulle kunna trigga Fas 3** — vilket är ett rimligt
läge att vara i, men det är ett medvetet, större beslut (backend, kostnad,
offline-avsteg), inte en liten tilläggsfunktion.

### 2. Det motsäger ett redan givet löfte om var data stannar

`tuvara_ai_assistent_traningsunderlag_v1.md` (er egen tränade
förköpsassistent-copy) svarar redan idag på frågan "Var lagras min data?"
med: *"everything — stock, prices, listings — stays locally on your own
phone or computer... there's genuinely nothing to secure on our end yet,
because we don't hold any of it."* Om en ny "berättelse"-funktion skickar
fritext om entreprenörens liv, mål och utmaningar till en molnbaserad
AI-tjänst för tolkning, är det första gången något faktiskt lämnar
enheten — och det är dessutom **känsligare** data än lagersaldo och pris
(personliga mål, ekonomisk situation, utmaningar). Det är inte
oöverstigligt, men det är en ny sanning att kommunicera ärligt, inte något
som kan byggas tyst under samma "allt stannar på din enhet"-löfte som
redan är ute hos riktiga piloter och i er egen AI-assistents träningsdata.

### 3. Er egen forskning har redan testat den här typen av lösning — och valt bort den

`claude/tuvara-ux-intuitivitet-analys.md` säger rakt ut: *"en vanlig
FAQ-sida löser inte det här — den är precis den typ av 'information utan
facilitering' er egen research redan visat är otillräcklig"* — och hela
projektets mest återkommande, forskningsstödda slutsats är att
**personlig facilitering slår ren information** i just den här målgruppen
(dokumenterat tre gånger oberoende: ADBI-studien, KU-forskningen om
solo-grundares beslutsbehov, halal/haram-legitimitetsspråket i
bangladeshisk affärskommunikation). Det är exakt därför onboarding redan
är byggd kring ett **personligt 15–20-minuters facilitieringssamtal**, inte
ett självbetjäningsformulär. Ett fritextformulär där en ny, ofta
digitalt ovan användare (dokumenterad barriär i Bangladesh-forskningen)
ska skriva om sina mål och utmaningar innan hon ens sett appen fungera,
är precis den typ av friktion som redan flaggats som ett problem —
`tuvara-ux-intuitivitet-analys.md` noterar dessutom att appen **redan**
har för många fält för målgruppen, och att onboarding idag saknar
inbyggd vägledning mellan en extern PDF och det första, ganska
komplexa kortet.

---

## Lättare alternativ som ger en del av värdet utan att bryta någon av principerna ovan

Om målet är "förstå användarens verklighet bättre", finns det flera vägar
dit som inte kräver backend, inte bryter offline-löftet, och inte lägger
till friktion i onboarding-flödet:

**A. Ett helt valfritt, privat "Om min verksamhet"-anteckningsfält.**
Ren fritext, sparas bara lokalt (samma `usePersistentState`-mönster som
allt annat), analyseras aldrig av Tuvara, skickas aldrig någonstans. Inte
ett formulär man måste fylla i vid onboarding, utan en anteckningsyta i
Settings hon kan använda om/när hon vill — mer en digital anteckningsbok
än en AI-funktion. Noll ny arkitekturrisk, men ger heller ingen
"tolkning" — bara en plats att skriva, om hon vill.

**B. En lätt, strukturerad profil — inte fritext, inte AI.** Ett par
explicita, korta frågor (kundtyp, produktkategori, största utmaning just
nu) med fördefinierade, korta svarsalternativ — samma mönster som
`categoryFieldMap.ts` redan använder för kategori-/fältkonfiguration per
tenant, alltså regelbaserat och transparent, inte tolkat. Det ger er
strukturerad, jämförbar data om varje pilot utan en enda AI-anrop, men
det är per definition inte en "berättelse" — det är en enkät.

**C. Låt facilitieringssamtalet vara platsen för "berättelsen", som idag
— men fånga och strukturera det efteråt, i CRM:et, inte i appen.**
`tuvara-faltagent` (samcrm.glocalunit.com) har redan en riktig backend
med autentisering och en databas — om ni vill ha en AI-tolkad
sammanfattning av varje pilots verksamhet, är det den naturliga platsen
att bygga det, byggt på anteckningar från det redan planerade personliga
samtalet, inte i den databaslösa mockup-appen. Det håller "berättelsen"
där personlig facilitering redan visat sig fungera bäst, och håller
AI-kostnaden/backend-beroendet borta från kärnappen som fortfarande ska
kunna köras helt offline.

**D. Om ni verkligen vill ha riktig AI-tolkning i själva appen** — vänta
tills Fas A–F-backend-migreringen faktiskt är aktuell (redan planerad,
se `docs/context/glasbox-synergy-memo.md`), och bygg det då, i rätt
ordning enligt er egen slutsats: *"Phase A–F migration → real
auth/subscription status → payment → any AI-proxy backend"*. Det är inte
ett nej — det är en sekvensering ni redan bestämt av goda skäl.

---

## Öppna frågor till dig

Enligt projektets egen princip frågar jag hellre än antar här — det här
är precis den typ av produktbeslut (datainsamling, AI-arkitektur,
onboarding-flöde) som inte finns färdigt dokumenterat:

1. **Vad är det egentliga syftet** — hjälpa er (Tushar/teamet) förstå
   piloten bättre för support/anpassning, mata framtida personalisering
   i appen, samla case-study-material, eller något annat? Svaret
   påverkar starkt vilket av alternativen A–D som faktiskt löser rätt
   problem.
2. **Måste det vara i själva appen**, eller löser CRM:et (alternativ C)
   behovet minst lika bra utan att röra appens offline-/AI-principer?
3. **Om ni vill ha riktig AI-tolkning:** är det värt att nu vara den
   "explicita nya begäran" som gör Fas 3 aktuell — med backend, kostnad
   per anrop och ett avsteg från offline-löftet som det innebär — eller
   väntar vi till Fas A–F-migreringen ändå blir aktuell av andra skäl?
4. Om ett lättare alternativ (A eller B) känns rätt som ett första steg —
   vill du att jag bygger det, eller vill du fundera vidare först?
