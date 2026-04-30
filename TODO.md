# Proof Web — Missing & Incomplete Features Roadmap

Based on the current architecture and codebase of the Proof Web application, here are 10 lacking or incomplete features that represent the next logical steps for a production-ready platform.

## 1. In-App & Email Notifications
There is currently no notification system. When a student requests a verification, the Teacher/Institution receives no alert. When a credential is approved or rejected, the student isn't notified. Adding a real-time notification dropdown (and email alerts) is critical for engagement.

## 2. Evidence Uploads (File Attachments)
Proof items currently rely entirely on text descriptions. To truly verify achievements, students need the ability to upload cryptographic proofs, PDF certificates, images, or links to external repositories (like GitHub or published papers). 

## 3. Search and Discovery
The platform lacks a global search feature. Users cannot search for other peers, researchers, specific institutions, or publicly verified credentials. A centralized search bar in the Navbar is a necessary addition.

## 4. Connection & Follow System
The `FeedPage` currently displays a global feed, and the `ProfilePage` has a placeholder "Connect" button for peers. Implementing a real "Follow/Connect" graph would allow users to curate their feeds and build their academic networks.

## 5. Commenting & Discussions on the Feed
While the Feed supports "Likes", it lacks a commenting system. Adding comments would foster community interaction, allowing researchers and students to discuss milestones or congratulate peers on verifications.

## 6. Rich Text Editor for Assets
Currently, achievements and posts only accept plain text. Integrating a rich-text or markdown editor would allow users to properly format their research abstracts, include bullet points, and add inline links to their proof assets.

## 7. Dashboard Redesigns (Teacher, Institution, Admin)
While we successfully overhauled the global design system, `FeedPage`, `LoginPage`, and `ProfilePage`, the specialized dashboards (`TeacherDashboardPage.tsx`, `InstitutionDashboardPage.tsx`, and `AdminDashboardPage.tsx`) are still using the older legacy styling and layouts. They need to be updated to match the new `DESIGN_LIGHT.md` specs.

## 8. Verification Messaging/Clarification
The current verification flow is binary (Approve/Reject). Often, a verifier might need more context or evidence. Implementing a "Request Changes" status with a mini-chat thread on the verification request would make the pipeline much more realistic.

## 9. Account Settings & Privacy Controls
There is no dedicated settings page. Users currently cannot change their passwords, manage email preferences, toggle Dark Mode, or set granular privacy controls (e.g., hiding specific proof items from their public URL while keeping others visible).

## 10. Pagination and Infinite Scroll
The queries in the `FeedPage` and dashboard data fetching currently pull in large batches or use hard limits (`limit(5)`). Implementing cursor-based pagination or infinite scroll is necessary so the application remains performant as the database grows.
