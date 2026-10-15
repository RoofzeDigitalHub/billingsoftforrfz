# Roofze Invoice & Billing System (BillingSoft)

A full-stack Invoice, Proposal, and Expense Management solution tailored for **Roofze Digital Hub**. Built with a **React + Vite + Tailwind CSS** frontend and a **Node.js + Express + MySQL** backend.

---

## 📑 Table of Contents
1. [Project Overview](#-project-overview)
2. [Project Architecture](#-project-architecture)
3. [Prerequisites](#-prerequisites)
4. [Local Development Setup](#-local-development-setup)
   - [1. Backend Setup](#1-backend-setup)
   - [2. Frontend Setup](#2-frontend-setup)
5. [Plesk Production Deployment Guide](#-plesk-production-deployment-guide)
   - [Backend Deployment (Plesk Node.js)](#backend-deployment-plesk-nodejs)
   - [Frontend Deployment (Plesk Static / SPA)](#frontend-deployment-plesk-static--spa)
   - [Crucial Plesk & IIS Configuration (WebDAV & Verb Fix)](#crucial-plesk--iis-configuration-webdav--verb-fix)
6. [Database Migrations & Structure](#-database-migrations--structure)
7. [Environment Variables Reference](#-environment-variables-reference)
8. [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## 🚀 Project Overview

- **Sequential & Compliant Invoicing**: Auto-generates sequential financial year numbers (e.g., `RFZ/2627/0001` for GST starting from `1`, `RFZ/2627/1001` for Non-GST starting from `1001`). Unpaid invoices hold safe temporary IDs (`TMP-XXXXXX`).
- **Payment Verification**: Captures payment mode, transaction reference ID, payment date, amount, and receipt/screenshot uploads.
- **Auto-Sync to Accounting**: Marking an invoice as paid automatically creates a matching credit entry in the Income/Expense ledger.
- **Client & Proposal Master**: Manages milestone/direct proposals, email dispatch via SMTP, and client master records with dynamic GST state mapping.

---

## 🏗 Project Architecture

```
billingsoftforrfz/
├── invoice-backend/          # Node.js + Express REST API
│   ├── config/               # MySQL connection pool
│   ├── controllers/          # Business logic (invoices, proposals, expenses, auth)
│   ├── routes/               # Express endpoints with dual POST/PATCH/PUT support
│   ├── scripts/              # Migration scripts (tables, schemas, seed data)
│   ├── uploads/payments/     # Payment screenshot storage
│   ├── utils/                # Calculations, email service, schema reflection
│   ├── server.js             # Main server entry point
│   ├── web.config            # IIS configuration (removes WebDAV for PUT/PATCH/DELETE)
│   └── package.json
│
├── invoice-frontend/         # React (Vite) Single Page Application
│   ├── src/
│   │   ├── api/              # HTTP clients for backend endpoints
│   │   ├── components/       # UI components (modals, tables, layout, navigation)
│   │   ├── pages/            # Views (Dashboard, Invoices, Proposals, Expenses)
│   │   └── utils/            # Calculations, formatting, PWA utilities
│   ├── dist/                 # Production production build output
│   └── vite.config.js
└── README.md
```

---

## ⚙️ Prerequisites

- **Node.js**: `v18.x` or `v20.x` LTS
- **npm**: `v9.x` or higher
- **MySQL**: `v8.0+` or MariaDB `v10.4+` (InnoDB engine required)
- **Git**

---

## 💻 Local Development Setup

### 1. Backend Setup

1. Open your terminal and navigate to the backend folder:
   ```bash
   cd invoice-backend
   npm install
   ```

2. Create your local environment file:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your MySQL and SMTP credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=roofzeco_billing
   PORT=5000

   # SMTP Configuration (Optional for local test)
   SMTP_HOST=roofze.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=jay@roofze.com
   SMTP_PASS="your_smtp_password"
   SMTP_FROM="Roofze Digital Hub <jay@roofze.com>"

   # Authentication Secret
   JWT_SECRET=rfz_billing_super_secret_jwt_key_2026_secured
   ```

4. Run database migrations to ensure all tables exist:
   ```bash
   npm run migrate
   npm run migrate:proposals
   ```
   *(Note: Expenses and Admin Auth tables automatically self-initialize on server boot).*

5. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend will start at `http://localhost:5000`. Test it by opening:
   `http://localhost:5000/api/health` -> should return `{"success": true, "db": "connected"}`.

---

### 2. Frontend Setup

1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd invoice-frontend
   npm install
   ```

2. Configure the frontend API target by editing or creating `.env`:
   ```env
   # For local backend testing:
   VITE_API_BASE_URL=http://localhost:5000/api

   # For connecting to live production API:
   # VITE_API_BASE_URL=https://trackinvoiceapi.roofze.com/api
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 🌐 Plesk Production Deployment Guide

Roofze Digital Hub is hosted on Plesk (Windows Server with IIS). Follow these exact steps for zero-downtime deployment:

### Backend Deployment (Plesk Node.js)

Domain example: `trackinvoiceapi.roofze.com`

1. **Log in to Plesk** and open your backend domain or subdomain.
2. In Plesk, click **Node.js**:
   - **Node.js Version**: Select `18.x` or `20.x`.
   - **Application Mode**: `production`
   - **Application Root**: `/httpdocs` (or your subdomain directory)
   - **Document Root**: `/httpdocs/public` or `/httpdocs`
   - **Application Startup File**: `server.js`
3. **Deploy Backend Files**:
   - Upload the files from `invoice-backend/` to `/httpdocs/`:
     - `server.js`
     - `package.json` & `package-lock.json`
     - `web.config` *(Crucial for IIS!)*
     - `config/`, `controllers/`, `routes/`, `scripts/`, `utils/`
     - `uploads/`
     - `.env` *(with production DB host `173.214.163.122`, user, password, DB name, etc.)*
4. **Install Dependencies in Plesk**:
   - In Plesk Node.js interface, click **NPM Install**.
5. **Ensure Folder Permissions for Uploads**:
   - Go to Plesk **File Manager** -> navigate to `uploads/payments`.
   - Ensure the IIS application pool user (`IUSR` / `IWPD_...`) has **Write** permissions so screenshots can be saved.
6. **Restart Application**:
   - Click **Restart** in the Node.js settings screen.
   - Verify health: `https://trackinvoiceapi.roofze.com/api/health` -> returns `{"success":true,"db":"connected"}`.

---

### Frontend Deployment (Plesk Static / SPA)

Domain example: `trackinvoice.roofze.com`

1. **Build the production bundle locally**:
   ```bash
   cd invoice-frontend
   ```
   Ensure `.env` points to the production API:
   ```env
   VITE_API_BASE_URL=https://trackinvoiceapi.roofze.com/api
   ```
   Run the build:
   ```bash
   npm run build
   ```
   This generates the optimized static files inside `invoice-frontend/dist/`.

2. **Upload to Plesk**:
   - Go to Plesk **File Manager** for your frontend domain (`trackinvoice.roofze.com`).
   - Open the document root (usually `httpdocs/`).
   - Upload all files from inside `invoice-frontend/dist/` (including `index.html`, `assets/`, `favicon.ico`, etc.) directly into `httpdocs/`.

3. **Configure SPA Client-Side Routing**:
   Because React Router uses HTML5 history mode (`/dashboard/invoices`, etc.), IIS needs to route non-file requests back to `index.html`.
   Create or verify `web.config` in the frontend `httpdocs/`:
   ```xml
   <?xml version="1.0" encoding="utf-8"?>
   <configuration>
     <system.webServer>
       <rewrite>
         <rules>
           <rule name="React SPA Routing" stopProcessing="true">
             <match url=".*" />
             <conditions logicalGrouping="MatchAll">
               <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
               <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
             </conditions>
             <action type="Rewrite" url="/index.html" />
           </rule>
         </rules>
       </rewrite>
     </system.webServer>
   </configuration>
   ```

---

### Crucial Plesk & IIS Configuration (WebDAV & Verb Fix)

> [!IMPORTANT]
> **Why this matters**: On Windows Server / Plesk with IIS, the default **WebDAV Publishing** module intercepts and blocks HTTP verbs like `PATCH`, `PUT`, and `DELETE` with `HTTP 403 Forbidden` without returning CORS headers, causing browsers to fail with `TypeError: Failed to fetch`.

To resolve this completely:

1. **`web.config` in `invoice-backend/`**:
   The repository includes a [web.config](file:///c:/prjs/billingsoftforrfz/billingsoftforrfz/invoice-backend/web.config) that disables the WebDAV module and whitelist-allows all HTTP methods:
   ```xml
   <?xml version="1.0" encoding="utf-8"?>
   <configuration>
     <system.webServer>
       <modules runAllManagedModulesForAllRequests="true">
         <remove name="WebDAVModule" />
       </modules>
       <handlers>
         <remove name="WebDAV" />
       </handlers>
       <security>
         <requestFiltering>
           <verbs applyToWebDAV="false">
             <add verb="GET" allowed="true" />
             <add verb="POST" allowed="true" />
             <add verb="PUT" allowed="true" />
             <add verb="PATCH" allowed="true" />
             <add verb="DELETE" allowed="true" />
             <add verb="OPTIONS" allowed="true" />
           </verbs>
         </requestFiltering>
       </security>
     </system.webServer>
   </configuration>
   ```
2. **Dual-Route Architecture**:
   The backend routes ([invoiceRoutes.js](file:///c:/prjs/billingsoftforrfz/billingsoftforrfz/invoice-backend/routes/invoiceRoutes.js), [expenseRoutes.js](file:///c:/prjs/billingsoftforrfz/billingsoftforrfz/invoice-backend/routes/expenseRoutes.js), etc.) explicitly support both `POST` and `PATCH`/`PUT` (e.g. `POST /api/invoices/:id/status`). The frontend will always use `POST` first, ensuring it functions seamlessly on any hosting environment.

---

## 🗄 Database Migrations & Structure

Database scripts are located in `invoice-backend/scripts/`:

- `npm run migrate`: Creates core invoice tables (`invoices`, `invoice_items`, `invoice_item_milestones`, `invoice_sequences`). Uses dynamic foreign keys linked to your workbench tables (`billing_location`, `clients`).
- `npm run migrate:proposals`: Creates proposal and terms template tables.
- Automatic bootstrap: On every server start, `server.js` calls `ensureAdminAuthTables()` and `ensureExpenseTables()`, creating expense categories, types, and admin user tables if they don't already exist.

---

## 🔑 Environment Variables Reference

### Backend (`invoice-backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `DB_HOST` | MySQL database host/IP | `localhost` or `173.214.163.122` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL username | `rfz_bill` |
| `DB_PASSWORD` | MySQL password | `******` |
| `DB_NAME` | Database schema name | `roofzeco_billing` |
| `PORT` | Node server listen port | `5000` |
| `SMTP_HOST` | Mail server hostname | `roofze.com` |
| `SMTP_PORT` | Mail server port | `587` |
| `SMTP_SECURE`| Use SSL/TLS directly | `false` |
| `SMTP_USER` | Mail sender username | `jay@roofze.com` |
| `SMTP_PASS` | Mail sender password | `******` |
| `SMTP_FROM` | Default sender header | `"Roofze Digital Hub <jay@roofze.com>"` |
| `JWT_SECRET` | Secret token signing key | `rfz_billing_super_secret_jwt_key_2026_secured` |

### Frontend (`invoice-frontend/.env`)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL for REST API calls | `http://localhost:5000/api` (Local) / `https://trackinvoiceapi.roofze.com/api` (Prod) |

---

## ❓ Troubleshooting & FAQs

### Q: "Failed to fetch" when marking an invoice as paid?
- **Cause**: The web server / IIS blocked `PATCH` requests with `403 Forbidden`.
- **Solution**: Ensure your deployed backend contains the updated `invoiceRoutes.js` and `web.config`. The frontend now automatically uses `POST /api/invoices/:id/status`.

### Q: Uploaded payment screenshots return 404?
- Ensure the `uploads/payments/` directory exists inside the backend directory on Plesk and that permissions are set to allow write access. The backend serves uploads statically via `/uploads`.

### Q: Navigating directly to `/dashboard/invoices` on production gives 404?
- Ensure the SPA rewrite rule `web.config` is present in the frontend root directory (`httpdocs/`).

---

© 2026 **Roofze Digital Hub**. All rights reserved.