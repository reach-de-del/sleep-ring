# Sleep Ring

A tiny sleep-planning web app: a 24-hour ring where you drag a **bedtime** and a **wake-up** handle and instantly see how long you'll sleep. No build step, no dependencies — just static HTML, CSS and JS.

## Features

- 24-hour dial (12 AM at the top, clockwise), drawn in SVG
- Drag the bed handle, the alarm handle, or the whole band to shift both
- Live duration, "meets your sleep goal" feedback, goal progress bar, and ~90-min sleep-cycle estimate
- Adjustable sleep goal (4–12 h) and an alarm on/off toggle
- Touch, mouse and keyboard support (arrow keys = 5 min, Page Up/Down = 1 h)
- Settings saved in `localStorage`

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Launch on GitHub Pages

1. Create a new repo on GitHub and push this folder to the `main` branch:
   ```bash
   git init -b main
   git add .
   git commit -m "Add Sleep Ring"
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. In the repo go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. The included workflow (`.github/workflows/pages.yml`) deploys on every push. Your site will be live at `https://<you>.github.io/<repo>/`.

Prefer no Actions? Set **Source** to **Deploy from a branch** → `main` / `(root)` instead and delete the workflow file.

## Customize

Defaults (bedtime, wake time, goal) are at the top of `script.js`; colors live in the `:root` block of `style.css`.
