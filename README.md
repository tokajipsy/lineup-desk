# Lineup Desk

A desktop-first VALORANT utility practice desk for Sage, Clove, Fade, and Neon. It ships with 56 original training prompts across the current seven-map competitive pool and stores all mastery, favorites, practice history, and personal drills in the browser.

## Local development

```bash
npm install
npm run dev
```

Run `npm test` for the domain tests and `npm run build` for the production bundle.

## GitHub Pages

The included workflow builds and publishes on every push to `main`. In the repository settings, choose **Pages → Build and deployment → GitHub Actions**.

## Updating the ranked pool

Edit `MAP_POOL` and `maps` in `src/data.ts`, then update or replace affected starter drills. The interface always shows the patch and verification date from that file.

## Data and attribution

Lineup Desk is a free fan project. Starter drills are original rehearsal prompts intended to be refined in a VALORANT custom lobby; they are not copied from LineupsValorant. Personal data stays in local browser storage and can be moved with the JSON export/import controls.

Lineup Desk was created under Riot Games' “Legal Jibber Jabber” policy using references owned by Riot Games. Riot Games does not endorse or sponsor this project.
