# SplitEase — Project Context

> **Purpose of this document:** A complete reference for any developer (or Claude instance) picking up this project cold. Everything needed to understand, run, and extend SplitEase without reading the source code first.

---

## 1. What Is SplitEase?

SplitEase is a full-stack **Splitwise-style expense splitting web app** built as a B.Tech CSE semester project. It lets users:

- Split shared expenses across groups (equal or custom splits)
- Track personal expenses, income, loans given/taken
- Settle up within groups (payments between members)
- View a unified personal financial timeline
- Get notified and remind others to pay

It started as a Python/Streamlit/MySQL DBMS submission, then was rebuilt as a production-grade React + FastAPI + MySQL app.

---

## 2. Tech Stack

### Frontend
| Layer | Tech |
|---|---|
| Framework | React 18 (functional components, hooks only) |
| Build tool | Vite |
| Routing | React Router v6 (`createBrowserRouter` / `<Routes>`) |
| HTTP client | Axios (custom instance in `src/api/axios.js`) |
| Styling | Inline styles + scoped `<style>` string injection per page (no Tailwind, no CSS modules) |
| Icons | Inline SVG only — no icon library installed |
| State | `useState` + `useCallback` + `useEffect` — no Redux, no Zustand |
| Auth state | React Context (`AuthContext`) with JWT stored in `localStorage` |

### Backend
| Layer | Tech |
|---|---|
| Framework | FastAPI (Python 3.14) |
| Runtime | Uvicorn with `--loop asyncio` flag (required for Python 3.14 on macOS Apple Silicon) |
| Database | MySQL via `mysql-connector-python` |
| Auth | JWT (python-jose), bcrypt password hashing (pinned version for Python 3.14 compat) |
| ORM | None — raw SQL only, all queries in `db.py` |
| Validation | Pydantic models (FastAPI default) |

### Database
- MySQL, database name: `expense_splitter_react`
- Schema file: `sql/schema_v2.sql` (clean install, all tables + stored procedure)
- Seed file: `sql/seedusers.sql`

---

## 3. Project Folder Structure

```
splitease/
├── backend/
│   ├── main.py              # FastAPI app entry, CORS config, router registration
│   ├── auth.py              # JWT creation, decode, get_current_user dependency
│   ├── config.py            # DB_CONFIG dict (host, user, password, database)
│   ├── db.py                # ALL database functions — single source of truth for SQL
│   ├── requirements.txt     # Python dependencies
│   └── routers/
│       ├── auth_router.py       # POST /auth/login, POST /auth/signup
│       ├── users.py             # GET /users/, GET /users/me, PUT /users/{id}
│       ├── groups.py            # CRUD for groups + members
│       ├── expenses.py          # Group expenses CRUD + splits
│       ├── payments.py          # Settlement payments within groups
│       ├── settlements.py       # GET /settlements/{group_id} — calls stored procedure
│       ├── personal_expenses.py # CRUD for Personal_Expenses table
│       ├── income.py            # CRUD for Income table
│       ├── loans.py             # Loans given — CRUD + repayment
│       ├── invites.py           # Token-based group invite links
│       ├── notifications.py     # In-app notifications
│       └── timeline.py          # GET /timeline/ — unified feed across all entry types
│
├── frontend/
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx             # ReactDOM.createRoot, BrowserRouter wrap
│       ├── App.jsx              # All routes defined here
│       ├── index.css            # Global CSS variables (--border, --surface, --text, etc.)
│       ├── api/
│       │   └── axios.js         # Axios instance: baseURL + JWT interceptor
│       ├── context/
│       │   └── AuthContext.jsx  # user state, login(), logout(), JWT decode
│       ├── components/
│       │   ├── AppShell.jsx     # MAIN LAYOUT — sidebar + topbar + page area
│       │   │                    # Contains all sidebar nav icons inline
│       │   │                    # Contains ProfileDropdown component
│       │   ├── AddEntryModal.jsx # 6-tab modal: Personal/Income/Lend/Borrow/Group/Settlement
│       │   ├── NotificationBell.jsx # Bell icon with unread count badge
│       │   └── AdminLayout.jsx  # Separate layout for /admin/* routes
│       ├── pages/
│       │   ├── Dashboard.jsx    # Hero card + mini balance cards + recent groups
│       │   ├── Expenses.jsx     # Personal financial timeline (was MyExpenses.jsx)
│       │   ├── Loans.jsx        # Loans given + borrowed, with repayment cards
│       │   ├── Groups.jsx       # Group cards grid with balances + filter/sort
│       │   ├── GroupDetail.jsx  # Single group: ledger tab + settlements tab
│       │   ├── AddExpense.jsx   # Full expense form for a specific group
│       │   ├── AddPayment.jsx   # Settlement payment form for a specific group
│       │   ├── Settlements.jsx  # Cross-group settlement view with simplified debts
│       │   ├── Activity.jsx     # Feed of all expenses + payments across groups
│       │   ├── Profile.jsx      # Edit profile + change password modals
│       │   ├── Settings.jsx     # Theme toggle (light/dark via localStorage)
│       │   ├── JoinGroup.jsx    # Token-based invite landing page
│       │   ├── Login.jsx
│       │   ├── Signup.jsx
│       │   └── admin/
│       │       ├── AdminOverview.jsx
│       │       ├── AdminUsers.jsx
│       │       ├── AdminGroups.jsx
│       │       └── AdminTransactions.jsx
│       └── utils/
│           ├── Icons.jsx        # Reusable SVG icon components for UI actions
│           │                    # (personalExpense, income, lendMoney, borrowMoney,
│           │                    #  groupExpense, settlement, moneyLent, moneyBorrowed,
│           │                    #  receiveBack)
│           └── GroupIcons.jsx   # Keyword-based group icon mapping
│                                # getGroupIcon(groupName) → {IconComponent, bg, color}
│                                # Keywords: trip→Plane, food→Utensils, home→Home, etc.
│
└── sql/
    ├── schema_v2.sql    # Clean install: all CREATE TABLE + stored procedure
    └── seedusers.sql    # Test user data
```

---

## 4. Database Schema (14 tables)

### Core tables
| Table | Purpose |
|---|---|
| `Users` | user_id, name, email, password_hash, upi_id, role (admin/user) |
| `Groups` | group_id, group_name, created_at |
| `Group_Members` | group_id + user_id (many-to-many) |
| `Categories` | category_id, category_name |
| `Subcategories` | subcategory_id, subcategory_name, category_id |
| `Expenses` | expense_id, group_id, payer_id, category_id, total_amount, description, split_type, expense_date |
| `Expense_Splits` | expense_id, user_id, amount_owed, share_pct |
| `Payments` | payment_id, group_id, payer_id, payee_id, amount, note, payment_date |

### Personal finance tables
| Table | Purpose |
|---|---|
| `Personal_Expenses` | user_id, amount, category, note, expense_date |
| `Income` | user_id, amount, source_type (salary/pocket_money/stipend/other), note, income_date |
| `Loans` | lender_user_id, borrower_name, amount, remaining_amount, note, loan_date, status (active/repaid) |
| `Borrows` | borrower_user_id, lender_name, amount, remaining_amount, note, borrow_date, status |
| `Invites` | token, group_id, created_by, expires_at, used |
| `Notifications` | user_id, message, is_read, created_at |

### Stored procedure
`Calculate_Settlements(group_id)` — computes net balance per member using payments and expense splits. Returns rows with `user_name`, `total_paid`, `total_owed`, `net_balance`.

---

## 5. API Endpoints

All routes require `Authorization: Bearer <JWT>` header except `/auth/login` and `/auth/signup`.

### Auth
```
POST /auth/login     { email, password } → { access_token, token_type, user_id, name, role }
POST /auth/signup    { name, email, password, upi_id? } → { user_id, message }
```

### Users
```
GET  /users/         → all users (name, user_id, upi_id) — used for group member picker
GET  /users/me       → current user profile
PUT  /users/{id}     { name, email, upi_id } → update profile
PUT  /users/{id}/password  { current_password, new_password }
```

### Groups
```
GET    /groups/              → groups current user belongs to
POST   /groups/              { group_name, user_ids[] } → create group
PUT    /groups/{id}          { group_name }
DELETE /groups/{id}
GET    /groups/{id}/members  → member list with name + upi_id
POST   /groups/{id}/remind   { debtor_name, amount } → send reminder notification
```

### Expenses (group)
```
GET    /expenses/{group_id}           → all expenses for group
POST   /expenses/{group_id}           { description, total_amount, split_type, category_id, subcategory_id?, expense_date, splits[] }
DELETE /expenses/{expense_id}
GET    /expenses/{expense_id}/splits  → per-member split amounts
```

### Payments (settlements within group)
```
GET    /payments/{group_id}    → all payments for group
POST   /payments/{group_id}    { payer_id, payee_id, amount, note?, payment_date }
DELETE /payments/{payment_id}
```

### Settlements
```
GET  /settlements/{group_id}              → calls Calculate_Settlements SP, returns net balances
GET  /settlements/{group_id}/simplified   → simplified debt list (who pays whom, minimum transactions)
```

### Personal Expenses
```
GET    /personal-expenses/       → all for current user
POST   /personal-expenses/       { amount, category, note?, expense_date }
DELETE /personal-expenses/{id}/
```

### Income
```
GET    /income/       → all for current user
POST   /income/       { amount, source_type, note?, income_date }
DELETE /income/{id}/
```

### Loans (money lent)
```
GET    /loans/                    → loans given by current user
POST   /loans/                    { borrower_name, amount, note?, loan_date }
POST   /loans/{id}/repay          { repayment_amount } → partial or full repayment
DELETE /loans/{id}
```

### Borrows (money borrowed)
```
GET    /borrows/                  → borrows taken by current user
POST   /borrows/                  { lender_name, amount, note?, borrow_date }
POST   /borrows/{id}/repay        { repayment_amount }
DELETE /borrows/{id}
```

### Timeline (unified feed)
```
GET  /timeline/?limit=100   → merged chronological list of all financial events for current user
```

Timeline entry shape:
```json
{
  "type": "personal_expense | group_expense | group_expense_owed | income | loan_given | loan_taken | settlement_received | settlement_sent",
  "date": "YYYY-MM-DD",
  "amount": 100.00,
  "my_share": 33.33,       // only for group_expense
  "receivable": 66.67,     // only for group_expense and loan_given
  "label": "Paid in onlySAS",
  "sub": "Pista House - Tandoori Mandi",
  "ref_id": 12,
  "group_id": 3,
  "group_name": "onlySAS"
}
```

### Invites
```
POST /groups/{id}/invite         → generate invite token link
GET  /invites/{token}            → validate + get group info
POST /invites/{token}/accept     → add current user to group
```

### Notifications
```
GET   /notifications/            → unread notifications for current user
POST  /notifications/read/{id}   → mark as read
POST  /notifications/read-all    → mark all read
```

---

## 6. Frontend Architecture

### Routing (App.jsx)
All routes are flat and independent — no nested layouts except `/admin/*`.

```
/login, /signup              → public
/join/:token                 → public (invite landing)
/dashboard                   → Dashboard.jsx
/expenses                    → Expenses.jsx (personal timeline)
/loans                       → Loans.jsx
/groups                      → Groups.jsx
/groups/:id                  → GroupDetail.jsx
/groups/:id/add-expense      → AddExpense.jsx
/groups/:id/add-payment      → AddPayment.jsx
/settlements                 → Settlements.jsx
/activity                    → Activity.jsx
/profile                     → Profile.jsx
/settings                    → Settings.jsx
/admin/*                     → AdminLayout + nested admin pages
```

Route guards: `<UserRoute>` checks `user` from AuthContext. `<AdminRoute>` additionally checks `user.role === "admin"`.

### AppShell (main layout)
Every page (except Login/Signup/JoinGroup) renders inside `<AppShell title="..." actions={...}>`. AppShell provides:
- Left sidebar with nav items (inline SVG icons, NavLink active state)
- Top bar with page title + actions slot + NotificationBell + ProfileDropdown
- Main content area with `page-inner fade-up` wrapper

**Critical:** The sidebar is INSIDE AppShell, not a separate component. There is a `Sidebar.jsx` file in the repo but it is NOT used — AppShell has its own inline sidebar. The `Sidebar.jsx` file can be deleted.

### Auth Flow
1. Login → POST `/auth/login` → receives JWT
2. JWT stored in `localStorage` as `"token"`
3. `AuthContext` decodes JWT on mount to restore `user` state
4. Axios interceptor in `axios.js` automatically attaches `Authorization: Bearer <token>` to every request
5. Logout → clears `localStorage` → redirects to `/login`

### CSS Architecture
There is NO global component library. Each page/component defines its own styles in a `const STYLES` string injected via `<style>{STYLES}</style>` at the top of the render. CSS variables from `index.css` are used throughout:

```css
--border, --border2          /* subtle, hover */
--surface, --surface2, --surface3   /* card bg, input bg, skeleton bg */
--text, --text2, --text3     /* primary, secondary, muted */
--primary, --primary-h       /* blue, hover blue */
--danger, --success          /* red, green */
```

Dark/light theme is toggled via `localStorage("theme")` by Settings.jsx — adds/removes a class on `<body>` that swaps the CSS variable values.

---

## 7. Key Components In Depth

### AddEntryModal.jsx
A 6-tab modal triggered by `+ Add Entry` button in AppShell topbar. Tabs:
- **Personal Expense** → POST `/personal-expenses/`
- **Income** → POST `/income/`
- **Lend Money** → POST `/loans/`
- **Borrow Money** → POST `/borrows/`
- **Group Expense** → redirects to `/groups/{id}/add-expense` (uses full form)
- **Settlement** → redirects to `/groups/{id}/add-payment`

Props: `onSuccess` (callback to reload parent), `defaultTab` (which tab to open).

### Icons.jsx (utils)
Exports a single `Icons` object with named SVG JSX elements:
```js
Icons.personalExpense  Icons.income       Icons.lendMoney
Icons.borrowMoney      Icons.groupExpense Icons.settlement
Icons.moneyLent        Icons.moneyBorrowed Icons.receiveBack
```
Import: `import { Icons } from "../utils/Icons"` (capital I in filename).

### GroupIcons.jsx (utils)
Exports `getGroupIcon(groupName)` which keyword-matches the group name and returns `{ IconComponent, bg, color }` for rendering contextual group avatars. Used in Groups.jsx, Dashboard.jsx, GroupDetail.jsx.

Example: `"onlySAS"` → Users icon (default), `"H-Block"` → Home icon (matches "block"), `"Goa Trip"` → Plane icon.

### Groups.jsx (complex)
Fetches groups then progressively enriches each card by calling 3 APIs per group in parallel: `/groups/{id}/members`, `/expenses/{id}`, `/settlements/{id}`. Uses two state maps: `enrichedMap` (balance data) and `memberMap` (avatar data). The RemindPopover fetches `/settlements/{id}/simplified` on demand.

### Expenses.jsx (timeline)
Calls `/timeline/` once. Filters client-side by type bucket (spent/received/loans), month (YYYY-MM), and search string. Summary cards reflect ALL entries regardless of filter. Loan entries show inline repayment widget (`InlineRepay` component) — calls `POST /loans/{id}/repay` directly from the timeline.

---

## 8. Coding Patterns

### Backend
- **All SQL in db.py** — routers import and call db functions, never write SQL themselves
- **One connection per function** — every db function opens and closes its own connection
- **Explicit transactions** — `conn.start_transaction()` + `conn.commit()` + `conn.rollback()` in try/except/finally
- **dictionary=True cursors** — all SELECT results return `list[dict]`
- **Date normalization** — all `date` and `datetime` fields converted to `str()` before returning from db functions (MySQL returns Python date objects that JSON can't serialize)
- **Decimal normalization** — MySQL DECIMAL columns converted to `float()` before returning

### Frontend
- **No prop drilling** — only AuthContext is global; everything else is local state
- **useCallback for load functions** — every data-fetching function is wrapped in `useCallback` to prevent stale closure issues with `useEffect`
- **Optimistic UI is NOT used** — all mutations await the API then call `load()` to refresh
- **Complete file replacement** — when editing pages, always provide the full file, never diffs
- **No external icon libraries** — all icons are inline SVG paths
- **Scoped styles** — CSS injected per-component via `<style>` tag, using BEM-like class prefixes (`.me-` for Expenses, `.gc-` for Groups, `.db-` for Dashboard, `.act-` for Activity, `.ld-` for Loans)

---

## 9. What's Working

- ✅ Full auth (signup, login, JWT, role-based)
- ✅ Group creation with member selection
- ✅ Group expenses with equal split (custom split UI exists)
- ✅ Settlement payments within groups
- ✅ Balance calculation via stored procedure
- ✅ Simplified debt algorithm (minimum transactions)
- ✅ Personal expenses CRUD
- ✅ Income CRUD
- ✅ Loans given — CRUD + partial/full repayment
- ✅ Borrows (money taken) — CRUD + repayment
- ✅ Unified timeline (`/timeline/`) with 8 entry types
- ✅ Inline loan repayment from Expenses page timeline
- ✅ Token-based group invite links
- ✅ In-app notifications + bell badge
- ✅ Month filter on Expenses and Activity pages
- ✅ Dashboard balance cards (computed from settlements per group)
- ✅ GroupIcons keyword matching (contextual icons per group name)
- ✅ Admin panel (user/group/transaction management)
- ✅ Dark/light theme toggle
- ✅ Profile edit + password change
- ✅ Remind debtor feature (sends notification)
- ✅ Progressive data enrichment on Groups page (skeleton → real data as APIs resolve)

---

## 10. What's Pending / Known Issues

- ❌ **Expenses summary cards are all-time, not month-scoped** — when month filter is applied, the 4 summary cards still show all-time totals. They should recompute from `visible` (filtered) entries, not all `entries`. Also `selMonth` should default to current month, not `"all"`.
- ❌ **No `/settlements/summary/` endpoint** — Dashboard fetches per-group settlements to compute balances; a dedicated summary endpoint would be cleaner
- ❌ **Borrows repayment endpoint path** — `POST /borrows/{id}/repay/` (with trailing slash) — verify this matches FastAPI route definition in `borrows` router
- ❌ **Loans router trailing slash inconsistency** — `POST /loans/{id}/repay` (no trailing slash in loans.py) vs axios calls — must match exactly or FastAPI returns 307 redirect
- ❌ **Activity page doesn't include personal expenses/loans** — intentional design decision (Activity = group feed only), but worth documenting
- ❌ **No export/report feature**
- ❌ **No recurring expense support**
- ❌ **No UPI deep-link payment integration** (UPI IDs stored but not used for payment initiation)
- ❌ **Mobile layout not fully tested** — Group cards grid uses `minmax(300px, 1fr)` which may stack oddly on small screens

---

## 11. Running the Project

### Backend
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --loop asyncio --port 8000
```
The `--loop asyncio` flag is required on Python 3.14 (macOS Apple Silicon).

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### Database
```bash
mysql -u root -p < sql/schema_v2.sql
mysql -u root -p expense_splitter_react < sql/seedusers.sql
```

Config is in `backend/config.py`:
```python
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "<your_password>",
    "database": "expense_splitter_react"
}
```

---

## 12. Common Gotchas

1. **Axios baseURL** — set in `frontend/src/api/axios.js` to `http://localhost:8000`. If backend port changes, update here.

2. **Trailing slashes** — FastAPI routes must match exactly. Most routes have trailing slashes (`/loans/`). The repay routes do NOT (`/loans/{id}/repay`). Mismatch causes 307 redirects that break on some browsers.

3. **bcrypt version** — pinned in requirements.txt for Python 3.14 compatibility. Don't upgrade without testing.

4. **Sidebar is in AppShell** — `Sidebar.jsx` and `Sidebar_updated.jsx` in the components folder are legacy files not imported anywhere. The working sidebar is the inline nav inside `AppShell.jsx`.

5. **Icons import is case-sensitive** — `import { Icons } from "../utils/Icons"` (capital I). File is `Icons.jsx` not `icons.jsx`.

6. **GroupIcons export** — `import { getGroupIcon } from "../utils/GroupIcons"` — the file also exports `Icons` (different from the main Icons.jsx) containing SVG components for group types.

7. **Timeline limit** — `/timeline/` defaults to 100 entries. Pass `?limit=200` if user has lots of data.

8. **Settlement stored procedure** — `Calculate_Settlements` must exist in MySQL before settlements pages work. It's defined in `schema_v2.sql`.

---

## 13. Design System Reference

### Colors (CSS variables in index.css)
| Variable | Dark value | Purpose |
|---|---|---|
| `--surface` | `#0f1117` | Card background |
| `--surface2` | `#161b27` | Input background |
| `--surface3` | `#1e2535` | Skeleton/hover |
| `--border` | `rgba(255,255,255,0.08)` | Default border |
| `--border2` | `rgba(255,255,255,0.15)` | Hover border |
| `--text` | `#f1f5f9` | Primary text |
| `--text2` | `#94a3b8` | Secondary text |
| `--text3` | `#64748b` | Muted/label text |
| `--primary` | `#2563eb` | Blue CTA |
| `--primary-h` | `#3b82f6` | Blue hover |
| `--danger` | `#ef4444` | Red (debt, delete) |
| `--success` | `#10b981` | Green (credit, settled) |

### Page anatomy (consistent across all pages)
```
AppShell
  └── page-inner
        ├── <h1> Page title (26px, 800 weight)
        ├── <p> Subtitle (14px, text3)
        ├── [insight chips row] (optional, dashboard/activity/expenses)
        ├── [summary cards grid] (4-col, 14px gap)
        ├── toolbar (search left, tabs+filters right, count far right)
        └── content area (list / card grid / timeline)
```

### Animation pattern
Every page uses the same two keyframes:
```css
@keyframes [prefix]FadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes [prefix]Pulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
```
FadeUp on cards (with staggered `animationDelay`). Pulse on skeleton loaders.

---

*Last updated: April 2026. Project by Mohammad Sabihul Haque, B.Tech CSE, SRM IST Delhi-NCR.*