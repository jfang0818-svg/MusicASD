# Project ASD MVP - Quick Start Guide

## 🚀 Installation

### Prerequisites
- Python 3.8+
- Node.js 14+
- Windows/Mac/Linux

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

## 🎯 Running the Application

### Start Backend Server

```bash
cd backend
python main.py
# Server runs on http://localhost:8000
```

### Start Frontend Dashboard

```bash
cd frontend
npm start
# Dashboard opens on http://localhost:3000
```

## 📱 Using Project ASD

### 1. Start a Session
- Click "Start Session" in the dashboard
- Session ID will be generated automatically

### 2. Set Engagement Level
- Manually select LOW/MED/HIGH based on child's state
- This simulates future MediaPipe integration

### 3. Get GPT Suggestions
- Click "Get GPT Suggestion"
- GPT will analyze engagement and suggest music + phrase
- Uses MCP protocol for safe, controlled interaction

### 4. Caregiver Actions
- **Accept**: Play the suggested music
- **Skip**: Ignore suggestion, wait for next
- **Modify**: Choose different music style

### 5. Log Responses
- Click Worked/Neutral/Didn't Work after each activity
- All data saved to CSV for analysis

### 6. Audio Modes
- **Generated**: Programmatic tones (no files needed)
- **Files**: Play custom audio files from assets/music/

## 🔧 Configuration

### Audio Settings
Edit `backend/audio_generator.py`:
- `volume`: 0.0 to 1.0
- `sample_rate`: Default 44100

### Safety Features (Optional)
Edit `backend/main.py`:
- Rate limiting: 10 second cooldown between suggestions
- Volume controls: In-app volume adjustment
- Emergency stop: Stop All button always available

## 📊 Data Analysis

Run the Jupyter notebook:
```bash
cd notebooks
jupyter notebook analysis.ipynb
```

Analyzes:
- Acceptance rates by engagement level
- Music style effectiveness
- Session patterns
- Engagement transitions

## 🎵 Adding Custom Music

Place audio files in:
- `assets/music/calm/` - Calming tracks
- `assets/music/happy/` - Upbeat tracks
- `assets/music/energetic/` - High-energy tracks

Supported formats: WAV, MP3

## 🔍 MCP Protocol Details

The system uses three MCP tools:

1. **engagement.read**
   - Returns: LOW/MED/HIGH
   - Used by GPT to assess current state

2. **music.play**
   - Input: {style: "calm|happy|energetic"}
   - Triggers audio playback

3. **session.log**
   - Records all events to CSV
   - Maintains therapy session history

## 📝 Session Data

All sessions saved to `data/sessions.csv` with:
- Timestamp
- Session ID
- Event type
- Engagement level
- Music style
- Caregiver notes
- Response outcomes

## ⚠️ Troubleshooting

### Backend won't start
- Check Python version (3.8+)
- Verify OPENAI_API_KEY in .env
- Install missing dependencies

### No audio playback
- Check sounddevice installation: `pip install sounddevice`
- Verify audio permissions
- Try switching to file mode

### Frontend connection issues
- Ensure backend is running on port 8000
- Check CORS settings in backend
- Verify no firewall blocking

## 📚 API Endpoints

- `POST /session` - Start/stop sessions
- `POST /engagement` - Update engagement level
- `POST /gpt/suggest` - Get GPT suggestion
- `POST /caregiver/action` - Record caregiver response
- `POST /music/control` - Audio controls
- `GET /data/export` - Export session data

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation
3. Examine session logs in data/sessions.csv

## 📄 License

MIT License - Use freely for therapy and research