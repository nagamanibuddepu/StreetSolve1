# 🚀 StreetSolve

> AI-powered civic issue reporting platform enabling citizens to report local problems through **voice, text, or images** with intelligent routing to the appropriate government departments.

![React](https://img.shields.io/badge/React-19-blue)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-success)
![Socket.IO](https://img.shields.io/badge/Socket.IO-RealTime-black)
![License](https://img.shields.io/badge/License-MIT-orange)

---

## 🌐 Live Demo

### Frontend
https://street-solve1-frontend.vercel.app

### Backend API
https://streetsolve-backend.onrender.com

---

# 📖 Overview

StreetSolve is an AI-powered civic engagement platform that bridges the gap between citizens and government authorities.

Citizens can report potholes, garbage dumps, broken streetlights, drainage issues, water leaks, and more using:

- 🎙 Voice (Regional Languages)
- 📝 Text
- 📷 Images

The platform automatically:

- Classifies the issue using AI
- Detects location
- Routes it to the correct government department
- Enables real-time status tracking
- Sends notifications
- Allows community voting & validation

---

# ✨ Features

## 👨 Citizens

- Register & Login
- Google Authentication
- Report issues with:
  - Voice
  - Images
  - Text
- GPS location support
- View nearby issues
- Vote on issues
- Comment on issues
- Track issue progress
- Notifications

---

## 🏛 Government

- Department dashboard
- Assigned issues
- Status updates
- Analytics
- Performance metrics

---

## 🤝 NGO / Volunteers

- Accept available issues
- Upload progress images
- Complete assigned work
- Community collaboration

---

## 🤖 AI Features

- Voice-to-text
- AI issue classification
- Language translation
- Issue summarization
- Smart department routing

---

# 🛠 Tech Stack

## Frontend

- React
- Vite
- TailwindCSS
- Zustand
- Axios
- React Router
- React Leaflet
- Socket.IO Client

---

## Backend

- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- JWT Authentication
- Socket.IO
- Multer
- Cloudinary
- Nodemailer
- Twilio

---

## AI & APIs

- Google Gemini API
- Google Maps API
- Cloudinary
- MongoDB Atlas

---

# 📂 Project Structure

```
StreetSolve1
│
├── frontend
│   ├── src
│   ├── public
│   └── package.json
│
├── backend
│   ├── src
│   ├── package.json
│   └── .env
│
└── README.md
```

---

# ⚙ Installation

## 1. Clone Repository

```bash
git clone https://github.com/nagamanibuddepu/StreetSolve1.git

cd StreetSolve1
```

---

## 2. Backend Setup

```bash
cd backend

npm install
```

Create a `.env` file inside the backend folder.

Example:

```env
PORT=5000

NODE_ENV=development

CLIENT_URL=http://localhost:5173

MONGODB_URI=your_mongodb_uri

JWT_SECRET=your_secret

GOOGLE_MAPS_API_KEY=your_key

GOOGLE_CLIENT_ID=your_key

GOOGLE_CLIENT_SECRET=your_secret

OPENAI_API_KEY=your_key

CLOUDINARY_CLOUD_NAME=your_cloud

CLOUDINARY_API_KEY=your_key

CLOUDINARY_API_SECRET=your_secret

SMTP_HOST=...

SMTP_PORT=...

SMTP_EMAIL=...

SMTP_PASSWORD=...

TWILIO_ACCOUNT_SID=...

TWILIO_AUTH_TOKEN=...

TWILIO_PHONE_NUMBER=...
```

Seed the database

```bash
npm run seed
```

Start backend

```bash
npm run dev
```

---

## 3. Frontend Setup

```bash
cd ../frontend

npm install
```

Create

```
frontend/.env
```

```env
VITE_API_URL=http://localhost:5000/api
```

Run frontend

```bash
npm run dev
```

Open

```
http://localhost:5173
```

---

# 🚀 Deployment

## Frontend

Hosted on **Vercel**

```
https://street-solve1-frontend.vercel.app
```

Environment Variable

```
VITE_API_URL=https://streetsolve-backend.onrender.com/api
```

---

## Backend

Hosted on **Render**

```
https://streetsolve-backend.onrender.com
```

Required Environment Variables

```
NODE_ENV=production

CLIENT_URL=https://street-solve1-frontend.vercel.app

MONGODB_URI=...

JWT_SECRET=...

GOOGLE_MAPS_API_KEY=...

GOOGLE_CLIENT_ID=...

GOOGLE_CLIENT_SECRET=...

OPENAI_API_KEY=...

CLOUDINARY_...

SMTP_...

TWILIO_...
```

---

# 👥 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Citizen | priya@example.com | Test@1234 |
| NGO | ngo@greenearth.org | Test@1234 |
| Admin | admin@streetsolve.in | Admin@123 |

---

# 📊 Major Features

- ✅ AI Voice Reporting
- ✅ Regional Language Support
- ✅ Google Authentication
- ✅ Live Notifications
- ✅ Real-time Updates (Socket.IO)
- ✅ GPS Based Reporting
- ✅ Image Uploads
- ✅ Community Voting
- ✅ Analytics Dashboard
- ✅ Government Workflow
- ✅ NGO Collaboration
- ✅ Cloud Image Storage
- ✅ Secure JWT Authentication

---

# 📌 Future Improvements

- Mobile Application
- Push Notifications
- AI Severity Prediction
- Duplicate Issue Detection
- OCR from Uploaded Images
- Offline Reporting
- Government SLA Tracking
- Advanced Analytics Dashboard

---

# 👩‍💻 Author

**Nagamani Buddepu**

GitHub

https://github.com/nagamanibuddepu

Project Repository

https://github.com/nagamanibuddepu/StreetSolve1

---

# ⭐ Support

If you found this project useful,

⭐ Star the repository

🍴 Fork the project

🤝 Contributions are welcome!