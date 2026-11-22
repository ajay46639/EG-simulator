# EG SIMULATOR v4.0 — Complete N.D. Bhatt Engineering Drawing Simulator

EG SIMULATOR **v4.0** is an interactive 3D and 2D Engineering Graphics simulator and drawing generator based on the N.D. Bhatt (*Elementary Engineering Drawing*, BIS SP:46) syllabus.

---

## 🔒 Protected Access Gate & Security

EG SIMULATOR is secured with an access gate that requires users to provide their credentials and a unique administrator-issued special access key before gaining access to the simulator.

### Features
1. **User Verification**: Users must enter **Full Name**, **Email Address**, and the **Special Access Key**.
2. **Access Verification**:
   - The special key is verified against the configured access key (via Vercel serverless function `/api/verify-access` or client config).
   - If the key is invalid, access is strictly denied with an immediate error message.
3. **Formspree Notification on Every Attempt (Authorized & Unauthorized)**:
   - Form notifications are sent to Formspree endpoint:
     `https://formspree.io/f/maeopqqb`
   - Even if an incorrect access key is entered, a notification is sent to Formspree logging the attempt with `status: ACCESS_DENIED_WRONG_KEY` and the attempted key, while preventing access to the project.
   - When the correct key is entered, a notification is sent with `status: ACCESS_GRANTED`, and the user is granted access to the simulator.
   - Payload records:
     - `name`: User full name
     - `email`: User email
     - `accessKey`: Key entered
     - `status`: `ACCESS_GRANTED` or `ACCESS_DENIED_WRONG_KEY`
     - `loginTime`: Local timestamp
     - `timestamp`: ISO timestamp
     - `userAgent`: Browser & OS details
4. **Session Management**:
   - Authenticated sessions are securely cached in local storage so valid users don't have to re-enter their credentials on every refresh.
   - If the administrator changes the access key, existing sessions with outdated key hashes are automatically invalidated, requiring re-authentication.
   - A **User Badge & Logout** button in the Top Toolbar allows users to exit and re-lock the simulator at any time.

---

## 🔑 How to Update the Special Access Key

You can update the special key at any time using any of the following 3 easy methods:

### Method 1: On Vercel (Recommended for Production)
1. Go to your project on the [Vercel Dashboard](https://vercel.com).
2. Navigate to **Settings** > **Environment Variables**.
3. Add or update the variable:
   - **Key**: `VITE_ACCESS_KEY` (or `ACCESS_KEY`)
   - **Value**: Your new secret access key (e.g. `MY-NEW-KEY-2026`)
4. Click **Save** and trigger a redeploy (or redeploy automatically on push). The key updates immediately!

### Method 2: Local Development (.env)
In `EngiView3D/.env` (or root `.env`), set:
```env
VITE_ACCESS_KEY=MY-NEW-KEY-2026
ACCESS_KEY=MY-NEW-KEY-2026
```

### Method 3: Directly in Config File
Edit `src/config/authConfig.ts`:
```typescript
export const DEFAULT_ACCESS_KEY = 'MY-NEW-KEY-2026';
```

---

## 🏛️ Project Architecture Overview

```
EngiView3D/
├── api/                       # Vercel Serverless Functions
│   └── verify-access.ts       # Secure server-side access key verification endpoint
├── public/                    # Static assets & icons
├── src/
│   ├── animations/            # Step-by-step drawing generation animations
│   │   └── stepEngine.ts      # Multi-stage projection animation engine
│   ├── components/            # UI components
│   │   ├── AccessGate.tsx     # 🔒 Protected Login & Key Verification Gate
│   │   ├── TopToolbar.tsx     # Navigation, view modes, export, user profile & logout
│   │   ├── LeftSidebar.tsx    # Scene tree & object list
│   │   ├── RightSidebar.tsx   # Parameter inputs & constraint solver inspector
│   │   └── AnimationBar.tsx   # Step playback controls
│   ├── config/                # App configuration
│   │   └── authConfig.ts      # Special key configuration & Formspree endpoint
│   ├── core/                  # Core engineering geometry & projections
│   │   ├── intersection/      # Solid-solid intersection curve engine
│   │   └── pictorial/         # Isometric, oblique, and perspective projectors
│   ├── engineering/           # Engineering math, curves, scales, and syllabus presets
│   │   ├── curvesAndScales.ts # Conics, cycloids, involutes, spirals, plain/diagonal scales
│   │   ├── presets.ts         # Standard N.D. Bhatt textbook problems & sample models
│   │   └── units.ts           # Quadrant detection, angles, scale ratios
│   ├── geometry/              # 3D Mesh and vector operations
│   │   ├── builders.ts        # Mesh generators for points, lines, planes, and solids
│   │   └── math.ts            # Matrix transformations & vector geometry
│   ├── projections/           # 2D Orthographic projections & Drawing sheets
│   │   ├── multiStageSheet.ts # Multi-stage engineering drawing sheet generation
│   │   └── projector.ts       # First-angle and third-angle orthographic projection
│   ├── services/              # External services
│   │   └── authService.ts     # Key verification, Formspree webhook integration & session store
│   ├── solver/                # Constraint solver
│   │   └── constraintSolver.ts# N.D. Bhatt rule solver for under/over-determined inputs
│   ├── state/                 # State management (Zustand)
│   │   ├── useAuthStore.ts    # 🔒 Authentication store (login, logout, session state)
│   │   └── useProjectStore.ts # CAD project state (objects, cameras, views, history)
│   ├── types/                 # TypeScript type definitions
│   │   └── engineering.ts     # Data structures for objects, planes, meshes, and settings
│   ├── views/                 # Viewport renderers
│   │   ├── ThreeViewport.tsx  # Interactive 3D WebGL viewport (Three.js / React Three Fiber)
│   │   ├── OrthographicView.tsx # SVG orthographic projections (Front, Top, Side, Auxiliary)
│   │   ├── DrawingSheetView.tsx # Printable drawing sheet with title block & projection symbols
│   │   ├── PictorialIntersectionView.tsx # Isometric, Oblique, Perspective & Intersections
│   │   └── CurvesScalesView.tsx # Engineering curves & scales lab
│   ├── App.tsx                # Main App entry (auth gate switch & workspace orchestrator)
│   └── main.tsx               # React DOM bootstrap
├── tests/                     # Automated Vitest test suites
│   ├── auth.test.ts           # Authentication & key validation unit tests
│   ├── engineering.test.ts    # Engineering drawing solver & mesh tests
│   └── phase0_bug_repro.test.ts # Regression test suite
├── vercel.json                # Vercel deployment configuration
└── vite.config.ts             # Vite configuration with local dev API middleware
```

---

## 🚀 Quick Start & Development

```bash
# Navigate to the project directory
cd EngiView3D

# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` in your browser. The Login Gate will prompt for Name, Email, and Special Key.
Default development key: `EG-SIM-2026-VIP`.

---

## 🧪 Testing & Verification

```bash
npm run test     # Run all Vitest suites
npm run build    # Typecheck & build production bundle
```

---

## ☁️ Deploying to Vercel

1. Push this repository to GitHub / GitLab.
2. In Vercel, click **Add New Project** and import the repository.
3. Configure settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Select `EngiView3D` (or leave default `./` as root `package.json` and `vercel.json` are already set up)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In **Environment Variables**, add:
   - `VITE_ACCESS_KEY` = `<your-unique-key>`
   - `ACCESS_KEY` = `<your-unique-key>`
5. Click **Deploy**. Your secure EG SIMULATOR is live!
