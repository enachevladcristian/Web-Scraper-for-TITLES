# Articole pe scurt

O pagină locală pentru găsirea articolelor după cuvinte sau expresii din rezumat și salvarea linkurilor într-o listă locală.

## Pornire

Din directorul proiectului, rulează `python -m http.server 8000`, apoi deschide `http://localhost:8000`. Este necesară o conexiune la internet pentru căutarea în OpenAlex. Pagina poate fi folosită și pentru verificarea manuală, fără conexiune.

Adaugă câte un câmp pentru fiecare cuvânt sau expresie; poți folosi și virgule pentru a separa mai multe expresii într-un câmp. Câmpurile suplimentare pot fi eliminate. Toate expresiile se aplică atât căutării, cât și verificării manuale și trebuie să apară în rezumat; potrivirea este literală, fără diferență între majuscule și minuscule. Căutarea trimite prima expresie la API-ul public OpenAlex și verifică local rezultatele câte 50 pe pagină; nu este o căutare exhaustivă a tuturor articolelor. Modificările cuvintelor se aplică la următoarea căutare. Deschide paginile următoare manual. OpenAlex poate impune limite de utilizare sau solicita o cheie API; o cheie opțională poate fi introdusă în pagină și este trimisă doar către OpenAlex, fără a fi salvată. Vezi [documentația OpenAlex](https://help.openalex.org/api/).

Pentru Google Scholar și ScienceDirect, deschide site-urile în mod obișnuit și copiază manual titlul, linkul și un rezumat la care ai acces în formularul de verificare. Aplicația nu caută automat pe aceste site-uri, nu accesează paginile lor și nu ocolește paywall-uri, autentificări, CAPTCHA sau alte restricții. Un articol găsit prin OpenAlex poate avea textul integral restricționat. Înregistrările OpenAlex fără rezumat disponibil sunt omise și numărate în mesajul de căutare.

Doar titlul și URL-ul linkurilor salvate sunt stocate în `localStorage` în browserul curent. Rezumatele sunt folosite temporar pentru filtrare și nu sunt salvate. Ștergerea datelor browserului poate șterge lista.

## Teste

Rulează `node --test core.test.js` cu o versiune Node.js care include test runnerul integrat.
