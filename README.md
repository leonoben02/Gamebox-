# Gamebox

Ein soziales Spiele-Tagebuch: Spiele loggen, mit halben Sternen bewerten, Reviews schreiben, Playlist führen, Listen kuratieren, Freunden folgen.

## Funktionen

- **Spielseiten** mit Bewertungsverteilung, beliebten Reviews, Reviews von Freunden, Listen, in denen das Spiel vorkommt
- **Schnellaktionen**: Gespielt, Like, Playlist, Sterne (½-Schritte)
- **Loggen**: Datum (Tagebuch), Status (Gespielt / Durchgespielt / 100 % / Abgebrochen), Plattform, Spielzeit, Review, Spoiler-Markierung, „erneut gespielt"
- **Profil** mit 4 Lieblingsspielen, Statistik, Tagebuch nach Monaten, Reviews, Playlist, Listen, Likes, Folgt/Follower
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

Next.js 16 (App Router, Server Actions) · React 19 · Tailwind CSS 4 · libSQL (lokal eine SQLite-Datei, online Turso) · eigene Session-Auth (bcrypt + HttpOnly-Cookie).

## Kostenlos online stellen (Vercel + Turso)

**1. Datenbank bei Turso anlegen** (kostenlos)
1. Auf https://turso.tech mit GitHub anmelden.
2. **Create Database** → Name `gamebox` → Region in Europa (z. B. Frankfurt) → erstellen.
3. In der Datenbank-Übersicht die **URL** kopieren (beginnt mit `libsql://`).
4. **Create Token** klicken und das Token kopieren.

**2. Seite bei Vercel veröffentlichen** (kostenlos)
1. Auf https://vercel.com mit GitHub anmelden.
2. **Add New → Project** → das Repo `Gamebox-` importieren.
3. Vor dem Klick auf **Deploy** unter **Environment Variables** eintragen:
   - `TURSO_DATABASE_URL` = die URL aus Schritt 1
   - `TURSO_AUTH_TOKEN` = das Token aus Schritt 1
   - `IGDB_CLIENT_ID` und `IGDB_CLIENT_SECRET`
   - optional `SEED_DEMO_USERS=false` (ohne Demo-Mitglieder starten)
4. **Deploy**. Nach ca. 2 Minuten ist die Seite unter `https://<projekt>.vercel.app` erreichbar.

Beim ersten Aufruf legt Gamebox die Tabellen in Turso an und befüllt den Startkatalog.

## Alternative: Railway (mit eigener SQLite-Datei)

1. Auf railway.com mit GitHub anmelden → **New Project** → **Deploy from GitHub repo** → dieses Repo wählen.
2. Im Service unter **Settings → Volumes** ein Volume mit Mount-Pfad `/data` anlegen.
3. Unter **Variables** eintragen:
   - `DATABASE_PATH=/data/gamebox.db`
   - `IGDB_CLIENT_ID=…`
   - `IGDB_CLIENT_SECRET=…`
   - optional `SEED_DEMO_USERS=false` (ohne Demo-Mitglieder starten)
4. Unter **Settings → Networking** auf **Generate Domain** klicken. Fertig.

Railway erkennt Next.js automatisch (`npm run build`, dann `npm start`, Port über `PORT`).
