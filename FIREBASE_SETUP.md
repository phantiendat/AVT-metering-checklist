# Firebase Setup Guide

Quick guide to enable real-time collaboration for AVT Metering Checklist.

## Step 1: Create Firebase Project (5 minutes)

1. Go to https://console.firebase.google.com
2. Click **"Add project"**
3. Enter project name (e.g., "avt-metering")
4. Disable Google Analytics (optional)
5. Click **"Create project"**

## Step 2: Add Web App

1. In project overview, click the **Web icon** (</>)
2. Enter app nickname (e.g., "AVT Checklist")
3. Click **"Register app"**
4. **Copy the firebaseConfig object** - you'll need this!

Example config:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "avt-metering.firebaseapp.com",
  databaseURL: "https://avt-metering-default-rtdb.firebaseio.com",
  projectId: "avt-metering",
  storageBucket: "avt-metering.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

## Step 3: Enable Realtime Database

1. In Firebase Console sidebar, go to **"Build" → "Realtime Database"**
2. Click **"Create Database"**
3. Choose location (e.g., United States)
4. Select **"Start in test mode"** (for development)
5. Click **"Enable"**
6. Copy the database URL (shown at top)

## Step 4: Update HTML File

1. Open `AVT_metering_checklist.html`
2. Find the Firebase config section (around line 860)
3. Replace the placeholder config with your actual config:

```javascript
// REPLACE THIS:
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    // ...
};

// WITH YOUR ACTUAL CONFIG FROM STEP 2
```

4. Save the file

## Step 5: Test Locally

1. Open `AVT_metering_checklist.html` in browser
2. Login as Admin or Client
3. You should see "Active Session" with session ID in sidebar
4. Click "Copy Share Link"
5. Open the link in another browser/incognito window
6. Login as Viewer
7. Make changes in first window → Should sync to second window instantly!

## Step 6: Deploy (Optional)

### Option A: Netlify (Easiest)
1. Go to https://app.netlify.com
2. Drag & drop `AVT_metering_checklist.html`
3. Get your live URL
4. Share with team!

### Option B: Vercel
1. Go to https://vercel.com
2. Import project or drag & drop file
3. Deploy

### Option C: GitHub Pages
1. Create GitHub repo
2. Push HTML file
3. Enable GitHub Pages in repo settings

## Database Rules (Production)

For production, update Firebase Realtime Database rules:

1. Go to Firebase Console → Realtime Database → Rules
2. Replace with:

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

**Note:** These rules allow public read/write. For better security, implement Firebase Authentication.

## Troubleshooting

**"Firebase not configured" alert?**
- Check if you replaced ALL placeholder values in firebaseConfig
- Verify apiKey doesn't say "YOUR_API_KEY"

**Session not syncing?**
- Open browser console (F12) and check for errors
- Verify database URL is correct
- Check internet connection

**"Permission denied" error?**
- Go to Firebase Console → Realtime Database → Rules
- Ensure rules allow read/write (see above)

## Free Tier Limits

Firebase Spark (free) plan includes:
- 1GB storage
- 10GB/month bandwidth
- 100 simultaneous connections

This is enough for small teams (5-10 users).

## Support

For issues, check:
- Browser console (F12) for error messages
- Firebase Console → Realtime Database → Data (to see if data is saving)
- Network tab to verify Firebase requests
