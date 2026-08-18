# Tuvara — analys av "Visuell Lönsamhet för Tuvara"

**Datum:** 2026-08-18
**Underlag:** den uppladdade rapporten *Visuell Lönsamhet för Tuvara.pdf* (12 sidor, avsnitt 1–10 + källförteckning), korsläst mot den faktiska koden i `stemsync-bolt-mockup` (StockList.tsx, AgingActionSheet.tsx, batchPricing.ts, adCopy.ts, strings.ts, LanguageContext.tsx, debtReminders.ts, insights.ts, businessHealth.ts/BusinessHealthSheet.tsx) och CLAUDE.md:s produktprinciper.

**Det här är en analys, inget är byggt.** Nedan går jag igenom rapportens tio avsnitt, markerar vad som redan finns, vad som är genuint nytt och kompatibelt, och vad som kräver ett uttryckligt beslut från dig innan något kodas — enligt projektinstruktionens princip att inte anta affärsmodell/prissättning/scope-beslut.

---

## Status (uppdaterad samma dag — byggt och verifierat)

Du svarade ja på de fyra "nytt, litet, kompatibelt"-förslagen plus förfallodatum-idén; nej på mallstyrd bokföring, Embedded Finance och betalnings-TCO (Tuvara förblir betalningsfritt under piloten). Alla fem godkända delar är nu byggda, `npm run typecheck`/`build`/`lint` går rena, och varje funktion är live-verifierad i webbläsaren (Playwright) — inte bara kodgranskad:

- **Klusterbaserad variantvisualisering** — nytt `variantGroup`-fält på `StockItem` (helt valfritt, seller-satt, aldrig gissat från namnet). Två eller fler synliga varor med samma gruppnamn visas som ett kort ("2 variants · 8 total") i StockList, tryck för att expandera till de enskilda varorna. Verifierat: skapa/expandera/kollapsa fungerar.
- **CRM-dubblett/inaktivitetsvarning** — ny "Customers"-yta (StockList-menyn) som flaggar sannolika dubbletter (samma namn eller telefonnummer) och kunder utan köp på 14+/30+ dagar. Rent lokal beräkning, inget nytt sparas, ingenting slås ihop automatiskt. Verifierat live med tre matchande kunder + en 20-dagars-gammal försäljning.
- **Break-even-stapel i kalkylatorn** — en enkel kostnad/vinst-stapel direkt i Add Item-flödet (skiljd från det befintliga affärsövergripande break-even-talet i Business health, för att inte blanda ihop de två). Verifierat, inklusive förlust-läget (röd stapel).
- **Bengalisk annonstext** — `adCopy.ts` kan nu skriva mallfraserna på bengaliska (produktnamn/taggar översätts aldrig automatiskt), växlingsbar direkt i Add Item-flödets sista steg, oberoende av appens eget UI-språk. Samma "ej granskad av modersmålstalare"-varning som resten av den bengaliska texten i projektet.
- **Förfallodatum + "Upcoming"** — `OwedEntry` har nu samma valfria datumfält som বাকি (`followUpDate`) redan hade. Business health har en ny "Upcoming"-sektion som slår ihop obetald বাকি och det du är skyldig, sorterat efter datum, ingen påminnelse skickas automatiskt.

Allt levererat till din dator via samma kanal som tidigare. En liten, obesläktad observation från live-testningen: "MORE"-menyn på Stock-fliken stängs inte automatiskt när du väljer ett menyval (t.ex. "Business health") — den ligger kvar öppen bakom det du öppnat och kan kortvarigt kännas hackig om man stänger och snabbt trycker igen. Fanns redan innan dagens ändringar, orört av mig — säg till om du vill att jag fixar den.

---

## Genomgång, avsnitt för avsnitt

### 1. Målgruppens mentala modeller
Ingen konkret funktionsbegäran här — mest kontext (khata-handlare vs. F-commerce-soloföretagare). Stämmer väl överens med hur Flowertot/Jhum/Shoilee redan är dokumenterade i projektets underlag. Inget att bygga, inget att flagga.

### 2. Vernacular UI + terminologitabell
**Redan byggt, delvis.** `strings.ts` + `LanguageContext.tsx` implementerar exakt den principen rapporten efterlyser — EN/BN-växling med vardagliga termer hämtade från `tuvara_vernacular_ui_glossary_english.md` (মাল för lager, কেনা দাম för inköpspris, বাকি-mönstret för kundfordringar är redan hela grunden för `CustomerDebtsSheet`). Det är dock uttryckligen en **"Fas 1"-katalog** — bara navigation, stocklistan, Add Item-kortet och Settings är täckta; resten av appen faller tillbaka till engelska. Rapportens specifika tabellrader (t.ex. "Prisjustering → Sänk priset/Ge bort") matchar redan vad som finns i AgingActionSheet (se avsnitt 5 nedan).

Inte byggt: SMS-kvitton och en särskild "Det är betalt"-bekräftelsetext. Litet, skulle kunna hänga på samma mönster som `debtReminders.ts`.

### 3. Kassaflödesoptimering — färgkodad förfallo-visning, en-klicks påminnelse
**Redan byggt.** `debtReminders.ts` bygger exakt det rapporten beskriver: ett `wa.me`-länk med förifylld, tonläge-eskalerande text (mjukare vid första påminnelsen, fastare vid tredje) — en riktig en-klicksfunktion, ingen SMS-kostnad, fungerar offline fram till skicka-klicket. Om det finns en tydlig grön/gul/röd-färgkodning av åldern direkt på huvudvyn (inte bara i বাকি-listan) har jag inte verifierat exakt — värt en snabb koll om du vill, men grundfunktionen finns.

Kravia-API-integration (avsnitt 3, sista meningen) — **inte byggt, och bör inte byggas nu.** Kräver en riktig bank-/betalningsdata-integration, vilket är rakt emot CLAUDE.md:s "betalningshantering är medvetet utanför scope".

### 4. Prissättningskalkylator, batchkalkylator, mallstyrd bokföring
**Batchkalkylatorn är redan byggd.** `batchPricing.ts` gör precis det rapporten beskriver — kostnad/styck vid parti-/brickköp, plus ett föreslaget säljpris via ett markup-spann (`MIN_MARKUP`/`MAX_MARKUP`/`DEFAULT_MARKUP`), delad mellan den manuella kalkylatorn i `AddSheet.tsx` och fritextigenkänningen i `parse.ts`.

**Marginal-tröskeln (grön/gul/röd vid 50/30 %) är redan byggd** och explicit skyddad i CLAUDE.md som en produktprincip, inte bara en färg.

**Delvis nytt:** rapportens "nollpunkt"-stapeldiagram (markup vs. vinstmarginal, visat direkt i prissättningsflödet — inte i en separat vy) finns inte. Den här sessionen byggde precis ett `computeClassicBreakEven` i `businessHealth.ts`/`BusinessHealthSheet.tsx`, men det ligger i en samlad "Business health"-yta, inte inbäddat i själva Add Item-kalkylatorn som rapporten föreslår. Det är en rimlig, litet-riskabel UI-idé — beräkningen finns redan, det som saknas är att visa den (som ett stapeldiagram) på rätt ställe i flödet.

**Kräver ditt beslut:** mallstyrd bokföring i Bokio-stil ("fråga efter affärsanledningen för en transaktion, visa aldrig debet/kredit"). Idén är sympatisk, men risken är verklig — ju mer strukturerad transaktionstaggning man bygger, desto mer börjar det likna bokföring även om orden är mjuka, vilket går emot ditt eget svar tidigare i sessionen ("hur kan vi använda funktionen väldigt enkelt och intuitivt utan att det känns som bokföring"). Jag föreslår att inte bygga det här utan att först diskutera var gränsen går för dig — se öppen fråga 3 nedan.

### 5. Kapitalskydd genom lageroptimering
**Foto-först katalogisering och nudge-flödet är redan byggt.** `AgingActionSheet.tsx` erbjuder exakt "Sänk priset / Bunta ihop / Ge bort" plus ett fjärde "Något annat" — till och med bredare än rapportens tre förslag, och med en tydlig, redan dokumenterad designmotivering (Coco Green-exemplet om att rädda osåld stock som ny produkt, inte bara rabattera den).

**Inte byggt, genuint nytt, konkret:** **klusterbaserad variantvisualisering** i `StockList.tsx` (rapporten nämner filen vid namn) — t.ex. "6 varianter · 14 totalt" istället för 7 separata rader. Jag sökte igenom hela `src`-katalogen efter variant-/kluster-grupperingslogik och hittade ingenting; det här är inte byggt än. Det är litet, rör inte affärsmodellen, och är en ren UI/datamodell-fråga — en bra kandidat om du vill gå vidare (öppen fråga 1).

**Ska inte byggas som beskrivet:** ML-baserad "dead-stock-detektion". Det strider direkt mot CLAUDE.md:s uttalade princip att inte bygga en riktig AI-modell (kostar per anrop, kräver backend, bryter offline-löftet, och skulle vara en svart låda jämfört med dagens regelbaserade "legat länge"-logik). Den nuvarande, transparenta trigger-logiken i AgingActionSheet uppnår redan praktiskt samma resultat utan den risken.

Stockout-varning för snabbsäljare — verkar redan delvis täckt av `insights.ts`/`forecast.ts` (kanalkoncentration, snabb-/långsamsäljar-signaler nämns redan i CLAUDE.md:s egen filbeskrivning). Inget nytt att bygga, men värt en snabb koll om exakt "risk för slut i lager"-fras finns.

### 6. Operativ effektivitet
**Kanalanpassad annonstext är redan byggd.** `adCopy.ts` ger olika ton beroende på kanal (kort/hashtag-tung för Instagram/TikTok, sakligt för övriga) — men genererar inte en separat bengalisk variant av själva annonstexten (bara UI-språket växlas via `strings.ts`). Eftersom glossariet redan finns skulle en BN-variant av `buildAdCopy`/`buildBundleAdCopy` vara ett naturligt, lågriskutökning om du vill (öppen fråga 1).

**Inte byggt, genuint nytt, kompatibelt:** CRM-dubblettvarning och 14/30-dagars inaktivitetsflagga för kunder. Jag hittade ingen sådan logik i koden. Det här går att bygga helt lokalt — ren beräkning över redan existerande `customers`/`sales`-listor, ingen backend, ingen ny datainsamling. Bra kandidat (öppen fråga 1).

**Ska inte byggas i det här repot:** "Order-från-chatt" med en-klicks chatt-till-faktura, plus Pathao/RedX-logistik-API. Det kräver en riktig backend, tredjeparts-API-nycklar och fraktleverantörsavtal — arkitektoniskt oförenligt med en klientbaserad, backend-lös localStorage-mockup. Om det här är intressant hör det snarare hemma i fältagent-CRM:et (samcrm.glocalunit.com) eller en framtida backend-fas, inte här.

Läsbar/WhatsApp-delbar backup — `settingsExportData` finns redan ("Export data"), men jag har inte verifierat om exporten är i ett människoläsbart, WhatsApp-delbart format eller en ren JSON-fil. Värt en snabb koll, inte en ny funktion om formatet redan är rimligt.

### 7. Transaktionshastighet, betalningslösningar, TCO
**Ska inte byggas som beskrivet.** Hela avsnittets premiss — att räkna med och synliggöra kortterminalavgifter (Zettle/PayPal/Square, 1,75–2,9 % + fast avgift), utbetalningsfördröjning (T+1/T+2), och en likviditetsprognoskalender baserad på faktiska bankinsättningar — förutsätter att Tuvara faktiskt processar betalningar. Det gör den uttryckligen inte, varken enligt CLAUDE.md eller enligt appens egna marknadsföringslöften ("does not process payments") som jag hittade tidigare i sessionen. Att bygga detta skulle vara en direkt konflikt med en redan uttalad produktprincip.

**En lättare, ärlig variant skulle kunna vara rimlig** utan att bryta principen: en valfri, självrapporterad "ungefärlig plattforms-/transaktionsavgift i %" per säljkanal, som dras av i marginalberäkningen — inte påstådd att vara exakt, bara en användarinmatning precis som allt annat i appen. Men det är ett nytt fält och en ny beräkningsregel, så jag lägger det som öppen fråga snarare än att bygga det direkt (öppen fråga 5).

Likviditetsprognoskalender byggd på riktig bankdata — samma konflikt, samma anledning. En mycket lättare släkting finns redan i det jag byggde tidigare i den här sessionen (বাকি-åldring + den nya "owed"-listan i Business health), men de saknar ett förfallodatum-fält, så en riktig kalendervy skulle kräva en liten datamodellsändring. Flaggar som öppen fråga snarare än att anta att du vill ha det (öppen fråga 5).

### 8. Embedded Finance — nanolån, alternativ kreditvärdering, gamification
**Det här är den enskilt viktigaste flaggan i hela rapporten, och jag har inte byggt något av det.** Avsnitt 8 föreslår att Tuvara aggregerar användarens transaktionshistorik för att skapa en alternativ kreditpoäng, samarbetar med finansinstitut eller statliga mikrolåneprogram, och erbjuder nanolån med automatisk mikroåterbetalning direkt ur dagsförsäljningen — visualiserat via en gamifierad "affärshälso-mätare".

Det här är **inte en produktfunktion, det är en affärsmodellsfråga** — kreditrisk, regelverk, datadelning med tredje part, och riktig pengarörelse, rakt emot CLAUDE.md:s "betalningshantering är medvetet utanför scope" (dokumenterat bl.a. med bedrägerioron i Bangladesh-forskningen). Enligt projektinstruktionens egen regel ("Om jag frågar om affärsmodell, prissättning eller specifika produktbeslut som inte finns dokumenterade – fråga mig istället för att anta") bygger jag ingenting här utan ett uttryckligt beslut från dig.

Värt att notera: rapportens "affärshälso-mätare" (gamification för kreditvärdighet) råkar dela namn med den "Business health"-yta jag just byggde tidigare i den här sessionen (ROI, marginal, ROAS-lite, break-even, বাকি/owed). De är **inte samma sak** — det jag byggde är rena, lokala, redan-loggade nyckeltal utan någon kreditvärderings- eller lånefunktion. Nämner det bara så namnlikheten inte skapar förvirring senare.

### 9. Teknisk arkitektur
**Redan byggt, och en bra validering.** Offline-first (localStorage, `usePersistentState`), tenant-konfiguration (`TenantConfig`/`categoryFieldMap.ts`-mönstret) — det här är i praktiken redan arkitekturen. Rapportens beskrivning matchar nästan ord för ord det som redan finns.

Avsnitt 9.3 (iterativ LLM-promptningsmetodik) är ett råd om *hur* jag som verktyg bör arbeta, inte en produktfunktion — redan i linje med hur CLAUDE.md:s verifieringskrav fungerar i den här sessionen (typecheck/build/lint + live Playwright-verifiering innan något räknas som klart).

### 10. Strategiska slutsatser
Ren syntes av ovanstående — ingen ny åtgärd.

---

## Sammanfattning i fyra nivåer

**Redan byggt, inget att göra:** EN/BN vernacular UI-grund (fas 1), en-klicks বাকি-påminnelse med eskalerande ton, batchkalkylator, marginal-tröskel-färgkodning, "Sänk priset/Bunta ihop/Ge bort"-nudges, kanalanpassad annonstext, offline-first/tenant-arkitektur.

**Nytt, litet, kompatibelt — värt att bygga om du vill:**
- Klusterbaserad variantvisualisering i StockList ("6 varianter · 14 totalt")
- CRM-dubblettvarning och inaktivitetsflagga för kunder
- Break-even-stapeldiagram inbäddat i själva prissättningskalkylatorn (beräkningen finns redan i `businessHealth.ts`)
- Bengalisk variant av annonstexten (inte bara UI-språket)

**Kräver ditt beslut innan jag bygger något:**
- Mallstyrd "bokföring" (transaktionsanledning) — risk att kännas som bokföring
- Självrapporterad plattforms-/transaktionsavgift i marginalberäkningen
- Förfallodatum på বাকি/owed för en enkel betalningskalender

**Byggs inte utan att affärsmodellen ändras:**
- Betalnings-TCO/utbetalningsfördröjning (Tuvara processar inte betalningar)
- Order-från-chatt + logistik-API-integration (kräver backend, hör hemma i fältagent-CRM)
- ML-baserad dead-stock-detektion (strider mot "ingen riktig AI-modell"-principen)
- Embedded Finance / nanolån / kreditvärdering (stor strategisk fråga, inte en kodfråga)

---

## Öppna frågor till dig

1. Vill du att jag går vidare och bygger något av "nytt, litet, kompatibelt"-listan (klustervarianter, CRM-dubblett/inaktivitet, break-even-diagram i kalkylatorn, BN-annonstext)? Alla fyra går att bygga utan att röra affärsmodellen — säg gärna vilka, om inte alla.
2. Mallstyrd bokföring (avsnitt 4) — vill du utforska det trots risken att det glider mot att kännas som bokföring, eller stannar vi vid nuvarande বাকি/owed-modell?
3. Embedded Finance/nanolån (avsnitt 8) — ska den hållas helt utanför Tuvara-mockupen (min rekommendation), eller vill du diskutera den som ett separat, framtida spår (t.ex. under GlocalUnit, inte i den här kodbasen)?
4. Betalnings-TCO (avsnitt 7) — ska Tuvara förbli helt betalningsfritt (nuvarande löfte), eller vill du ha den lätta, självrapporterade avgifts-%-varianten i marginalberäkningen?
5. Förfallodatum på বাকি/owed för en enkel kalendervy — värt den lilla datamodellsändringen, eller onödigt just nu?
