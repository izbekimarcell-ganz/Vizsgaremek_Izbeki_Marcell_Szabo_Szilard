# Git Workflow - Együttműködési útmutató

## Alapvető Git parancsok

### Repository frissítése
```bash
git pull origin main
```

### Új branch létrehozása
```bash
git checkout -b feature/uj-funkcio-neve
```

### Változtatások commitolása
```bash
git add .
git commit -m "Érthető üzenet a változtatásról"
```

### Branch feltöltése
```bash
git push origin feature/uj-funkcio-neve
```

## Ajánlott workflow

### 1. Munka kezdése előtt
1. Húzd le a legfrissebb változtatásokat a main branch-ről
2. Készíts új branch-et a munkádhoz

### 2. Fejlesztés során
1. Kis, logikus egységekben commitolj
2. Írj érthető commit üzeneteket
3. Rendszeresen töltsd fel a változtatásokat

### 3. Funkció befejezése után
1. Ellenőrizd a kódodat
2. Futtass teszteket (ha vannak)
3. Merge-eld a main branch-be

## Commit üzenet konvenciók

### Jó commit üzenetek:
- `feat: felhasználó regisztráció hozzáadva`
- `fix: bejelentkezés hiba javítása`
- `docs: README frissítése`
- `style: kód formázás javítása`

### Kerülendő üzenetek:
- `update`
- `fix`
- `changes`
- `asdf`

## Konfliktusok kezelése

### Ha merge konfliktus lép fel:
1. Nyisd meg a konfliktusban lévő fájlt
2. Keresd meg a `<<<<<<<`, `=======`, `>>>>>>>` jelöléseket
3. Döntsd el, melyik változtatást tartod meg
4. Távolítsd el a jelöléseket
5. Commitold a javítást

## Hasznos parancsok

### Státusz ellenőrzése
```bash
git status
```

### Változtatások megtekintése
```bash
git diff
```

### Commit történet megtekintése
```bash
git log --oneline
```

### Branch váltás
```bash
git checkout branch-neve
```