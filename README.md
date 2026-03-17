---
title: Internet Quota
emoji: 📚
colorFrom: green
colorTo: purple
sdk: docker
pinned: false
---

# Internet Quota Manager

A robust, full-stack application designed to track and manage internet quotas for **WE (Telecom Egypt)** Landline and Mobile (WE Air/4G) accounts.

This project features a **FastAPI** backend that scrapes provider APIs for real-time usage data, stores history in **MongoDB**, and serves a modern **React + Vite** frontend for monitoring multiple accounts simultaneously. It is explicitly designed and optimized to run on the **Hugging Face Spaces** free tier, bypassing common network restrictions.

## 🚀 Key Features

* **Multi-Account Dashboard**: Track multiple Landline (VDSL/Fiber) and WE Air (4G) lines in one clean interface.
* **Live Auto-Refresh**: The dashboard automatically polls the backend every 5 minutes to ensure your internet data is never stale, complete with a live "last updated" visual indicator.
* **Smart Data Collection & Caching**: A background scheduler securely updates quotas hourly to minimize API spam. Only raw credentials are required.
* **Monthly Statistics Engine**:
  * Automatically aggregates raw hourly logs into monthly usage statistics.
  * Tracks Average Daily Usage, total consumption, and Peak Usage Days.
  * Includes **Smart Dynamic Thresholding**: The system adapts to the calendar, requiring only ~30% of the elapsed month's data to generate statistics, so you get early insights without waiting for month-end.
* **Telegram Bot Integration (Bypass Built-In)**:
  * Full Telegram bot support, routed specifically through a Cloudflare proxy to bypass Hugging Face's strict outgoing DNS blocks on `api.telegram.org` and `*.workers.dev`.
  * Send `/status` to get a full readout of all tracked accounts.
  * Send `/start` to get a quick summary of ONLY the accounts that are running low.
  * Automatic alerts are dispatched every 6 hours for accounts dipping below the 10% threshold.
* **Desktop Notifications**: Instant browser-native notification alerts when quota drops below 10%.

## 🛠️ Tech Stack

### Backend
* **Framework**: FastAPI (Python 3.10)
* **Database**: MongoDB (via `pymongo`)
* **Scheduling**: APScheduler (Background jobs running hourly and daily)
* **Network**: Direct HTTP request patching to bypass HF DNS limitations.

### Frontend
* **Build Tool**: Vite
* **Framework**: React 18
* **Styling**: Tailwind CSS
* **Icons**: Lucide React

## 📋 Prerequisites

* **Docker** (for containerized deployment)
* **MongoDB Atlas** URI or a local MongoDB instance.
* **Telegram Bot Token & Chat ID** (optional, for notifications)
* **Cloudflare Worker URL** (optional, a default proxy is provided for Telegram)

## ⚙️ Installation & Setup

### 1. Environment Variables

Create a `.env` file in the `backend/` directory or add these as Secrets in your deployment environment (like Hugging Face Space Settings):

```env
ADMIN_USERNAME=your_admin_user
ADMIN_PASSWORD=your_admin_password
MONGO_URI=mongodb+srv://...
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
# Optional: TELEGRAM_API_URL=https://your-cloudflare-worker.workers.dev
```

### 2. Running with Docker (Recommended)

The project includes a `Dockerfile` optimized for Hugging Face Spaces (port 7860).

```bash
# Build the image
docker build -t internet-quota-backend .

# Run the container
docker run -p 7860:7860 --env-file backend/.env internet-quota-backend
```

*The UI and API will be available at `http://localhost:7860`.*

### 3. Running Locally (Manual)

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

## 📖 Usage

1. **Login**: Access the frontend UI and log in using the `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
2. **Add Account**:
   * Click the **"Add"** button.
   * Select **Landline** or **WE Air**.
   * Enter the service number (e.g., `024...` for landline or `015...` for mobile).
   * Enter the **My WE** account password (not the router Wi-Fi password).
3. **Monitor Dashboards**: 
   * **Dashboard Tab**: View real-time quota data securely caching in the background. Look out for the red/yellow alerts.
   * **Statistics Tab**: View historical month-over-month usage trends. (Data will appear automatically within a few days of usage tracking, scaling dynamically).

## 🔌 API Documentation

Once the backend is running, full interactive documentation (Swagger UI) is available at:
`http://localhost:7860/docs`

## 🛡️ Security Note

* **Access**: The API and internal endpoints are protected by HTTP Basic Auth. The frontend handles authentication tokens locally.
* **Credentials**: My WE passwords are required to fetch data from the provider. Store your `MONGO_URI` securely.
