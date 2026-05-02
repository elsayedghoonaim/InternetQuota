# 🌐 Internet Quota Manager

A full-stack application to track and manage internet quota usage across multiple accounts. Built with a **FastAPI** backend, **MongoDB** for history storage, and a **React + Vite** frontend for real-time monitoring.

> Designed to run on [Hugging Face Spaces](https://huggingface.co/spaces) (free tier) with Docker, but works on any server.

---

## 🚀 Features

- **Multi-Account Dashboard** — Track multiple Landline (VDSL/Fiber) and Mobile (4G/Air) lines in one interface.
- **Live Auto-Refresh** — Dashboard polls the backend every 5 minutes with a live "last updated" indicator.
- **Background Scheduler** — Hourly background jobs silently refresh all accounts without manual intervention.
- **Monthly Statistics Engine**:
  - Aggregates raw hourly logs into monthly usage reports.
  - Tracks Average Daily Usage, Total Consumption, and Peak Usage Days.
  - Smart Dynamic Thresholding: generates early insights using ~30% of elapsed month data.
- **Telegram Bot Integration**:
  - Send `/status` — full readout of all tracked accounts.
  - Send `/start` — summary of accounts running low on quota.
  - Automatic alerts every 6 hours for accounts below the 10% threshold.
- **Desktop Notifications** — Browser-native alerts when quota drops below 10%.

---

## 🛠️ Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Backend   | FastAPI (Python 3.10), APScheduler, pymongo     |
| Database  | MongoDB (Atlas or local)                        |
| Frontend  | React 18, Vite, Tailwind CSS, Lucide React      |
| Deployment| Docker, Hugging Face Spaces (port 7860)         |

---

## 📋 Prerequisites

- **Docker** (recommended for deployment)
- **MongoDB Atlas** URI or a local MongoDB instance
- **Telegram Bot Token & Chat ID** *(optional, for notifications)*
- **Cloudflare Worker URL** *(optional, for Telegram proxy — required on Hugging Face Spaces)*

---

## ⚙️ Setup

### 1. Environment Variables

Create a `.env` file in the `backend/` directory:

```env
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_admin_password
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/
MONGO_DB_NAME=internet_quota_db
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
TELEGRAM_API_URL=https://your-cloudflare-worker.workers.dev   # Required on HF Spaces
```

> ⚠️ Never commit your `.env` file. It is already listed in `.gitignore`.

---

### 2. Run with Docker *(Recommended)*

```bash
# Build the image
docker build -t internet-quota .

# Run the container
docker run -p 7860:7860 --env-file backend/.env internet-quota
```

The app will be available at `http://localhost:7860`.

---

### 3. Run Locally *(Manual)*

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 7860
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 📖 Usage

1. **Login** — Open the UI and sign in with your `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
2. **Add an Account**:
   - Click **"Add"**.
   - Select the account type: **Landline** or **Mobile**.
   - Enter the service number and account password from your ISP portal.
3. **Dashboard Tab** — View live quota data. Red/yellow indicators highlight low-quota accounts.
4. **Statistics Tab** — View month-over-month usage trends. Data appears automatically within a few days of tracking.

---

## 🔌 API Docs

Interactive Swagger UI is available at:

```
http://localhost:7860/docs
```

---

## 🛡️ Security

- All API routes are protected with **HTTP Basic Auth**.
- Credentials (`MONGO_URI`, `ADMIN_PASSWORD`, `TELEGRAM_BOT_TOKEN`) are loaded from environment variables — never hardcoded.
- Account passwords are stored in MongoDB and only used to fetch live data from the ISP portal.

---

## 📁 Project Structure

```
.
├── backend/
│   ├── main.py              # FastAPI app & routes
│   ├── database.py          # MongoDB connection
│   ├── models.py            # Pydantic models
│   ├── requirements.txt
│   └── services/
│       ├── scheduler.py     # APScheduler jobs
│       ├── landline.py      # Landline quota fetcher
│       ├── mobile.py        # Mobile quota fetcher
│       ├── statistics.py    # Monthly stats pipeline
│       ├── notifications.py # Telegram alerts
│       └── telegram_bot.py  # Bot command handlers
├── frontend/
│   ├── src/
│   └── ...
├── Dockerfile
└── README.md
```

---

## 📄 License

MIT License — free to use, modify, and deploy.
```
