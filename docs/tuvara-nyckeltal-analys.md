# Tuvara — nyckeltal för hållbarhet och lönsamhet (ROI/ROAS/Working Capital/Profit Margin/BEP/RRR)

**Datum:** 2026-08-18
**Status (uppdaterad samma dag):** Byggd, verifierad (typecheck/build/lint +
Playwright-genomgång i webbläsare, inklusive en bugg som fångades och
fixades under den genomgången) och levererad till din enhet. Dina svar på
de fyra öppna frågorna nedan:

1. **Betalda annonser är vanligt** hos mikroföretagen → ROAS byggdes ändå,
   men som "ROAS-lite": annonsspend loggas per kanal (inte per försäljning
   — Tuvara har ingen klickspårning), och jämförs mot försäljning på samma
   kanal i samma fönster. Tydligt märkt som en grov korrelation, aldrig
   exakt attribution.
2. **"Hur kan vi göra det enkelt, inte som bokföring?"** → en ny lista
   "Vad du är skyldig" byggdes som en exakt spegelbild av den redan
   existerande বাকি-funktionen (belopp + fritextfält "vem" + valfri
   anteckning, markera som betald) — inget nytt kontobegrepp, ingen
   kategorisering, samma UX-mönster användaren redan känner igen.
3. **"Hur kan AI hjälpa upptäcka fasta kostnader?"** → ärligt byggt som en
   tappbar lista av vanliga kostnads*kategorier* per tenant (hyra för
   marknadsstånd, telefon/data, frakt, förpackning ...), aldrig en gissad
   summa — Tuvara har ingen bank-/kassaintegration att faktiskt upptäcka
   kostnader ifrån, så "AI föreslår kategorier att tänka på" är den
   ärliga versionen, inte påhittad detektering.
4. **Samlad på en ny yta** → en ny "Business health"-sheet, nåbar via
   Stock-flikens "More"-meny (samma mönster som redan används för
   Bookings/Customer বাকি), med sex sektioner: How you're doing (ROI +
   aggregerad marginal), Your pace (Revenue Run Rate), Ads (ROAS-lite),
   Cash (förenklad Working Capital — tillgångar minus vad du är skyldig,
   aldrig en kvot), och Break-even (både det befintliga
   lager-återhämtningstalet och det nya, tydligt separata klassiska
   BEP-talet från loggade fasta kostnader).

Ny kod: `src/businessHealth.ts` (alla beräkningar, med explicita
null-returer istället för gissade tal när data saknas),
`src/components/BusinessHealthSheet.tsx`. Tre nya, små loggar i
`types.ts`: `AdSpendEntry`, `OwedEntry`, `FixedCostEntry`.

Originalanalysen nedan är kvar oredigerad som historik.

---

## Kärnspänningen

De sju formlerna är standardformler från ett företagsekonomi-kurspaket —
skrivna för någon som redan för bokföring med tillgångar, skulder,
annonskostnader och fasta kostnader som egna, separat inmatade poster.
Tuvaras uttalade löfte är i praktiken motsatsen: "Tuvara shows a simple
summary — no spreadsheet needed", "does not guess silently". Det är alltså
inte ett läge av "bygg alla sju som de står" — rätt fråga är: vilket
verkligt behov ligger bakom varje formel, och kan Tuvara svara på det utan
att be en soloentreprenör börja föra bokföring hon uttryckligen valde bort
genom att använda Tuvara istället för Excel?

Genomgången nedan går punkt för punkt (numreringen följer bilderna du
delade — det saknas en "5" i underlaget, så den hoppar jag över snarare än
gissar på vad den var).

---

## 1. ROI (Return on Investment)

**Formel:** Net Profit ÷ Cost of Investment × 100

Det här är redan nästan byggt, bara inte uttalat som "ROI". Ett varas
`markup` (säljpris ÷ inköpspris) är samma idé upp och ner, och
`margin()`-funktionen i `types.ts` räknar redan ut vinst per vara — men
notera att margin (vinst ÷ *intäkt*) och ROI (vinst ÷ *kostnad*) är olika
tal trots att de låter lika, och att blanda ihop dem är ett vanligt riktigt
misstag. Det är värt att hålla isär tydligt i eventuell UI-text.

**Bedömning: enkelt att bygga, ingen ny inmatning.** All data
(`purchasePrice`, `salePrice`, `quantity`, sålda rader) finns redan.
Förslag: ett nytt tal, i vanligt språk snarare än "ROI: X%" — t.ex. "För
varje 100 kr du la in fick du tillbaka X" — bredvid den befintliga
marginalvisningen per vara, samt ett affärs-nivå-tal (total vinst ÷ total
inköpskostnad över en period) i `EarningsStrip`, byggt på samma
`revenue`/`knownCost`-siffror `computeEarnings()` redan samlar in.

---

## 2. ROAS (Return on Advertising Spend)

**Formel:** Revenue from Ads ÷ Cost of Ads

Jag sökte igenom hela kodbasen — det finns **ingenting** som spårar
annonskostnad någonstans. `SalesChannel` har ett valfritt pris-fält, men
aldrig "pengar spenderat för att få den här försäljningen".

**Bedömning: bör troligen inte byggas som ett bokstavligt fält.** Att bygga
det här på riktigt betyder att be säljaren logga annonsspend per kanal per
period för hand — ny bokföring, rakt emot "no spreadsheet needed". Det
finns heller inget i projektunderlaget som bekräftar att piloterna
faktiskt kör *betalda* annonser — kanalerna som redan finns i appen
(WhatsApp, Instagram, Facebook Marketplace, TikTok) är i huvudsak organiska
kanaler, inte annonsplattformar med spårbar spend.

Om själva behovet ("vilken kanal ger mig faktiskt något") är det som
spelar roll snarare än ordet ROAS, finns det redan en lättare lösning:
`channelConcentrationInsight` i `insights.ts` visar redan "X% av
försäljningen via [kanal]" — helt utan att någon behöver mata in en enda
kostnadssiffra.

---

## 3. Working Capital / Working Capital Ratio

**Formler:** Current Assets − Current Liabilities; Current Assets ÷
Current Liabilities

"Current assets" finns delvis redan — lagervärde (`stockValue` i
`earnings.ts`) och utestående kundskulder (বাকি, `CustomerDebt` — pengar
kunder är skyldiga *dig*). "Current liabilities" (pengar *du* är skyldig
någon annan — leverantörsskulder, lån, obetalda räkningar) finns
ingenstans i appen idag.

**Bedömning: det här är den enskilt största produktfrågan i hela listan.**
En riktig Working Capital-kvot kräver att Tuvara börjar spåra skulder du
har, inte bara skulder andra har till dig — det är ett steg rakt in i
riktig bokföring, i samma kategori som betalningshantering, som
`CLAUDE.md` uttryckligen håller utanför scope. En lättare variant (bara
"tillgångar", ingen kvot) går att räkna ut redan idag: lagervärde + utestående
kundskulder = "vad du skulle kunna få loss om allt såldes/betalades in just
nu". Men även den enkla varianten är känslig att presentera fel —
lagervärde är inte likvida pengar, så en siffra som ser ut som "det här har
du att röra dig med" utan den brasklappen skulle kunna vilseleda snarare än
hjälpa. Flaggar det här som en öppen fråga snarare än antar ett svar.

---

## 4. Profit Margin (Net + Gross)

**Formler:** Net Profit Margin = Net Profit ÷ Net Revenue × 100; Gross
Profit Margin = (Revenue − COGS) ÷ Revenue × 100

Det här är redan det bäst täckta av alla sju. `margin()` i `types.ts`
räknar redan marginal per vara, och `marginTrendInsight()` i `insights.ts`
(byggd tidigare idag som B6) jämför senaste veckans marginal mot veckan
innan med en förklarande text. Värt att vara exakt: det befintliga
`margin()`-talet är i praktiken redan "gross margin" per enhet (säljpris
mot inköpspris, inga andra kostnader avdragna) — bra att hålla den
benämningen konsekvent om det byggs vidare, så inget råkar dubbelräknas
eller kallas fel sak.

**Bedömning: minimalt kvar att göra.** Enda verkliga luckan är att det inte
finns en enda aggregerad "din marginal totalt den här veckan"-siffra i
`EarningsStrip` — bara per vara och veckotrenden. Billig att lägga till
från samma `revenue`/`knownCost`-tal `computeEarnings()` redan samlar in
för "profit".

---

## 6. Break-Even Point (BEP)

**Formel i bilden:** Fixed costs ÷ (Selling price per unit − Variable cost
per unit) — notera att bilden visuellt bara staplar de två sista raderna
utan ett tydligt minustecken; jag utgår ifrån standardformeln (skillnaden
mellan dem) snarare än att gissa på vad en felformaterad bild egentligen
menade.

Tuvara har redan ett break-even-tal (B5, byggt tidigare idag) — men det
svarar på en annan fråga: "hur många fler enheter, till nuvarande
snittsäljpris, för att få tillbaka pengarna som just nu sitter i lager"
(`stockValue ÷ avgSalePrice`). Bildens klassiska formel handlar istället om
att täcka löpande **fasta kostnader** (hyra, prenumerationer,
annonsbudget, ev. personal) per period, relativt täckningsbidrag per
enhet — en genuint annan fråga ("hur många försäljningar per månad för att
täcka omkostnader" mot "hur många försäljningar för att få tillbaka just
det här lagret").

**Bedömning: liten men riktig ny inmatning krävs.** Tuvara spårar inga
fasta kostnader alls idag. Den klassiska BEP-varianten skulle behöva ett
nytt, valfritt fält ("ungefär vad kostar dina fasta omkostnader per
vecka/månad?") — mindre scope-creep än Working Capital, men samma typ av
fråga: vill en soloentreprenör fylla i det, eller känns det som bokföring
hon valde bort? Viktigt oavsett beslut: håll de två break-even-begreppen
tydligt åtskilda i all text så de aldrig blandas ihop, eftersom "break-even"
redan betyder en specifik sak i appen sedan tidigare idag.

---

## 7. Revenue Run Rate (RRR)

**Formel:** Revenue for period × antal perioder per år

All underliggande data finns redan (`Sale.date`, `sale.total`) via samma
fönsterlogik `computeEarnings()` redan använder för "Earned last 7 days".

**Bedömning: billigast av alla sju att bygga, ingen ny inmatning.** Förslag:
en extrapolerad takt bredvid "Earned last 7 days" — t.ex. "I den här takten,
≈ X i månaden". Viktigt att vara försiktig med hur den framställs: en enda
ovanligt bra eller dålig vecka skulle ge en missvisande årssiffra, så den
bör ha samma typ av minimidata-spärr som redan finns för marginaltrenden
(`MARGIN_TREND_MIN_SALES_PER_WINDOW`-mönstret) innan den visas, och bör
heta "i den här takten" snarare än "prognos" eller "du kommer tjäna" — det
senare låter som ett löfte Tuvara inte kan hålla.

---

## Sammanfattning — tre nivåer

**Byggbart direkt, ingen ny inmatning, låg risk** (samma princip som
B5/B6/B7 som redan byggdes idag — ren räkning på data som redan loggats):
ROI (per vara/batch och affärs-nivå), RRR (extrapolerad takt), aggregerad
marginal i `EarningsStrip`.

**Kräver en liten men riktig ny inmatning, är ett produktbeslut:**
Klassisk BEP behöver ett fasta-kostnader-fält.

**Bör troligen inte byggas som bokstavliga fält** — kräver bokföring
Tuvara uttryckligen lovar att slippa (jämför `feature-reference.html`:
"Does not process payments", "no spreadsheet needed"):
ROAS (kräver annonskostnadsspårning; oklart om piloterna ens kör betalda
annonser), Working Capital-kvoten (kräver leverantörsskuld-spårning — en
riktig bokföringsfunktion).

---

## En annan vinkel: hur det visas, inte bara vilka tal

Om flera av de "byggbara direkt"-talen (ROI, RRR, aggregerad marginal)
byggs samtidigt är sju nyckeltal för mycket att smälta på en gång för en
förstagångsanvändare, särskilt jämfört med Tuvaras nuvarande stil av
korta, enskilda chips. Ett alternativ värt att väga: samla dem på en enda
ny yta (t.ex. en expanderbar sektion under `EarningsStrip`, eller en egen
flik) med vanligt språk och en kort "varför det spelar roll"-rad per tal,
istället för att sprida ut ännu fler enskilda chips bredvid de som redan
finns. Det här är i sig ett UX-beslut värt att stämma av innan det byggs,
inte något jag bör anta.

---

## Öppna frågor innan något byggs

1. **Kör någon av piloterna faktiskt betalda annonser** (boostade inlägg,
   Facebook/Instagram-annonser) idag, eller är alla kanaler organiska?
   Avgör om ROAS är värt att bygga överhuvudtaget, i någon form.
2. **Vill du att Tuvara ska börja spåra vad säljaren själv är skyldig**
   (leverantörsskulder, lån) — en spegelbild av den বাকি-funktion som
   redan finns för vad kunder är skyldiga henne? Det är den enda vägen
   till en riktig Working Capital-siffra, och är ett större scope-beslut
   i linje med "aldrig betalningshantering"-principen.
3. **Är ett nytt fasta-kostnader-fält något en soloentreprenör skulle vilja
   fylla i**, eller känns det som mer bokföring än Tuvara ska be om?
   Avgör om den klassiska BEP-formeln är värd att bygga separat från den
   redan byggda B5-break-even.
4. **Om du vill gå vidare med de "byggbara direkt"-talen** (ROI, RRR,
   aggregerad marginal) — som fler enskilda kort/chips i befintlig stil,
   eller samlade på en ny "hälsa för din affär"-yta?

Säg till vilka du vill gå vidare med (eller "gissa själv men markera det
tydligt"), så bygger jag det på samma sätt som tidigare rundor.
