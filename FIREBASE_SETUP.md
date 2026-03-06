# Firebase Setup Guide

This guide explains how to configure Firebase credentials for the EV Cars application backend.

---

## 1. Generate Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com) and open your project
2. Click the **gear icon** (⚙️) next to "Project Overview"
3. Select **"Project settings"**
4. Go to the **"Service accounts"** tab
5. Click **"Generate new private key"**
6. Click **"Generate key"** in the confirmation dialog
7. A JSON file will download automatically

---

## 2. Configure the Backend

1. Rename the downloaded JSON file to `firebase-credentials.json`
2. Move it to the `backend/` folder:
   ```
   backend/
   ├── api.py
   ├── firebase_db.py
   ├── firebase-credentials.json  ← Place here
   └── ...
   ```

3. **Important:** This file contains sensitive credentials. It's already in `.gitignore` to prevent accidental commits.

---

## 3. Verify Connection

Test that Firebase is configured correctly:

```bash
cd backend
source ../.venv/bin/activate
python -c "import firebase_db; print('Firebase connected successfully!')"
```

If successful, you'll see: `Firebase connected successfully!`
