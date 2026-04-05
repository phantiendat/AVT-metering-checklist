# AVT Metering Checklist - Project Guidelines

## Project Context

Single-page web application for metering verification checklist with role-based access control and **real-time collaboration**.
Built with vanilla HTML/CSS/JavaScript - no framework dependencies.

**Tech Stack:**
- Pure HTML5/CSS3/JavaScript
- Firebase Realtime Database (real-time multi-user sync)
- SessionStorage + localStorage for data persistence
- Puppeteer for automated testing
- JSDOM for unit testing

## New Features (Real-Time Collaboration)

**Firebase Integration:**
- Multi-user real-time sync via Firebase Realtime Database
- Session-based collaboration with shareable URLs
- Automatic fallback to localStorage when Firebase not configured
- Admin/Client can create sessions, Viewers can join

**How it works:**
1. User logs in → Creates/joins Firebase session
2. Session ID displayed in sidebar with "Copy Share Link" button
3. All changes sync to Firebase → Real-time updates for all users
4. Data structure: `sessions/{sessionId}/{checklist, checked, metadata}`

## Commands

```bash
# Run admin functionality tests
node test.js

# Run role permission tests
node test2.js

# Run JSDOM unit tests
node test_dom.js

# Install dependencies
npm install
```

## Architecture

```
AVT metering checklist/
├── AVT_metering_checklist.html  # Main app (single-file)
├── test.js                       # Admin tests (Puppeteer)
├── test2.js                      # Permission tests (Puppeteer)
├── test_dom.js                   # Unit tests (JSDOM)
├── package.json                  # Dependencies
└── CLAUDE.md                     # This file
```

## Code Conventions

**HTML Structure:**
- All code in single HTML file for easy deployment
- Clear section comments: `<!-- SECTION: Name -->`
- CSS in `<style>` tag, JS in `<script>` tag

**JavaScript:**
- Use clear function names: `authenticate()`, `addCategory()`, `updateProgress()`
- SessionStorage keys: `gas_metering_session_*`
- Comment all major functions

**CSS:**
- CSS variables in `:root` for theming
- BEM-like naming: `.sidebar-header`, `.auth-container`
- Notion-inspired design system

## Authentication System

**3 Roles:**
- `admin` - Full edit/delete permissions
- `client` - Can check/uncheck items only
- `view` - Read-only mode

**Flow:**
1. User enters role in auth modal
2. Role saved to `sessionStorage.gas_metering_session_role`
3. UI updates based on role (show/hide admin controls)
4. Logout clears session

## Critical Rules

- ❌ NEVER remove authentication checks
- ❌ NEVER expose admin controls to client/view roles
- ✅ ALWAYS test role permissions after changes
- ✅ ALWAYS preserve data structure in localStorage changes
- ✅ ALWAYS run tests before committing

## Testing Protocol

Before any commit:
```bash
node test.js && node test2.js && node test_dom.js
```

All tests must pass.

## Known Issues

- Data stored in sessionStorage (lost on tab close)
- No backend - purely client-side
- Authentication is simple (no real security)

## Future Improvements

- Switch to localStorage for persistence
- Add data export/import
- Add backend API integration
- Improve authentication security
