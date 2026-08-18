# Tuvara — Quote card: bugg, intuitivitet och värdeförslag

> **Statusuppdatering 2026-08-18 (uppdaterad):** Buggen, **P1 i sin helhet**
> (marginalvarning vid rabatt, döpt om till "Checkout", procentrabatt,
> omskriven "Sold via"-text) och **P2 i sin helhet** (kundkoppling till
> försäljningar, orderhistorik via ny "Recent sales"-vy, ångra-toast vid
> borttagning) är **implementerade, verifierade och redo för granskning**
> i `stemsync-bolt-mockup` — `npm run typecheck`/`build`/`lint` gröna
> genom hela arbetet, samt live i webbläsaren (Playwright, inklusive hela
> det nya flödet: lägga till kund, koppla den till ett köp, slutföra
> försäljningen och se den dyka upp med rätt märkning i "Recent sales").
> Allt ligger ostagat i repot, väntar på din granskning innan commit —
> inget har committats eller pushats. De två återstående, uttryckligen
> **flaggade men inte föreslagna** punkterna (flervalutavisning, namngivna
> vilande offerter) är fortfarande bara idéer, inte byggda — se motivering
> under respektive rubrik nedan.

**Datum:** 2026-08-18
**Underlag:** kodgranskning av `QuoteCard.tsx`, `SellTab.tsx`,
`CheckoutBar.tsx` och relevant varukorgslogik i `App.tsx`, samt
`docs/context/vision-and-pilots.md` och `docs/context/product-decisions.md`
för att inte föreslå något som redan är medvetet avskrivet (betalning,
riktig AI-tolkning, nytt backend).

---

## Buggen — bekräftad grundorsak

`QuoteCard.tsx` hade inget sätt alls att ändra varukorgen inifrån
kortet: varje rad renderades som ren, oklickbar text (namn, antal ×
pris, radsumma) utan vare sig borttagningsknapp eller antalsväljare, och
komponentens props-gränssnitt saknade helt en callback för att mutera
varukorgen. Jag letade även igenom `SellTab.tsx` (varukorgens
källvy — `onAdd` ökar bara antal, det finns ingen minus-funktion där
heller) och `CheckoutBar.tsx` (visar bara summa och öppnar Quote card) —
**det fanns bokstavligen ingen plats någonstans i appen** där en felaktigt
tillagd vara eller fel antal kunde korrigeras. Enda alternativen var att
slutföra försäljningen som den såg ut, eller stänga kortet och leva med
att varukorgen (som sparas i `localStorage` och alltså överlever
stängning/omstart) låg kvar fel tills den manuellt las om, rad för rad,
genom att lägga till samma vara på nytt tillräckligt många gånger.

Det här är inte ett "känns inte intuitivt"-problem i vanlig mening — det
är en funktion som saknades helt, med direkt affärsrisk (en felaktig
offert/kvitto delas eller en försäljning slutförs med fel varor/antal).

### Fixen

- Varje rad har nu en `−`/`+`-stegare (samma mönster som antalsfält
  används för på andra ställen i appen) och en papperskorgsikon för att
  ta bort raden helt, oavsett antal.
- `App.tsx` fick två nya handlers, `handleUpdateCartQuantity` (antal ≤ 0
  tar bort raden) och `handleRemoveCartLine`, kopplade via två nya props
  på `QuoteCard` (`onUpdateQuantity`, `onRemoveLine`).
- Nytt: eftersom varukorgen nu faktiskt *kan* tömmas inifrån kortet (vilket
  den aldrig kunde förut) lades ett tomt-läge till — "Cart is empty —
  nothing left to quote" med en "Continue shopping"-knapp som stänger
  kortet. Innan fixen hade "Complete sale"-knappen redan ett dolt
  `disabled`-läge vid tom varukorg, men ingen förklaring till varför —
  nu är det synligt och begripligt istället för en knapp som bara inte
  reagerar.
- Kvitto-/delningstexten (Print/WhatsApp/Share) byggs fortfarande från
  samma `cart`-state och stämmer automatiskt med vad som faktiskt visas,
  eftersom det inte finns någon separat kopia av datan.

Inget annat i kortets logik (rabatt, "Sold via", själva försäljningen)
är ändrat.

---

## Intuitivitet, enkelhet och användarvänlighet — övriga fynd

### A. Namnet "Quote card" matchar inte vad kortet faktiskt gör

Rubriken säger "Quote card" (en offert), men knappen längst ner säger
"Complete sale" (slutför en försäljning) — två olika mentala modeller i
samma yta. En prospekt kan rimligen tro att kortet bara är en förhands-
titt/offert att skicka, inte det faktiska kassaflödet. Det är en liten,
billig fix (byt rubriktext) men värd att nämna eftersom den direkt
speglar samma typ av "namnet lovar en sak, gränssnittet gör en annan"-
gap som redan identifierades som den mest sannolika förklaringen i den
tidigare UX-analysen (`tuvara-ux-intuitivitet-analys.md`).

### B. Ingen väg tillbaka för att lägga till fler varor utan att helt lämna kortet

Om säljaren, mitt i att visa kunden en offert, behöver lägga till "och
en till av den här" måste hen stänga hela kortet, gå till Sell-fliken,
trycka på varan, och öppna Checkout igen. Varukorgen bevaras (den ligger
kvar i `localStorage`), så inget data går förlorat — men själva
*vägen* dit är onödigt lång för något som händer ofta i ett verkligt
säljsamtal. En tydlig "+ Lägg till fler varor"-länk i kortet (som helt
enkelt stänger sheeten och lämnar varukorgen orörd) hade gjort samma sak
mer begripligt och en aning snabbare.

### C. Rabattfältet tar bara ett belopp, aldrig procent

Många småföretagare tänker i procent ("10 % rabatt"), inte i exakt
belopp — särskilt vid större totalsummor (t.ex. taka-belopp i
tusentals). Att bara kunna skriva ett fast belopp tvingar fram
huvudräkning som appen enkelt skulle kunna göra åt användaren.

### D. "Sold via (optional)" förklaras lite abstrakt

Texten under kanalvalet ("Helps flag if you're becoming too dependent
on one channel") är korrekt men känns mer som en varning än ett
konkret värde vid just det här ögonblicket. Ett enklare, mer direkt
"Hjälper dig se vilken kanal som faktiskt säljer mest" hade varit
lättare att koppla till varför man skulle bry sig, precis nu, mitt i
en försäljning.

### E. Ingen ångra-funktion vid borttagning

Med den nya papperskorgsikonen kan en rad tas bort med ett enda,
oavsiktligt tryck — och på en order med högt värde är det inte trivialt
att lägga in exakt samma rad igen (rätt antal, rätt pris om priset
sedan ändrats i lagret). Ett litet "Removed [vara] — Undo"-meddelande
i 3–4 sekunder (inte en blockerande `confirm()`-dialog, som skulle göra
själva borttagningen segare för alla de gånger det *var* avsiktligt)
löser det utan att komplicera det vanliga flödet.

---

## Förslag med genuint kund- och affärsvärde

Dessa är **inte byggda** — de är förslag, rangordnade efter hur direkt
de kopplar till redan dokumenterade produktprinciper eller redan
existerande, men idag frånkopplad, data i appen. Ingen av dem kräver
betalningshantering, ett nytt backend eller riktig AI-tolkning (alla tre
är medvetet avskrivna just nu enligt `docs/context/product-decisions.md`).

### 1. Marginalvarning vid rabatt (starkast motiverad — kopplar direkt till en redan uttalad principerna)

"Aldrig underprissätt" är enligt `vision-and-pilots.md` en uttalad
produktprincip, inte bara en färgkodning i "Lägg till produkt"-kortet.
Men just **i Quote card, när en rabatt faktiskt läggs på en riktig
försäljning**, finns ingen som helst koppling tillbaka till varans
inköpspris (`StockItem.purchasePrice` finns redan i datamodellen) — en
säljare kan av misstag rabattera under sitt eget inköpspris utan
varning, precis vid det ögonblick det spelar som mest roll. Att
återanvända samma gul/röd-tröskellogik som redan finns i `AddSheet.tsx`
(50 %/30 %) här, beräknad lokalt från data som redan finns, skulle
stänga en verklig lucka i ett redan uttalat löfte — inte lägga till en
ny idé utifrån.

### 2. Koppla en försäljning till en "Recognised customer"

`SellTab.tsx` visar redan en lista över kända kunder, men den listan
används inte alls när en försäljning faktiskt slutförs — `Sale`-objektet
som skapas i `handleCompleteSale` sparar inget kund-ID. Att låta
säljaren (valfritt) välja en kund i Quote card skulle koppla ihop två
redan byggda men idag helt frånkopplade delar av appen, och ge en
soloentreprenör något hen annars saknar helt: vem som faktiskt är en
återkommande kund, utan något nytt datalager.

### 3. Kvitto-/orderhistorik snabbt tillgänglig

`Sale`-data sparas redan (`setSales`) vid varje slutförd försäljning,
men syns ingen annanstans i gränssnittet efteråt. En enkel "Senaste
ordrar"-vy (eller bara en länk från kvittot efter en slutförd
försäljning) hade gett omedelbart, konkret värde utan ny datamodell.

### 4. Flervalutavisning för Flowertot Botanicals (UK) — flaggas, inte föreslås som säker vinnare

`AppSettings.exchangeRates` finns redan och används i `StockList.tsx`.
Att visa totalsumman i en andra referensvaluta (för en turist som
handlar krukväxter) hade varit tekniskt billigt eftersom infrastrukturen
redan finns. Jag flaggar den här snarare än föreslår den som prioriterad,
eftersom jag — i linje med projektets "fråga istället för att anta"-
princip för produktbeslut som inte är dokumenterade — inte har sett
något dokumenterat om hur ofta turistkunder faktiskt är en del av
Flowertots säljsituation. Säg till om det är ett verkligt, återkommande
behov så prioriterar jag om den.

### 5. Namngivna "vilande" offerter — flaggas som P2, inte föreslagen nu

Idag fungerar varukorgen redan som en enda, tyst "hållen" offert
(den ligger kvar i `localStorage` om kortet bara stängs). Men appen kan
bara hålla **en** aktiv varukorg åt gången — om en kund lämnar mitt i
ett köp och en annan kund kommer in samtidigt går det inte att hålla
båda ordrarna separat. En riktig "spara som väntande order, med namn"-
funktion vore en större förändring av datamodellen (flera samtidiga
varukorgar) och bör, i linje med `product-decisions.md`s princip om att
"investigate before building" för större arkitekturförändringar, vänta
tills piloterna faktiskt visat att det är ett återkommande problem —
inte byggas i förebyggande syfte.

---

## Föreslagen prioritering, om du vill gå vidare

**P0 (redan gjort):** borttagning/antalsjustering av varor + tomt-läge —
se statusraden överst.

**P1 — litet, tydligt kopplat till en redan uttalad princip:**
marginalvarning vid rabatt (förslag 1), samt de billiga
namn-/textfixarna (A, C, D ovan).

**P2 — kräver mer eftertanke eller mer pilotsignal innan de byggs:**
kundkoppling (förslag 2), orderhistorik (förslag 3), ångra-toast (E),
"+ Lägg till fler varor"-länk (B) — inget av dessa är fel att bygga, men
inget av dem är heller lika akut kopplat till ett redan dokumenterat
löfte som förslag 1 är.

**Flaggat, inte prioriterat:** flervalutavisning (förslag 4) och
vilande/namngivna offerter (förslag 5) — vardera av ett skäl som är
specifikt beskrivet ovan, inte bara "senare".

Säg till vilken nivå du vill köra så tar jag den härnäst, på samma sätt
som P0/P1 kördes för den förra UX-genomgången.
