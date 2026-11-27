# Articole pe scurt

O pagină locală pentru găsirea articolelor după cuvinte sau expresii și salvarea linkurilor într-o listă locală.

## Pornire

Din directorul proiectului, rulează `python -m http.server 8000`, apoi deschide `http://localhost:8000`. Este necesară o conexiune la internet pentru căutare.

Adaugă câte un câmp pentru fiecare cuvânt sau expresie; poți folosi și virgule pentru a separa mai multe expresii într-un câmp. Câmpurile suplimentare pot fi eliminate. Expresiile sunt trimise sursei selectate ca expresii între ghilimele, combinate cu AND; căutarea se face în indexul sursei, nu doar în rezumate. Nu folosi ghilimele sau backslash în expresii. Rezultatele se afișează câte 50 pe pagină; nu este o căutare exhaustivă. Modificările cuvintelor se aplică la următoarea căutare. Deschide paginile următoare manual. OpenAlex poate impune limite de utilizare sau solicita o cheie API; o cheie opțională poate fi introdusă în pagină și este trimisă doar către OpenAlex, fără a fi salvată. Vezi [documentația OpenAlex](https://help.openalex.org/api/).

Pentru ScienceDirect, selectează sursa și introdu o cheie proprie Elsevier în câmpul vizibil din formular, cu acces la [ScienceDirect Search API](https://dev.elsevier.com/documentation/SCIDIRSearchAPI.wadl). Cheia se trimite numai API-ului Elsevier și nu este salvată. Accesul depinde de aprobarea și condițiile Elsevier; erorile de autorizare sau de cotă sunt afișate. Căutarea returnează linkurile disponibile, fără a descărca rezumate sau textul integral.

Aplicația nu accesează automat Google Scholar sau paginile articolelor și nu ocolește paywall-uri, autentificări, CAPTCHA sau alte restricții. Un articol găsit poate avea textul integral restricționat.

Doar titlul și URL-ul linkurilor salvate sunt stocate în `localStorage` în browserul curent. Ștergerea datelor browserului poate șterge lista.

Pentru a descărca toate linkurile salvate, apasă **Descarcă lista CSV**. Butonul este activ după ce salvezi cel puțin un rezultat. Fișierul conține coloanele `Titlu` și `URL`, se generează local și nu este trimis pe server. Pentru siguranța deschiderii în aplicații de calcul tabelar, titlurile care pot fi interpretate ca formule primesc un apostrof la început. Lista de pe GitHub Pages este separată de cea de pe localhost, deoarece fiecare adresă are propriul spațiu local de stocare.

## Teste

Rulează `node --test core.test.js app.test.js` cu o versiune Node.js care include test runnerul integrat.
