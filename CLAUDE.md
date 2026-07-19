# CLAUDE.md

Kontext för Claude Code när den arbetar i det här repot.

## Vad det här repot är — och inte är

Detta är **stemsync-bolt-mockup**: en fristående, kastbar Bolt-prototyp för den
bransch- och landagnostiska generaliseringen av Flowertot Florist's Friend.
Ingen riktig databas, ingen backend — persistens sker via localStorage
(`usePersistentState.ts`), per tenant-namnrymd.

**KRITISK REGEL: rör aldrig repot `stem-savvy-seller`.** Det är det riktiga,
Lovable-kopplade produktionsrepot för Flowertot Botanicals (UK), med en skarp
Supabase-databas (`bastkukjbwcgdpnvjcpb`). Om en uppgift av misstag pekar mot
den mappen eller det repot: stanna och fråga innan något committas. Det här
är inte en teoretisk risk — det har hänt en gång tidigare (mockup-kod
pushad över produktionsrepot, återställt via `git revert`).

## Innan du gör ett produktomdöme, inte bara en mekanisk fix

Om uppgiften är en fullständigt specificerad bugg (exakt fil, exakt symptom,
förväntat resultat) räcker resten av den här filen. Om uppgiften kräver att
du väger in *varför* något ska bete sig på ett visst sätt — vilken funktion
som är rätt att bygga, hur ett gränsfall ska hanteras, om något är i scope —
läs först:

- `docs/context/vision-and-pilots.md` — enmeningsvisionen, vad de två
  piloterna (Flowertot Botanicals, Jhum Fashion) faktiskt är och vilka
  verkliga smärtpunkter som styrt tidigare beslut.
- `docs/context/product-decisions.md` — kondenserad beslutslogg: roadmap-
  faser (vad som är byggt, vad som medvetet väntar och varför), slutsatser
  från konkurrensanalys (Blocket) och marknadsanalys (Norden), samt en
  ärlig beskrivning av `parse.ts`s begränsningar som en regelbaserad
  tolkare — inte en AI-modell.
- `docs/context/glasbox-synergy-memo.md` — vad från GlasBox som är
  återanvändbart (mönster: RLS-disciplin, DPA-mall, PII-maskering) kontra
  vad som måste byggas om (auth, tenant-modell, betalning). Relevant först
  när Fas A–F-migreringen faktiskt är aktuell, inte nu.

Dessa filer är skrivna för att läsas selektivt, inte i sin helhet varje
session — läs den som är relevant för uppgiften, hoppa över resten.

## Tenant-modell

Två pilot-tenants körs från samma kodbas, styrt av `src/config.ts`:
- `flowertot` — Flowertot Botanicals, UK, £ som valuta, krukväxter (se
  `CATEGORIES_BY_TENANT.flowertot` — Foliage/Flowering/Succulents & Cacti/
  Palms/Ferns/Trailing & Climbing/Air Plants/Accessories/Other, INTE en
  generisk blomsterhandel)
- `jhums` — Jhum Fashion, Bangladesh, ৳ som valuta, kläder/tyg

Tenant väljs via `?tenant=`-query-param eller hostname. **Lägg aldrig till en
delad, branschspecifik kategori- eller fältlista igen** — se
`src/categoryFieldMap.ts` för mönstret (`CATEGORIES_BY_TENANT`,
`categoryFieldConfig`). Nya branschspecifika fält/etiketter går dit, inte
hårdkodat i en komponent. (`types.ts` har kvar en gammal, avvecklad
`CATEGORIES`-konstant enbart för bakåtkompatibilitet — använd den aldrig i
ny kod; en tidigare regression i `FilterSheet.tsx` orsakades exakt av det.)

## Verifiering — gör alltid detta innan en uppgift räknas som klar

```bash
npm install          # node_modules är INTE incheckat, kör alltid detta först
npm run typecheck    # tsc --noEmit
npm run build         # vite build
npm run lint           # eslint .
```

En ändring är inte klar för att koden "ser rätt ut" — kör alla tre. Det här
är samma princip som redan gäller för GlasBox ("verifiera mot verkligt
beteende, inte bara kodgranskning"), applicerad på den här kodbasen: bygg
måste lyckas och typecheck måste vara ren innan något lämnas tillbaka.

Om du ändrar tolknings- eller prislogik (`parse.ts`, `batchPricing.ts`):
testa den faktiska funktionen direkt (t.ex. `npx tsx -e "..."`) med minst
ett par realistiska exempel, inte bara att typecheck går igenom — flera
tidigare buggar i den här kodbasen kompilerade felfritt men gav fel svar.

## Produktprinciper som är kodkonventioner, inte bara text

- **Allt AI/heuristik-genererat ska visas med `<AiBadge />`**
  (`src/components/AiBadge.tsx`) — tolkad fritext, kategori satt från foto,
  genererad annonstext, markup-föreslaget pris. Det här är inte kosmetiskt:
  det är produktens uttalade löfte ("AI ska inte ersätta mänskligt omdöme,
  utan ge ett bättre underlag") gjort synligt i gränssnittet. Ny AI-driven
  funktionalitet utan denna etikett är ett produktfel, inte bara en
  stilfråga.
- **Om appen är osäker, gissa inte — lämna fältet tomt med en hint.** Se
  `parse.ts`: när en batchöversättning inte går att räkna ut fullständigt
  (t.ex. antal per bricka saknas) sätts varken kvantitet eller pris, även
  om det skulle gå att chansa. Samma disciplin gäller ny logik.
- **Betalningshantering är medvetet utanför scope.** Lägg inte till det utan
  att det uttryckligen efterfrågas — se `docs/context/vision-and-pilots.md`
  för varför (bedrägerioro dokumenterad i Bangladesh-forskningen, ingen
  tydlig förtroendeberättelse på plats än).
- **Marginal-tröskeln ("aldrig underprissätt") är en produktprincip, inte en
  färgkodning.** Om du rör prissättningslogiken, håll varningsbeteendet
  (grön/gul/röd vid 50%/30%) intakt om inte annat uttryckligen bes.
- **Riktig AI-tolkning (ett LLM-anrop istället för regex i `parse.ts`) är
  medvetet inte byggt.** Se `docs/context/product-decisions.md` för varför
  — kräver backend, kostar pengar per anrop, bryter offline-löftet. Föreslå
  inte detta som en lösning på en parsningsbugg; patcha regeln istället,
  eller flagga tillbaka om buggen verkar vara ett tecken på att regex-
  ansatsen nått sin gräns.

## Kärnlogik, en fil i taget

- `parse.ts` — nyckelordsbaserad fritextolkning (inte AI-modell), hanterar
  brittisk pence-notation, "bought X/sell for X", "total"-vs-styckpris,
  bricka×antal-per-bricka-mönster (delar med `batchPricing.ts`), kanaler i
  texten.
- `batchPricing.ts` — beräkning av kostnad/styck vid batch-/brickköp samt
  markup-baserat föreslaget säljpris. Delad logik mellan den manuella
  kalkylatorn i `AddSheet.tsx` och den automatiska fritextigenkänningen i
  `parse.ts` — ändra bara på ett ställe.
- `categoryFieldMap.ts` — tenant- och kategorispecifik fältkonfiguration
  (kategorilistor, etiketter som "Care conditions" vs "Size range").
- `insights.ts` — ticker-insikter per flik (Stock/Sell/Offers), inklusive
  prognossignaler (kanalkoncentration, snabb-/långsamsäljare) beräknade
  helt från lokalt loggad data — inga externa API:er.
- `adCopy.ts` — annonstext, stilanpassad per kanal (kort/hashtag-tung för
  Instagram/TikTok, sakligt för övriga).
- `bookingSuggestions.ts` — merförsäljningsförslag vid bokning.
- `useSpeechToText.ts` — webbläsarens inbyggda Web Speech API (gratis,
  klientsidan, inget API-anrop) för diktering i fritextfältet.

## Kommandon

```bash
npm install
npm run dev -- --host   # lokal devserver, --host krävs för test på mobil i samma nätverk
```
