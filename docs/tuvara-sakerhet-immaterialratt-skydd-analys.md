# Tuvara — säkerhet och skydd mot kopiering, imitation och intrång

**Datum:** 2026-08-19
**Underlag:** teknisk genomgång av `stemsync-bolt-mockup` (kod, `functions/_middleware.js`, `docs/context/*`, `CLAUDE.md`), en offentlig kontroll av samtliga tre GitHub-repos kopplade till Tuvara/GlocalUnit, samt research kring varumärkes- och immaterialrättsskydd i UK, EU och Bangladesh.

**Läs det här som en analys, inte en åtgärdslista jag redan genomfört.** Ett par av punkterna nedan är sådant jag varken kan eller bör göra åt dig utan att du fattat beslutet själv — bland annat det första och viktigaste fyndet.

---

## Det viktigaste fyndet först

**`github.com/iTushka/stemsync-bolt-mockup` är ett publikt repo.** Jag kontrollerade det direkt mot GitHub (inte bara mot din lokala klon) och sidan visar tydligt "Public" bredvid repo-namnet, med hela filträdet synligt utan inloggning — `src/`, `docs/`, `functions/`, alltså **hela** appens kod, hela prissättnings- och tolkningslogiken, `CLAUDE.md` och `docs/context/`-filerna med er produktstrategi, konkurrensanalys och tidigare beslutsresonemang. Din GitHub-profil visar bara detta enda repo som publikt, medan `stem-savvy-seller` (produktionsrepot) ger 404 för en oinloggad besökare — det är alltså redan privat, vilket är rätt. `tuvara-faltagent` kunde jag inte verifiera direkt (nätverksbegränsning i min session), men eftersom din profil bara listar **ett** publikt repo totalt, är det med stor sannolikhet privat.

Det här är inte en teoretisk risk. Vem som helst — inklusive en direkt konkurrent i Bangladesh eller UK — kan just nu:
- Klona hela koden och köra en identisk kopia under eget namn.
- Läsa `parse.ts`, `batchPricing.ts`, `adCopy.ts`, `insights.ts` rakt av — er faktiska produktlogik, inte bara vad appen ser ut att göra.
- Läsa `docs/context/product-decisions.md` och `vision-and-pilots.md` — er egen strategiska analys av vad som fungerar och varför, i praktiken ett gratis konkurrensunderlag.

Jag sökte igenom hela repot efter riktiga hemligheter (API-nycklar, lösenord, `service_role`-nycklar) och hittade **inga** — lösenorden för `_middleware.js` (Cloudflare Basic Auth) ligger korrekt som miljövariabler i Cloudflare, inte i koden. Jag hittade heller ingen persondata om era piloter (inga namn, telefonnummer eller mejladresser i `docs/context/`). Så det är inte en dataläcka i GDPR-mening. Men det **är** en fullständig, öppen kopia av hela affärslogiken och strategiresonemanget, och det är den enskilt största åtgärdspunkten i hela den här analysen.

En mindre sak i samma veva: `CLAUDE.md` nämner produktionsrepots riktiga Supabase-projekt-id (`bastkukjbwcgdpnvjcpb`) rakt ut, i klartext, i det publika repot. Ett projekt-id är i sig inte en nyckel och går inte att logga in med, men det är onödigt att peka ut det specifika produktionssystemet för vem som helst som läser — värt att byta ut mot en neutral platshållare i den här filen specifikt, oavsett vad du bestämmer om resten.

---

## Nulägesbild — vad skyddar Tuvara idag, faktiskt

**Tekniskt:**
- Cloudflare Basic Auth (`functions/_middleware.js`) skyddar `tuvara.glocalunit.com` bakom ett användarnamn/lösenord, med ett separat, lättare lösenord för demo-tenants. Det stoppar en tillfällig förbipasserande, men är svagt mot en motiverad kopierare: lösenordet delas muntligt/via WhatsApp till prospekt, cachas av webbläsaren, och skyddar bara *åtkomst* — inte innehållet efter inloggning.
- Appen är **helt klientbaserad** (localStorage, ingen backend, ingen databas) — det är en medveten, dokumenterad arkitekturprincip (se `CLAUDE.md`), och den har ett pris ur skyddssynpunkt: allt som körs, körs som vanlig, läsbar JavaScript i besökarens webbläsare. Vite:s produktionsbygge minifierar koden (kortare variabelnamn, ingen formattering), men det är **inte** verklig obfuskering — vem som helst med webbläsarens devtools eller ett gratis "unminify"-verktyg kan läsa ut i princip hela logiken på några minuter. Det gäller oavsett hur starkt lösenordet framför är, eftersom lösenordet bara skyddar *vägen in*, inte vad som skickas till klienten efteråt.
- `tuvara-faltagent` (fältagent-CRM:et) är annorlunda — det har en riktig Supabase-backend med RLS och inloggning per agent. Där *kan* proprietär logik faktiskt ligga skyddad server-side, till skillnad från huvudappen.

**Juridiskt/legalt:**
- Inget varumärke registrerat för "Tuvara" såvitt jag kan se i det underlag jag har tillgång till — värt att dubbelkolla, men inget av projektdokumenten nämner en registrering.
- Ingen användarvillkor (ToS/EULA) eller licenstext hittad i vare sig appen eller repot som uttryckligen förbjuder kopiering, dekompilering eller återskapande — även om det inte skulle stoppa någon tekniskt, ger det ett verkligt juridiskt påstående att luta sig mot om det någonsin blir aktuellt.
- Copyright på koden och texterna finns automatiskt (ingen registrering krävs i UK/EU/Bangladesh för att äga upphovsrätten), men copyright skyddar bara *den konkreta koden/texten* — inte *idén* eller *funktionaliteten*. En konkurrent som tittar på Tuvara och bygger något som gör samma sak, med egen kod, bryter inte mot upphovsrätten även om resultatet känns identiskt.

---

## Vad juridik och teknik faktiskt kan — och inte kan — skydda

Det här är den obekväma men viktiga delen, och jag vill vara ärlig om det istället för att sälja en falsk trygghetskänsla:

**Ingen av åtgärderna nedan hindrar en tekniskt kunnig konkurrent från att bygga en funktionellt likvärdig produkt** genom att bara *studera vad Tuvara gör* (inte koden) och skriva egen kod som gör samma sak. Det är i de allra flesta jurisdiktioner fullt lagligt — idéer, affärsmodeller och funktionalitet skyddas normalt inte av upphovsrätt, bara det konkreta uttrycket (er specifika kod, text, design). Ett programvarupatent skulle kunna täcka en verkligt ny teknisk metod, men är dyrt (tiotusentals kronor plus årsavgifter), tar år, och passar dåligt för en app som i grunden kombinerar kända mönster (prissättningskalkyl, lagerhantering, annonstextgenerering) snarare än en ny teknisk uppfinning — jag rekommenderar **inte** att lägga tid/pengar på patent för Tuvara i nuläget.

Det som faktiskt går att skydda:
- **Att just er specifika kod inte kopieras rakt av** (repo-synlighet, åtkomstkontroll) — det här är det enda punkten där en enkel åtgärd faktiskt stänger en verklig lucka, se ovan.
- **Namnet "Tuvara" och logotypen** — det här är vad varumärkesregistrering är till för, och det är det mest konkreta juridiska skyddet som faktiskt fungerar mot imitation: om någon lanserar en konkurrerande tjänst under samma eller förvillande likt namn, har ni ett registrerat varumärke att peka på, i UK/EU/Bangladesh specifikt (skyddet är per territorium, inte globalt).
- **Att kopiering av er *specifika* kod/text/bilder är ett formellt brott**, även om det sällan går att bevisa eller lönar sig att driva juridiskt för ett litet, tidigt bolag.

Den ärliga slutsatsen: för ett bolag i Tuvaras skede är det verkliga skyddet sällan juridiskt. Det är **hastighet** (ni hinner iterera och bygga förtroende innan någon hinner kopiera och komma ikapp), **relationerna med piloterna** (Flowertot, Jhum Fashion, Shoilee — en kopiator har inte den förtroenderelationen och måste bygga den från noll), och **varumärke/community**. Juridiska/tekniska åtgärder är värda att göra — de är billiga eller gratis i de flesta fall nedan — men de är ett komplement till det, inte en ersättning för det.

---

## Prioriterade åtgärder

### Gör nu — gratis, ingen risk att vänta med

1. **Gör `stemsync-bolt-mockup` privat på GitHub.** Det här kan jag inte göra åt dig från den här sessionen — jag har varken push- eller admin-behörighet till repot (bekräftat tidigare i den här konversationen när en push nekades av samma anledning). Du gör det själv: GitHub → repot → **Settings** → längst ner, **Danger Zone** → **Change repository visibility** → **Make private**. Tar under en minut.
   - **Viktigt att veta:** att göra repot privat *nu* stoppar framtida åtkomst, men om någon redan klonat eller forkat det medan det var publikt, har den kopian kvar sin egen version oavsett vad du gör efteråt — GitHub visar antal forks/stjärnor på repo-sidan om du vill kolla om det redan hänt (jag kunde inte se den siffran i min kontroll).
2. **Byt ut `bastkukjbwcgdpnvjcpb` i `CLAUDE.md`** mot en neutral platshållare (t.ex. `<production-supabase-project-id>`) — oavsett om repot blir privat eller ej, är det onödigt att peka ut det specifika produktionssystemet i klartext.
3. **Lägg till en enkel `LICENSE`-fil** i repot med "All rights reserved" (inte en öppen licens som MIT/Apache — de skulle uttryckligen *tillåta* kopiering). Kostar inget, tar fem minuter, och är den formella grunden för att någonsin kunna hävda upphovsrättsintrång.

### Gör inom en månad — låg kostnad, kräver ett beslut från dig

4. **Registrera varumärket "Tuvara"** i de marknader ni faktiskt är aktiva i. Ungefärliga kostnader jag hittade (kontrollera aktuella siffror innan ni betalar, de ändras):
   - **UK (UKIPO):** från £170 för en klass vid onlineansökan (höjs till £205 i april 2026), +£50 per extra klass. Går att söka själv via UKIPO:s webbplats; en ombudskostnad (om ni anlitar hjälp) läggs ofta till, ca £700–1 200 utöver officiell avgift.
   - **EU (EUIPO):** från €850 för en klass online, täcker samtliga 27 EU-länder med en enda ansökan — relevant eftersom marknadssidan redan pratar om att nå vidare "across Europe".
   - **Bangladesh (DPDT):** ca BDT 3 500 per klass i officiell avgift, men **kräver ett lokalt juridiskt ombud** för utländska sökande (Power of Attorney), och handläggningstiden är lång — typiskt 12–18 månader till registrering.
   - Min rekommendation, men det är ert beslut: börja med **UK** (där Flowertot Botanicals redan är en verklig pilot och där ni har mest att förlora på imitation just nu), lägg till **EU** när/om den bredare europeiska satsningen blir konkret, och vänta med **Bangladesh** tills Jhum Fashion/Shoilee-spåret känns mer permanent — inte för att Bangladesh är mindre viktigt, utan för att den längre handläggningstiden och ombudskravet gör det till en större initial investering per krona skydd.
5. **Skriv en kort, konkret användarvillkorstext** (kan vara en enkel sida, inte ett juridiskt dokument på 20 sidor) som uttryckligen förbjuder kopiering, dekompilering och återskapande av tjänsten, och som varje pilot/prospekt implicit godkänner genom att använda appen. Jag kan skriva ett förslag om du vill — det är inte gjort, bara flaggat som en möjlighet.
6. **Om/när ni tar in fler personer** (praktikanter, agenter, framtida utvecklare) — en enkel NDA-mall innan de får se kod eller strategidokument. GlasBox har redan DPA-mallar enligt tidigare synergianalys; värt att kolla om samma mall kan återanvändas eller behöver en egen variant för Tuvara.

### Senare — när det finns intäkter/resurser att investera

7. **Flytta den mest värdefulla logiken server-side**, som en del av den redan planerade Fas A–F/GlasBox-migreringen (`docs/context/glasbox-synergy-memo.md`). Det här är den enda åtgärden som faktiskt löser klientexponeringsproblemet på djupet — riktig autentisering, riktig databas, och prissättnings-/tolkningslogik som körs på en server ingen utomstående kan läsa. Redan dokumenterat som medvetet inte aktuellt än (kräver backend, kostar per anrop, bryter det nuvarande offline-löftet) — jag flaggar det här bara som *det* som faktiskt stänger dörren helt, inte som något att göra nu.
8. **Formell copyright-registrering** är mest relevant i USA (ger tillgång till högre skadestånd vid en eventuell tvist där), och sannolikt inte värt tid/pengar för Tuvara i nuläget givet var ni faktiskt säljer.

---

## Öppna beslut till dig

Enligt projektets egen princip frågar jag hellre än antar på det här området — det är precis den typ av budget-/marknadsbeslut som inte finns dokumenterat sedan tidigare:

1. **Vill du att jag skriver instruktionerna ovan (steg 1–3) som en enkel checklista du kan bocka av själv i GitHub**, eller räcker det som står här?
2. **Varumärke — vilken marknad och när?** Min rekommendation ovan (UK först) är en utgångspunkt, inte ett beslut jag bör göra åt dig.
3. **Vill du att jag skriver ett förslag till en kort användarvillkorstext** (punkt 5) som du kan granska, eller avvaktar vi?
4. Har `tuvara-faltagent` verkligen aldrig varit publikt av misstag? Jag kunde inte verifiera det direkt (nätverksbegränsning), bara indirekt via att din profil bara listar ett publikt repo totalt — värt att du dubbelkollar själv i GitHub-inställningarna för det repot specifikt, eftersom det är det enda jag inte kunde bekräfta med samma säkerhet som de andra två.

---

Sources:
- [Cost of Trademark Registration in the UK | 2026 Guide](https://marlegal.co.uk/cost-of-trademark-registration-in-the-uk/)
- [How Much Does It Cost to Trademark a Name in the UK?](https://www.sortmymark.com/trademark-insights/how-much-does-it-cost-to-trademark-a-name-uk)
- [How to Register a Trademark in Bangladesh 2025](https://deweyleboeuf.com/en-bd/register-a-trademark-in-bangladesh/)
- [Trademark Registration in Bangladesh 2026 - JK Associates](https://jkassociates.com.bd/trademark-registration-in-bangladesh)
- [EU Trademark Cost Calculator 2026 – EUIPO Fees & Total Cost | Vilta](https://vilta.cy/eu-trademark-cost/)
- [Strategies for Protecting Source Code Intellectual Property](https://arapackelaw.com/intellectual-property/source-code-intellectual-property/)
