# Tuvara — funktionsöversikt: kundnytta och affärsvärde

**Datum:** 2026-08-18
**Underlag:** hela den byggda koden i `stemsync-bolt-mockup` (verifierad via typecheck/build/lint + live Playwright-genomgångar), samt projektets egna analys- och statusdokument (`tuvara-bifogade-filer-analys.md`, `tuvara-nyckeltal-analys.md`, `tuvara-offers-analys.md`, `tuvara-quote-card-analys.md`, `tuvara-ux-intuitivitet-analys.md`, `tuvara-sasongspaslag-analys.md`, `tuvara-perioder-analys.md`) och `feature-reference.html`.

Det här är en sammanställning, inte en ny analys — syftet är att ge en samlad bild av vad Tuvara faktiskt gör idag, uttryckt som värde för användaren snarare än som teknisk beskrivning. Ett genomgående drag i allt nedan, värt att nämna en gång istället för vid varje punkt: Tuvara fattar aldrig ett prissättnings- eller kategoriseringsbeslut tyst åt användaren. Där AI eller en regelbaserad heuristik föreslår något är det alltid tydligt markerat och alltid redigerbart — ägaren bestämmer, Tuvara underlättar. Det är grunden för förtroendet hela lösningen bygger på, inte en enskild funktion bland andra.

---

## Del 1 — Grundplattformen

### Foto-först katalogisering

Att lägga in en vara kräver inte ett formulär fält för fält — ett foto eller en talad/skriven beskrivning räcker, och Tuvara tolkar det till ett färdigt utkast. **Kundnytta:** en soloentreprenör som redan är van vid att fota och skicka i WhatsApp slipper lära sig ett nytt, formellt sätt att arbeta. **Affärsvärde för användaren:** lägre tröskel för att faktiskt hålla lagret uppdaterat — ett verktyg som känns som en omväg används inte, och ett register som inte hålls uppdaterat är värdelöst.

### Smart prissättning — utan att kräva bokföringskunskap

Flera lager av samma grundidé: ett standardpåslag som säljaren kan justera, egna tagg-baserade prispresets ("premium" → visst påslag), en tenant-startlista av säsonger/högtider (Alla hjärtans dag, jul, Eid, Pohela Boishakh, bröllopssäsong) med ett extra påslag som läggs på multiplikativt, samt en batch-/partikalkylator som räknar ut kostnad per styck vid ojämna leveranser. En marginaltröskel (grön/gul/röd vid 50/30 %) varnar aktivt om ett pris ligger farligt nära eller under vad varan faktiskt kostade. **Kundnytta:** rätt pris utan att behöva räkna för hand eller gissa, särskilt vid partiköp där kvaliteten varierar. **Affärsvärde:** skyddar marginalen direkt vid källan — den vanligaste vägen till att en mikroföretagare tjänar mindre än hon tror är att sälja för billigt utan att märka det, och det är precis det den här funktionen förhindrar.

### Kassa och offert (Sell / Quote card)

En redigerbar varukorg (ändra antal, ta bort en rad, se totalsumma) som mynnar ut i ett delbart kvitto/offert via Print, WhatsApp eller bild. Rabatter kan ges som belopp eller procent, med samma marginalvarning som i prissättningen — en säljare kan inte längre av misstag rabattera under inköpspris utan att bli varnad. Varje försäljning kan valfritt kopplas till en sparad kund. **Kundnytta:** samma verktyg som redan används för att visa kunden priset kan direkt slutföra köpet, utan att byta app. **Affärsvärde:** minskar risken för tysta förlustaffärer vid rabatt, och bygger upp en verklig köphistorik utan extra arbete.

### Erbjudanden och buntar (Offers)

Buntar av flera varor till ett fast pris, med korrekt lagerdragning när bunten säljs (lagersaldot för de ingående varorna minskar automatiskt) och automatisk inaktivering om en ingående vara tar slut. AI-föreslagna buntpar baserat på kategori, färg och prisnivå ger ett startförslag att bygga vidare på. Färdig, delbar annonstext genereras direkt efter att en bunt sparats. **Kundnytta:** ett naturligt sätt att sälja åldrande eller osålt lager tillsammans istället för att bara sänka priset. **Affärsvärde:** rör om i annars stillastående kapital (lager som inte säljer) utan att kräva att säljaren manuellt håller reda på vilka varor som ingår i vilken bunt.

### Kundrelationer och বাকি (kundkredit)

QR-baserad WhatsApp-kontaktfångst ("Share my card"), tolkning av inklistrade WhatsApp-meddelanden till ett kundkort, samt en fullständig বাকি-funktion för när en kund köper nu och betalar senare: belopp, valfri anteckning, valfritt påminnelsedatum, och en färdig, tonanpassad WhatsApp-påminnelse (mjukare första gången, fastare vid upprepning) med ett enda knapptryck. **Kundnytta:** samma sociala, förtroendebaserade sätt att hantera kundkrediter som redan används muntligt eller i en anteckningsbok — bara med en påminnelse som inte glöms bort. **Affärsvärde:** synliggör pengar som annars riskerar att "försvinna" i minnet, och ger ett strukturerat men inte byråkratiskt sätt att driva in dem.

### Affärsinsikter och lönsamhet

En rad insikter beräknade helt från redan loggad data, utan externa API:er: vilken kanal säljer faktiskt mest, vilka varor är snabb- respektive långsamsäljare, hur marginalen förändras vecka för vecka (med en förklarande text, inte bara ett tal), samt — i en samlad "Business health"-yta — avkastning på investerat kapital (ROI), försäljningstakt extrapolerad till en månads-/årssiffra, aggregerad marginal, en enkel korrelation mellan annonsspend och försäljning per kanal, en förenklad bild av tillgångar minus skulder, samt två tydligt separata break-even-tal (hur många fler försäljningar för att få tillbaka pengar som sitter i lager just nu, respektive hur många försäljningar per vecka för att täcka löpande fasta kostnader). **Kundnytta:** samma sorts frågor en revisor skulle ställa, omsatta till vardagsspråk utan krav på bokföringskunskap. **Affärsvärde:** gör lönsamhet synlig innan den blir ett problem, inte bara efteråt — precis den typen av tidig varningssignal en soloentreprenör annars saknar helt.

### Lagerhälsa

Åldrande lager flaggas proaktivt, med tre konkreta handlingsalternativ istället för bara "sänk priset": sänk priset, bunta ihop, eller ge bort — plus en helt fri "något annat"-anteckning. Färgtaggning ger en snabb visuell överblick och matas in i buntförslagen. Fritt namngivna "perioder" (t.ex. "Eid Collection 2026" eller bara "Vecka 34") låter en säljare med återkommande inköpsrytm snabbt återanvända förra periodens "recept" utan att gammal försäljningshistorik eller sparade buntar går sönder. **Kundnytta:** lager som blivit liggande behöver aldrig bara skrivas av som en förlust — det finns alltid ett nästa steg. **Affärsvärde:** skyddar kapital som annars ligger bundet i osåld vara, vilket för en mikroföretagare ofta är den enskilt största likviditetsrisken.

### Flerspråkighet och tillgänglighet

En riktig EN/বাংলা-språkväxling i själva appen (inte bara marknadssidorna), byggd på vardagliga, vardagsnära termer istället för formell bokföringsbangla — "মাল" istället för "inventarier", "কেনা দাম" istället för "inköpspris". En kort, inbyggd fyra-skärmars introduktion vid första öppningen ersätter en tidigare separat PDF-genomgång. Ikonknappar i huvudnavigeringen har fått synlig text istället för att bara luta sig mot en tooltip. **Kundnytta:** en användare möter sitt eget vardagsspråk, inte ett översatt affärsspråk som känns lika främmande som originalet. **Affärsvärde:** sänker tröskeln för just den målgrupp (låg digital vana, begränsad engelska) som annars är svårast att nå och behålla — en direkt konkurrensfördel gentemot verktyg byggda för en annan marknad.

### Flervaluta och professionella kvitton

Prissättning och visning i flera valutor (idag ৳, £, $, €) för handel över landsgränser eller med diasporakunder. Riktig utskriftsanpassad kvittolayout (A4 eller termisk 80/58 mm) med logga, sociala länkar och webbplats, plus möjlighet att dela kvittot som bild där en klickbar länk inte fungerar. **Kundnytta:** ett kvitto eller en offert som ser lika professionellt ut oavsett om den skrivs ut, mejlas eller skickas i en chatt. **Affärsvärde:** ett proffsigt kundmöte stärker förtroendet för hela affären, inte bara för det enskilda köpet.

### Förtroende inbyggt i arkitekturen

Allt fungerar offline, utan konto och utan att någon data lämnar telefonen idag. Tuvara hanterar aldrig betalningar eller kundens pengar i något skede. När appen är osäker på något (en pris- eller kategoritolkning) lämnas fältet tomt med en förklaring istället för att gissa tyst. **Kundnytta:** inget att förlora, inget konto att glömma lösenordet till, ingen oro för vart pengarna tar vägen. **Affärsvärde:** de här tre principerna är inte en funktionslista utan själva grunden för varför en försiktig, tillitsbaserad målgrupp överhuvudtaget vågar börja använda verktyget.

---

## Del 2 — Fem nya funktioner (byggda och verifierade idag)

### Klustervarianter i lagerlistan

Flera varianter av samma produkt (t.ex. samma klänningsmodell i olika färger) kan valfritt grupperas till ett enda kort — "6 varianter · 14 totalt" — istället för att fylla lagerlistan med sju nästan identiska rader. Helt säljarstyrt: ingenting grupperas automatiskt utifrån varunamnet, bara när säljaren själv sätter samma gruppnamn på flera varor. **Kundnytta:** en lagerlista som förblir överskådlig även när sortimentet växer i bredd, inte bara i antal. **Affärsvärde:** gör det lättare att se på en blick vilka produktstilar som faktiskt säljer, inte bara vilka enskilda varianter.

### Kunddubblett- och inaktivitetsvarningar

En ny "Customers"-yta flaggar sannolika dubbletter (samma namn eller telefonnummer sparat två gånger) och kunder utan köp på 14 respektive 30 dagar — rent beräknat från redan sparad data, ingenting slås ihop eller ändras automatiskt. **Kundnytta:** en enkel påminnelse om vilka återkommande kunder som börjar bli tysta, utan att behöva bläddra igenom hela kundlistan i huvudet. **Affärsvärde:** ett billigt, tidigt varningssystem för kundtapp — betydligt billigare att agera på en kund som varit tyst i två veckor än att försöka vinna tillbaka en som varit borta i tre månader.

### Kostnad/vinst-stapel direkt i prissättningskalkylatorn

En enkel visuell stapel visar exakt hur mycket av säljpriset som bara täcker vad varan kostade ("nollpunkten") och hur mycket som är faktisk vinst — direkt i samma steg där priset sätts, inte gömt i en separat rapport. Byter automatiskt till en tydlig varningsfärg om priset skulle innebära en förlust. **Kundnytta:** man ser med en blick, i samma ögonblick man sätter priset, vad man faktiskt tjänar — inte bara ett procenttal att tolka. **Affärsvärde:** gör lönsamhetstänk till en del av vardagsflödet istället för något man måste komma ihåg att kolla separat.

### Bengalisk annonstext

Den redan befintliga, kanalanpassade annonstextgenereringen (kort och hashtag-tung för Instagram/TikTok, saklig för övriga kanaler) kan nu även skrivas på bengaliska — växlingsbart direkt i flödet, oberoende av vilket språk appens eget gränssnitt är satt till. Produktnamn och egna taggar översätts aldrig automatiskt, bara de färdiga mallfraserna runt omkring. **Kundnytta:** säljtext som når kunder på deras eget språk utan att själv behöva skriva om samma annons två gånger. **Affärsvärde:** utökar den praktiska räckvidden mot bengalisktalande köpare utan extra tidsåtgång för säljaren.

### Förfallodatum och en samlad "Upcoming"-vy

Både বাকি (vad kunder är skyldiga) och det säljaren själv är skyldig någon annan kan nu få ett valfritt datum, och en ny "Upcoming"-sektion i Business health slår ihop båda riktningarna i en enda kronologisk lista — pengar på väg in och pengar på väg ut, sorterat efter vad som förfaller snarast. Ingen påminnelse skickas automatiskt; det är en översikt, inte ett nytt bokföringssystem. **Kundnytta:** en enda plats att kolla "vad händer med pengarna den här veckan" istället för att hålla det i huvudet eller leta på två olika ställen. **Affärsvärde:** bättre likviditetsöverblick utan att kräva att användaren för in ett enda nytt begrepp hon inte redan känner igen från বাকি.

---

## Sammanfattande värdeproposition

Tagna tillsammans löser de här funktionerna samma tre grundproblem som mikro- och soloentreprenörer i målgruppen redan är kända för att brottas med: att sätta rätt pris utan bokföringskunskap, att hålla koll på vem som är skyldig vem utan att det blir byråkratiskt, och att se om affären faktiskt går ihop innan det är för sent att göra något åt det. Tuvara löser dem genom att möta användaren där hon redan är — foto och tal istället för formulär, vardagsspråk istället för affärstermer, förslag istället för påtvingade beslut — snarare än genom att be henne lära sig ett nytt sätt att arbeta.
