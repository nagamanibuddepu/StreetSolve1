# StreetSolve Platform: Technical Architecture & Documentation

StreetSolve is a full-stack, AI-powered civic governance platform designed to revolutionize community grievance redressal. It bridges citizens, volunteers, NGOs, and municipal corporations through geospatial intelligence, multilingual voice reporting, and automated AI lifecycle management.

This document breaks down the end-to-end implementation, algorithms, technology choices, and operational methodologies used throughout the platform.

---

## 1. Technology Stack & Tech Choices

### Frontend
- **Framework:** React.js (built with Vite)
  - *Justification:* Vite provides a vastly superior development experience and compilation speeds compared to Create React App. React allows for highly modular, reusable UI components perfect for a heavy multi-dashboard system.
- **Routing & State Management:** React Router / Zustand / React Query (TanStack)
  - *Justification:* Zustand is preferred over Redux since it avoids massive boilerplate while persisting critical auth states globally. React Query abstracts complex asynchronous network state, caching, pagination, and allows for near-instant UI repaints upon triggering cache invalidation.
- **Styling & Animations:** TailwindCSS / Framer Motion
  - *Justification:* Tailwind ensures highly consistent utility-first styling guaranteeing rapid responsiveness across mobile devices without bloated external CSS files. Framer Motion powers 60fps micro-interaction animations (e.g., modal alerts, collapsible preference panels).

### Backend
- **Core Server:** Node.js & Express.js
  - *Justification:* Node handles the huge payload concurrency of WebSockets natively. Express is a standard battle-tested router that easily natively integrates rate limiters and extensive API security layers (helmet, cors, hpp, mongoSanitize).
- **Real-Time Engine:** Socket.IO
  - *Justification:* Necessary over HTTP Long-Polling or raw WebSockets because Socket.IO natively supports "Rooms" and multiplexing. This enables the server to easily group specific municipality workers together into a single broadcast channel (e.g. `govbody:GVMC`).
- **Database:** MongoDB (via Mongoose ORM)
  - *Justification:* **VITAL choice**. Standard SQL databases (MySQL/PostgreSQL) require heavy GIS plugins to handle rapid geospatial sweeping. MongoDB has native `2dsphere` geographic mapping built directly into its core, allowing the system to instantly search coordinates using `$near`.

### External Services & APIs
- **Voice-to-Text Transcription:** Groq (Whisper-Large-V3)
  - *Justification:* OpenAI's standard Whisper takes 3 to 6 seconds to transcribe audio. Groq utilizes advanced Language Processing Unit (LPU) chips, reducing WebM audio processing to ~200 milliseconds, fundamentally making real-time voice reporting viable for illiterate users.
- **Mapping Infrastructure:** React-Leaflet overlaying OpenStreetMap/CartoDB tiles
  - *Justification:* Google Maps requires restrictive billing. Leaflet and CartoDB supply free, extremely beautiful customized, and lightweight geographical tile boundaries without compromising on interaction capabilities.
- **Artificial Intelligence Engine:** OpenAI (GPT-3.5-Turbo)
  - *Justification:* Unrivaled natural language processing used for classifying Hindi/Telugu inputs, identifying malicious/spam grievances, and structuring issue definitions dynamically.

---

## 2. Core Methodologies

### Auto-Classification & Natural Language Pipeline
When a citizen reports an issue verbally or via text:
1. **Transcription:** Audio buffers are fired to Groq's API and translated.
2. **Translation:** Non-English inputs are translated to English via OpenAI.
3. **Classification & Categorization:** A highly engineered prompt forces OpenAI to map the unstructured grievance into strict JSON representing the Category (e.g. Roads, Electricity), Sentiment, and Urgency (1 to 10 scale). 
4. **Deterministic Fallback:** A massive offline array (`KEYWORD_MAP`) in `aiService.js` exists as a safety net. If OpenAI crashes or restricts limits, the local array parses the text (e.g., identifying "transformer" routing it to Electricity) guaranteeing 100% classification reliability.

### Priority Level Calculation
*How is it decided whether an issue is 'Critical' or 'Medium'?*
- Priority routing is largely mathematical. The OpenAI model produces an `urgencyScore` from 1 to 10 by checking for life-threatening syntax (e.g. "explosion", "death", "collapse", "fire").
- If `urgencyScore >= 8`: Promoted to **Critical**.
- If `urgencyScore >= 6`: Promoted to **High**.
- If below 6: Defaults to **Medium**.

### Trending Score Algorithm
Issues require traction to be highlighted. The system actively utilizes a hacker-news style "Gravity" algorithm refreshed by a Cron Job every 30 minutes inside `cronService.js`.
**The Formula:** 
`TrendingScore = (Votes + Comments * 2) / Math.pow(AgeInHours + 2, 1.5)`
- *Basis:* Comments are weighted twice as heavily as passive upvotes because typing physical context requires more community involvement. The denominator forces *Age decay*, meaning an issue from 4 weeks ago organically drops off the "Trending" feed instantly if it receives no momentum, ensuring the community always sees urgent active issues.

### Geospatial Dynamic Routing (The Map Logic)
1. **The Grid:** All Government Bodies and Gram Panchayats are seeded into MongoDB using true [Longitude, Latitude] coordinates embedded with `2dsphere` spatial indexing.
2. **The Sweep:** When an issue is logged, `IssueController` executes an absolute `$near` lookup query in MongoDB. This geometrically calculates which governing jurisdiction is physically closest to the pin (up to a 50km fallback boundary), instantly injecting it to the correct department without manual sorting.

### Real-time Notifications & WebSocket Ecosystem
- **Radius Triggers:** The moment the database captures an issue:
  - **Citizens:** Located strictly within a **3km walking radius** are pulled and sent an alert.
  - **NGOs/Volunteers:** Located within a **10km driving radius** are pulled and alerted that an issue awaits assistance.
- **Global Broadcast:** Backend `notificationService.js` actively pushes to the frontend listener `socket.on('notification')`. 
- **Action:** This prompts `react-hot-toast` to produce a beautiful center-screen notification overlay globally and concurrently trips `React Query` to instantly invalidate all memory cache `['map-issues']`, forcing the geographical Leaflet maps to live update and drop a pinpoint immediately without the user refreshing their browser page.

### Issue Lifecycle Management
- **Verification Gating:** Government workers cannot unilaterally "Close" an issue independently and permanently. Instead, they mark it `completed`.
- **Satisfaction Gate:** Marking it `completed` pings the original reporter requesting an approval rating. If the rating returns under **70% Satisfaction**, a local block intervenes: the issue is automatically ripped from "Completed", designated `Auto-Reopened`, and penalized natively for further municipal visibility.

---

## 3. Visualization Tools
- **Analytic Donut Charts:** Rendered dynamically using raw `<svg>` manipulations calculated inside state vectors, granting highly customized tracking over status arrays (Resolved vs Pending).
- **Interactive Geospatial Dashboard Hotspots:** Instead of arbitrary colored squares, the application leverages Leaflet `MapContainer`-wrapped `CircleMarkers` overlaid on `OpenStreetMap` generating live heat zones proportional to `priority`.

*All implementation logic resides in the active Node.js server (`backend/src`) and React codebase (`frontend/src`).*
