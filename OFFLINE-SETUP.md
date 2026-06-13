# Al-Hikmah Member Portal — Offline Setup Guide

## Prerequisites (install once)

1. **Node.js 20+** — https://nodejs.org (click "LTS" version)
2. **PostgreSQL 16** — https://www.postgresql.org/download/windows/
   - During install, set password to: `postgres` (or remember what you set)
   - Keep default port: `5432`
3. **pnpm** — after Node.js is installed, open Command Prompt and run:
   ```
   npm install -g pnpm
   ```

---

## First-Time Setup

### Step 1 — Download the project
- Download the ZIP from GitHub or Replit
- Extract to a folder, e.g. `C:\al-hikmah-portal`

### Step 2 — Run the setup script
- Open the extracted folder
- Double-click **`setup.bat`**
- Wait for it to finish (takes 2-3 minutes first time)

### Step 3 — Start the app
- Double-click **`start.bat`**
- Open your browser and go to: **http://localhost**

That's it! The app runs fully offline.

---

## Running After First Setup

Just double-click **`start.bat`** every time you want to use the app.

To stop the app, close the black Command Prompt windows that opened.

---

## Access From Other Devices on Same WiFi

Once the app is running on the PC:
- Find the PC's local IP address (run `ipconfig` in Command Prompt, look for IPv4)
- On any phone/tablet on the same WiFi, open browser and go to: `http://192.168.x.x`
  (replace with your actual IP)

---

## Default Login

- Username: `admin`
- Password: `admin123`

**Change this immediately after first login** in Settings > Users.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Port already in use" | Another app is using port 80. Run `start-alt.bat` which uses port 3000 |
| Database connection error | Make sure PostgreSQL service is running (check Windows Services) |
| "pnpm not found" | Run `npm install -g pnpm` in Command Prompt first |
