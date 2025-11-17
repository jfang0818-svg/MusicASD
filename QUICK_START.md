# 🚀 Quick Start Guide - musicASD

## What's Been Built

✅ **Backend (100% Complete)**
- User authentication with JWT
- Child profile management
- GPT-5.1 music element extraction
- Session tracking linked to children
- Azure Blob Storage integration

✅ **Frontend (60% Complete)**
- Gen-Z style login/register pages
- Auth context and API client
- Beautiful UI with animations

## Next Steps to Run the App

### 1. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create `backend/.env`:

```env
# Azure Storage (Get from Azure Portal)
AZURE_STORAGE_CONNECTION_STRING=your_connection_string_here
AZURE_CONTAINER_NAME=musicasd-container

# OpenAI API (Get from platform.openai.com)
OPENAI_API_KEY=your_openai_api_key_here
GPT_MODEL=gpt-5.1

# Security (Generate random strings)
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=10080

# Enable features
ENABLE_GPT_SUGGESTIONS=true
```

**How to get Azure Storage Connection String:**
1. Go to Azure Portal → Storage Accounts
2. Select your storage account
3. Click "Access keys" in left menu
4. Copy "Connection string" from Key1 or Key2

**How to get OpenAI API Key:**
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (you won't see it again!)

### 3. Start Backend

```bash
cd backend
python main.py
```

You should see:
```
🎵 musicASD MCP Server v2.0.0
✓ Azure Blob Storage initialized successfully
Music Library Status:
  calm: 6 files
  happy: 6 files
  energetic: 6 files
Server ready at http://localhost:8000
```

Visit `http://localhost:8000/docs` to see API documentation!

### 4. Install Frontend Dependencies

```bash
cd frontend
npm install
```

This will install all dependencies including `framer-motion`.

### 5. Configure Frontend

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 6. Start Frontend

```bash
cd frontend
npm run dev
```

You should see:
```
▲ Next.js 14.2.5
- Local:        http://localhost:3000
```

## 🎉 Test It Out!

### 1. Register a New Account

1. Go to `http://localhost:3000/register`
2. Fill in the form:
   - Name: Your name
   - Email: your@email.com
   - Password: At least 8 characters
3. Click "Create Account"
4. You'll be redirected to `/dashboard` (may be empty for now)

### 2. Test the API Directly

Go to `http://localhost:8000/docs` (FastAPI Swagger UI):

#### Create a Child Profile

1. Click on `POST /profile/child`
2. Click "Try it out"
3. Add your JWT token:
   - Click the green "Authorize" button at top right
   - In "HTTPBearer (http, Bearer)" enter: `Bearer YOUR_TOKEN`
   - Your token is in browser localStorage after login
4. Use this example body:

```json
{
  "demographics": {
    "name": "Alex",
    "age": 7,
    "gender": "Male",
    "race": "Asian",
    "diagnosis_date": "2020-03-15",
    "asd_level": "2",
    "comorbidities": ["ADHD"]
  },
  "sensory_sensitivities": {
    "sound_sensitivity": "high",
    "loud_noises_trigger": true,
    "sudden_sounds_trigger": true,
    "specific_triggers": "High-pitched sounds, sirens",
    "calming_sounds": "White noise, ocean waves"
  },
  "music_preferences": {
    "preferred_genres": ["classical", "ambient"],
    "preferred_instruments": ["piano", "violin"],
    "preferred_tempo": "slow",
    "disliked_music": ["heavy metal", "rap"]
  },
  "therapy_goals": {
    "goals": ["Improve emotional regulation", "Reduce anxiety"],
    "focus_areas": ["Sensory processing", "Communication"]
  }
}
```

5. Click "Execute"
6. Copy the `id` from the response (this is your `child_id`)

#### Analyze the Profile with GPT-5.1

1. Click on `POST /profile/child/{child_id}/analyze`
2. Paste the `child_id` from above
3. Click "Execute"
4. You'll get music element recommendations like:

```json
{
  "child_id": "abc123...",
  "elements": {
    "tempo_range": "60-80 BPM",
    "key": "C major",
    "instruments": ["piano", "soft strings", "nature sounds"],
    "dynamics": "soft to moderate",
    "mood": "calm, soothing",
    "avoid_elements": ["loud drums", "sudden changes", "dissonance"],
    "recommended_duration": "3-5 minutes",
    "style_tags": ["ambient", "classical", "nature"],
    "reasoning": "Based on high sound sensitivity..."
  },
  "analyzed_at": "2025-11-15T12:00:00"
}
```

#### Start a Session

1. Click on `POST /session/start`
2. Body:
```json
{
  "child_id": "your-child-id-here"
}
```
3. Click "Execute"
4. Session will start and link to that child!

## 🐛 Troubleshooting

### "Azure Storage connection string not configured"
- Make sure you added `AZURE_STORAGE_CONNECTION_STRING` to `backend/.env`
- Restart the backend server

### "OpenAI API key not found"
- Add `OPENAI_API_KEY` to `backend/.env`
- Make sure there's no extra spaces

### "Unauthorized" when calling profile endpoints
- Make sure you're logged in
- Copy the JWT token from browser's localStorage
- Add it to Swagger UI with "Authorize" button

### Frontend shows "Cannot read property..."
- Run `npm install` in frontend folder
- Make sure `framer-motion` is installed
- Restart the dev server

### Can't login after registering
- Check backend logs for errors
- Make sure `JWT_SECRET_KEY` is set in `.env`
- Try a different email if one was already registered

## 📚 What's Next?

The remaining frontend work needed:

1. **Child Profile Form** - UI to create/edit profiles
2. **Parent Dashboard** - Show all children with cards
3. **Profile Analysis Page** - Display GPT music recommendations
4. **Session Page Updates** - Select child before starting session

Check `IMPLEMENTATION_STATUS.md` for detailed implementation guide!

## 💡 Tips

- **Use the API docs** (`/docs`) - It's the easiest way to test backend
- **Check browser console** - Errors will show there
- **Check backend logs** - Terminal where you ran `python main.py`
- **LocalStorage** - Your JWT token is stored in browser's localStorage under `auth_token`

---

**Need help?** Check the detailed implementation status in `IMPLEMENTATION_STATUS.md`!
