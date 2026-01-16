# DetailManager - Car Detailing Business Management Software

A comprehensive web and mobile application for managing car detailing businesses, built with React, Vite, and Supabase.

## Features

- 🔐 **Authentication System**
  - User sign up and login
  - Supabase authentication integration
  - Protected routes
  - Password reset functionality

- 📊 **Dashboard**
  - Business overview
  - Key metrics and statistics
  - Quick access to main features

- 💰 **Sales Management**
  - Track sales and revenue
  - Client management
  - Job tracking

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Supabase (PostgreSQL database + Authentication)
- **Routing**: React Router v6
- **Mobile**: Ready for Capacitor integration (iOS & Android)

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Supabase Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy your project URL and anon key to the `.env` file

### 2. Database Schema (Coming Soon)

We'll set up the following tables:
- `profiles` - User profiles and business information
- `clients` - Customer information
- `services` - Detailing service types
- `sales` - Sales records
- `appointments` - Scheduled jobs

### 3. Enable Authentication

Supabase authentication is already configured in the app. Make sure email authentication is enabled in your Supabase project settings.

## Project Structure

```
detailmanager/
├── src/
│   ├── contexts/
│   │   └── AuthContext.jsx      # Authentication context
│   ├── lib/
│   │   └── supabase.js          # Supabase client
│   ├── pages/
│   │   ├── Login.jsx            # Login page
│   │   ├── SignUp.jsx           # Sign up page
│   │   ├── Dashboard.jsx        # Main dashboard
│   │   └── Sales.jsx            # Sales management
│   ├── App.jsx                  # Main app component
│   ├── App.css                  # Global styles
│   ├── main.jsx                 # App entry point
│   └── index.css                # Base styles
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Mobile App Development

This project is ready to be converted into a mobile app using Capacitor:

```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli

# Initialize Capacitor
npx cap init

# Add platforms
npx cap add ios
npx cap add android

# Build and sync
npm run build
npx cap sync
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Next Steps

1. Set up Supabase database tables
2. Implement sales creation and management
3. Add client management features
4. Create appointment scheduling
5. Add service catalog
6. Implement reporting and analytics
7. Add mobile app builds with Capacitor

## Contributing

This is a private project for car detailing business management.

## License

Private - All rights reserved
