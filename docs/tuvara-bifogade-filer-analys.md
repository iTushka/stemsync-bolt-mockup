# Tuvara — analys av fyra bifogade filer och förslag på funktioner

**Datum:** 2026-08-18
**Underlag:** de fyra bifogade filerna (`flowertotcalculator.html`,
`projectboltsb1jmcrecnlenv3.zip`, `boltpromptqrwhatsappniva1.md`,
`calculator.html`), jämförda mot den faktiska koden i
`stemsync-bolt-mockup` som den ser ut idag (`insights.ts`, `AddSheet.tsx`,
`types.ts`, `WhatsAppCardSheet.tsx`, `AddCustomerSheet.tsx`,
`index.css`), samt `docs/context/vision-and-pilots.md` och
`docs/context/product-decisions.md` för samma avgränsningar som tidigare
(ingen betalning, ingen riktig AI-tolkning, inget nytt backend).

---

## Viktigt först: två av filerna är redan byggda — inte nya idéer

Innan förslagen: två av de fyra filerna visade sig, när jag jämförde dem
mot koden, vara **historik snarare än nytt underlag**. Värt att säga
tydligt så du inte förväntar dig nya förslag där det inte finns några.

**`projectboltsb1jmcrecnlenv3.zip`** är en tidig Bolt-export av samma
kodbas som `stemsync-bolt-mockup` självt — samma filnamn
(`AddSheet.tsx`, `StockList.tsx`, `CheckoutBar.tsx`, `parse.ts`,
`adCopy.ts` m.fl.), men en betydligt tidigare version (`App.tsx` på 91
rader mot dagens 539, en `SellPlaceholder.tsx` som visar att Sell-fliken
inte ens var byggd än, ingen multi-tenant-arkitektur). Det här är
Tuvaras egen historik, inte ett externt referensprojekt — jag har inte
hittat något i den som inte redan finns i en mer utvecklad form idag.

**`boltpromptqrwhatsappniva1.md`** är byggspecen för QR-baserad
WhatsApp-kontaktfångst — och den är **redan fullt implementerad**.
Jag jämförde punkt för punkt mot `WhatsAppCardSheet.tsx` (QR-kod via
`qrcode.react`, redigerbart telefonnummer + meddelande, "Copy link
instead"-fallback, samma förklarande text som specen föreslog ordagrant)
och `AddCustomerSheet.tsx` (samma "Paste the WhatsApp message you
received"-flöde, `parseCustomerMessage` som extraherar namn och
samtycke, redigerbart bekräftelsekort innan spara). Kundlistan i
Sell-fliken (`Recognised customers`) täcker del 3. Alla tre delar av
specen och samtliga acceptanskriterier stämmer mot vad som faktiskt är
byggt. Inget att lägga till här.

De två återstående filerna är däremot verkligt nytt underlag.

---

## `calculator.html` — litet, men bekräftar en verklig arbetsrytm

Ett enda litet fristående verktyg: mata in "hur många veckor sedan
varan listades på Marketplace" → få tillbaka det ungefärliga
listningsdatumet **och söndagen innan** (kommenterat i koden som
"Market Day"). Det är inte i sig en funktion värd att bygga om till
Tuvara, men den bekräftar något intressant tillsammans med nästa fil:
båda oberoende artefakterna antar att Flowertots inköp är ankarade till
en åter­kommande veckodag (söndagens blomsteruppköp på Columbia Flower
Market, redan nämnt i `CLAUDE.md`). Det underbygger förslag B1 nedan
(veckovisa prislistor) — det är inte en gissning från min sida, utan
en arbetsrytm som redan syns på två olika ställen i det underlag ni
själva tagit fram.

---

## `flowertotcalculator.html` — en parallell, mer avancerad byggnad

Det här är en helt egen, fristående implementation av samma grundidé
som Tuvara (foto-först lagerhantering, prisförslag, säljtext) men med
flera funktioner som **inte finns i `stemsync-bolt-mockup` idag**. Jag
har verifierat frånvaron i koden (inte antagit den) för varje punkt
nedan innan jag listar den som ett förslag.

### B1. Veckovisa prislistor (`currentWeek`, "Copy last week's items")

Hela lagret i den bifogade filen är organiserat per vecka
(`db.weeks[weekKey]`), med möjlighet att starta en ny vecka, kopiera
föregående veckas varor rakt av, och växla mellan veckor för att se
historik. Tuvaras nuvarande lager är en enda platt, evig lista — det
finns inget sätt att se "vad hade jag i lager förra veckan" eller att
snabbt återanvända förra veckans sortiment som utgångspunkt. För en
återkommande, marknadsdags-baserad inköpsrytm (Flowertot: fräscha
blommor varje söndag från grossisten) är det här inte en marginell
skillnad — det är en annan grundmodell för hur "lager" begreppsmässigt
fungerar, och matchar hur en blomsterhandlare faktiskt tänker: inte
"mitt eviga lager" utan "den här veckans leverans". Värt att notera:
det här är den enskilt största arkitekturförändringen i listan — inte
en enkel tilläggsfunktion.

### B2. Säsongsmärkning + säsongsanpassat föreslaget påslag

Varje vara kan taggas med en säsong (Alla hjärtans dag, Mors dag, jul
osv), och när ett varunamn matchar ett känt mönster (t.ex. "rose")
föreslås ett högre påslag automatiskt vid rätt säsong (`SEASON_BOOST`).
Tuvara har idag bara en fri textagg ("seasonal") utan koppling till
prisförslaget — `DEFAULT_MARKUP` i `batchPricing.ts` är en enda flat
konstant (3×) oavsett vad eller när något säljs. En säsongsmedveten
påslags*förslag* (fortfarande `AiBadge`-märkt, fortfarande redigerbart
— aldrig tyst) hade varit ett litet, kodmässigt billigt tillägg ovanpå
den logik som redan finns.

### B3. Föreslaget påslag per varutyp (nyckelordsbaserat, inte AI-modell)

En liten uppslagstabell (`SUGG_MARKUP`: ros 3.2×, pion 3.5×, tulpan
2.8× osv.) fyller i ett rimligt startpåslag baserat på varunamnet,
istället för samma flata standardpåslag för allt. Samma
regelbaserade-inte-AI-modell-disciplin som redan gäller för `parse.ts`
— en utökningsbar lista, inte ett API-anrop. Naturlig fortsättning på
B2, och relevant särskilt för Flowertot där olika blomsorter
verkligen har olika rimliga påslag i verkligheten.

### B4. Kvantitetsrabatt vid större köp (bulk-tröskel)

En global inställning ("vid X eller fler enheter, ge Y % rabatt")
tillämpas automatiskt i prisberäkningen. Tuvara har rabatt på
korg-nivå (Quote card, engångsrabatt per försäljning) men inget
inbyggt begrepp för "den här varan blir automatiskt billigare vid
större kvantitet" som en stående prisregel. Relevant för båda
piloterna — buntpartier av tyg (Jhum Fashion), storsäljande
krukväxter (Flowertot).

### B5. Break-even-beräkning ("hur mycket måste jag sälja för att gå jämnt upp")

Ett enda, konkret tal: "du behöver sälja N enheter till genomsnittligt
säljpris för att täcka veckans inköpskostnad". Stock-fliken visar redan
"Money sitting in stock" och marginalsignaler, men aldrig detta direkt
handlingsbara talet. Billigt att räkna ut från data som redan finns
(`purchasePrice`, `salePrice`, `quantity`) — inget nytt behövs samlas in.

### B6. Marginaltrend med förklarande text, inte bara ett nuläge

Jämför senaste periodens genomsnittliga marginal mot perioden innan,
och skriver ut en förklaring ("marginalen sjunker märkbart — kolla
grossistpriser och varor under din minimimarginal" / "stabil eller
förbättras — överväg högre buntrabatt för att flytta mer lager"), inte
bara en siffra. Tuvaras `insights.ts` har redan riktigt bra
enskild-vara-signaler (kanalkoncentration, snabb-/långsamsäljare,
verifierat i koden) — men inget som tittar på *trenden* i marginal över
tid och sätter ord på vad den betyder. En naturlig, jämnstor
komponent bredvid de befintliga insight-chipsen, samma beräkningsprincip
(ren lokal statistik, ingen AI, inget externt data).

### B7. Efterfrågeprognos / svinnrisk per vara — proaktiv, inte bara reaktiv

Räknar ut den historiska sälj-igenom-andelen per varunamn (såld
kvantitet ÷ inköpt kvantitet, snittat över tidigare perioder) och
använder den för att förutsäga: "förvänta dig att sälja ~X av Y i
lager — svinnrisk Z" **redan när varan läggs in**, inte efter att den
blivit gammal. Det här skiljer sig verkligt från Tuvaras nuvarande
`aging`-flagga, som är reaktiv (flaggar först efter att en vara stått
still ett tag). En framåtblickande version av samma idé — och en
tydlig kandidat för `AiBadge`-märkning eftersom det är en prognos, inte
ett faktum.

### B8. AI-föreslagna buntpar (poängsatt matchning) i stället för helt manuellt urval

Föreslår vilka varor som passar ihop i en bunt baserat på enkel
poängsättning (samma säsong +2, kompletterande färg +1, liknande
prisnivå +1) — fortfarande bara ett förslag, säljaren väljer fritt
ändå. Tuvaras `BundleBuilder` (nyligen genomgången i
`tuvara-offers-analys.md`) är helt manuellt idag: ingen som helst
hjälp att hitta vilka varor som faktiskt passar ihop. Låg risk att
lägga till eftersom det bara är ett förslag ovanpå en redan existerande,
helt manuell vy — samma "AI föreslår, du bestämmer"-princip som redan
gäller överallt annars i appen, med `AiBadge`.

### B9. Färgtaggning per vara (visuell + used för B8:s matchning)

En liten färgprick per vara i listan, vald från en fast palett. Delvis
en förutsättning för B8 (färgmatchning), delvis ett eget, litet
UX-tillskott — snabbare visuell avläsning av lagerlistan. Mest relevant
för Flowertot (blommor har verkligen en färgdimension); mindre
självklart för Jhum Fashion/Shoilee där kategorisering redan sker via
`categoryFieldMap.ts`.

### B10. Riktig utskriftsanpassad CSS för offert/kvitto

En `@media print`-regel som döljer navigering/knappar och visar en ren,
tryckvänlig offert. Jag sökte igenom `index.css` och samtliga
komponenter i Tuvara — det finns **ingen** print-specifik styling
alls, trots att Quote card redan har en fungerande "Print"-knapp
(`window.print()`). Just nu skulle en utskrift sannolikt inkludera
appens navigering och knappar rakt av. Litet, billigt, och en direkt
kvalitetsbrist snarare än en ny idé — bör rimligen ligga tidigt i en
prioritering trots att det kom fram i den här genomgången snarare än en
tidigare buggrond.

---

## Rekommenderad indelning

Inget av det här är byggt — det här är enbart en genomgång och förslag,
som tidigare rundor. Om du vill gå vidare skulle jag dela in det så här:

**Litet och fristående, kan köras oberoende av resten:**
B10 (print-CSS) — ren kvalitetsfix, inget produktbeslut inblandat.
B5 (break-even-tal) — ett nytt, litet statistikkort utifrån data som
redan finns.

**Kräver lite mer eftertanke men bygger direkt ovanpå befintlig logik:**
B3 (varutyp-påslag) och B2 (säsongspåslag) hänger ihop och bygger
vidare på `batchPricing.ts`/`DEFAULT_MARKUP`. B6 (marginaltrend) är en
naturlig utökning av `insights.ts`. B8 (AI-buntförslag) bygger ovanpå
det redan nyligen uppdaterade `BundleBuilder.tsx`.

**Större produktbeslut — bör diskuteras innan de byggs, inte antas:**
B1 (veckovisa prislistor) är den enda riktigt stora arkitekturfrågan
här — den ändrar grundmodellen för vad "lager" betyder i appen, och
bör vägas mot om det är ett verkligt uttalat behov hos piloterna eller
en lösning från en kontext (Flowertots specifika söndags-inköpsrytm)
som inte nödvändigtvis stämmer för Jhum Fashion/Shoilee på samma sätt.
B4 (kvantitetsrabatt) och B7 (svinnprognos) är mindre i kodomfattning
men rör prissättnings- respektive prognoslogik, som `CLAUDE.md` ber om
extra eftertanke kring innan de byggs.
B9 (färgtaggning) är mest värd om B8 byggs — annars marginell nytta för
sig själv, och tveksamt värdefull för icke-blomster-piloterna.

Säg till vilka du vill gå vidare med, så tar jag dem på samma sätt som
tidigare rundor.
