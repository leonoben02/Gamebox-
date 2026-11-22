# Gamebox

Ein soziales Spiele-Tagebuch: Spiele loggen, mit halben Sternen bewerten, Reviews schreiben, Backlog führen, Listen kuratieren, Freunden folgen.

## Funktionen

- **Spielseiten** mit Bewertungsverteilung, beliebten Reviews, Reviews von Freunden, Listen, in denen das Spiel vorkommt
- **Schnellaktionen**: Gespielt, Like, Backlog, Sterne (½-Schritte)
- **Loggen**: Datum (Tagebuch), Status (Gespielt / Durchgespielt / 100 % / Abgebrochen), Plattform, Spielzeit, Review, Spoiler-Markierung, „erneut gespielt"
- **Profil** mit 4 Lieblingsspielen, Statistik, Tagebuch nach Monaten, Reviews, Backlog, Listen, Likes, Folgt/Follower
- **Listen** (optional als Rangliste) mit Likes
- **Reviews** mit Likes und Kommentaren
- **Aktivitäts-Feed** der Leute, denen du folgst
- **Suche** nach Spielen und Mitgliedern; mit IGDB-Zugang wird jedes Spiel inkl. Cover gefunden

## Lokal starten

```bash
npm install
cp .env.example .env.local   # optional: IGDB-Zugangsdaten eintragen
npm run dev                   # http://localhost:3000
```

Die SQLite-Datenbank wird beim ersten Start unter `data/gamebox.db` angelegt und mit ~50 Spielen sowie vier Demo-Mitgliedern befüllt (Passwort `gamebox-demo`).

## Spieledaten (IGDB)

1. Auf https://dev.twitch.tv/console eine Anwendung registrieren (kostenlos, braucht einen Twitch-Account mit 2FA).
2. Client-ID und Client-Secret als `IGDB_CLIENT_ID` / `IGDB_CLIENT_SECRET` setzen.

Danach importiert die Suche Treffer von IGDB in die lokale Datenbank, und bereits vorhandene Spiele bekommen beim ersten Aufruf ihr Cover.

## Technik

Next.js 16 (App Router, Server Actions) · React 19 · Tailwind CSS 4 · SQLite über better-sqlite3 · eigene Session-Auth (bcrypt + HttpOnly-Cookie).

Hosting: Da SQLite eine Datei auf der Platte ist, braucht der Server einen persistenten Speicher (z. B. Railway, Fly.io, Render mit Disk oder ein eigener VPS). Für Vercel müsste die Datenbank auf Postgres/Turso umgestellt werden.
