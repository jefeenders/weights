# Lift Tracker

Tiny offline web app for logging weight training on an iPhone.
Data stays on the phone (localStorage). Backups are manual JSON exports.

## Structure

```
index.html            app shell
style.css             styles
store.js              data model + storage (pure functions)
backup.js             export (share sheet) / import
app.js                screens + event handling
sw.js                 offline cache
manifest.webmanifest  home-screen app settings
icon-180.png, icon-512.png  app icons
```

## Test on the PC

```powershell
Set-Location "$HOME\projects\lift-tracker"
python -m http.server 8000
# open http://localhost:8000 in the browser (use the phone view in DevTools)
```

## Deploy to GitHub Pages

```powershell
git init
git add .
git commit -m "Initial version"
git branch -M main
git remote add origin https://github.com/<username>/lift-tracker.git
git push -u origin main
```

GitHub: Settings -> Pages -> Deploy from a branch -> `main` / `(root)`.
On the iPhone open `https://<username>.github.io/lift-tracker/` in Safari -> Share -> Add to Home Screen.

## Updating

Push changes as usual. The app shows the new version on the second launch after the push.
If you add or rename files, add them to `ASSETS` in `sw.js` and bump `CACHE` (e.g. `lift-tracker-v2`).

## Backup

Export opens the share sheet -> Save to Files -> OneDrive.
Import replaces all data with the chosen backup file.
The list screen shows a reminder when the last backup is 3 or more days old.
