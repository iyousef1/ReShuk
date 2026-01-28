# ReShuk 🛍️🤖
AI-powered second-hand marketplace that helps people buy and sell faster with smarter listings, fair pricing, and safer meetups.

> Replace this line with your 1-sentence pitch (what ReShuk is + who it’s for + why it’s better).

---

## Table of Contents
- [Demo](#demo)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [System Overview](#system-overview)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Demo
- Live: **TBD**
- Figma: **TBD**
- Screenshots: put images in `/docs/screenshots` and link them here.

---

## Key Features
### Marketplace Core
- Create listings with title, description, category, photos, price, and location
- Search + filters (category, price range, condition, distance)
- Favorites / saved items
- Chat or messaging between buyer & seller
- Real-time updates/notifications for new messages and listing status

### AI Assist (optional / in-progress)
- **Price estimation** based on item category + condition + similar listings
- **Condition hints** from photos (basic prompts / model-assisted suggestions)
- **Smarter listing assistant** (suggests title/keywords, highlights, and fair price range)

### Safety & Trust (optional)
- Meet-up suggestions (public places, daylight preference, distance-aware)
- Report / block users
- Basic reputation signals (verified phone/email, completed trades count)

---

## Tech Stack
> Update this section to match your repo.

**Client**
- React Native (Expo) / or React (Web)
- Expo Router / or React Navigation
- State: Zustand / Redux / React Query (choose what you actually use)

**Backend**
- Node.js + Express **or** Firebase/Supabase **or** your custom API
- Database: MongoDB / Firestore / Postgres
- Storage: Firebase Storage / S3 / Supabase Storage

**AI**
- Lightweight rules + embeddings/search **or** model API
- Image analysis pipeline (optional)

---

## System Overview
High-level flow:
1. User signs up / logs in
2. User creates a listing → uploads images → saves metadata
3. Buyers browse/search → message sellers
4. AI assistant can suggest price/keywords/condition notes during listing creation

---

## Getting Started

### Prerequisites
- Node.js (LTS)
- Git
- (If mobile) Expo Go app or iOS/Android emulator

### Clone
```bash
git clone <YOUR_REPO_URL>
cd reshuk
