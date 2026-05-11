# ☕ Diesel Café — QR Self-Ordering System

A full-stack production-ready café ordering system. Customers scan a QR code at their table and order directly from their phone. Admins manage orders and menu in real-time.

---

## 🗂️ Project Structure

```
diesel-cafe/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── Admin.js
│   │   │   ├── Menu.js
│   │   │   └── Order.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── menu.js
│   │   │   └── orders.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── seed/
│   │   │   └── seedData.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── axios.js
    │   ├── components/
    │   │   ├── Cart.jsx
    │   │   ├── MenuCard.jsx
    │   │   ├── Navbar.jsx
    │   │   └── OrderModal.jsx
    │   ├── context/
    │   │   └── CartContext.jsx
    │   ├── pages/
    │   │   ├── AdminDashboard.jsx
    │   │   ├── AdminLogin.jsx
    │   │   └── CustomerMenu.jsx
    │   ├── App.jsx
    │   ├── index.css
    │   └── main.jsx
    ├── index.html
    ├── .env.example
    ├── tailwind.config.js
    ├── vite.config.js
    └── package.json
```

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)

---

### 1. Backend Setup

```bash
cd diesel-cafe/backend

# Install dependencies
npm install

# Copy env file
cp .env.example .env

# Edit .env with your values:
# MONGODB_URI=mongodb://localhost:27017/diesel-cafe
# JWT_SECRET=your_super_secret_key_here
# ADMIN_EMAIL=admin@dieselcafe.com
# ADMIN_PASSWORD=Admin@123
# FRONTEND_URL=http://localhost:5173

# Start dev server (with auto-reload)
npm run dev

# Or production start
npm start
```

Backend runs on: `http://localhost:5000`

**Auto-seeding:** On first run, the database is seeded with:
- 1 admin account (credentials from `.env`)
- 31 menu items across all categories

---

### 2. Frontend Setup

```bash
cd diesel-cafe/frontend

# Install dependencies
npm install

# Copy env file
cp .env.example .env

# Edit .env:
# VITE_API_URL=http://localhost:5000/api

# Start dev server
npm run dev
```

Frontend runs on: `http://localhost:5173`

---

## 🔗 Key URLs

| URL | Description |
|-----|-------------|
| `http://localhost:5173/` | Customer menu |
| `http://localhost:5173/?table=Table%201` | Customer menu with QR table pre-filled |
| `http://localhost:5173/admin/login` | Admin login |
| `http://localhost:5173/admin/dashboard` | Admin dashboard |

---

## 📱 QR Code Setup

Generate QR codes with these URLs for each table:

```
Table 1: https://yourdomain.com/?table=Table%201
Table 2: https://yourdomain.com/?table=Table%202
...
```

Use any free QR generator (e.g., https://qr-code-generator.com) to create printable QR codes.

---

## 🔑 Admin Login (Default)

```
Email:    admin@dieselcafe.com
Password: Admin@123
```

Change these in `.env` before deploying!

---

## 🌐 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/login` | No | Admin login |
| `GET` | `/api/auth/me` | JWT | Get admin info |
| `GET` | `/api/menu` | No | Get all menu items |
| `POST` | `/api/menu` | JWT | Add menu item |
| `PUT` | `/api/menu/:id` | JWT | Update menu item |
| `DELETE` | `/api/menu/:id` | JWT | Delete menu item |
| `POST` | `/api/orders` | No | Place order |
| `GET` | `/api/orders` | JWT | Get all orders |
| `GET` | `/api/orders/track/:id` | No | Track order status |
| `GET` | `/api/orders/daily-stats` | JWT | Today's sales stats |
| `PUT` | `/api/orders/:id` | JWT | Update order status |

---

## ☁️ Deployment

### Backend → Render (Free tier)

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo, select the `backend` folder
4. Set:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add Environment Variables:
   ```
   MONGODB_URI=mongodb+srv://...  (use MongoDB Atlas)
   JWT_SECRET=your_very_secret_key
   ADMIN_EMAIL=admin@dieselcafe.com
   ADMIN_PASSWORD=YourSecurePass123
   FRONTEND_URL=https://your-frontend-domain.com
   PORT=5000
   ```
6. Deploy!

### Frontend → Hostinger / Netlify / Vercel

**Option A — Vercel (easiest):**
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project
3. Select `frontend` folder as root
4. Add env variable: `VITE_API_URL=https://your-render-backend.onrender.com/api`
5. Deploy!

**Option B — Hostinger:**
1. Build the frontend:
   ```bash
   cd frontend
   VITE_API_URL=https://your-backend-url.com/api npm run build
   ```
2. Upload the `dist/` folder to your Hostinger public_html via File Manager or FTP
3. Create `.htaccess` file in public_html:
   ```apache
   Options -MultiViews
   RewriteEngine On
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteRule ^ index.html [QSA,L]
   ```

### MongoDB Atlas (Free)

1. Go to [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create free cluster
3. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/diesel-cafe`
4. Add to Render env as `MONGODB_URI`

---

## 🔒 Security Features

- JWT authentication (24h expiry)
- bcrypt password hashing (12 rounds)
- Rate limiting (100 req/min per IP)
- Helmet.js HTTP security headers
- CORS restricted to frontend domain
- Input validation on all endpoints

---

## 🎨 Tech Stack

**Frontend:** React 18, Vite, Tailwind CSS, React Router v6, Axios, react-hot-toast

**Backend:** Node.js, Express.js, Mongoose, JWT, bcryptjs, Helmet, express-rate-limit

**Database:** MongoDB

---

## 📞 Support

For issues, check the browser console and server logs. Common issues:

- **CORS error**: Make sure `FRONTEND_URL` in backend `.env` matches your frontend URL exactly
- **401 errors**: Token expired — log out and log back in
- **MongoDB connection failed**: Check `MONGODB_URI` and whitelist your IP in Atlas
