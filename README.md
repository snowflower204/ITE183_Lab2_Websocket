# ITE183_Lab2_Websocket

A real-time mentor–mentee consultation chat prototype for Econite, built with **Bonezegei Scripting Language v1.3.3**, HTML, CSS, and vanilla JavaScript for ITE183 Laboratory 2: WebSocket Server.

## Run locally

Use Bonezegei Scripting Language **1.3.3** and its `bzg` package manager. From this project directory:

```powershell
bzg install
bzg run
```

Open `http://localhost:8000/` in two browser windows. The package manager and language runtime have separate version numbers: this environment has `bzg` 1.0.2 and `bonezegei` 1.3.3. `package.json` continues to start `app.bzg`; no Node.js server or frontend build is required.

## Project files

```text
app.bzg                       HTTP + WebSocket server, port 8000
package.json                  Original entry point, start command, HTTP dependency
.gitattributes                Academic repository language attribution
README.md                     Setup, behavior, limitations, verification
LICENSE                       MIT license
lib/http.bzg                  Existing native HTTP library loader
lib/http.json                 Existing HTTP/WebSocket API metadata
lib/http/http.dll             Existing native HTTP implementation
public/index.html             Dashboard, inline CSS and vanilla JavaScript
public/404.html               Custom fallback page, inline CSS
public/assests/econite-logo.png Existing Econite artwork
public/assests/favicon.ico     Existing icon asset (PNG contents)
```

The existing `assests` directory spelling is retained. Both branding assets are reused without modification. The icon link declares `image/png` because the existing `.ico` file contains PNG data.

## UI phase

The original page was a heading, connection status, input, button, and message list; the existing 404 file was empty. The dashboard adds a green and cream layout, a desktop shared-room sidebar, a compact mobile layout, accessible labels/focus indicators, message bubbles, and a branded fallback page.

- Connection badges follow actual WebSocket open, error, and close events. A Reconnect button opens a new connection after a close; there is no automatic retry loop.
- Enter or Send submits trimmed, nonempty plain text. Sending is disabled while disconnected and for blank input. Input method composition does not submit a message.
- Incoming content is rendered through `textContent`. Messages appear only when received from the server, avoiding a duplicate optimistic echo.
- New messages follow the bottom when the reader is already nearby. When reading older messages, a **New messages** button returns to the latest message.
- Every received message has a timestamp from this browser's device clock, explicitly labeled as a local receipt time. It is not a server timestamp.
- The **Mentor/Mentee** selector is a demo-only local preview. It changes the composer label and never changes the socket payload, assigns identity, or authenticates a user.
- History lives only in this page and clears on refresh. There are no saved conversations, online-user counts, accounts, bookings, payments, or database.

## Preserved protocol and server changes

`app.bzg` still owns HTTP and WebSocket service on port **8000**, including `server.onConnect`, `server.onData`, `server.onDisconnect`, and real-time multi-client broadcasting with `server.sendAll()`.

```text
Browser sends:       <plain-text message>
Connection greeting: Welcome to EcoNite!
Broadcast:           User <clientId> says: <plain-text message>
```

The browser is not told its own assigned client ID. Matching outgoing text against broadcasts would confuse identical messages from different users. The UI therefore preserves each complete broadcast and uses the same left alignment for all messages. It does not invent a reliable “you” identity. The room is shared with every connected browser; it is not a private mentor–mentee consultation.

The only changes to `app.bzg` are two exact HTTP asset routes:

- `/assests/econite-logo.png` serves the existing logo.
- `/assests/favicon.ico` serves the existing favicon.

Previously all non-root requests reached the empty fallback, preventing those assets from loading. No general filesystem route is introduced. All WebSocket handlers and broadcast formatting remain unchanged. HTML, CSS, and JavaScript stay together in each page, so no further static-file routing is required. Other URLs retain the existing `server.sendFile("public/404.html")` handling. The native library returns HTTP **200** for that fallback; this update preserves that behavior and does not claim a true HTTP 404 response.

## Verification

During this UI update, `bzg install` was executed but reported `Failed to install 'http' (code=1)`. The manager returned exit code 0 despite that failure. The existing local HTTP library remained unchanged, and `bzg run` successfully served the project on port 8000. A clean dependency download is not verified in this environment.

Browser acceptance results and remaining manual checks are recorded below after live testing.
