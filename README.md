# SoulSync

SoulSync is an AI-enhanced social discovery web app built to help people find, match with, and interact with others through profiles, shared interests, real-time chat, creative collaboration, and safety-focused moderation.

The app is designed for meaningful connection rather than passive scrolling. Users create a profile, discover nearby or interest-compatible people, send match requests, chat after matching, run AI compatibility checks, send virtual gifts, join local community rooms, and use playful AI-powered tools to start better conversations.

## Purpose

SoulSync is a final-year project that demonstrates a full-stack social discovery platform with:

- User authentication and profile management
- Discovery, matching, and private messaging
- Real-time communication with Socket.IO
- AI-assisted compatibility, creative writing, moderation, and drawing prompts
- A credit and points economy
- Admin tools for safety, reports, user actions, and platform analytics

In short, it is a dating/social connection platform with social discovery, AI guidance, gamified engagement, and moderation features.

## Features

### Authentication and Accounts

- Register and log in with email and password
- 18+ age validation during registration
- JWT-based API authentication
- Forgot password and reset password flow using Supabase Auth links
- Account deletion with cleanup of user data and avatar storage
- Admin-only authentication based on the `is_admin` user flag

### Profiles

- Editable user profile with name, bio, city, country, interests, and avatar
- Profile privacy toggle through blurred profiles
- Public profile pages for viewing other users
- Avatar upload to Supabase Storage
- Photo gallery upload, listing, and deletion with a 7-photo limit
- Photo privacy behavior for blurred profiles

### Discovery

- Browse users through the Discover page
- Search and filter by name, age, city, and country
- Sort by points, newest users, or random ordering
- Automatically excludes yourself, existing matches, and blocked users
- Profile cards with quick match-request actions

### Matching

- Send match requests
- View incoming and outgoing requests
- Accept, reject, or cancel requests
- Auto-match when both users show interest
- View active matches
- Unmatch existing connections

### Real-Time Chat

- One-to-one chat for matched users
- Socket.IO-powered real-time messages
- Message history loading
- Typing indicators
- Message reactions
- Message deletion
- Unread message counts and read status
- Gift messages inside chat
- AI moderation before storing/sending unsafe messages

### Soul Canvas

- Shared real-time drawing canvas for matched users
- Canvas invites, acceptance, decline, timeout, and session state
- Live drawing stroke sync
- Clear canvas and end-session events
- AI-generated drawing prompts
- AI scoring and feedback for submitted canvas drawings

### AI Features

- AI Vibe Check with compatibility score, vibe type, dimensions, insights, and conversation starter
- AI Writer for pickup lines, poems, and love letters
- AI-generated Soul Canvas prompts
- AI-powered canvas scoring from image input
- AI-assisted report review
- AI message moderation for chat and room messages

The current AI implementation uses the Groq SDK and Llama-family models in the server routes.

### Credits, Gifts, and Leaderboard

- Users start with credits
- Watch ads to earn credits, limited per day
- Spend credits on AI tools and virtual gifts
- Send stickers/gifts to matches
- Gift receivers earn points
- Leaderboard ranks users by points
- Admin economy dashboard tracks credit and gift activity

### Community Chat Rooms

- Location-based public chat rooms
- Room purposes such as Study, Coffee, Workout, Gaming, Hiking, Book Club, Language Exchange, and Hangout
- Create one active room per owner
- Enforces unique room names and purposes per location
- Join, leave, delete, and inspect room membership
- Room owners can kick members
- Real-time room messages and typing indicators

### Safety and Moderation

- Block and unblock users
- Block status checks on profile pages
- Reports with AI verdicts and explanations
- Admin report review
- Admin actions: warn, suspend, unsuspend, ban, and unban
- Notifications for moderation actions
- Suspended-user banner in the frontend
- Banned users are blocked from logging in

### Admin Dashboard

- Admin overview with platform stats
- Reports management
- User search and moderation actions
- Economy dashboard with gifts, credits, and points data
- Protected admin layout and admin login page

### UI and Experience

- Next.js App Router frontend
- Responsive layout
- Light and dark theme support
- Shared design system in `globals.css`
- Animated UI with Framer Motion
- Lucide icon system
- Navbar with auth-aware navigation, notifications, request counts, and unread counts

## Tech Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- Lucide React
- Socket.IO Client
- Supabase JavaScript client
- country-state-city

### Backend

- Node.js
- Express 5
- Socket.IO
- Supabase JavaScript client
- Supabase PostgreSQL database
- Supabase Storage
- JSON Web Tokens
- bcryptjs
- multer
- Groq SDK
- CORS and dotenv

### Testing

- Jest
- Supertest
- Unit tests for auth, economy, and matching helpers
- Integration tests for auth, users, matches, and economy routes
- Supabase mock utilities for tests

## Project Structure

```text
.
+-- client
|   +-- src
|   |   +-- app              # Next.js pages and layouts
|   |   +-- components       # Reusable UI and feature components
|   |   +-- context          # Auth and theme providers
|   |   +-- lib              # API, Supabase, and sound helpers
|   +-- package.json
|   +-- README.md
+-- server
|   +-- config               # Supabase client, schema, and migrations
|   +-- lib                  # Shared backend helpers
|   +-- middleware           # Auth and admin auth middleware
|   +-- routes               # REST API route modules
|   +-- socket               # Socket.IO chat/canvas/room handlers
|   +-- tests                # Unit and integration tests
|   +-- index.js
|   +-- package.json
+-- README.md
```

## Main Pages

- `/` - Landing page for SoulSync
- `/register` - Create an account
- `/login` - Sign in
- `/forgot-password` - Request a password reset
- `/reset-password` - Set a new password
- `/discover` - Discover users
- `/users/[id]` - View a public profile
- `/matches` - Manage requests and active matches
- `/chat` - Conversation list and room list
- `/chat/[matchId]` - One-to-one chat
- `/chat/[matchId]/canvas` - Soul Canvas
- `/rooms/[roomId]` - Community room chat
- `/profile` - Edit profile, avatar, photos, privacy, blocks, and account deletion
- `/leaderboard` - Points leaderboard
- `/earn-credits` - Earn credits through ad views
- `/ai-writer` - Generate romantic writing
- `/admin` - Admin overview
- `/admin/users` - User moderation
- `/admin/reports` - Report review
- `/admin/economy` - Economy dashboard

## API Overview

The Express server exposes these route groups:

- `/api/auth` - register, login, forgot password, reset password
- `/api/users` - own profile, public profiles, avatar upload, account deletion
- `/api/discover` - user discovery and filtering
- `/api/matches` - requests, responses, matches, unmatching
- `/api/messages` - conversations, unread counts, read status, message history
- `/api/photos` - photo upload, listing, and deletion
- `/api/economy` - balance, stickers, gifts, leaderboard
- `/api/ads` - ad-watch credit rewards
- `/api/vibe-check` - AI compatibility checks
- `/api/ai-writer` - AI romantic writing
- `/api/ai` - canvas prompt generation and canvas scoring
- `/api/reports` - user reports
- `/api/notifications` - moderation notifications
- `/api/chat-rooms` - community rooms and memberships
- `/api/blocks` - block list and block status
- `/api/admin` - admin stats, reports, users, and economy

## Database and Storage

The backend uses Supabase PostgreSQL and Supabase Storage.

Important tables include:

- `users`
- `match_requests`
- `matches`
- `messages`
- `message_reactions`
- `match_read_status`
- `stickers`
- `gift_transactions`
- `reports`
- `notifications`
- `vibe_checks`
- `ad_views`
- `chat_rooms`
- `room_members`
- `room_messages`
- `user_blocks`
- `user_photos`

Storage buckets used by the app:

- `avatars`
- `user-photos`

Database setup files are in `server/config`:

- `schema.sql`
- `migration.sql`
- `migration_blocks.sql`
- `migration_room_members.sql`

## Environment Variables

Create environment files for both apps before running locally.

### Server `.env`

```env
PORT=5000
CLIENT_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GROQ_API_KEY=your_groq_api_key
```

Optional Render deployment variables:

```env
RENDER=true
RENDER_EXTERNAL_URL=https://your-render-service-url
```

### Client `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Getting Started

### 1. Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

### 2. Set up Supabase

1. Create a Supabase project.
2. Run `server/config/schema.sql` in the Supabase SQL editor.
3. Run the migration files in `server/config` if the tables or columns are not already present.
4. Confirm the `avatars` and `user-photos` storage buckets exist, or let the server create them on startup.
5. Add your Supabase keys to the server and client environment files.

### 3. Run the backend

```bash
cd server
npm run dev
```

The API runs on:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

### 4. Run the frontend

```bash
cd client
npm run dev
```

The web app runs on:

```text
http://localhost:3000
```

## Available Scripts

### Client

```bash
npm run dev      # Start Next.js development server
npm run build    # Build production frontend
npm run start    # Start production frontend
npm run lint     # Run ESLint
```

### Server

```bash
npm run dev            # Start Express server with nodemon
npm run start          # Start Express server with Node
npm run test           # Run Jest tests
npm run test:coverage  # Run Jest tests with coverage
```

## Notes

- The app uses a custom `users` table while also creating Supabase Auth users for password reset support.
- Most protected API routes expect an `Authorization: Bearer <token>` header.
- The server attaches Socket.IO to the same HTTP server as Express.
- The Render keep-alive logic only runs when `RENDER=true`.
- Some database objects used by newer features are defined in migration files rather than only in the base schema.
