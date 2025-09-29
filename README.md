# Vizsgaremek - Izbeki Marcell & Szabó Szilárd

Közös vizsgaremek projekt repository - hatékony együttműködés és fájlmegosztás platformja.

## 👥 Csapattagok
- **Izbeki Marcell** - [GitHub: @izbekimarcell-ganz]
- **Szabó Szilárd** - [GitHub: @szabo-szilard]

## 📋 Projekt áttekintés

Ez a repository szolgál a vizsgaremek projekt összes anyagának tárolására és megosztására. A strukturált mapparendszer és templates segítségével könnyedén követhető a projekt előrehaladása és koordinálható a csapatmunka.

## 📁 Repository struktúra

```
├── 📂 dokumentacio/           # Összes projektre vonatkozó dokumentum
│   ├── 📂 tervezes/          # Tervezési dokumentumok, specifikációk
│   ├── 📂 jelentesek/        # Haladási jelentések, státusz dokumentumok
│   └── 📂 prezentaciok/      # Prezentációs anyagok
├── 📂 forras_kodok/          # Projekt forráskódja
│   ├── 📂 frontend/          # Felhasználói felület kódja
│   ├── 📂 backend/           # Szerver oldali kód
│   ├── 📂 adatbazis/         # Adatbázis sémák és scriptek
│   └── 📂 teszt/             # Tesztek és teszt scriptek
├── 📂 csapat_munka/          # Csapatmunka koordináció
│   ├── 📂 feladatok/         # Feladat tracking és hozzárendelések
│   ├── 📂 utemterv/          # Projekt ütemterv és mérföldkövek
│   └── 📂 megbeszeles_jegyzokonyvek/  # Meeting jegyzőkönyvek
├── 📂 referenciak/           # Külső referenciák és források
└── 📂 segito_anyagok/        # Hasznos útmutatók és tools
```

## 🚀 Gyors kezdés

### Első lépések
1. **Clone-ozd le a repositoryt**:
   ```bash
   git clone https://github.com/izbekimarcell-ganz/Vizsgaremek_Izbeki_Marcell_Szabo_Szilard.git
   cd Vizsgaremek_Izbeki_Marcell_Szabo_Szilard
   ```

2. **Ismerkedj meg a struktúrával**: Nézd át a mappaszerkezetet és a README fájlokat

3. **Olvass el a közreműködési útmutatót**: [CONTRIBUTING.md](CONTRIBUTING.md)

4. **Használd a template-eket**: A `csapat_munka/` mappában találsz sablonokat

### Napi munkafolyamat
1. **Frissítés indulás előtt**: `git pull origin main`
2. **Új branch létrehozása**: `git checkout -b feature/uj-funkcio`
3. **Munka elvégzése és commitolás**: Rendszeres commitok érthető üzenetekkel
4. **Feltöltés**: `git push origin feature/uj-funkcio`

## 📖 Használati útmutatók

### Feladatok kezelése
- Új feladathoz használd a [feladat template-et](csapat_munka/feladatok/feladat_template.md)
- Követéssel és státusz frissítéssel tartsd naprakészen a csapatot

### Meetingek dokumentálása
- Használd a [meeting template-et](csapat_munka/megbeszeles_jegyzokonyvek/meeting_template.md)
- Minden meeting után töltsd fel a jegyzőkönyvet

### Dokumentáció írása
- A `dokumentacio/` mappába kerüljenek a formális dokumentumok
- Használd a [követelményspecifikáció template-et](dokumentacio/tervezes/kovetelmeny_specifikacio_template.md)

## 🔧 Git Workflow

Részletes Git útmutató: [Git Workflow útmutató](segito_anyagok/git_workflow.md)

### Alapvető parancsok:
```bash
# Státusz ellenőrzése
git status

# Változtatások commitolása
git add .
git commit -m "feat: új funkció hozzáadása"

# Feltöltés
git push origin branch-neve

# Frissítés
git pull origin main
```

## 📞 Kommunikáció és támogatás

### Problémák esetén:
1. **Issues**: Hozz létre issue-t GitHub-on
2. **Közvetlen kommunikáció**: Jelezd a másik csapattagnak
3. **Dokumentáció**: Írd le a problémát részletesen

### Hasznos linkek:
- [Közreműködési útmutató](CONTRIBUTING.md)
- [Git Workflow](segito_anyagok/git_workflow.md)
- [Projekt ütemterv](csapat_munka/utemterv/projekt_utemterv.md)

## 📝 Licenc

Ez egy oktatási célú vizsgaremek projekt.

---

**Utolsó frissítés**: 2024
**Verzió**: 1.0.0
