const fs = require("fs");
const path = require("path");
const PptxGenJS = require("pptxgenjs");

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "Szabó Szilárd, Izbéki Marcell";
pptx.company = "BGéSZC Ganz Ábrahám Két Tanítási Nyelvű Technikum";
pptx.subject = "HalBarátok vizsgaremek prezentáció";
pptx.title = "HalBarátok - Vizsgaremek bemutatása";
pptx.lang = "hu-HU";

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const FONT_HEAD = "Arial";
const FONT_BODY = "Arial";

const COLORS = {
  navy: "163745",
  teal: "2F8E97",
  sky: "71C9D0",
  sand: "C2A46A",
  cream: "F8F5EC",
  mist: "EEF7F8",
  ink: "1D2933",
  slate: "51646D",
  line: "BBD8DE",
  white: "FFFFFF",
  softBlue: "E8F5F7",
  softSand: "F7F0E2",
  darkPanel: "123040",
};

const builderRoot = __dirname;
const workspaceRoot = path.resolve(builderRoot, "..", "..");
const assetRoot = path.join(builderRoot, "assets");
const logoPath = path.join(
  workspaceRoot,
  "Projekt",
  "halbaratok-frontend",
  "assets",
  "logo.png"
);
const titleBgPath = path.join(assetRoot, "title-background.png");
const lightBgPath = path.join(assetRoot, "light-background.png");
const darkBgPath = path.join(assetRoot, "dark-background.png");
const outputPath = path.join(
  process.env.USERPROFILE || "C:\\Users\\szili",
  "Downloads",
  "HalBaratok_vizsgaremek_prezentacio - 2. verzio.pptx"
);

for (const asset of [logoPath, titleBgPath, lightBgPath, darkBgPath]) {
  if (!fs.existsSync(asset)) {
    throw new Error(`Hiányzó fájl: ${asset}`);
  }
}

function addImageBackground(slide, imagePath) {
  slide.addImage({ path: imagePath, x: 0, y: 0, w: SLIDE_W, h: SLIDE_H });
}

function addLightBackground(slide, tone = "cool") {
  addImageBackground(slide, lightBgPath);
  const overlayColor = tone === "warm" ? COLORS.cream : COLORS.mist;
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE_W,
    h: SLIDE_H,
    fill: { color: overlayColor, transparency: 72 },
    line: { color: overlayColor, transparency: 100 },
  });
}

function addDarkBackground(slide) {
  addImageBackground(slide, darkBgPath);
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE_W,
    h: SLIDE_H,
    fill: { color: COLORS.navy, transparency: 24 },
    line: { color: COLORS.navy, transparency: 100 },
  });
}

function addFooter(slide, pageNumber, dark = false) {
  const textColor = dark ? COLORS.white : COLORS.slate;
  const lineColor = dark ? COLORS.sky : COLORS.line;

  slide.addShape(pptx.ShapeType.line, {
    x: 0.7,
    y: 7.05,
    w: 11.95,
    h: 0,
    line: { color: lineColor, pt: 1.1, transparency: dark ? 30 : 0 },
  });

  slide.addText("HalBarátok | Vizsgaremek bemutatása", {
    x: 0.76,
    y: 7.08,
    w: 4.9,
    h: 0.16,
    fontFace: FONT_BODY,
    fontSize: 8,
    color: textColor,
    margin: 0,
  });

  slide.addText(String(pageNumber), {
    x: 12.05,
    y: 7.02,
    w: 0.5,
    h: 0.2,
    fontFace: FONT_HEAD,
    bold: true,
    fontSize: 10,
    color: textColor,
    align: "right",
    margin: 0,
  });
}

function addLabel(slide, text, x, y, dark = false) {
  const fill = dark ? COLORS.sky : COLORS.teal;
  const color = dark ? COLORS.navy : COLORS.white;
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w: 1.55,
    h: 0.32,
    rectRadius: 0.04,
    fill: { color: fill },
    line: { color: fill, transparency: 100 },
  });
  slide.addText(text, {
    x,
    y: y + 0.05,
    w: 1.55,
    h: 0.14,
    fontFace: FONT_BODY,
    fontSize: 8,
    bold: true,
    color,
    align: "center",
    margin: 0,
  });
}

function addHeader(slide, label, title, body, options = {}) {
  const { dark = false, x = 0.86, y = 0.55, w = 5.9 } = options;
  addLabel(slide, label, x, y, dark);
  slide.addText(title, {
    x,
    y: y + 0.56,
    w,
    h: 0.62,
    fontFace: FONT_HEAD,
    fontSize: 24,
    bold: true,
    color: dark ? COLORS.white : COLORS.ink,
    margin: 0,
    fit: "shrink",
  });
  if (body) {
    slide.addText(body, {
      x,
      y: y + 1.32,
      w,
      h: 0.72,
      fontFace: FONT_BODY,
      fontSize: 12,
      color: dark ? "EAF8FA" : COLORS.slate,
      margin: 0,
      fit: "shrink",
    });
  }
}

function addCard(slide, options) {
  const {
    x,
    y,
    w,
    h,
    title,
    body,
    fill = COLORS.white,
    titleColor = COLORS.ink,
    bodyColor = COLORS.slate,
    border = COLORS.line,
    titleSize = 16,
    bodySize = 11.5,
    badge,
    badgeFill = COLORS.sand,
    badgeColor = COLORS.white,
  } = options;

  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.08,
    fill: { color: fill, transparency: fill === COLORS.white ? 8 : 0 },
    line: { color: border, pt: 1.1, transparency: 0 },
  });

  if (badge) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: x + 0.22,
      y: y + 0.2,
      w: 1.2,
      h: 0.34,
      rectRadius: 0.05,
      fill: { color: badgeFill },
      line: { color: badgeFill, transparency: 100 },
    });
    slide.addText(badge, {
      x: x + 0.22,
      y: y + 0.27,
      w: 1.2,
      h: 0.12,
      fontFace: FONT_BODY,
      fontSize: 9,
      bold: true,
      color: badgeColor,
      align: "center",
      margin: 0,
    });
  }

  slide.addText(title, {
    x: x + 0.22,
    y: y + (badge ? 0.7 : 0.24),
    w: w - 0.44,
    h: 0.34,
    fontFace: FONT_HEAD,
    fontSize: titleSize,
    bold: true,
    color: titleColor,
    margin: 0,
    fit: "shrink",
  });

  if (body) {
    slide.addText(body, {
      x: x + 0.22,
      y: y + (badge ? 1.12 : 0.72),
      w: w - 0.44,
      h: h - (badge ? 1.28 : 0.92),
      fontFace: FONT_BODY,
      fontSize: bodySize,
      color: bodyColor,
      margin: 0,
      paraSpaceAfterPt: 12,
      fit: "shrink",
      valign: "top",
    });
  }
}

function addDivider(slide, x, y, h, color) {
  slide.addShape(pptx.ShapeType.line, {
    x,
    y,
    w: 0,
    h,
    line: { color, pt: 2.2 },
  });
}

function addChip(slide, text, x, y, fill, color) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w: 1.55,
    h: 0.42,
    rectRadius: 0.06,
    fill: { color: fill },
    line: { color: fill, transparency: 100 },
  });
  slide.addText(text, {
    x,
    y: y + 0.09,
    w: 1.55,
    h: 0.14,
    fontFace: FONT_BODY,
    fontSize: 10,
    bold: true,
    color,
    align: "center",
    margin: 0,
  });
}

function addTitleSlide() {
  const slide = pptx.addSlide();
  addImageBackground(slide, titleBgPath);

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 1.02,
    y: 0.72,
    w: 6.25,
    h: 5.75,
    rectRadius: 0.08,
    fill: { color: COLORS.white, transparency: 6 },
    line: { color: "D6E7EA", pt: 1 },
  });

  slide.addText("HalBarátok", {
    x: 1.38,
    y: 1.08,
    w: 4.5,
    h: 0.6,
    fontFace: FONT_HEAD,
    fontSize: 28,
    bold: true,
    color: COLORS.navy,
    margin: 0,
  });

  slide.addText("Vizsgaremek bemutatása", {
    x: 1.4,
    y: 1.78,
    w: 4.8,
    h: 0.28,
    fontFace: FONT_BODY,
    fontSize: 16,
    color: COLORS.teal,
    bold: true,
    margin: 0,
  });

  slide.addText(
    "Magyarországi horgászvizek, fogások és közösségi funkciók egyetlen, átlátható webes rendszerben.",
    {
      x: 1.4,
      y: 2.4,
      w: 4.95,
      h: 1.1,
      fontFace: FONT_BODY,
      fontSize: 14,
      color: COLORS.ink,
      margin: 0,
      fit: "shrink",
    }
  );

  addChip(slide, "SZFT vizsgaremek", 1.4, 3.85, COLORS.sand, COLORS.white);

  slide.addText("Készítette", {
    x: 1.4,
    y: 4.55,
    w: 2,
    h: 0.2,
    fontFace: FONT_BODY,
    fontSize: 11,
    color: COLORS.slate,
    bold: true,
    margin: 0,
  });

  addCard(slide, {
    x: 1.38,
    y: 4.88,
    w: 2.45,
    h: 0.9,
    title: "Szabó Szilárd",
    fill: COLORS.softBlue,
    border: COLORS.line,
    titleColor: COLORS.navy,
    titleSize: 16,
  });

  addCard(slide, {
    x: 4.0,
    y: 4.88,
    w: 2.45,
    h: 0.9,
    title: "Izbéki Marcell",
    fill: COLORS.softSand,
    border: "E5D7B9",
    titleColor: COLORS.navy,
    titleSize: 16,
  });

  slide.addImage({ path: logoPath, x: 8.25, y: 1.1, w: 3.8, h: 1.9 });
}

function addProjectSlide(page) {
  const slide = pptx.addSlide();
  addLightBackground(slide, "cool");
  addHeader(
    slide,
    "ALAPOK",
    "Miért készült a projekt?",
    "A HalBarátok egy olyan rendszer, amely egy helyre rendezi a horgászathoz kapcsolódó adatokat, a személyes naplót és a közösségi funkciókat."
  );

  addCard(slide, {
    x: 0.88,
    y: 2.35,
    w: 5.55,
    h: 2.6,
    title: "Kiinduló helyzet",
    body:
      "• Az információk több különböző felületen érhetőek el.\n• A fogások személyes nyilvántartása nehézkes.\n• Hiányzik egy modern, közösségi szemléletű magyar megoldás.",
    fill: COLORS.white,
    border: COLORS.line,
    titleColor: COLORS.navy,
    bodyColor: COLORS.ink,
    bodySize: 12.5,
    badge: "PROBLÉMA",
    badgeFill: COLORS.teal,
  });

  addCard(slide, {
    x: 6.9,
    y: 2.35,
    w: 5.55,
    h: 2.6,
    title: "A célunk",
    body:
      "• Átlátható horgász-információs felület létrehozása.\n• Saját fogások és horgásznapok rögzítése.\n• Fórum, ismerősök, üzenetek és marketplace egy rendszerben.",
    fill: COLORS.softSand,
    border: "E4D4AE",
    titleColor: COLORS.navy,
    bodyColor: COLORS.ink,
    bodySize: 12.5,
    badge: "MEGOLDÁS",
    badgeFill: COLORS.sand,
  });

  addFooter(slide, page);
}

function addFeaturesSlide(page) {
  const slide = pptx.addSlide();
  addLightBackground(slide, "warm");
  addHeader(
    slide,
    "FUNKCIÓK",
    "A rendszer fő moduljai",
    "A projekt több, egymásra épülő modulból áll, de a felület célja mindenhol az egyszerűség és a gyors, áttekinthető használat."
  );

  const cards = [
    ["Vízterületek", "Halfaj, megye és víztípus szerinti szűrés, rendezett találati listával."],
    ["Fogásnapló", "Fogások rögzítése, szerkesztése, képekkel és méretekkel."],
    ["Horgásznaptár", "Napokhoz rendezetten jelennek meg a horgászattal kapcsolatos bejegyzések."],
    ["Fórum", "Témák, hozzászólások és jelentési lehetőség a közösségi tartalmakhoz."],
    ["Marketplace", "Hirdetések feladása, böngészése és moderációja."],
    ["Admin", "Felhasználók, törzsadatok és reportok kezelése."],
  ];

  cards.forEach(([title, body], index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    addCard(slide, {
      x: 0.88 + col * 4.1,
      y: 2.35 + row * 1.78,
      w: 3.55,
      h: 1.38,
      title,
      body,
      fill: row === 0 ? COLORS.white : COLORS.softBlue,
      border: row === 0 ? COLORS.line : "C7E3E6",
      titleColor: COLORS.navy,
      bodyColor: COLORS.ink,
      titleSize: 15,
      bodySize: 11.2,
    });
  });

  addFooter(slide, page);
}

function addTechSlide(page) {
  const slide = pptx.addSlide();
  addDarkBackground(slide);
  addHeader(
    slide,
    "TECHNOLÓGIA",
    "Frontend, backend és adatbázis",
    "A rendszer külön rétegekre bontva készült, ami átláthatóbb fejlesztést és könnyebb bővíthetőséget ad.",
    { dark: true }
  );

  addCard(slide, {
    x: 0.88,
    y: 2.42,
    w: 3.65,
    h: 2.75,
    title: "Frontend",
    body:
      "• HTML, CSS, JavaScript\n• Bootstrap alapokra épülő reszponzív felület\n• Külön oldalak a fő funkciókhoz",
    fill: COLORS.darkPanel,
    border: COLORS.sky,
    titleColor: COLORS.white,
    bodyColor: "EAF8FA",
    bodySize: 12.5,
    badge: "WEB",
    badgeFill: COLORS.sky,
    badgeColor: COLORS.navy,
  });

  addCard(slide, {
    x: 4.84,
    y: 2.42,
    w: 3.65,
    h: 2.75,
    title: "Backend",
    body:
      "• Node.js és Express.js\n• REST API végpontok\n• JWT alapú hitelesítés és jogosultságkezelés",
    fill: COLORS.darkPanel,
    border: COLORS.sky,
    titleColor: COLORS.white,
    bodyColor: "EAF8FA",
    bodySize: 12.5,
    badge: "API",
    badgeFill: COLORS.sky,
    badgeColor: COLORS.navy,
  });

  addCard(slide, {
    x: 8.8,
    y: 2.42,
    w: 3.65,
    h: 2.75,
    title: "Adatbázis",
    body:
      "• Microsoft SQL Server\n• Relációs adatmodell\n• Logikusan szétválasztott törzs-, napló- és közösségi adatok",
    fill: COLORS.darkPanel,
    border: COLORS.sky,
    titleColor: COLORS.white,
    bodyColor: "EAF8FA",
    bodySize: 12.5,
    badge: "SQL",
    badgeFill: COLORS.sky,
    badgeColor: COLORS.navy,
  });

  addFooter(slide, page, true);
}

function addTeamworkSlide(page, sectionTitle, chipText, tone = "cool") {
  const slide = pptx.addSlide();
  addLightBackground(slide, tone);
  addHeader(
    slide,
    "TEAMWORK",
    `Teamwork - ${sectionTitle}`,
    "A diára csak a két készítő neve és a terület került fel, részletes feladatfelsorolás nélkül."
  );

  addDivider(slide, 6.66, 2.3, 3.15, tone === "warm" ? COLORS.sand : COLORS.teal);

  addCard(slide, {
    x: 1.08,
    y: 2.38,
    w: 4.9,
    h: 2.55,
    title: "Szabó Szilárd",
    fill: COLORS.white,
    border: tone === "warm" ? "E4D4AE" : COLORS.line,
    titleColor: COLORS.navy,
    titleSize: 21,
  });
  addChip(
    slide,
    chipText,
    2.72,
    3.78,
    tone === "warm" ? COLORS.sand : COLORS.teal,
    COLORS.white
  );

  addCard(slide, {
    x: 7.35,
    y: 2.38,
    w: 4.9,
    h: 2.55,
    title: "Izbéki Marcell",
    fill: COLORS.white,
    border: tone === "warm" ? "E4D4AE" : COLORS.line,
    titleColor: COLORS.navy,
    titleSize: 21,
  });
  addChip(
    slide,
    chipText,
    8.99,
    3.78,
    tone === "warm" ? COLORS.sand : COLORS.teal,
    COLORS.white
  );

  addFooter(slide, page);
}

function addDatabaseSlide(page) {
  const slide = pptx.addSlide();
  addLightBackground(slide, "cool");
  addHeader(
    slide,
    "ADATBÁZIS",
    "A legfontosabb táblák és kapcsolatok",
    "A dia most szellősebb elrendezésű: kisebb adatsűrűség, nagyobb dobozok és átláthatóbb blokkstruktúra."
  );

  addCard(slide, {
    x: 0.92,
    y: 2.25,
    w: 5.35,
    h: 1.68,
    title: "Felhasználói adatok",
    body: "• Felhasználó\n• BarátKérelem\n• Értesítések és kapcsolatok",
    fill: COLORS.white,
    border: COLORS.line,
    titleColor: COLORS.navy,
    bodyColor: COLORS.ink,
    bodySize: 12,
  });

  addCard(slide, {
    x: 6.48,
    y: 2.25,
    w: 5.35,
    h: 1.68,
    title: "Horgász adatok",
    body: "• Halfaj\n• Víztípus és vízterület\n• Kapcsolótáblák a fajokhoz és megyékhez",
    fill: COLORS.softBlue,
    border: "C8E3E6",
    titleColor: COLORS.navy,
    bodyColor: COLORS.ink,
    bodySize: 12,
  });

  addCard(slide, {
    x: 0.92,
    y: 4.18,
    w: 5.35,
    h: 1.68,
    title: "Naplózás",
    body: "• FogásNapló\n• HorgászNap\n• Személyes fogások időben rendezve",
    fill: COLORS.softSand,
    border: "E4D4AE",
    titleColor: COLORS.navy,
    bodyColor: COLORS.ink,
    bodySize: 12,
  });

  addCard(slide, {
    x: 6.48,
    y: 4.18,
    w: 5.35,
    h: 1.68,
    title: "Közösségi modulok",
    body: "• Fórum és hozzászólások\n• Marketplace\n• Üzenetek, reportok és moderáció",
    fill: COLORS.white,
    border: COLORS.line,
    titleColor: COLORS.navy,
    bodyColor: COLORS.ink,
    bodySize: 12,
  });

  addFooter(slide, page);
}

function addUiSlide(page) {
  const slide = pptx.addSlide();
  addLightBackground(slide, "warm");
  addHeader(
    slide,
    "FELÜLET",
    "A felhasználói élmény fő pontjai",
    "A projekt felépítésében a gyors tájékozódás, a személyes használat és a közösségi interakció kap külön hangsúlyt."
  );

  addCard(slide, {
    x: 0.92,
    y: 2.35,
    w: 3.7,
    h: 3,
    title: "Információs felületek",
    body:
      "• Kezdőlap\n• Vízterületek és szűrők\n• Részletes horgászati adatok",
    fill: COLORS.white,
    border: COLORS.line,
    titleColor: COLORS.navy,
    bodyColor: COLORS.ink,
    bodySize: 12.2,
  });

  addCard(slide, {
    x: 4.82,
    y: 2.35,
    w: 3.7,
    h: 3,
    title: "Személyes modulok",
    body:
      "• Profil\n• Fogásnapló\n• Horgásznaptár és saját adatok kezelése",
    fill: COLORS.softBlue,
    border: "C8E3E6",
    titleColor: COLORS.navy,
    bodyColor: COLORS.ink,
    bodySize: 12.2,
  });

  addCard(slide, {
    x: 8.72,
    y: 2.35,
    w: 3.7,
    h: 3,
    title: "Közösségi felületek",
    body:
      "• Fórum\n• Ismerősök és üzenetek\n• Marketplace és admin felület",
    fill: COLORS.white,
    border: COLORS.line,
    titleColor: COLORS.navy,
    bodyColor: COLORS.ink,
    bodySize: 12.2,
  });

  addFooter(slide, page);
}

function addValueSlide(page) {
  const slide = pptx.addSlide();
  addDarkBackground(slide);
  addHeader(
    slide,
    "ÉRTÉK",
    "Kinek hasznos a HalBarátok?",
    "A rendszer egyszerre támogatja a hobbi horgászokat, a közösséget és az admin oldalról érkező karbantartási igényeket.",
    { dark: true }
  );

  addCard(slide, {
    x: 0.92,
    y: 2.4,
    w: 3.72,
    h: 2.8,
    title: "Horgászoknak",
    body:
      "• Gyors adatelérés\n• Saját fogások visszakeresése\n• Egyszerűbb tervezés és nyilvántartás",
    fill: COLORS.darkPanel,
    border: COLORS.sky,
    titleColor: COLORS.white,
    bodyColor: "EAF8FA",
    bodySize: 12.3,
  });

  addCard(slide, {
    x: 4.8,
    y: 2.4,
    w: 3.72,
    h: 2.8,
    title: "Közösségnek",
    body:
      "• Fórum és tapasztalatmegosztás\n• Ismerősök és üzenetek\n• Piactér egy helyen",
    fill: COLORS.darkPanel,
    border: COLORS.sky,
    titleColor: COLORS.white,
    bodyColor: "EAF8FA",
    bodySize: 12.3,
  });

  addCard(slide, {
    x: 8.68,
    y: 2.4,
    w: 3.72,
    h: 2.8,
    title: "Adminisztrációnak",
    body:
      "• Törzsadatok kezelése\n• Moderáció és reportok\n• Átláthatóbb tartalomfelügyelet",
    fill: COLORS.darkPanel,
    border: COLORS.sky,
    titleColor: COLORS.white,
    bodyColor: "EAF8FA",
    bodySize: 12.3,
  });

  addFooter(slide, page, true);
}

function addSummarySlide(page) {
  const slide = pptx.addSlide();
  addLightBackground(slide, "cool");
  addHeader(
    slide,
    "ÖSSZEGZÉS",
    "A bemutató lényege röviden",
    "A HalBarátok egy összetett, de átlátható webes vizsgaremek, amelyben az információs, személyes és közösségi funkciók egymásra épülnek."
  );

  addCard(slide, {
    x: 0.92,
    y: 2.4,
    w: 5.45,
    h: 2.85,
    title: "Fő üzenetek",
    body:
      "• Modern webes felépítés\n• Központi horgász-információs rendszer\n• Saját fogások és közösségi funkciók egy helyen",
    fill: COLORS.white,
    border: COLORS.line,
    titleColor: COLORS.navy,
    bodyColor: COLORS.ink,
    bodySize: 12.4,
  });

  addCard(slide, {
    x: 6.7,
    y: 2.4,
    w: 5.65,
    h: 2.85,
    title: "Továbbfejlesztés",
    body:
      "• További valós adatok betöltése\n• Még részletesebb statisztikák\n• Interaktívabb megjelenítések és bővítések",
    fill: COLORS.softSand,
    border: "E4D4AE",
    titleColor: COLORS.navy,
    bodyColor: COLORS.ink,
    bodySize: 12.4,
  });

  addFooter(slide, page);
}

function addClosingSlide(page) {
  const slide = pptx.addSlide();
  addDarkBackground(slide);

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 1.3,
    y: 1.15,
    w: 10.7,
    h: 5.05,
    rectRadius: 0.08,
    fill: { color: COLORS.darkPanel, transparency: 8 },
    line: { color: COLORS.sky, pt: 1.2, transparency: 30 },
  });

  slide.addImage({ path: logoPath, x: 4.72, y: 1.55, w: 3.9, h: 1.95 });
  slide.addText("Köszönjük a figyelmet!", {
    x: 2.1,
    y: 3.85,
    w: 8.95,
    h: 0.5,
    fontFace: FONT_HEAD,
    fontSize: 26,
    bold: true,
    color: COLORS.white,
    align: "center",
    margin: 0,
  });
  slide.addText("Szabó Szilárd | Izbéki Marcell", {
    x: 2.5,
    y: 4.58,
    w: 8.15,
    h: 0.22,
    fontFace: FONT_BODY,
    fontSize: 14,
    color: "EAF8FA",
    align: "center",
    margin: 0,
  });

  addFooter(slide, page, true);
}

function buildPresentation() {
  addTitleSlide();
  addProjectSlide(2);
  addFeaturesSlide(3);
  addTechSlide(4);
  addTeamworkSlide(5, "Backend", "Backend", "cool");
  addTeamworkSlide(6, "Frontend", "Frontend", "warm");
  addDatabaseSlide(7);
  addUiSlide(8);
  addValueSlide(9);
  addSummarySlide(10);
  addClosingSlide(11);
}

async function main() {
  buildPresentation();
  await pptx.writeFile({ fileName: outputPath });
  console.log(outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
