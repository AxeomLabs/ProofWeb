# Proof Web - Application State & UI/UX Overview

## 1. Application Details
* **App Name:** Proof Web (Project Proof)
* **Organization/Owner:** AxeomLabs (Harinandan JV)
* **Core Purpose:** A community-driven platform for academic and professional credential verification. It allows students to log their achievements, request verification from recognized authorities (teachers or institution administrators), and showcase their verified portfolio to the public or on a community feed.

## 2. Technology Stack
* **Frontend Framework:** React.js (TypeScript) powered by Vite
* **Routing:** React Router v6
* **Backend / Database:** Firebase (Authentication, Firestore Database, Storage)
* **Styling:** Vanilla CSS (`index.css`) with a custom design system leveraging CSS variables for theming, responsive layouts, and modern aesthetics.

## 3. Current User Experience (UX) Architecture
The platform is designed around a multi-role ecosystem, providing tailored experiences based on the user's designation:

### Roles
1. **Student:** The primary user who creates a profile, adds achievements, requests verifications, and interacts with the community feed.
2. **Teacher:** Acts as a verifier for student achievements.
3. **Institution Admin:** Manages the institution's presence and has higher-level verification authority.
4. **Platform Admin:** Oversees the entire ecosystem, moderates content, and manages global settings.

### Core Workflows
* **Authentication & Onboarding:** 
  * Supports standard Email/Password registration and seamless Google OAuth integration.
  * **Smart Onboarding:** If a user signs in via Google for the first time, a deferred onboarding modal interrupts the flow, prompting them to select their required platform role (Student, Teacher, etc.) before initializing their database documents. This prevents "ghost" accounts.
* **Verification Loop:** Students submit achievements as "drafts" and send verification requests to authorities. Authorities review and update the status to "verified," which boosts the student's overall verification score.
* **Community Engagement:** A centralized feed where users can post updates and like other users' posts, fostering an active community.

## 4. Current User Interface (UI) Design
The UI focuses on a premium, clean, and dynamic aesthetic without relying on heavy frameworks like Tailwind, ensuring maximum control over the visual identity.

### Design System Highlights
* **Layouts:** Utilizes flexible CSS Grid and Flexbox for highly responsive, card-based layouts.
* **Color Palette:** Employs a curated set of CSS variables (`--accent-primary`, `--border-primary`, `--text-secondary`, etc.) to maintain consistency across dark/light modes or custom themes.
* **Components:** Custom buttons (`btn-blue`, `btn-outline`), badges (`badge-grey`), and structural cards that provide depth and clear visual hierarchy.

### Key Screens
1. **Login & Signup Page (`/login`, `/signup`)**
   * Centered card layout.
   * Clear separation between Email/Password inputs and the "Continue with Google" button (with embedded Google SVG icon).
   * Dynamic role-selection dropdown during signup or via a modal overlay for OAuth users.
   
2. **Community Feed (`/`)**
   * **Two-Column Layout:** 
     * **Main Column:** A scrollable list of user posts, featuring the author's name, role, content, and interactive "Like" buttons with badge counters.
     * **Sticky Sidebar:** Displays "Proof Community" news, system updates, and suggestions, keeping users informed about platform changes.
     
3. **Personal Profile & Dashboard (`/profile`)**
   * A comprehensive control center for the user.
   * Displays a dynamic "Completeness Score" based on filled profile fields and verified achievements.
   * Tabular or list views for managing achievements, tracking pending verification requests, and viewing peers.
   * Includes a secure, multi-step "Delete Account" capability that safely tears down Firestore data before removing the Auth instance.
   
4. **Public Profile Viewer (`/:profileUrlSlug`)**
   * A high-fidelity, polished read-only view designed to "wow" visitors.
   * Focuses on structural hierarchy, presenting the user's verified credentials and biography in a clean, easily digestible format suitable for sharing with recruiters or peers.

5. **Dashboards (Admin/Institution/Teacher)**
   * Dedicated interfaces for handling bulk verifications, managing organizational details, and overseeing platform security.

## 5. Security & Infrastructure State
* **Firestore Rules:** Tightly secured using short-circuit evaluation (`hasRole` checks) to ensure users can only modify their own data, while admins and authorities have appropriate access to handle verifications and moderation.
* **Data Integrity:** Complex teardown logic ensures that when a user deletes their account, all associated posts, achievements, and requests are recursively wiped before the Firebase Auth token is revoked.
