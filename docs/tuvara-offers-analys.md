# Tuvara — Offers: intuitivitet, korrekthet och värdeförslag

> **Statusuppdatering 2026-08-18:** **P0 (alla tre korrekthetsbuggarna) och
> P1 (redigera/ta bort, marginalvarning, dela-text) är implementerade,
> verifierade och redo för granskning** i `stemsync-bolt-mockup` —
> `npm run typecheck`/`build`/`lint` gröna, samt en fullständig
> Playwright-genomgång: skapade en bunt, bekräftade marginalvarningen,
> sparade och såg AI-märkt annonstext, redigerade den (av/på "Mark as
> active sale" och bekräftade att den faktiskt döljs/visas i Sell),
> sålde en bunt och bekräftade att lagersaldot för båda ingående varorna
> minskade korrekt, uttömde en varas lager och bekräftade att en bunt som
> innehåller den blir inaktiverad med "Not enough stock", och till sist
> tog bort en bunt och bekräftade att den försvann ur listan. Allt ligger
> ostagat i repot, väntar på din granskning innan commit — inget har
> committats eller pushats. P2 (utgångsdatum, kvantitetserbjudanden) är
> fortsatt bara flaggat, inte byggt — väntar på tydligare pilotsignal,
> som du redan bekräftat.

**Datum:** 2026-08-18
**Underlag:** kodgranskning av `OffersTab.tsx`, `BundleBuilder.tsx`,
`SellTab.tsx`, `App.tsx`s bunt-/försäljningslogik, `insights.ts`,
`adCopy.ts` och `types.ts`, samt `docs/context/vision-and-pilots.md` och
`docs/context/product-decisions.md` (samma avgränsningar som tidigare:
ingen betalning, ingen riktig AI-tolkning, inget nytt backend).

---

## Sammanfattning — det viktigaste fyndet

Till skillnad från de två tidigare genomgångarna (AddSheet-komplexitet,
Quote card-buggen) är huvudfyndet här inte ett enskilt trasigt knapptryck
utan ett **strukturellt hål**: en bunt/ett erbjudande (`Bundle`) skapas
utifrån riktiga lagervaror, men är **från det ögonblicket helt
frånkopplad från det riktiga lagersaldot**. Det får tre konkreta,
kodbelagda konsekvenser, i fallande allvarlighetsgrad:

1. **Att sälja en bunt drar aldrig av lagersaldot för de ingående
   varorna.** `handleCompleteSale` i `App.tsx` matchar bara varulinjer
   där `l.kind === 'item'` mot lagret (rad 289: `cart.find((l) =>
   l.kind === 'item' && l.refId === item.id)`) — en bunt-rad har
   `kind: 'bundle'` och matchas aldrig, träffar aldrig den koden, och
   lagersaldot för de ingående varorna rörs alltså inte alls.
2. **Varukorgen kontrollerar aldrig om de ingående varorna faktiskt
   finns i lager innan en bunt kan läggas till.** Enskilda varor i
   `SellTab.tsx` inaktiveras korrekt när de är slutsålda (`disabled =
   item.soldOut || available <= 0`), men bunt-knappen har ingen
   motsvarande kontroll — den går alltid att trycka på, oavsett vad som
   faktiskt finns kvar av innehållet.
3. **Det finns ingen väg att redigera eller ta bort en bunt efter att
   den skapats.** `setBundles` anropas exakt en gång i hela kodbasen —
   för att lägga till en ny bunt (`App.tsx:197`). Ingen `onClick` på
   själva bunt-kortet i `OffersTab.tsx` (det är en vanlig `<div>`, inte
   en `<button>`), och ingen ta-bort-funktion någonstans.

Tillsammans betyder det att en bunt, en gång skapad, blir ett permanent
säljbart "spöke-erbjudande" som aldrig kan stängas av och som — om den
säljs — ger en felaktig lagerbild från och med första försäljningen.
Det här är inte "svårt att förstå"-typen av problem utan samma typ av
faktiska, riskfyllda buggar som Quote card-genomgången hittade, och bör
bedömas därefter (se prioritering nedan).

Utöver det finns ytterligare ett fynd som (liksom språkväxlaren i den
första genomgången) ser färdigt ut men inte är det:

4. **"Mark as active sale"-kryssrutan i `BundleBuilder.tsx` gör
   ingenting funktionellt.** Den sätter `bundle.onSale`, som bara
   styr om en röd "Sale"-etikett visas i listan (`OffersTab.tsx:69-73`)
   — den påverkar aldrig om bunten faktiskt går att köpa. `SellTab.tsx`
   filtrerar bunt-listan enbart på söktext, inte på `onSale`. En säljare
   som bockar ur rutan i tron att hen "stänger av" erbjudandet gör i
   praktiken ingenting mer än att ta bort en etikett.

---

## Övriga fynd — intuitivitet och mental modell

### A. "Bundle"-språket passar dåligt när man bara vill rabattera en enda vara

`AgingActionSheet`s "Bundle it"-genväg och `BundleBuilder` i övrigt är
byggda för att gruppera *flera* varor, men fungerar tekniskt lika bra med
bara en (`selected.length > 0` räcker). Ändå möts användaren av "Bundle
name", kryssrutor under rubriken "Pick items to include" och en
"Individual price total" som bara är meningsfull vid fler än en vara.
Den vanliga situationen "den här enskilda krukväxten har åldrats, jag
vill bara sänka priset på den" tvingas alltså genom ett gränssnitt
byggt för ett annat scenario (flera varor ihop), vilket är precis den typ
av "det här verkar inte gjort för mig"-känsla som troligen ligger bakom
"känns inte intuitivt". En riktig, enkel prissänkning på en vara finns
för övrigt redan — `handleAgingMarkdown` i `App.tsx` — men den nås bara
via ett annat flöde (aging-actions), inte här.

### B. Ingen marginalvarning vid bunt-prissättning

`BundleBuilder` visar "Individual price total" (summan av `salePrice`)
som referens när bunt-priset sätts, men jämför aldrig mot de ingående
varornas faktiska inköpspris. Exakt samma princip som redan byggdes för
Quote card-rabatten (marginalvarning, 50 %/30 %-tröskel) saknas här helt
— trots att en bunt, precis som en rabatt, är ett ställe där "aldrig
underprissätt" tyst kan brytas.

### C. Inget sätt att snabbt dela ett nytt erbjudande

Efter att ha sparat en vanlig vara i `AddSheet.tsx` möts användaren av
ett `savedStep`: AI-märkt (`AiBadge`), kanalanpassad annonstext
(`buildAdCopy`) redo att kopieras. `BundleBuilder.handleSave` gör
motsatsen — sparar och stänger direkt (`reset(); onClose();`), utan
någon som helst hjälp att faktiskt berätta för kunder att erbjudandet
finns. Det är en omvänd prioritering: ett tidsbegränsat erbjudande är
om något *mer* brådskande att dela snabbt än en vanlig lagervara.

### D. Datamodellen stödjer bara "olika varor, ett fast pris" — inte kvantitetserbjudanden

`Bundle.itemIds` är en lista av unika id:n, inte antal. Vanliga
erbjudandetyper som "3 för 2" eller "köp 2, få 10 %" på *samma* vara går
alltså inte att representera alls idag — bara "den här specifika
kombinationen av olika varor till ett fast pris".

---

## Föreslagen prioritering

### P0 — korrekthetsbuggar, bör åtgärdas oavsett vad ni bestämmer om resten

1. Dra av lagersaldo för bunt-varor vid försäljning (samma logik som
   redan finns för enskilda varor i `handleCompleteSale`, bara utökad
   till att även läsa `Bundle.itemIds` när `l.kind === 'bundle'`).
2. Inaktivera bunt-knappen i `SellTab.tsx` när någon ingående vara är
   slut, på samma sätt som redan görs för enskilda varor.
3. Koppla "Mark as active sale" till något verkligt (antingen faktiskt
   dölja/inaktivera bunten i `SellTab` när den är avbockad, eller — om
   den bara är tänkt som en visuell etikett — döpa om den till något som
   inte antyder på/av-funktion, t.ex. "Show 'Sale' badge").

### P1 — kräver lite mer arbete, tydligt kopplat till redan etablerade principer/mönster

4. Gör bunt-korten i `OffersTab.tsx` klickbara med en redigera/ta bort-
   vy (samma grundmönster som redan finns för lagervaror via
   `onEditItem`/`handleUpdateItem`/`handleDeleteItem`).
5. Marginalvarning vid bunt-prissättning i `BundleBuilder` — samma
   `margin()`-funktion och 50/30-tröskel som redan används i `AddSheet`
   och i Quote card.
6. Ett minimalt "här är text redo att posta"-steg efter sparad bunt,
   återanvänder `buildAdCopy`/`AiBadge`-mönstret från `AddSheet`. Kräver
   en liten anpassning eftersom `Bundle` saknar `quantity`/`tags`/
   `category` som `buildAdCopy` idag förväntar sig — ingen ny AI-modell,
   bara samma lokala heuristik applicerad på en bunt istället för en
   enskild vara.

### P2 — större eller mer osäkra, väntar på tydligare pilotsignal

7. Ett enkelt, tydligare namngivet en-varas-rabattflöde skilt från
   "bunta ihop flera varor" (fynd A) — påverkar hur `AgingActionSheet`
   och `BundleBuilder` hänger ihop, så värt att tänka igenom innan det
   byggs, inte bara döpa om.
8. Valfritt utgångsdatum på ett erbjudande, som en naturlig fortsättning
   på P1 punkt 4 (redigera/ta bort) — flaggas här snarare än föreslås
   direkt, eftersom det bygger vidare på en funktion som inte finns än.
9. Kvantitetsbaserade erbjudanden ("3 för 2") — en större förändring av
   `Bundle`-datamodellen (fynd D), bör vänta på om det faktiskt är en
   efterfrågad erbjudandetyp hos piloterna innan den byggs.

---

## Kundnytta och affärsvärde utöver ren korrekthet/UX

Dessa bygger vidare på data och mönster som redan finns i kodbasen,
inte nya integrationer eller AI-anrop:

1. **Föreslå buntar direkt från åldrande-lager-signalen.**
   `offersInsights` flaggar redan "N aging, not bundled yet" i
   Offers-fliken, och `AgingActionSheet`s "Bundle it" förifyller redan
   *en* åldrande vara i `BundleBuilder` (`preselectedItemId`). Att låta
   samma insight-chip öppna `BundleBuilder` med *alla* åldrande,
   obuntade varor förvalda på en gång (inte bara en i taget) är en
   liten utökning av ett mönster som redan är byggt och validerat,
   snarare än en ny idé — och löser ett konkret, redan synligt problem
   (varor som blir liggande).
2. **Enkel resultatuppföljning per erbjudande.** `SaleLine` sparar idag
   inte om en såld rad kom från en bunt eller vilken — bara `itemId`
   (som för en bunt-rad faktiskt är bunt-id, inte vara-id, se fynd 1
   ovan), `name`, `quantity`, `unitPrice`. Ett litet, icke-brytande
   tillägg (samma typ av tillägg som `customerId` på `Sale` i förra
   rundan) skulle göra det möjligt att i efterhand visa "den här bunten
   har sålt N gånger, totalt X kr" direkt på erbjudande-kortet — konkret
   svar på "funkar mina erbjudanden?", som konkurrentanalysen (Blocket)
   redan pekat ut som något målgruppen förväntar sig av ett modernt
   säljverktyg.
3. **Dela ett erbjudande direkt, inte bara kopiera text.** Samma Print/
   WhatsApp/Share-knapprad som redan byggts i Quote card kunde
   återanvändas rakt av på ett bunt-kort, så att "Weekend Bouquet Deal,
   199 kr, spara 50 kr" går att skicka till en kund eller WhatsApp-grupp
   med en knapptryckning — inte bara kopieras för att klistras in någon
   annanstans, vilket är ett extra steg som redan är löst för Quote
   card men saknas här.

---

Inget av det här är byggt än — säg till vilken nivå (P0/P1/P2 eller
någon av kundnytteförslagen) du vill köra, på samma sätt som tidigare
rundor.
