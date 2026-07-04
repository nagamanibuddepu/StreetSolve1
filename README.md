# StreetSolve

StreetSolve is a full-stack civic engagement and issue-resolution platform designed to help communities report local problems, track progress, and connect citizens with government bodies, volunteers, and NGOs. The platform combines civic issue reporting, geolocation, AI-assisted categorization, and real-time updates in a single experience.

The project is organized as a monorepo with a Node.js/Express backend and a React/Vite frontend.

## What the project does

StreetSolve enables users to:

- Report civic issues such as potholes, sanitation problems, water supply issues, electricity faults, and more
- Submit reports using text, voice, or image uploads
- Attach location data to ensure better routing to the right department or authority
- Track issue status and lifecycle from report to resolution
- Vote, comment, and engage with public issues
- Receive real-time notifications for updates and nearby activity
- Work across multiple roles, including citizens, volunteers, NGOs, government officials, and admins

## Core features

### Citizen experience
- Report issues from mobile-friendly forms
- Choose between text, voice, and image-based reporting
- Add location automatically or manually
- Track submitted issues and their progress

### Government and community workflows
- Route issues to relevant departments based on category and location
- Support status updates and assignment workflows
- Enable volunteers and NGOs to engage with issues in their area
- Provide role-based access for different user types

### AI and smart processing
- AI-assisted issue classification and urgency assessment
- Keyword-based fallback classification when AI services are unavailable
- Voice transcription support for multilingual reporting
- Automated summary and routing logic for civic data

### Real-time capabilities
- Socket.IO-based notification support
- Live updates for issue activity and notifications
- Backend services for recurring tasks and notifications

## Tech stack

### Frontend
- React
- Vite
- React Router
- Zustand
- TanStack React Query
- Tailwind CSS
- Framer Motion
- Leaflet / React Leaflet
- Socket.IO client

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT authentication
- Socket.IO
- Multer and Cloudinary for media uploads
- OpenAI and Groq integration for AI features
- Winston logging
- Helmet, CORS, rate limiting, and input sanitization for security

## Project structure

- backend/ - Express API, database models, services, and route handlers
- frontend/ - React application and UI pages
- documentation.md - Additional architecture and implementation notes
- README_QUICK_START.md - Quick local setup notes

## Prerequisites

Make sure you have the following installed:

- Node.js 18+ recommended
- npm
- MongoDB instance or connection string

## Getting started

### 1. Install dependencies

From the project root:

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 2. Configure environment variables

Create the required environment files for the backend and frontend as needed for your local setup. The backend uses environment variables for:

- MongoDB connection
- JWT secrets
- OpenAI / Groq / other AI service keys
- Cloudinary configuration
- CORS and client URL settings

### 3. Seed sample data

From the backend folder:

```bash
npm run seed
```

### 4. Run the application

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend:

```bash
cd frontend
npm run dev
```

The frontend is typically available at:

- http://localhost:5173

The backend API runs at:

- http://localhost:5000

You can also use the root workspace scripts if you prefer to run both together.

## Usage flow

1. Register or sign in as a user.
2. Navigate to the reporting experience.
3. Choose a reporting method: text, voice, or image.
4. Add a title, description, category, and location.
5. Submit the issue.
6. Track updates, comments, votes, and status changes.

## Notes

This repository reflects a functional civic-tech prototype with a strong emphasis on practical reporting workflows, geolocation, and AI-assisted issue handling. The implementation is designed to be extensible for production use with additional deployment, monitoring, and governance integrations.

## Next steps

Possible future improvements include:

- Production deployment configuration
- Expanded admin analytics dashboards
- Better moderation and spam controls
- More advanced geospatial routing and automation
- Additional notification channels and integrations
