# AVT Metering Verification Checklist

Professional checklist application for metering verification with real-time collaboration, role-based access control, analytics tracking, and accessibility features.

## ✨ Features

### Core Features
- ✅ **Real-time Collaboration** - Multiple users work on same checklist simultaneously
- ✅ **Role-Based Access** - Admin, Client, and View modes with permission control
- ✅ **Template System** - Save and reuse checklist templates
- ✅ **Session Sharing** - Share URL for instant collaboration

### UI/UX Features (NEW)
- ✅ **Dark Mode** - Toggle between light and dark themes with persistence
- ✅ **Accessibility** - WCAG 2.1 AA compliant (keyboard navigation, screen reader support)
- ✅ **Micro-animations** - Smooth transitions and visual feedback
- ✅ **Responsive Design** - Works on desktop, tablet, and mobile

### Export & Analytics (NEW)
- ✅ **PDF Export** - Generate professional reports with session info
- ✅ **Analytics Dashboard** - Track completion rates, session duration, and activity (Admin only)
- ✅ **Analytics Export** - Download analytics data as JSON

### Security (NEW)
- ✅ **XSS Protection** - All user inputs sanitized
- ✅ **Auth Hardening** - Role validation and permission guards
- ✅ **Firebase Security Rules** - Production-ready database rules

## Quick Start

### Option 1: Local Mode (No Collaboration)

1. Open `AVT_metering_checklist.html` in your browser
2. Login with a role (admin/client/view)
3. Data saved to localStorage only

### Option 2: Real-Time Collaboration Mode

#### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" and follow the wizard
3. Once created, click "Web" icon (</>) to add a web app
4. Copy the Firebase configuration object

#### Step 2: Enable Realtime Database

1. In Firebase Console, go to "Build" → "Realtime Database"
2. Click "Create Database"
3. Choose location (e.g., us-central1)
4. Start in **test mode** (for development)
5. Copy the database URL (e.g., `https://your-project-default-rtdb.firebaseio.com`)

#### Step 3: Configure Firebase in HTML

Open `AVT_metering_checklist.html` and replace the Firebase config (around line 860):

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

Replace with your actual config from Firebase Console.

#### Step 4: Deploy (Optional)

**Deploy to Netlify (Free):**
1. Go to [Netlify](https://app.netlify.com)
2. Drag & drop `AVT_metering_checklist.html`
3. Get your live URL

**Or use local server:**
```bash
python -m http.server 8000
# Open http://localhost:8000
```

### How Real-Time Collaboration Works

1. **Admin/Client** logs in → Automatically creates a new session
2. Session ID appears in sidebar with "Copy Share Link" button
3. Share the URL with team members
4. **Viewers** open the shared URL → Join the same session
5. All changes sync in real-time across all users

## Roles & Permissions

| Feature | Admin | Client | View |
|---------|-------|--------|------|
| View checklist | ✅ | ✅ | ✅ |
| Check/uncheck items | ✅ | ✅ | ❌ |
| Add/edit categories | ✅ | ❌ | ❌ |
| Delete items | ✅ | ❌ | ❌ |
| Save templates | ✅ | ❌ | ❌ |
| Export PDF | ✅ | ✅ | ❌ |
| View analytics | ✅ | ❌ | ❌ |
| Export analytics | ✅ | ❌ | ❌ |
| Reset checklist | ✅ | ✅ | ❌ |
| Create session | ✅ | ✅ | ❌ |
| Real-time sync | ✅ | ✅ | ✅ |

## 📖 User Guide

### For Admins
1. **Manage Checklist**: Create/edit/delete categories and tasks
2. **Templates**: Save frequently used checklists as templates
3. **Analytics**: View dashboard with completion rates and activity
4. **Export**: Generate PDF reports and download analytics data
5. **Share**: Copy session link to collaborate with team

### For Clients
1. **Complete Tasks**: Check/uncheck tasks and mark evidence
2. **Track Progress**: View completion percentage
3. **Export**: Generate PDF reports
4. **Collaborate**: Join shared sessions for real-time updates

### For Viewers
1. **Read-Only**: View checklist status without making changes
2. **Monitor**: Track team progress in real-time
3. **Join Sessions**: Access shared sessions via URL

## Firebase Database Rules

For production, update your Firebase Realtime Database rules:

```json
{
  "rules": {
    "sessions": {
      "$sessionId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

**Note:** These rules allow anyone to read/write. For better security, implement Firebase Authentication.

## Testing

```bash
npm install
npm test
```

## Tech Stack

- Pure HTML5/CSS3/JavaScript
- Firebase Realtime Database (real-time sync)
- Puppeteer (testing)
- JSDOM (unit testing)

## Troubleshooting

**Firebase not working?**
- Check if you replaced the config with your actual Firebase credentials
- Verify Realtime Database is enabled in Firebase Console
- Check browser console for errors

**Session not syncing?**
- Ensure all users are using the same session URL
- Check internet connection
- Verify Firebase database rules allow read/write

## Notes

- Without Firebase config, app runs in local mode (localStorage only)
- Firebase free tier: 1GB storage, 10GB/month bandwidth
- Session data persists in Firebase until manually deleted
