# Tuvara — globala vs lokala/regionala säsongs- och varutyp-påslag (B2/B3)

**Datum:** 2026-08-18
**Underlag:** `flowertotcalculator.html` (förslag B2/B3 i
`tuvara-bifogade-filer-analys.md`), nuvarande `categoryFieldMap.ts` och
`batchPricing.ts`, samt `CLAUDE.md`s regel om att aldrig lägga en delad,
branschspecifik lista i koden (orsakade en tidigare regression i
`FilterSheet.tsx`).

Det här är en analys, inget är byggt.

---

## Varför frågan är svårare än den ser ut

Originalfilens `SUGG_MARKUP`-tabell (ros 3.2×, pion 3.5×, tulpan 2.8× osv.)
löser ett verkligt behov — olika varor har olika rimliga påslag — men på
ett sätt som bara fungerar för en blomsterhandel. Att bara kopiera in den
rakt av skulle bryta mot en regel som redan finns av en anledning: en
tidigare regression i `FilterSheet.tsx` orsakades exakt av en delad,
branschspecifik lista som antogs gälla alla tenants.

Din fråga — hur får man både **globalt** (fungerar likadant oavsett
tenant) och **lokalt/regionalt** (rätt innehåll för just den marknaden)
— är egentligen två separata beslut som blandats ihop i originalfilen:

- **Mekanismen** (koden: hur ett påslag föreslås, var det redigeras, hur
  det visas) bör vara global — samma kod, samma UI-mönster, oavsett
  tenant.
- **Innehållet** (vilka säsonger/varutyper som faktiskt finns, och vilket
  påslag som är rimligt för dem) är oundvikligen lokalt — Flowertots
  Alla hjärtans dag-toppar och Jhum/Shoilees Eid- eller
  bröllopssäsong-toppar är inte samma sak, och ska inte tvingas in i
  samma hårdkodade lista.

---

## Den kritiska begränsningen: B3 kan inte vara en artnamnstabell

`SUGG_MARKUP` är i praktiken en lista över *blomsorter* (ros, pion,
tulpan). Det finns inget naturligt sätt att generalisera artnamn till
Jhum Fashion/Shoilee — "ros" har ingen motsvarighet i en klädaffär. Men
när jag tittade på vad "varutyp" redan betyder i Tuvara upptäckte jag att
den generaliseringen redan finns, bara inte kopplad till pris: **kategori**
(`CATEGORIES_BY_TENANT` i `categoryFieldMap.ts`) är redan tenant-scopad
och redan det närmaste Tuvara har ett "varutyp"-begrepp — Flowertots
"Succulents & Cacti" vs "Flowering", Jhums "Saree" vs "Kurti". B3
generaliseras alltså naturligast som **ett standardpåslag per kategori**,
inte en ny artnamnslista — samma mekanism (en tenant-scopad
uppslagstabell) som kategorierna redan använder, bara med ett tal
(påslag) istället för en etikett.

Det täcker däremot inte den finkornighet originalfilen egentligen ville
åt (en sällan ros vs en vanlig krukväxt, båda "Flowering"). Den
skillnaden löser jag med ett andra, helt fristående lager nedan.

---

## Föreslagen modell — tre lager, olika grad av "globalt" respektive "lokalt"

### Lager 1: Standardpåslag per kategori (tenant-scopat, säljaren kan redigera)

En ny, valfri `defaultMarkupByCategory`-inställning, samma mönster som
`CATEGORIES_BY_TENANT` — startvärden per tenant i `categoryFieldMap.ts`,
men fritt redigerbara av säljaren i Settings (inte en fast regel). Fångar
B3s huvudpoäng (olika varutyper har olika rimliga påslag) utan någon
artnamnslista.

### Lager 2: Säljardefinierade tag-presets (helt globalt, inget hårdkodat)

En lista säljaren själv bygger i Settings: tagg → föreslaget påslag
(t.ex. "premium" → 4×, "rar art" → 5×, "sidenblandning" → 3.5×). Exakt
samma mekanism för alla tenants, noll förinställt innehåll — det är
säljaren som känner sina egna varor, inte koden. Det här är lagret som
faktiskt löser "ros vs vanlig krukväxt"-nyansen utan att gissa på
branschvokabulär.

### Lager 3: Säsongs-/högtidspresets (tenant-scopad startlista, redigerbar)

En tenant-scopad lista i samma fil som ovan — `SEASON_PRESETS_BY_TENANT`
— där varje tenant får en **startlista** av rimliga, illustrativa
högtider/säsonger med ett föreslaget påslag, som säljaren fritt kan
redigera, döpa om, ta bort eller lägga till i. Exempel på startinnehåll
(medvetet markerat som illustrativt, inte ett bekräftat pilotbehov — se
öppen fråga nedan):

- **flowertot** (UK): Valentine's Day, Mother's Day, Christmas, Wedding
  season
- **jhums** (Bangladesh): Eid, Pohela Boishakh, Wedding season, Puja
- **general**: tom startlista — för bred för en meningsfull gissning

Ett varunamn/vara kan taggas med en säsong (fri koppling, inte
obligatoriskt), och när säsongen är aktiv (eller manuellt vald) föreslås
ett högre påslag — alltid `AiBadge`-märkt, alltid redigerbart, aldrig
tillämpat tyst.

---

## Var det skulle synas

**AddSheet** (ny vara): när kategori är vald, prefyll föreslaget påslag
från Lager 1 (kategori) om inget annat matchar; om en tagg matchar ett
Lager 2-preset, använd det istället (mer specifikt vinner); om en säsong
väljs, lägg på Lager 3s boost ovanpå. Allt visas som ett enda redigerbart
fält med en liten `AiBadge`-text som förklarar varför just det talet
föreslogs ("Baserat på kategori Flowering" / "Baserat på din tagg
'premium'" / "+Valentine's Day-boost").

**Settings**: en ny sektion för att redigera Lager 2 (tag-presets) och
Lager 3 (säsongslistan) — samma redigerbara lista-mönster som redan finns
för sociala länkar/print-format i den här sessionens tidigare arbete.

---

## Öppna frågor innan något byggs

1. **Är exempelsäsongerna ovan (Valentine's/Mother's/Christmas för
   Flowertot; Eid/Pohela Boishakh/bröllop/Puja för Jhum) rätt, eller
   gissar jag fel?** Det här är precis den typen av påstående om
   verkligt kundbeteende `CLAUDE.md` ber om att fråga om — jag har inte
   dokumentation som bekräftar dem, bara allmän kunskap om marknaderna.
2. **Behövs Lager 1 (kategori-standardpåslag) alls, eller räcker Lager 2
   + 3?** Om ingen pilot faktiskt vill ha per-kategori-påslag är det ett
   extra UI-lager utan motsvarande nytta.
3. **Hur ska flera matchande lager prioriteras** om en vara både har en
   matchande tagg-preset och en aktiv säsong — läggs boosten på, eller
   vinner det mest specifika? Jag föreslår "lägg på" (multiplicera) som
   standard, men det påverkar hur höga tal en säljare kan råka se.

Säg till med svar (eller "gissa själv men markera det tydligt") så bygger
jag det på samma sätt som tidigare rundor.
