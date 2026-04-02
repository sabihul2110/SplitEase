  
Markdown

\# PROJECT\_CONTEXT.md: SplitEase

\#\# 1\. 📖 Project Overview  
\*\*SplitEase\*\* is a full-stack, decoupled College Expense Splitter System. It facilitates group expense splitting, peer-to-peer (P2P) lending, personal finance tracking (income and standalone expenses), and automated debt simplification.

\*\*Primary Goal:\*\* Serve as a comprehensive College DBMS project demonstrating raw SQL proficiency, relational data modeling, and robust API design, paired with a modern React SPA.

\---

\#\# 2\. 🛠 Tech Stack & Libraries

\#\#\# Frontend  
\* \*\*Core:\*\* React 19, Vite.  
\* \*\*Routing:\*\* \`react-router-dom\` (v7).  
\* \*\*Styling:\*\* CSS Variables (Dark/Light/System theme support), Tailwind CSS v4.  
\* \*\*Network:\*\* \`axios\` (with global interceptors).  
\* \*\*Icons:\*\* Custom inline SVGs (no external icon libraries to minimize bundle size).

\#\#\# Backend  
\* \*\*Core:\*\* Python, FastAPI, Uvicorn.  
\* \*\*Database:\*\* MySQL 8.0+ (Strictly \*\*Raw SQL\*\* via \`mysql-connector-python\`—\*\*NO ORM\*\*).  
\* \*\*Security/Auth:\*\* \`python-jose\` (JWT), \`passlib\`, \`bcrypt\` (Password hashing).  
\* \*\*Environment:\*\* \`python-dotenv\`.

\---

\#\# 3\. 📂 Folder Structure & File Purposes

\#\#\# Frontend (\`/frontend\`)  
\`\`\`text  
src/  
├── api/  
│   └── axios.js                \# Singleton Axios instance. Attaches JWT, intercepts 401s to force logout.  
├── components/  
│   ├── AddEntryModal.jsx       \# Floating FAB modal to add Personal, Income, Lend, Borrow, or redirect to Group forms.  
│   ├── AdminLayout.jsx         \# App shell specific to Admin users.  
│   ├── AppShell.jsx            \# Main app shell (Sidebar \+ Topbar) for regular users.  
│   ├── NotificationBell.jsx    \# Polls /unread-count every 30s. Shows dropdown of notifications.  
│   └── Sidebar.jsx             \# Navigation sidebar component.  
├── context/  
│   └── AuthContext.jsx         \# Global state for Auth. Hydrates from localStorage, validates via /auth/me.  
├── pages/  
│   ├── admin/  
│   │   ├── AdminGroups.jsx     \# Cascade-delete groups.  
│   │   ├── AdminOverview.jsx   \# Global stats dashboard.  
│   │   ├── AdminTransactions.jsx \# Audit log of all group expenses globally.  
│   │   └── AdminUsers.jsx      \# Cascade-delete users.  
│   ├── Activity.jsx            \# Unified chronological feed (timeline) of all user transactions.  
│   ├── AddExpense.jsx          \# Complex form to add group expenses (Equal vs. Custom %/Amount splits).  
│   ├── AddPayment.jsx          \# Form to record peer-to-peer settlements within a group.  
│   ├── Dashboard.jsx           \# Landing page after login. Shows recent groups and quick stats.  
│   ├── Expenses.jsx            \# Personal expenses tracker (isolated from groups).  
│   ├── GroupDetail.jsx         \# Group ledger, balances, and member list.  
│   ├── Groups.jsx              \# Create new groups and list existing ones.  
│   ├── JoinGroup.jsx           \# Handles /join/:token links. Redirects to signup if unauthenticated.  
│   ├── Loans.jsx               \# P2P Borrowing and Lending tracking (outside of groups).  
│   ├── Login.jsx               \# JWT login form.  
│   ├── Profile.jsx             \# Update name, email, UPI ID, and password.  
│   ├── Settings.jsx            \# App appearance (Theme) and version info.  
│   ├── Settlements.jsx         \# Displays optimal "Simplified Debts" graph.  
│   └── Signup.jsx              \# User registration.  
├── App.jsx                     \# Route definitions and UserRoute/AdminRoute wrappers.  
├── index.css                   \# Global CSS, CSS variables for theming, and utility animations.  
└── main.jsx                    \# React strict mode and AuthProvider root.

### **Backend (/backend)**

Plaintext

./  
├── auth.py                     \# JWT encoding/decoding, bcrypt hashing, and Depends() injection.  
├── config.py                   \# Loads .env (DB credentials, JWT secrets).  
├── db.py                       \# The single source of truth for all DB interactions. Raw SQL only.  
├── main.py                     \# FastAPI entry point, CORS config, and router registration.  
├── schema\_v2.sql               \# Complete DB Schema (14 tables) and Stored Procedures.  
├── seedusers.sql               \# Seed data for users and categories.  
└── routers/  
    ├── auth\_router.py          \# /auth (login, signup, me, change-password)  
    ├── borrows.py              \# /borrows (Money borrowed outside groups)  
    ├── expenses.py             \# /expenses (Group expenses and split logic)  
    ├── groups.py               \# /groups (Group CRUD, membership)  
    ├── income.py               \# /income (Personal income tracking)  
    ├── invites.py              \# /invite (Shareable links)  
    ├── loans.py                \# /loans (Money lent outside groups)  
    ├── notifications.py        \# /notifications (Reminders and alerts)  
    ├── payments.py             \# /payments (Settlements within groups)  
    ├── personal\_expenses.py    \# /personal-expenses (Standalone tracking)  
    ├── settlements.py          \# /settlements (Raw balances and debt simplification)  
    ├── timeline.py             \# /timeline (Unified chronological feed)  
    └── users.py                \# /users (Profile updates, Admin user management)

## ---

**4\. 🧩 Component & State Architecture**

### **State Management**

* **No Redux/Zustand:** State is managed locally within pages using useState and useEffect.  
* **Auth State:** Managed via React Context (AuthContext). It stores the user object ({ user\_id, email, role, name }). The JWT token is saved in localStorage under the key "expense\_user".  
* **Data Fetching:** Standard axios calls within useEffect hooks. Loading states (loading, saving) are tracked locally to render spinners or skeleton UI.

### **Component Hierarchy**

Plaintext

\<AuthProvider\>  
  \<BrowserRouter\>  
    \<Routes\>  
      \<AppShell\>  
         \<Sidebar /\>  
         \<Topbar\> \<NotificationBell /\> \<ProfileDropdown /\> \</Topbar\>  
         \<PageContent (Dashboard, Groups, Activity, etc.) /\>  
         \<AddEntryModal /\> \</AppShell\>

      \<AdminLayout\>  
         \<AdminSidebar /\>  
         \<PageContent (AdminOverview, AdminUsers, etc.) /\>  
      \</AdminLayout\>  
    \</Routes\>  
  \</BrowserRouter\>  
\</AuthProvider\>

## ---

**5\. 🔌 API Endpoints Summary**

| Domain | Methods | Key Endpoints | Description |
| :---- | :---- | :---- | :---- |
| **Auth** | POST, GET | /auth/login, /auth/signup, /auth/me, /auth/change-password | JWT issuance, validation, and profile security. |
| **Users** | GET, PUT, DEL | /users/, /users/all, /users/me | Fetch users (dropdowns), Admin fetch all, update profile. |
| **Groups** | GET, POST, PUT, DEL | /groups/, /groups/{id}, /groups/{id}/members | Group CRUD. Admin bypasses membership checks. |
| **Expenses** | GET, POST | /expenses/{group\_id}, /expenses/{group\_id}/{exp\_id}/splits | Create group expense. Accepts split\_type (equal/custom). |
| **Settlements** | GET | /settlements/{group\_id}, /settlements/{group\_id}/simplified | Fetches raw total\_paid/total\_owed and simplified graph. |
| **Payments** | POST | /payments/{group\_id} | Logs a peer-to-peer settlement payment within a group. |
| **Invites** | GET, POST | /groups/{group\_id}/invite, /invite/{token}/join | Generate and consume shareable non-expiring tokens. |
| **Notifs** | GET, POST | /notifications/, /notifications/unread-count, /groups/{group\_id}/remind | Polls unread count. Allows users to "remind" debtors. |
| **Personal** | GET, POST, DEL | /personal-expenses/, /income/ | Isolated personal finance. |
| **Loans/Borrow** | GET, POST | /loans/, /borrows/, /{id}/repay | P2P tracking outside of formal groups. Tracks remaining balances. |
| **Timeline** | GET | /timeline/ | Unified chronological feed from 6 different SQL tables. |

## ---

**6\. 🗄 Database Architecture & Patterns**

* **Paradigm:** Strict Relational mapping. Zero ORM.  
* **Atomicity:** Endpoints that write to multiple tables (e.g., adding an expense \+ writing to Expense\_Splits) wrap cur.execute() calls inside a conn.start\_transaction() and utilize try...except...conn.rollback().  
* **Stored Procedures:** The heavy lifting for settlements is offloaded to the DB. Calculate\_Settlements(input\_group\_id) aggregates Expenses, Expense\_Splits, and Payments to calculate exactly what each user paid, owes, and their net balance.  
* **Cascades:** Deleting a group or a user heavily utilizes ON DELETE CASCADE in the schema to ensure data integrity without orphaned records.

## ---

**7\. 🚀 Current Features (Working)**

1. **Auth Flow:** JWT based authentication, global logout on token expiry, protected routes.  
2. **Group Math:** Calculates exact "Equal" and custom Percentage splits dynamically in the React UI before sending to the backend.  
3. **Debt Simplification:** The /simplified endpoint successfully minimizes the number of transactions required to settle a group.  
4. **Invite System:** Unauthenticated users clicking a /join/{token} link are routed to Signup and seamlessly dropped into the group post-registration via ?next= URL parameters.  
5. **Multi-Tenancy (Admin):** Dedicated admin panel to oversee global transactions and prune users/groups.  
6. **Polling:** Real-time feel via 30s interval polling on NotificationBell.jsx.  
7. **Unified Timeline:** A feed that combines personal expenses, group expenses, loans, and income into one stream.

## **8\. 🚧 Pending / Future Scope**

1. **Actual Payment Gateway:** Currently, payments are just "recorded" as text notes (e.g., "Paid via GPay"). Integrating Stripe or UPI deep-linking for actual fund transfers.  
2. **Push/Email Notifications:** Currently, notifications are purely in-app DB rows. Expanding to WebSockets or SMTP email triggers for invites/reminders.  
3. **Receipt Parsing:** Adding OCR (e.g., Tesseract or a vision model) to upload a grocery receipt and auto-fill the AddExpense.jsx form.  
4. **Pagination:** The /timeline and /notifications endpoints currently limit to 100-200. Cursor-based pagination could be added to the frontend.

---

*End of Context Document.*