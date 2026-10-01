# Backseat — road trip games

A phone-first web app for groups on road trips: riddles, trivia, visual puzzles, road bingo,
would-you-rather, and links to daily games. It runs in the browser over an animated WebGL shader background.

No frameworks, no build step, no backend. It's just HTML, CSS and JavaScript.

## Run it

**Quickest:** double-click `index.html`. It opens in your browser.

**Better (auto-refreshes when you save):** in VS Code, install the **Live Server** extension,
right-click `index.html` → **Open with Live Server**.

**On your phone (same Wi-Fi):** with Live Server running, open `http://<your-computer's-IP>:5500`
on your phone. Find your IP by running `ipconfig` in a terminal (look for "IPv4 Address").

**Preview phone size on desktop:** in Chrome press `F12`, then `Ctrl+Shift+M` to toggle device mode.

## Where things live

| File | What it does | Edit it to… |
|---|---|---|
| `js/data.js` | All riddles, trivia, puzzles, bingo squares, links | Add or change content (safest place to start) |
| `css/styles.css` | All visual styling. Design tokens are at the top | Change colors, fonts, spacing, radii |
| `js/shader.js` | The animated sunset-highway background | Change sky/sun/grid colors, road speed |
| `js/app.js` | Screens and game logic | Add new games or change behavior |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Offline support and "Add to Home Screen" | Rarely |

## Put it online for free

Any of these work because it's a static site:

- **Netlify Drop:** go to https://app.netlify.com/drop and drag the `backseat` folder onto the page. You get a live URL in seconds.
- **GitHub Pages:** push the folder to a GitHub repo → Settings → Pages → deploy from the `main` branch.
- **Cloudflare Pages / Vercel:** connect the GitHub repo; no build settings needed.

Once hosted, phones can "Add to Home Screen" and the app keeps working offline.
After deploying changes, bump `CACHE = 'backseat-v1'` in `sw.js` to `v2` and so on, so installed copies update.
