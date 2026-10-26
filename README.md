# PouchTrack — Real NFC-Based Factory Pouch Tracking Web App

**PouchTrack** is a full-stack, mobile-first factory traceability web application that tracks physical manufacturing pouches using the native **Web NFC API (`NDEFReader`)** built into Android mobile browsers.

The application operates with **direct shopfloor access**: **NO login page, NO signup, and NO authentication barrier** before scanning. Factory operators pick up an Android phone, select their destination checkpoint, tap **Start NFC Scan**, touch the phone to the pouch's NFC tag, and record the movement in real time.

---

## 🌟 Key Features

1. **Native Web NFC Hardware Scanning**:
   - Uses the browser's native `NDEFReader` API with `reading` and `readingerror` event listeners.
   - Decodes standardized NDEF text payloads (`POUCH:PCH-000123`).
   - Built-in debounce protection against accidental double-taps.
   - Clean `AbortController` cancellation on session stop or page navigation.
   - Real hardware error reporting (e.g. `NotSupportedError`, `NotAllowedError`).
   - Explicitly labeled **Developer NFC Simulator** for testing on desktop environments without physical NFC hardware.

2. **Native NFC Tag Programming (`NDEFReader.write()`)**:
   - Direct physical NFC tag writing from the mobile browser.
   - Formats writable tags (NTAG213, NTAG215, NTAG216, Mifare Ultralight, Type 2/4 tags) with the required `POUCH:<SERIAL>` format.
   - Automatic database synchronization marking `tagProgrammed: true`.

3. **Shopfloor-First Usability (No Login Required)**:
   - Root URL `/` opens immediately to the live dashboard.
   - Operators can scan, inspect timelines, record movements, and register pouches without login barriers.
   - Optional operational operator identifier (e.g. `Rajesh Kumar (Tech-104)`) for non-authenticated audit logs.

4. **8 Factory Production Departments & Checkpoints**:
   - `Raw Material Receiving` &rarr; Inward Dock Station, Fabric & Trim Inspection
   - `Cutting` &rarr; CNC Automated Cutter, Die Cut Table 1
   - `Stitching` &rarr; Ultrasonic Seam Welder, Heavy Duty Stitcher 2
   - `Assembly` &rarr; Sub-Assembly Station A, Final Hardware Fitting
   - `Quality Inspection` &rarr; Dimensional & Seal Check, Stress & Tensile Testing
   - `Packaging` &rarr; Barcode & NFC Verification, Polybag & Box Packing
   - `Finished Goods` &rarr; Racking Bay 4, Buffer Storage Area
   - `Dispatch` &rarr; Outbound Staging Area, Carrier Loading Bay

5. **Workflow Stage Validation & Transition Rules**:
   - Enforces factory quality & packaging rules before allowing dispatch.
   - Flagged transitions automatically record audit events and create reviewable alerts.
   - Idempotency key protection preventing duplicate movement submissions.

6. **Live Telemetry & Reporting**:
   - WebSocket updates via Socket.IO for real-time dashboard refreshes.
   - Recharts visual throughput: Daily movement volume, department inventory distribution, status donut, and overdue checkpoint warnings (>48h).
   - CSV export for Pouch Registry and Movement History ledger.

---

## 🛠 Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts, Socket.IO Client.
- **Backend**: Node.js, Express, TypeScript, Socket.IO, Zod validation, Vitest.
- **Database & ORM**: PostgreSQL with Prisma ORM (with zero-config SQLite mode for instant local testing).
- **Physical NFC**: Native W3C Web NFC API (`NDEFReader`).

---

## 📂 Project Structure

```text
pouchtrack/
├── client/                     # Mobile-first React + Vite frontend
│   ├── src/
│   │   ├── components/         # Navbar, BottomNav, Sidebar, StatusBadge, Modals
│   │   ├── hooks/              # useWebNfc (real NDEFReader hook), useSocket
│   │   ├── pages/              # 10 factory pages
│   │   │   ├── Dashboard.tsx   # Live KPI cards, Recharts, recent scans
│   │   │   ├── NfcScanner.tsx  # Dedicated Web NFC scanner screen
│   │   │   ├── PouchRegistry.tsx # Searchable pouch list & mobile cards
│   │   │   ├── RegisterPouch.tsx # New pouch form with auto-serial generator
│   │   │   ├── PouchDetails.tsx # Detail card, timeline, write tag trigger
│   │   │   ├── Checkpoints.tsx # 8 departments and checkpoints
│   │   │   ├── MovementHistory.tsx # Append-only movement log + CSV export
│   │   │   ├── Alerts.tsx      # Exceptions and investigation hub
│   │   │   ├── Reports.tsx     # Throughput and overdue analysis
│   │   │   └── Diagnostics.tsx # Web NFC hardware checklist and telemetry
│   │   ├── services/           # Typed REST API adapter
│   │   ├── App.tsx             # Responsive layout & router container
│   │   └── router.tsx          # Client-side router
│   ├── tailwind.config.js      # Industrial color system and animations
│   └── vite.config.ts          # Host exposure for mobile Wi-Fi testing
│
├── server/                     # Express REST API & Socket.IO server
│   ├── src/
│   │   ├── routes/             # Departments, checkpoints, pouches, movements, alerts, reports, diagnostics
│   │   ├── services/           # movementService, workflowEngine, reportService
│   │   ├── utils/              # ndefParser (strict payload parsing)
│   │   ├── tests/              # 17 Vitest comprehensive unit & API tests
│   │   └── index.ts            # Express server and Socket.IO entrypoint
│   └── tsconfig.json
│
├── prisma/                     # Database schema and seed data
│   ├── schema.prisma           # Active schema (SQLite local / PostgreSQL prod)
│   ├── schema.postgresql.prisma# PostgreSQL schema reference
│   └── seed.ts                 # 30 demo pouches, 8 departments, 16 checkpoints, alerts
│
├── .env.example                # Sample environment variables
├── package.json                # Root monorepo workspace scripts
└── README.md                   # Documentation
```

---

## 🚀 Quick Start Guide (Local Setup)

### 1. Prerequisites
- **Node.js**: v18.0.0 or later (v24.12+ recommended)
- **NPM**: v9.0.0 or later

### 2. Install Dependencies
From the repository root:
```bash
npm install
```

### 3. Initialize Database & Seed Demo Data
The project defaults to a zero-configuration SQLite database (`prisma/dev.db`) so you can run the entire system immediately without configuring a local PostgreSQL service:

```bash
# Push schema and generate Prisma client
npm run db:push

# Populate 30 sample factory pouches, 8 departments, and movement events
npm run db:seed
```

### 4. Run Automated Test Suite
Verify that all 17 integration and unit tests pass:
```bash
npm test
```

### 5. Start Development Servers
Run frontend and backend simultaneously:
```bash
npm run dev
```

- **Frontend Application**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/api/health`

---

## 📱 Testing with Physical Android Phones & NFC Tags

Web NFC is a native W3C web standard supported by **Google Chrome for Android**.

### Step 1: Connect Phone to Local Wi-Fi
1. Ensure your Android phone and development computer are on the **same Wi-Fi network**.
2. Find your computer's local IP address (e.g. `192.168.1.50`).
3. Note that Vite runs with `host: true`, exposing the dev server to your local network.

### Step 2: Configure Chrome for Local Web NFC
Web NFC strictly requires a **Secure Context** (`HTTPS` or `localhost`).
To test over local Wi-Fi without installing SSL certificates on your dev machine:
1. Open Chrome on your Android phone and navigate to:
   ```text
   chrome://flags/#unsafely-treat-insecure-origin-as-secure
   ```
2. Enable the flag and enter your computer's IP and port:
   ```text
   http://192.168.1.50:5173
   ```
3. Tap **Relaunch** Chrome.
4. *(Alternatively, deploy to an HTTPS service like Vercel or Render for zero-configuration testing).*

### Step 3: Enable NFC in Android Settings
1. Open Android **Settings** &rarr; **Connections** (or **Connected Devices**).
2. Toggle **NFC** to **ON**.

### Step 4: Program and Scan a Tag
1. Open `http://192.168.1.50:5173` on your Android phone.
2. Tap **Pouches** &rarr; select pouch `PCH-000101` (or tap **Register Pouch**).
3. Tap **Write NFC Tag**.
4. Hold a writable NFC tag (e.g. NTAG213 / NTAG215) against the back of your phone.
5. Once written, navigate to the **Scan NFC** screen.
6. Select your destination checkpoint (e.g. `Quality Inspection -> Dimensional & Seal Check`).
7. Tap **Start NFC Scan**.
8. Tap the tag to your phone. The pouch will be identified and decoded instantly.
9. Tap **Confirm Movement to Checkpoint**. The movement is permanently recorded in the database and broadcast to all connected dashboards!

---

## 🌐 Production Deployment Guide

### Deploying Backend to Render (with Managed PostgreSQL)

1. **Create Managed PostgreSQL Database**:
   - In Render, create a **New PostgreSQL** instance.
   - Copy the **Internal Database URL** or **External Database URL**.

2. **Configure Environment Variables**:
   In your Render Web Service settings:
   ```ini
   PORT=5000
   NODE_ENV=production
   DATABASE_URL="postgresql://user:password@your-postgres-host:5432/pouchtrack?sslmode=require"
   CORS_ORIGIN="https://your-frontend-app.vercel.app"
   ```

3. **Deploy Build Command**:
   ```bash
   npm install && npx prisma db push --schema=../prisma/schema.postgresql.prisma && npm run build
   ```

4. **Start Command**:
   ```bash
   npm start
   ```

### Deploying Frontend to Vercel / Netlify

1. In Vercel or Netlify, set the Root Directory to `client`.
2. Add Environment Variable:
   ```ini
   VITE_API_URL="https://your-backend-app.onrender.com"
   ```
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Vercel automatically issues an SSL certificate (`https://`), satisfying the Web NFC secure context requirement out of the box!

---

## 🔒 Security & Shopfloor Direct Access Notice

As specified by the operational requirements:
- **PouchTrack has NO in-app login page or password prompt.**
- In real factory environments, access to this application should be restricted to authorized factory personnel using:
  1. **Private Factory Wi-Fi / LAN**: Host the server on an internal intranet subnet inaccessible from the public internet.
  2. **Corporate VPN**: Require operators to connect to the factory VPN (e.g. WireGuard, Tailscale, OpenVPN).
  3. **Reverse Proxy Access Control**: If exposed over the internet, place a reverse proxy (e.g. Cloudflare Zero Trust, Traefik, NGINX with mTLS or HTTP Basic Auth) in front of the root URL so shopfloor tablets remain authenticated at the network edge.

---

## 🧪 Automated Testing Verification

The backend includes a comprehensive Vitest test suite testing:
- NDEF payload parser (`POUCH:PCH-XXXXXX` format, case insensitivity, whitespace, URL rejection, invalid tag rejection).
- Pouch registration and duplicate serial number rejection.
- Unknown pouch handling and automated alert generation.
- Valid checkpoint movement recording.
- Idempotency key duplicate submission protection.
- Inactive checkpoint rejection.
- Factory workflow stage transition rules (e.g. preventing direct dispatch without quality & packaging).
- Chronological movement history integrity.
- Real-time reporting aggregations from database records.

Run the test suite with:
```bash
npm test
```
All 17 tests pass in < 3 seconds.
