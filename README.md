# 🍳 Smakosz & Co. – Nowoczesna Strona Kulinarna z Inteligentnym Koszykiem Zakupowym

Kompletna, nowoczesna i responsywna aplikacja kulinarna stworzona z myślą o gotowaniu i sprawnych zakupach w supermarkecie.

---

## 🌟 Główne Funkcje i Podstrony

### 1. ⭐ Topka & Polecane (`#topka`)
- **Danie Szefa Kuchni**: Wyróżnione danie tygodnia z bezpośrednim przyciskiem do dodania składników do koszyka.
- **Najczęściej wybierane dania**: Bestsellery i najwyżej oceniane pozycje przez społeczność.
- **Szybkie obiady poniżej 25 minut**: Gotowe propozycje na zabiegane dni.
- **Karty dań**: Zdjęcia w wysokiej rozdzielczości, stopień trudności, czas przygotowania, kalorie i ocena.

### 2. 📖 Baza Przepisów i Gatunki Dań (`#przepisy`)
- **Wyszukiwarka na żywo**: Szukaj po nazwie potrawy, składniku (np. *kurczak*, *awokado*, *makaron*) lub tagach.
- **Podział na gatunki i pory dań**:
  - 🍲 Obiady i dania główne
  - 🍳 Śniadania
  - 🌮 Kolacje i przekąski
  - 🥣 Zupy i kremy
  - 🍰 Desery i ciasta
  - 🥗 Fit & Zdrowe
- **Filtry kuchni świata**: Włoska 🇮🇹, Polska 🇵🇱, Azjatycka 🥢, Meksykańska 🇲🇽, Kuchnie Świata 🌍.
- **Filtry czasu i trudności**: Błyskawiczne (<20 min), średnie (<35 min) oraz poziomy: Łatwy, Średni, Zaawansowany.

### 3. 🛒 Inteligentny Koszyk & Lista Zakupów (`#koszyk`) – *Kluczowa Funkcja*
- **Dodawanie dań do koszyka**: Jednym kliknięciem dodajesz całe menu do listy.
- **Kalkulator porcji w locie**:
  - Zwiększ lub zmniejsz porcje dla każdego dania (np. z 2 na 6 osób).
  - Wszystkie gramatury składników przeliczają się **automatycznie w czasie rzeczywistym**!
- **Automatyczna konsolidacja składników**:
  - Jeśli wybrano kilka dań wymagających np. czosnku, cebuli czy pomidorów, system sumuje ich ilości w jedną pozycję i pokazuje, z których dań pochodzą.
- **Podział na działy supermarketu**:
  - 🥦 **Warzywa i owoce**
  - 🥩 **Mięso, drób i ryby**
  - 🧀 **Nabiał i jaja**
  - 🌾 **Pieczywo i produkty zbożowe**
  - 🧂 **Spiżarnia, sosy i przyprawy**
  - 📦 **Inne produkty**
- **Tryb sklepowy (Shop Mode)**:
  - **Odhaczanie produktów w wózku**: Klikasz w produkt w sklepie – zostaje przekreślony, przygaszony i wliczony do wskaźnika postępu zakupów.
  - **Pasek postępu**: Widzisz na żywo np. *„W koszyku: 14 z 20 produktów (70%)”*.
  - **Ukrywanie kupionych**: Opcja `Ukryj kupione` czyści ekran, pozostawiając tylko to, czego jeszcze szukasz.
  - **Usuwanie ze spiżarni**: Jeśli masz już sól lub oliwę w szafce, klikasz `✕` – nie musisz jej kupować (możesz też cofnąć jednym kliknięciem).
  - **Własne produkty**: Możliwość dopisania do listy np. *wody mineralnej*, *ręczników papierowych* itp.
  - **Kopiowanie na SMS / WhatsApp**: Generuje czytelną listę z podziałem na działy do wysłania partnerowi/współlokatorowi.
  - **Druk / PDF**: Czysty wydruk listy zakupów bez zbędnych elementów interfejsu.

### 4. 🥕 "Co mam w lodówce?" (`#lodowka`) – *Generator Zero Waste*
- Zaznacz produkty, które masz w domu (np. jajka, ser, makaron, pomidory).
- Algorytm wskazuje, które przepisy możesz przyrządzić od razu oraz czego ewentualnie Ci brakuje.

### 5. 📅 Planer Menu Tygodniowego (`#planer`)
- Zaplanuj posiłki od Poniedziałku do Niedzieli.
- Przycisk **„Dodaj cały tydzień do koszyka”** przenosi wszystkie składniki na 7 dni do Twojej listy zakupów jednym kliknięciem.

### 6. ⏱️ Minutnik Kuchenny & Szczegóły Przepisu
- Okno modalne z pełnym opisem, zdjęciem i listą kroków przygotowania z możliwością odhaczania.
- Wbudowany **Minutnik kuchenny (Kitchen Timer)** z dźwiękowym powiadomieniem alarmowym (Web Audio API).

---

## 🚀 Jak uruchomić stronę?

Aplikacja jest w 100% samowystarczalna i nie wymaga instalacji żadnych baz danych.

### Opcja 1: Bezpośrednie otwarcie (Najprostsza)
Wystarczy dwukrotnie kliknąć plik **`index.html`** w folderze projektu, aby otworzyć stronę w dowolnej przeglądarce (Google Chrome, Microsoft Edge, Firefox, Safari).

### Opcja 2: Uruchomienie lokalnego serwera (opcjonalnie)
Jeśli posiadasz Node.js:
```bash
npx serve .
```
i otwórz adres wyświetlony w terminalu (np. `http://localhost:3000`).

---

## 💾 Zapisywanie Danych (Offline & LocalStorage)
Wszystkie zmiany – dodane dania, odhaczone produkty w sklepie, własne notatki, plan tygodnia i ulubione – są automatycznie zapisywane w pamięci przeglądarki (`localStorage`). Po odświeżeniu lub ponownym otwarciu strony nic nie ginie!
