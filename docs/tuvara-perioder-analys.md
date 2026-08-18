# Tuvara — från "Copy last week's items" till användardefinierade perioder

**Datum:** 2026-08-18
**Underlag:** `flowertotcalculator.html` (förslag B1 i
`tuvara-bifogade-filer-analys.md`), nuvarande datamodell i
`types.ts`/`usePersistentState.ts`, samt hur `Bundle`, `Sale` och
`insights.ts` faktiskt hänger ihop med `StockItem.id` i dagens kod —
det sistnämnda visade sig vara den viktigaste delen av den här analysen.

Det här är en analys, inget är byggt. Uppgiften var specifikt att
utvärdera idén, inte implementera den.

---

## Varför "vecka" var fel låsning — och varför din idé är rätt

I `flowertotcalculator.html` är "vecka" hårdkodat på två sätt: dels
tekniskt (`weekKey()` räknar alltid söndags-ankarad datumvecka), dels
begreppsmässigt (hela UI:t pratar om "veckor"). Det passar Flowertots
verkliga rytm (söndagsinköp på Columbia Flower Market, bekräftat även
av `calculator.html`) — men stämmer sämre för Jhum Fashion/Shoilee, där
`docs/context/vision-and-pilots.md` snarare beskriver
kollektions-/säsongsbaserade inköp (Eid, bröllopssäsong) än en fast
veckorytm. Att byta "vecka" mot en fritt namngiven, användarstyrd
**period** ("Eid Collection 2026", "Vinterparti", eller bara "Vecka 34"
om man vill) är alltså inte bara en generalisering för generaliseringens
skull — det är en bättre modell för den ena piloten och en nödvändig
för den andra. Bra instinkt.

---

## Den viktigaste upptäckten: en period får INTE byta ut lagrets id:n

I originalfilen kopieras en ny periods varor så här:
`db.weeks[currentWeek].items = db.weeks[prev].items.map(it => ({...it, id: uid()}))`
— varje ny period får sina egna, helt nya vara-id:n, och den gamla
periodens varor blir i praktiken overksamma/oåtkomliga (`currentWeek`
är den enda aktiva listan).

Det fungerar i originalfilen eftersom "buntar" där bara är en tillfällig
val-lista i minnet (`let bundleIds=[]`, aldrig sparad) — de existerar
bara för att bygga en enskild offert och kastas sedan.

**I Tuvara är det annorlunda, och det spelar roll:** efter den här
sessionens Offers-arbete är `Bundle` en riktig, sparad entitet
(`Bundle.itemIds: string[]`) som pekar på specifika `StockItem.id`, och
`Sale.lines[].itemId` gör likadant för historik. Om en ny period bytte
ut hela `items`-listan mot nya id:n på samma sätt som
`flowertotcalculator.html` gör, skulle **alla sparade buntar och all
säljhistorik som pekar på förra periodens varor sluta fungera eller bli
missvisande** — exakt den typen av "ser ut som att fungera men gör det
inte längre"-bugg som redan flaggats två gånger tidigare i det här
projektet (språkväxlaren, "Mark as active sale"). Det är inte ett skäl
att låta bli — det är ett skäl att inte kopiera modellen rakt av.

---

## Rekommenderad modell: period som tillägg, inte som utbyte

I stället för att en ny period ersätter den aktiva listan, föreslår jag
att en period är en **valfri, additiv tagg** — inget befintligt id
någonsin återanvänds eller görs overksamt:

```ts
interface StockPeriod {
  id: string;
  name: string;        // fritt namngiven av säljaren — "Eid Collection 2026" osv.
  startedAt: number;
  closedAt?: number;    // sätts när nästa period startas, eller manuellt
}
```

```ts
interface StockItem {
  // ...befintliga fält oförändrade
  periodId?: string;    // valfritt — obefintligt för allt som redan finns idag
}
```

**"Starta ny period, kopiera förra periodens varor"** blir då: skapa en
ny `StockPeriod`, och för varje vara i källperioden — skapa en **ny**
`StockItem` (nytt id, samma namn/kategori/pris-"recept"/taggar/kanaler/
bild, men **kvantitet återställd, `soldOut`/`aging` nollställt**) taggad
med den nya perioden. Källperiodens varor, buntar och försäljningar rör
sig aldrig — de förblir korrekt historik, precis som redan är fallet
för allt annat i appen.

En vara som säljs slut i en gammal period blir naturligt otillgänglig
för försäljning av samma anledning som idag (`item.quantity <= 0`) —
inget särskilt periodfilter behövs för att dölja den. **Stock- och
Sell-flikarna bör därför visa varor från alla perioder som standard**,
med period som ett valfritt filter (samma mönster som säsongsfiltret i
`flowertotcalculator.html`, eller kategorifiltret i Tuvaras egen
`FilterSheet.tsx`) — inte ett hårt "bara aktiv period säljs"-läge. Det
är en medveten avvikelse från originalfilens modell: att tyst dölja
riktigt, osåld lager bara för att en ny period startats är samma sorts
risk som just åtgärdades för `onSale`-kryssrutan i Offers — ett läge
som ser ofarligt ut men kan göra att en säljare glömmer bort riktigt
lager som fortfarande finns kvar.

---

## Vad kopieras — en fråga att bestämma, inte anta

Originalfilen kopierar kvantitet och kostnad rakt av (`{...it, id:
uid()}`), vilket underförstår "jag köper ungefär samma mängd varje
vecka". Det stämmer sannolikt ofta för Flowertot, men är en gissning
för en generell lösning. Två rimliga varianter:

1. **Kopiera "receptet", nollställ kvantiteten** — namn, kategori,
   pris/påslag, taggar, kanaler, bild följer med; kvantitet sätts till
   0 och säljaren fyller i vad den faktiska nya batchen faktiskt
   innehåller. Säkrare (ingen risk att lagersaldot av misstag visar fel
   antal), men ett extra steg för Flowertot om mängderna verkligen
   brukar vara samma.
2. **Kopiera allt inklusive kvantitet**, som originalfilen — snabbare
   för en handlare med stabila, återkommande volymer, men risk för
   tyst felaktigt lagersaldo om mängderna faktiskt varierar.

Det här är precis den typ av "gissa inte" produktbeslut `CLAUDE.md` ber
om att fråga om istället för att anta — jag lutar mot alternativ 1 som
standard (säkrare fel-läge), men det är ert anrop, inte ett jag bör
göra tyst.

---

## Var det skulle synas i appen

Naturligast som en ny sektion i `SettingsSheet.tsx`, i samma stil som
den befintliga "Weekly price lists"-idén i `flowertotcalculator.html`
men periodnamngiven: en lista över perioder (namn, datumintervall,
antal varor — samma listmönster som redan används i
`SalesHistorySheet.tsx`), en "Starta ny period"-knapp med valfritt
"kopiera från: [senaste perioden ▾]", och möjlighet att döpa om/stänga
en period. Ett litet periodfilter (chips, samma mönster som
säsongsfiltret) skulle kunna läggas till i `StockList.tsx` som en rent
valfri extra sorteringshjälp, aldrig ett krav.

---

## Öppna beslut innan något byggs

1. **Vad kopieras** — recept-utan-kvantitet (säkrare) eller allt
   inklusive kvantitet (snabbare för stabila volymer)? Se ovan.
2. **Obligatoriskt eller valfritt per säljare?** Jag rekommenderar
   starkt att periodbegreppet är helt osynligt tills en säljare
   aktivt startar sin första period — ingen ska tvingas in i ett nytt
   mentalt modell de inte bett om, särskilt inte Jhum Fashion/Shoilee
   om det visar sig vara mer en Flowertot-specifik efterfrågan.
3. **Ska perioder ha ett slutdatum, eller bara ett startdatum** (öppen
   tills nästa period börjar)? Öppen tills vidare är enklare och kräver
   inget extra fält användaren måste fylla i.
4. **Vem efterfrågar det här just nu** — är det här en direkt
   observerad smärtpunkt hos Flowertot (den uttalade veckorytmen), en
   generell hygienfunktion, eller en förberedelse inför Jhum
   Fashion/Shoilee? Svaret påverkar om standardnamnet på en ny period
   bör vara datumbaserat ("Vecka 34") eller helt tomt/fritt.

---

## Sammanfattning

Generaliseringen från vecka till fritt namngiven period är rätt
riktning — den passar båda piloterna bättre än originalfilens
hårdkodade veckomodell. Den stora risken är inte konceptet i sig utan
att kopiera implementationens genväg (byta ut hela lagrets id:n), som
skulle bryta buntar och säljhistorik som redan bygger på stabila
`StockItem.id`. Med perioder som en additiv tagg snarare än ett utbyte
av den aktiva listan blir det en betydligt säkrare, mindre
allt-eller-inget-förändring än vad B1 ursprungligen flaggades som i
`tuvara-bifogade-filer-analys.md` — men fortfarande värt att bestämma
de fyra punkterna ovan innan det byggs, inte anta dem.
