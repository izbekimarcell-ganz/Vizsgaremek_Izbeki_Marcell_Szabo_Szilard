# Forráskódok

Ez a mappa tartalmazza a vizsgaremek összes forráskódját.

## Mappastruktúra

- `frontend/` - Felhasználói felület kódja (HTML, CSS, JavaScript, React, stb.)
- `backend/` - Szerver oldali kód (API-k, üzleti logika)
- `adatbazis/` - Adatbázis sémák, scriptek, migrációk
- `teszt/` - Tesztek (unit teszt, integrációs teszt, stb.)

## Fejlesztési irányelvek

1. **Kód minőség**: Tiszta, jól kommentezett kód írása
2. **Verziók**: Minden jelentős változtatást commitolj értelmes üzenettel
3. **Tesztelés**: Új funkciók létrehozásakor írj hozzá teszteket
4. **Dokumentáció**: Komplex kód részeknél adj magyarázatot
5. **Nevezéktan**: Használj konzisztens és érthető változó/függvény neveket

## Git workflow

1. Húzd le a legfrissebb változtatásokat: `git pull`
2. Készíts új branch-et a funkciódhoz: `git checkout -b feature/uj-funkcio`
3. Commitold a változtatásokat: `git commit -m "Funkció leírása"`
4. Töltsd fel: `git push origin feature/uj-funkcio`