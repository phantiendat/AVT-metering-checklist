# AVT Metering Checklist - Deployment Guide

## 🚀 Quick Deploy

**Single HTML file** - No build process needed!

### Option 1: GitHub Pages (Recommended)
1. Create GitHub repository
2. Upload `AVT_metering_checklist.html`
3. Go to Settings → Pages
4. Select branch → Save
5. Access at: `https://[username].github.io/[repo-name]/AVT_metering_checklist.html`

### Option 2: Netlify
1. Drag & drop `AVT_metering_checklist.html` to Netlify
2. Done! Get instant URL

### Option 3: Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Copy HTML file to public/
firebase deploy
```

---

## ✅ Pre-Deployment Checklist

### 1. Firebase Configuration
- [ ] Firebase rules deployed to production
- [ ] Database URL correct in HTML (line ~853)
- [ ] Test Firebase connection

### 2. Security Verification
- [ ] XSS protection working (`escapeHtml()` applied)
- [ ] Auth validation working
- [ ] View mode cannot modify data

### 3. Features Testing
- [ ] Login (admin/client/view)
- [ ] Add/edit/delete categories (admin only)
- [ ] Check/uncheck tasks (admin/client)
- [ ] Dark mode toggle
- [ ] PDF export
- [ ] Analytics dashboard (admin)
- [ ] Template save/load
- [ ] Session sharing

### 4. Browser Testing
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (if available)
- [ ] Mobile responsive

---

## 🔧 Post-Deployment

### Monitor Firebase Usage
- Check Realtime Database usage
- Set up billing alerts
- Monitor concurrent connections

### User Access
- Share URL with team
- Provide login credentials:
  - Admin: `admin` / `admin`
  - Client: `client` / `client`
  - View: `view` / `view`

### Backup
- Export templates regularly
- Export analytics data
- Keep local copy of HTML

---

## 🆘 Troubleshooting

**Firebase permission denied:**
- Deploy rules from `firebase.rules.json`

**Dark mode not persisting:**
- Check localStorage enabled in browser

**Session not syncing:**
- Verify Firebase connection
- Check browser console for errors

