import type Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { slugify } from "./util";

type SeedGame = [title: string, year: number, developer: string, genres: string, platforms: string, summary: string];

// Starter catalogue so the site works without an IGDB key. With IGDB configured,
// search pulls in any game (with real cover art) on demand.
export const SEED_GAMES: SeedGame[] = [
  ["The Legend of Zelda: Breath of the Wild", 2017, "Nintendo EPD", "Action-Adventure,Open World", "Switch,Wii U", "Link erwacht nach hundert Jahren und erkundet ein offenes Hyrule, um Ganon aufzuhalten."],
  ["The Legend of Zelda: Tears of the Kingdom", 2023, "Nintendo EPD", "Action-Adventure,Open World", "Switch", "Hyrule erhebt sich in den Himmel und versinkt in die Tiefe. Link baut, klebt und fliegt sich durch eine neue Krise."],
  ["Elden Ring", 2022, "FromSoftware", "Action-RPG,Open World,Soulslike", "PC,PS5,PS4,Xbox Series X|S,Xbox One", "Ein Befleckter zieht durch das Zwischenland, um Elden-Lord zu werden."],
  ["Dark Souls", 2011, "FromSoftware", "Action-RPG,Soulslike", "PC,PS3,Xbox 360,Switch", "Ein Untoter macht sich in Lordran auf, das Schicksal der Ersten Flamme zu entscheiden."],
  ["Bloodborne", 2015, "FromSoftware", "Action-RPG,Soulslike,Horror", "PS4", "Ein Jäger erkundet in der Nacht der Jagd die gotische Stadt Yharnam."],
  ["Hollow Knight", 2017, "Team Cherry", "Metroidvania,Platformer", "PC,Switch,PS4,Xbox One", "Ein kleiner Ritter steigt in das verfallene Insektenkönigreich Hallownest hinab."],
  ["Celeste", 2018, "Maddy Makes Games", "Platformer,Indie", "PC,Switch,PS4,Xbox One", "Madeline besteigt den Celeste-Berg und stellt sich dabei ihren eigenen Ängsten."],
  ["Hades", 2020, "Supergiant Games", "Roguelike,Action", "PC,Switch,PS5,PS4,Xbox Series X|S,Xbox One", "Zagreus, Sohn des Hades, kämpft sich immer wieder aus der Unterwelt heraus."],
  ["Hades II", 2025, "Supergiant Games", "Roguelike,Action", "PC,Switch,Switch 2", "Melinoë, Prinzessin der Unterwelt, zieht gegen den Titanen der Zeit in den Kampf."],
  ["Disco Elysium", 2019, "ZA/UM", "RPG,Detective", "PC,PS5,PS4,Switch,Xbox One", "Ein Detektiv ohne Gedächtnis löst einen Mordfall in der heruntergekommenen Stadt Revachol."],
  ["The Witcher 3: Wild Hunt", 2015, "CD Projekt Red", "Action-RPG,Open World", "PC,PS5,PS4,Xbox Series X|S,Xbox One,Switch", "Geralt von Riva sucht seine Ziehtochter Ciri, die von der Wilden Jagd verfolgt wird."],
  ["Red Dead Redemption 2", 2018, "Rockstar Games", "Action-Adventure,Open World,Western", "PC,PS4,Xbox One", "Arthur Morgan und die Van-der-Linde-Bande am Ende des Wilden Westens."],
  ["Baldur's Gate 3", 2023, "Larian Studios", "RPG,Turn-based", "PC,PS5,Xbox Series X|S", "Eine Gruppe mit Gedankenschinder-Larven im Kopf sucht in den Vergessenen Reichen nach Heilung."],
  ["Mass Effect 2", 2010, "BioWare", "Action-RPG,Sci-Fi", "PC,Xbox 360,PS3", "Commander Shepard stellt ein Team für eine Selbstmordmission gegen die Kollektoren zusammen."],
  ["Portal 2", 2011, "Valve", "Puzzle,First-Person", "PC,PS3,Xbox 360,Switch", "Chell und GLaDOS kehren in die verfallenen Aperture-Labore zurück."],
  ["Half-Life 2", 2004, "Valve", "Shooter,First-Person", "PC,Xbox,Xbox 360,PS3", "Gordon Freeman kehrt nach City 17 zurück und führt den Widerstand gegen die Combine an."],
  ["Super Mario Odyssey", 2017, "Nintendo EPD", "Platformer,3D", "Switch", "Mario reist mit Cappy durch Königreiche, um Peach vor Bowsers Hochzeitsplänen zu retten."],
  ["Super Mario Bros. Wonder", 2023, "Nintendo EPD", "Platformer,2D", "Switch", "Im Blumenkönigreich verwandeln Wunderblumen jedes Level in etwas Unerwartetes."],
  ["Outer Wilds", 2019, "Mobius Digital", "Adventure,Exploration,Mystery", "PC,PS4,Xbox One,Switch", "Ein Sonnensystem in einer 22-minütigen Zeitschleife will erkundet und verstanden werden."],
  ["Stardew Valley", 2016, "ConcernedApe", "Simulation,Farming,Indie", "PC,Switch,PS4,Xbox One,Mobile", "Du erbst den Hof deines Großvaters und baust dir ein neues Leben in Pelican Town auf."],
  ["Minecraft", 2011, "Mojang Studios", "Sandbox,Survival", "PC,Switch,PS4,Xbox One,Mobile", "Eine unendliche Blockwelt zum Bauen, Graben und Überleben."],
  ["God of War", 2018, "Santa Monica Studio", "Action-Adventure", "PS4,PC", "Kratos und sein Sohn Atreus wandern durch die nordische Mythologie, um eine Asche zu verstreuen."],
  ["The Last of Us", 2013, "Naughty Dog", "Action-Adventure,Survival,Horror", "PS3,PS4,PS5,PC", "Joel soll die junge Ellie quer durch ein postapokalyptisches Amerika bringen."],
  ["Persona 5 Royal", 2020, "Atlus", "JRPG,Social Sim", "PS4,PS5,PC,Switch,Xbox One", "Eine Gruppe Schüler stiehlt als Phantomdiebe die verdorbenen Herzen Erwachsener."],
  ["Final Fantasy VII", 1997, "Square", "JRPG", "PS1,PC,Switch,PS4,Xbox One", "Cloud Strife und AVALANCHE kämpfen gegen den Shinra-Konzern und Sephiroth."],
  ["Chrono Trigger", 1995, "Square", "JRPG,Time Travel", "SNES,DS,PC,Mobile", "Crono und seine Freunde reisen durch die Zeit, um den Untergang der Welt zu verhindern."],
  ["Metroid Prime", 2002, "Retro Studios", "Action-Adventure,First-Person,Metroidvania", "GameCube,Wii,Switch", "Samus Aran erkundet in der Ich-Perspektive den Planeten Tallon IV."],
  ["Super Metroid", 1994, "Nintendo R&D1", "Metroidvania,Action", "SNES,Switch", "Samus kehrt nach Zebes zurück, um das gestohlene Metroid-Baby zu retten."],
  ["Resident Evil 4", 2005, "Capcom", "Survival Horror,Action", "GameCube,PS2,PC,Switch,PS4,Xbox One", "Leon S. Kennedy soll die entführte Tochter des Präsidenten aus einem spanischen Dorf retten."],
  ["Silent Hill 2", 2001, "Konami", "Survival Horror,Psychological", "PS2,PC,Xbox", "James Sunderland folgt einem Brief seiner verstorbenen Frau in die nebelverhangene Stadt."],
  ["Inside", 2016, "Playdead", "Puzzle-Platformer,Indie", "PC,PS4,Xbox One,Switch", "Ein Junge flieht durch eine düstere, wortlose Welt voller Kontrolle und Experimente."],
  ["Journey", 2012, "thatgamecompany", "Adventure,Indie", "PS3,PS4,PC", "Eine wortlose Pilgerreise durch die Wüste zu einem fernen Berg."],
  ["Undertale", 2015, "Toby Fox", "RPG,Indie", "PC,PS4,Switch,Xbox One", "Ein Kind fällt in die Welt der Monster, in der niemand sterben muss."],
  ["Return of the Obra Dinn", 2018, "Lucas Pope", "Puzzle,Detective,Indie", "PC,Switch,PS4,Xbox One", "Ein Versicherungsermittler rekonstruiert das Schicksal jeder Person an Bord eines Geisterschiffs."],
  ["Tetris", 1984, "Alexey Pajitnov", "Puzzle", "Diverse", "Fallende Blöcke, volle Reihen. Mehr braucht ein Klassiker nicht."],
  ["Animal Crossing: New Horizons", 2020, "Nintendo EPD", "Simulation,Life Sim", "Switch", "Ein Inselparadies, das man Tag für Tag nach eigenen Vorstellungen gestaltet."],
  ["Cyberpunk 2077", 2020, "CD Projekt Red", "Action-RPG,Open World,Sci-Fi", "PC,PS5,PS4,Xbox Series X|S,Xbox One,Switch 2", "Söldner V kämpft in Night City mit einem Chip im Kopf ums Überleben."],
  ["Sekiro: Shadows Die Twice", 2019, "FromSoftware", "Action-Adventure,Soulslike", "PC,PS4,Xbox One", "Der einarmige Wolf will im Japan der Sengoku-Zeit seinen Herrn befreien."],
  ["Balatro", 2024, "LocalThunk", "Roguelike,Deckbuilder,Card Game", "PC,Switch,PS5,PS4,Xbox Series X|S,Mobile", "Poker-Hände, absurde Joker-Kombinationen und ein Roguelike, das einen nicht mehr loslässt."],
  ["Astro Bot", 2024, "Team Asobi", "Platformer,3D", "PS5", "Astro sammelt seine verlorene Crew in einer Galaxie voller PlayStation-Liebe ein."],
  ["Clair Obscur: Expedition 33", 2025, "Sandfall Interactive", "RPG,Turn-based", "PC,PS5,Xbox Series X|S", "Jedes Jahr malt die Malerin eine Zahl, und alle in diesem Alter verschwinden. Expedition 33 will das beenden."],
  ["Pentiment", 2022, "Obsidian Entertainment", "Adventure,Narrative", "PC,Xbox One,Xbox Series X|S,Switch,PS4,PS5", "Ein Buchmaler im Bayern des 16. Jahrhunderts gerät in eine Reihe von Morden."],
  ["Slay the Spire", 2019, "Mega Crit", "Roguelike,Deckbuilder", "PC,Switch,PS4,Xbox One,Mobile", "Ein Deckbuilder, in dem man Stockwerk für Stockwerk einen Turm erklimmt."],
  ["Death Stranding", 2019, "Kojima Productions", "Action,Exploration", "PS4,PS5,PC", "Sam Porter Bridges verbindet ein zersplittertes Amerika Paket für Paket wieder."],
  ["Kingdom Hearts II", 2005, "Square Enix", "Action-RPG", "PS2,PS4,PC", "Sora, Donald und Goofy reisen durch Disney-Welten gegen die Organisation XIII."],
  ["Super Smash Bros. Ultimate", 2018, "Bandai Namco Studios, Sora Ltd.", "Fighting,Party", "Switch", "Jeder Kämpfer ist dabei. Wirklich jeder."],
  ["Mario Kart 8 Deluxe", 2017, "Nintendo EPD", "Racing,Party", "Switch", "Der Funracer-Klassiker mit Antigravitation und Blauem Panzer."],
  ["Lethal Company", 2023, "Zeekerss", "Horror,Co-op,Indie", "PC", "Als Angestellte einer Firma sammelt man auf verlassenen Monden Schrott ein und hofft, zu überleben."],
];

// FNV-1a: deterministic but well-mixed, so demo data looks varied.
function hash(s: string) {
  let h = 0x811c9dc5;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0;
  return h;
}

export function seedDatabase(db: Database.Database, withDemoUsers: boolean) {
  const insertGame = db.prepare(
    "INSERT OR IGNORE INTO games (slug, title, year, developer, genres, platforms, summary) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  for (const [title, year, developer, genres, platforms, summary] of SEED_GAMES) {
    insertGame.run(slugify(title), title, year, developer, genres, platforms, summary);
  }
  if (withDemoUsers) seedDemoUsers(db);
}

const DEMO_USERS = [
  { username: "mira", name: "Mira", bio: "Soulslikes, Metroidvanias und alles mit guter Atmosphäre.", hue: 330 },
  { username: "jonas", name: "Jonas K.", bio: "Spielt JRPGs, seit es Speicherkarten gibt.", hue: 200 },
  { username: "pixelpaula", name: "Paula", bio: "Indies > alles. Backlog ist ein Lebensgefühl.", hue: 140 },
  { username: "deniz", name: "Deniz", bio: "Couch-Koop, Nintendo und Story-Spiele.", hue: 40 },
];

const DEMO_REVIEWS = {
  high: [
    "Hat mich komplett abgeholt. Ich denke immer noch an das Ende.",
    "Selten so viel Spaß mit einem Spiel gehabt. Jede Minute wert.",
    "Atmosphäre zum Schneiden. Der Soundtrack läuft bei mir seit Wochen.",
    "Schwer, manchmal gemein, und genau deshalb so befriedigend.",
    "Ein perfektes Spiel für einen verregneten Sonntag.",
  ],
  mid: [
    "Das Gameplay ist großartig, die Story etwas zu lang. Trotzdem ein Muss.",
    "Technisch beeindruckend, aber mich hat die Welt etwas kalt gelassen.",
    "Starker Anfang, im Mittelteil zieht es sich. Das Finale reißt es raus.",
  ],
  low: [
    "Ich wollte es mögen, wirklich. Nach 15 Stunden war die Luft raus.",
    "Sieht toll aus, spielt sich aber wie Arbeit. Nicht meins.",
  ],
};

function seedDemoUsers(db: Database.Database) {
  const pw = bcrypt.hashSync("gamebox-demo", 10);
  const games = db.prepare("SELECT id FROM games ORDER BY id").all() as { id: number }[];
  const ids: number[] = [];
  for (const u of DEMO_USERS) {
    const r = db
      .prepare("INSERT INTO users (username, display_name, password_hash, bio, avatar_hue) VALUES (?, ?, ?, ?, ?)")
      .run(u.username, u.name, pw, u.bio, u.hue);
    ids.push(Number(r.lastInsertRowid));
  }
  const today = new Date();
  for (const [ui, userId] of ids.entries()) {
    // each demo user plays a deterministic pseudo-random subset of games
    const picks = games.filter((g) => hash(`${userId}-${g.id}`) % 3 === 0);
    picks.forEach((g, i) => {
      const h = hash(`${ui}:${g.id}`);
      const rating = 4 + (h % 7); // 2–5 stars
      const liked = rating >= 9 ? 1 : 0;
      const daysAgo = (i * 9 + (h % 7)) % 360;
      const d = new Date(today.getTime() - daysAgo * 86400000).toISOString().slice(0, 10);
      const pool = rating >= 8 ? DEMO_REVIEWS.high : rating >= 6 ? DEMO_REVIEWS.mid : DEMO_REVIEWS.low;
      const review = (h >>> 3) % 3 === 0 ? pool[(h >>> 5) % pool.length] : null;
      const status = rating <= 5 && h % 2 ? "abandoned" : ["played", "completed", "completed", "mastered"][(h >>> 7) % 4];
      const created = `${d} 1${h % 10}:00:00`;
      const r = db
        .prepare(
          "INSERT INTO logs (user_id, game_id, played_on, rating, liked, review, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run(userId, g.id, d, rating, liked, review, status, created);
      db.prepare(
        "INSERT INTO user_games (user_id, game_id, played, liked, rating, updated_at) VALUES (?, ?, 1, ?, ?, ?)",
      ).run(userId, g.id, liked, rating, created);
      db.prepare("INSERT INTO activity (user_id, type, game_id, log_id, created_at) VALUES (?, ?, ?, ?, ?)").run(
        userId,
        review ? "review" : "log",
        g.id,
        r.lastInsertRowid,
        created,
      );
    });
    // backlog
    games
      .filter((g) => hash(`b${userId}-${g.id}`) % 7 === 0)
      .forEach((g) =>
        db
          .prepare(
            "INSERT INTO user_games (user_id, game_id, backlog) VALUES (?, ?, 1) ON CONFLICT DO NOTHING",
          )
          .run(userId, g.id),
      );
    // favourites: top four rated
    const favs = db
      .prepare("SELECT game_id FROM user_games WHERE user_id = ? AND rating IS NOT NULL ORDER BY rating DESC, game_id LIMIT 4")
      .all(userId) as { game_id: number }[];
    favs.forEach((f, i) => db.prepare("INSERT INTO favorites (user_id, game_id, position) VALUES (?, ?, ?)").run(userId, f.game_id, i));
  }
  // everyone follows everyone
  for (const a of ids) for (const b of ids) if (a !== b) db.prepare("INSERT INTO follows (follower_id, followee_id) VALUES (?, ?)").run(a, b);

  // a couple of lists
  const listDefs: [number, string, string, number, string[]][] = [
    [ids[0], "Die schwersten Spiele, die ich geliebt habe", "Leiden mit Stil.", 1, ["sekiro-shadows-die-twice", "bloodborne", "celeste", "hollow-knight", "dark-souls", "elden-ring"]],
    [ids[2], "Indies für einen Abend", "Kurz, perfekt, kein Backlog-Schuldgefühl.", 0, ["inside", "journey", "return-of-the-obra-dinn", "celeste", "undertale", "lethal-company"]],
    [ids[1], "JRPG-Grundkurs", "Wo man anfangen sollte.", 1, ["chrono-trigger", "final-fantasy-vii", "persona-5-royal", "kingdom-hearts-ii", "clair-obscur-expedition-33"]],
  ];
  for (const [userId, title, desc, ranked, slugs] of listDefs) {
    const r = db.prepare("INSERT INTO lists (user_id, title, description, ranked) VALUES (?, ?, ?, ?)").run(userId, title, desc, ranked);
    slugs.forEach((s, i) =>
      db
        .prepare("INSERT INTO list_items (list_id, game_id, position) SELECT ?, id, ? FROM games WHERE slug = ?")
        .run(r.lastInsertRowid, i, s),
    );
    db.prepare("INSERT INTO activity (user_id, type, list_id) VALUES (?, 'list', ?)").run(userId, r.lastInsertRowid);
    for (const other of ids) if (other !== userId) db.prepare("INSERT INTO list_likes (user_id, list_id) VALUES (?, ?)").run(other, r.lastInsertRowid);
  }
  // some review likes
  const reviews = db.prepare("SELECT id, user_id FROM logs WHERE review IS NOT NULL").all() as { id: number; user_id: number }[];
  for (const rv of reviews)
    for (const u of ids)
      if (u !== rv.user_id && hash(`${u}~${rv.id}`) % 2 === 0)
        db.prepare("INSERT INTO review_likes (user_id, log_id) VALUES (?, ?)").run(u, rv.id);
}
