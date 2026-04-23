# SoulSync – Social Discovery Platform

[![GitHub stars](https://img.shields.io/github/stars/aungminthant9/SoulSync-Social-Discovery-Platform?style=flat-square)](https://github.com/aungminthant9/SoulSync-Social-Discovery-Platform/stargazers)
[![License](https://img.shields.io/github/license/aungminthant9/SoulSync-Social-Discovery-Platform?style=flat-square)](LICENSE)

## 📖 Overview
SoulSync is a **premium, modern web platform** that helps users discover meaningful connections through an elegant, data‑driven UI.  It combines a **Next.js** powered client with a **Node.js / Supabase** backend, offering real‑time chat, AI‑enhanced matchmaking, and an interactive drawing canvas.

> **Live demo:** _coming soon – stay tuned!_

## ✨ Key Features
- **Dynamic matchmaking** with AI‑powered "Vibe Check" compatibility scoring.
- **Real‑time chat** powered by Supabase listeners.
- **SoulCanvas** – an interactive drawing board that receives AI feedback and scoring.
- **Earn‑credits system** – watch short ads to earn platform credits.
- **Premium UI/UX** that follows a cohesive design system (dark/light mode, glass‑morphism, micro‑animations).
- **Responsive mobile‑first layout** – works beautifully on any device.

## 🛠️ Tech Stack
| Layer | Technology |
|-------|------------|
| **Client** | Next.js 14, TypeScript, React, Tailwind CSS, UI‑UX‑Pro‑Max design system |
| **Backend** | Node.js, Express, Supabase (PostgreSQL), Gemini AI API |
| **Styling** | Vanilla CSS with modern design tokens, Google Fonts (Inter) |
| **Deployment** | Vercel (frontend) + Supabase (backend) |

## 🚀 Getting Started
### Prerequisites
- **Node.js** ≥ 20.x
- **Git**
- **Supabase** account (for the database and auth services)

### Clone the repository
```bash
git clone https://github.com/aungminthant9/SoulSync-Social-Discovery-Platform.git
cd "SoulSync-Social-Discovery-Platform"
```

### Install dependencies
```bash
# Install client dependencies
cd client
npm ci
```

### Configure environment variables
Create a `.env.local` file in the `client` folder and add the following (replace placeholder values):
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

### Run the development server
```bash
npm run dev
```
Visit `http://localhost:3000` in your browser.

## 📂 Repository Structure
```
SoulSync-Social-Discovery-Platform/
├─ client/                 # Next.js front‑end
│   ├─ src/                # React components, pages, contexts
│   ├─ public/             # Static assets (icons, SVGs)
│   └─ ...
├─ server/                 # Backend (Supabase functions, SQL schema)
│   └─ config/schema.sql   # Database schema
├─ .gitignore
├─ README.md               # **You are here**
└─ LICENSE
```

## 🤝 Contributing
Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feat/awesome-feature`).
3. Commit your changes with clear messages.
4. Open a Pull Request describing the changes.
---
*Built with love, design, and AI.*
