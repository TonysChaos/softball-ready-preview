# SoftballReady.net

**The National Travel Softball Connection**

SoftballReady.net is a nationwide travel softball platform designed to help players, families, coaches, and teams find opportunities and connect more easily.

## Current Production Build

**Status:** Phase 2A — Clean Production Baseline

The current build includes:

- Account signup, login, logout, and password reset
- Player profile creation and editing
- Player photo uploads
- Coach/team profiles
- Team opportunities and roster needs
- Pickup Player Marketplace
- Pickup Player “I’m Interested” flow
- Coach player search
- Private messaging
- Membership pages and Stripe integration
- Player and coach dashboards
- Tryout directory interface
- Community Standards, Our Story, Our Promise, and Contact pages
- Mobile-responsive layouts
- Vercel server functions contained in `/api`

## Project Structure

- `index.html` — Home page
- `players.html` — Player profile entry
- `player-dashboard.html` — Player account/profile management
- `player-profile.html` — Full player profile view
- `player-search.html` — Coach player search
- `teams.html` — Team opportunities directory
- `coach-dashboard.html` — Team profile and team-need management
- `pickup-players.html` — Pickup Player Marketplace
- `messages.html` — Private messaging center
- `membership.html` — Membership
- `tryouts.html` — Tryout directory
- `supabase-app.js` — Main application logic
- `message-app.js` — Messaging logic
- `membership-app.js` — Membership logic
- `supabase-config.js` — Browser Supabase configuration
- `styles.css` — Shared site styling
- `/api` — Vercel server functions for Stripe and Supabase
- `/assets` — Production image assets

## Infrastructure

- **Domain:** SoftballReady.net
- **Hosting:** Vercel
- **Source of truth:** GitHub
- **Database / authentication / storage:** Supabase
- **Payments:** Stripe

## Production Rules

- GitHub is the source of truth.
- Vercel deploys from the GitHub repository.
- Do not create numbered copies of production JavaScript files.
- The live application must use `supabase-app.js`.
- Server functions belong in `/api`.
- Do not delete or replace working production files without first verifying dependencies.
- Keep the experience simple, mobile-friendly, and focused on helping softball families and teams connect.

## Product Principle

Every improvement to SoftballReady.net should make it easier for a player to find an opportunity, a family to find the right team, or a coach to find the right player.

**Where Opportunity Meets Preparation.**
