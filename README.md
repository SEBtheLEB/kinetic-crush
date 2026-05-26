# Kinetic Crush

Kinetic Crush is a portrait, mobile-first momentum brick breaker built with HTML, CSS, JavaScript, Canvas, Vite, localStorage, and Capacitor-ready configuration.

## Play Test

Run locally:

```bash
npm install
npm run dev
```

Open the LAN URL on your phone while it is on the same Wi-Fi network. On Windows PowerShell, use `npm.cmd run dev` if the npm shim is blocked by execution policy.

After this repo is pushed, the included GitHub Pages workflow publishes the game automatically on every push to `master` or `main`. Enable GitHub Pages with source set to **GitHub Actions**, then use the Pages URL on your phone for auto-updating play tests.

## Android / Play Store Prep

```bash
npm install
npm run build
npm run cap:init
npm run cap:add:android
npm run cap:sync
```

Then in Android Studio set:

- `minSdkVersion`: 23 or higher
- `compileSdkVersion`: 35 or latest stable installed
- `targetSdkVersion`: 35 or higher, updating to the newest active Google Play requirement if it changes
- Orientation: portrait
- Permissions: none beyond defaults; do not add internet permission unless a future feature needs it

Build the release Android App Bundle:

```bash
cd android
./gradlew bundleRelease
```

Use Play App Signing in Play Console. This version is offline-only and does not collect user data.

## Store Copy

Short description:

> Flick, boost, and smash through layered brick arenas with momentum-based physics.

Full description:

> Kinetic Crush is a momentum-based brick breaker where every flick adds force to a fast-moving ball. Swipe with the ball's movement to build speed, trigger Perfect Pushes, smash through square brick layers, set off bomb chains, and master physics-based arcade levels. The faster you move, the harder you hit.
