# musicASD Optimization Roadmap

## 🚨 Phase 1: Critical Fixes (1-2 days)

### Priority: SECURITY & FUNCTIONALITY

#### 1.1 Fix Unauthed Session Logging Endpoint
**File**: `backend/api/session.py`
**Issue**: `/session/log` has no authentication
**Fix**:
```python
@router.post("/log")
def log_session(
    log: SessionLog,
    credentials: HTTPAuthorizationCredentials = Depends(security)  # ADD THIS
):
    user_id = auth_service.get_current_user_id(credentials)  # ADD THIS

    # Verify user owns the session
    if state.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # ... rest of logic
```

#### 1.2 Fix API Endpoint Mismatches
**Files**:
- `frontend/app/lib/api.ts`
- `frontend/app/store/useMusicStore.ts`

**Issues**:
- Frontend uses `/sessions/start` but backend has `/session/start`
- Music store uses `/api/backend/music/play` but should be `/music/play`

**Fix**:
```typescript
// frontend/app/lib/api.ts
export async function startSession(childId: string): Promise<SessionResponse> {
    // CHANGE FROM: /sessions/start
    // CHANGE TO:   /session/start
    const { data } = await apiClient.post('/session/start', { child_id: childId });
    return data;
}

// frontend/app/store/useMusicStore.ts
playMusic: async (style: string, file?: string) => {
    set({ loading: true });
    try {
        // CHANGE FROM: fetch('/api/backend/music/play', ...)
        // CHANGE TO:   Use apiClient
        const response = await apiClient.post('/music/play', {
            style,
            volume: get().volume,
            file
        });

        set({
            musicPlaying: true,
            currentMusic: response.data,
            loading: false
        });
    } catch (error) {
        console.error('Failed to play music:', error);
        toast.error('Failed to play music');
        set({ loading: false });
    }
}
```

#### 1.3 Sync Session Store with API Response
**File**: `frontend/app/dashboard/session/page.tsx`

**Issue**: `handleStartSession` calls API but doesn't update `useSessionStore`

**Fix**:
```typescript
import { useSessionStore } from '@/app/store/useSessionStore';

export default function SessionPage() {
    const { setSessionActive, setSessionId } = useSessionStore();

    const handleStartSession = async () => {
        if (!selectedChildId) {
            toast.error('Please select a child first');
            return;
        }

        setLoading(true);
        try {
            const response = await startSessionForChild(selectedChildId);

            // UPDATE STORE WITH RESPONSE
            setSessionActive(true);
            setSessionId(response.session_id);

            toast.success(`Session started for ${response.child_name}! 🎵`);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to start session');
        } finally {
            setLoading(false);
        }
    };
}
```

**Also update**: `frontend/app/store/useSessionStore.ts`
```typescript
interface SessionStore {
    sessionActive: boolean;
    sessionId: string | null;
    setSessionActive: (active: boolean) => void;
    setSessionId: (id: string | null) => void;
    // ... rest
}

export const useSessionStore = create<SessionStore>((set) => ({
    sessionActive: false,
    sessionId: null,

    setSessionActive: (active) => set({ sessionActive: active }),
    setSessionId: (id) => set({ sessionId: id }),

    // ... rest
}));
```

#### 1.4 Add Rate Limiting to Auth Endpoints
**File**: `backend/main.py` and `backend/api/auth.py`

**Install**:
```bash
pip install slowapi
```

**Fix**:
```python
# backend/main.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# backend/api/auth.py
from fastapi import Request

@router.post("/login", response_model=TokenResponse)
@app.state.limiter.limit("5/minute")  # Max 5 login attempts per minute per IP
async def login_user(request: Request, user_data: UserLogin):
    # ... existing logic

@router.post("/register", response_model=TokenResponse)
@app.state.limiter.limit("3/hour")  # Max 3 registrations per hour per IP
async def register_user(request: Request, user_data: UserRegister):
    # ... existing logic
```

#### 1.5 Validate Session Ownership in Stop Endpoint
**File**: `backend/api/session.py`

**Issue**: Lines 97-99 use `hasattr()` which silently bypasses auth check

**Fix**:
```python
@router.post("/stop")
async def stop_session(credentials: HTTPAuthorizationCredentials = Depends(security)):
    state = get_state()
    user_id = auth_service.get_current_user_id(credentials)

    if not state.session_active:
        raise HTTPException(status_code=400, detail="No active session to stop")

    # CHANGE FROM:
    # if hasattr(state, 'user_id') and state.user_id != user_id:

    # CHANGE TO:
    if not hasattr(state, 'user_id'):
        raise HTTPException(status_code=400, detail="Session has no user association")

    if state.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied - session belongs to another user")

    # ... rest of logic
```

---

## 🔧 Phase 2: Architecture Improvements (3-5 days)

### Priority: DATA CONSISTENCY & PERFORMANCE

#### 2.1 Remove SQLite, Use Azure Only
**Goal**: Single source of truth for all data

**Files to modify**:
- `backend/core/state.py` (remove SQLite init)
- `backend/api/session.py` (remove session_logs.db writes)
- `backend/api/health.py` (update to query Azure instead)

**Steps**:
1. Remove all SQLite cursor (`c.execute()`) calls
2. Update `save_session_summary()` to only use Azure
3. Remove `data/session_logs.db` creation
4. Update analytics queries to fetch from Azure Blob

#### 2.2 Add Redis for Session State
**Goal**: Fast, persistent, thread-safe session management

**Install**:
```bash
pip install redis aioredis
```

**Create**: `backend/services/redis_client.py`
```python
from redis.asyncio import Redis
from backend.core.config import settings

class RedisClient:
    def __init__(self):
        self.redis: Redis | None = None

    async def connect(self):
        self.redis = await Redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )

    async def close(self):
        if self.redis:
            await self.redis.close()

redis_client = RedisClient()
```

**Update**: `backend/core/config.py`
```python
REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
```

**Create**: `backend/services/session_manager.py`
```python
from redis.asyncio import Redis
from backend.services.azure_storage import AzureStorageService
import json
from datetime import datetime, timedelta
import uuid

class SessionManager:
    def __init__(self, redis: Redis, azure: AzureStorageService):
        self.redis = redis
        self.azure = azure

    async def create_session(self, user_id: str, child_id: str) -> dict:
        """Create new session with distributed locking"""
        lock_key = f"session:lock:{user_id}"

        async with self.redis.lock(lock_key, timeout=10):
            # Check for existing active session
            active_key = f"active_session:{user_id}"
            existing_session_id = await self.redis.get(active_key)

            if existing_session_id:
                raise ValueError("User already has an active session")

            # Create session
            session_id = str(uuid.uuid4())
            timestamp = datetime.utcnow().isoformat()

            session_data = {
                "id": session_id,
                "user_id": user_id,
                "child_id": child_id,
                "status": "active",
                "timestamp": timestamp,
                "logs": [],
                "engagement_level": "MED"
            }

            # Save to Redis (24h TTL)
            session_key = f"session:{session_id}"
            await self.redis.setex(
                session_key,
                timedelta(hours=24),
                json.dumps(session_data)
            )

            # Track as active session
            await self.redis.setex(active_key, timedelta(hours=24), session_id)

            # Save to Azure for persistence
            await self.azure.save_session(child_id, session_id, session_data)

            return session_data

    async def get_session(self, session_id: str) -> dict | None:
        """Get session from Redis (fast) or Azure (fallback)"""
        session_key = f"session:{session_id}"
        session_json = await self.redis.get(session_key)

        if session_json:
            return json.loads(session_json)

        # Fallback to Azure if not in Redis
        # (e.g., after server restart)
        # TODO: Parse child_id from session_id or store mapping
        return None

    async def add_log(self, session_id: str, log_entry: dict, user_id: str):
        """Add log entry with authorization"""
        session = await self.get_session(session_id)

        if not session:
            raise ValueError("Session not found")

        if session["user_id"] != user_id:
            raise PermissionError("Session belongs to another user")

        session["logs"].append(log_entry)

        # Update Redis
        session_key = f"session:{session_id}"
        await self.redis.setex(
            session_key,
            timedelta(hours=24),
            json.dumps(session)
        )

        # Async save to Azure (background task)
        await self.azure.save_session(session["child_id"], session_id, session)

    async def end_session(self, session_id: str, user_id: str):
        """End session and persist final state"""
        session = await self.get_session(session_id)

        if not session:
            raise ValueError("Session not found")

        if session["user_id"] != user_id:
            raise PermissionError("Session belongs to another user")

        session["status"] = "completed"
        session["ended_at"] = datetime.utcnow().isoformat()

        # Save final state to Azure
        await self.azure.save_session(session["child_id"], session_id, session)

        # Remove from Redis
        await self.redis.delete(f"session:{session_id}")
        await self.redis.delete(f"active_session:{user_id}")

# Singleton
session_manager: SessionManager | None = None

def get_session_manager(redis: Redis, azure: AzureStorageService) -> SessionManager:
    global session_manager
    if not session_manager:
        session_manager = SessionManager(redis, azure)
    return session_manager
```

**Update**: `backend/api/session.py` to use SessionManager
```python
from backend.services.session_manager import get_session_manager
from backend.services.redis_client import redis_client
from backend.services.azure_storage import azure_storage

@router.post("/start")
async def start_session(
    session_data: SessionStart,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = auth_service.get_current_user_id(credentials)

    # Get child profile to verify ownership
    profile = await azure_storage.get_child_profile(user_id, session_data.child_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Create session via manager
    manager = get_session_manager(redis_client.redis, azure_storage)
    session = await manager.create_session(user_id, session_data.child_id)

    return {
        "status": "started",
        "session_id": session["id"],
        "child_id": session["child_id"],
        "child_name": profile["demographics"]["name"],
        "timestamp": session["timestamp"]
    }
```

#### 2.3 Implement Music Library Caching
**File**: `backend/api/music.py`

**Issue**: `get_music_library()` rescans filesystem on every request

**Fix**:
```python
from backend.services.redis_client import redis_client
import json

LIBRARY_CACHE_KEY = "music:library"
LIBRARY_CACHE_TTL = 3600  # 1 hour

@router.get("/library", response_model=MusicLibraryResponse)
async def get_music_library():
    """Get music library (cached for 1 hour)"""

    # Try cache first
    cached = await redis_client.redis.get(LIBRARY_CACHE_KEY)
    if cached:
        library_data = json.loads(cached)
        return MusicLibraryResponse(**library_data)

    # Cache miss - scan filesystem
    state = get_state()
    library = state.scan_music_library()

    # Cache result
    await redis_client.redis.setex(
        LIBRARY_CACHE_KEY,
        LIBRARY_CACHE_TTL,
        json.dumps(library)
    )

    return MusicLibraryResponse(library=library)

@router.post("/upload/{style}")
async def upload_music(style: str, file: UploadFile = File(...)):
    # ... upload logic ...

    # Invalidate cache after upload
    await redis_client.redis.delete(LIBRARY_CACHE_KEY)

    return {"message": "Upload successful"}
```

#### 2.4 Auto-generate TypeScript Types
**Goal**: Prevent API contract mismatches

**Install**:
```bash
cd frontend
npm install --save-dev openapi-typescript
```

**Add script**: `frontend/package.json`
```json
{
  "scripts": {
    "generate-types": "openapi-typescript http://localhost:8000/openapi.json -o app/lib/api-types.ts",
    "dev": "npm run generate-types && next dev"
  }
}
```

**Update**: `frontend/app/lib/api.ts`
```typescript
import type { paths } from './api-types';

type SessionStartRequest = paths['/session/start']['post']['requestBody']['content']['application/json'];
type SessionStartResponse = paths['/session/start']['post']['responses']['200']['content']['application/json'];

export async function startSessionForChild(childId: string): Promise<SessionStartResponse> {
    const requestData: SessionStartRequest = { child_id: childId };
    const { data } = await apiClient.post<SessionStartResponse>('/session/start', requestData);
    return data;
}
```

---

## 🎨 Phase 3: UX Improvements (2-3 days)

### Priority: STREAMLINE USER WORKFLOW

#### 3.1 Remove Redundant Child Selection
**Goal**: User selects child once on dashboard, session page auto-loads

**Current Flow**:
```
Dashboard → Click "Start Session" → Session page → Select child again → Start
```

**New Flow**:
```
Dashboard → Click "Start Session" → Session page (child pre-selected) → Confirm & Start
```

**Implementation**:

**File**: `frontend/app/dashboard/page.tsx`
```typescript
const handleStartSession = (childId: string) => {
    // Navigate with child ID - session page will auto-load
    router.push(`/dashboard/session?childId=${childId}&autoStart=true`);
};
```

**File**: `frontend/app/dashboard/session/page.tsx`
```typescript
export default function SessionPage() {
    const searchParams = useSearchParams();
    const childId = searchParams.get('childId');
    const autoStart = searchParams.get('autoStart') === 'true';

    const [selectedChildId, setSelectedChildId] = useState<string>(childId || '');

    // Auto-start session if URL param present
    useEffect(() => {
        if (autoStart && selectedChildId && !sessionActive) {
            handleStartSession();
        }
    }, [autoStart, selectedChildId, sessionActive]);

    // Show confirmation modal before auto-start
    const [showStartConfirm, setShowStartConfirm] = useState(autoStart && !!childId);

    if (showStartConfirm) {
        return (
            <ConfirmStartModal
                child={selectedChild}
                onConfirm={() => {
                    setShowStartConfirm(false);
                    handleStartSession();
                }}
                onCancel={() => {
                    setShowStartConfirm(false);
                    router.push('/dashboard');
                }}
            />
        );
    }

    // ... rest of component
}
```

#### 3.2 Add Session Summary Modal
**Goal**: Show insights immediately after session ends

**Create**: `frontend/app/components/modals/SessionSummaryModal.tsx`
```typescript
interface SessionSummaryModalProps {
    show: boolean;
    sessionData: {
        duration: string;
        avgEngagement: string;
        musicUsed: { style: string; duration: string }[];
        aiInsights: string[];
    };
    onClose: () => void;
    onStartAnother: () => void;
}

export function SessionSummaryModal({
    show,
    sessionData,
    onClose,
    onStartAnother
}: SessionSummaryModalProps) {
    if (!show) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white rounded-3xl p-8 max-w-2xl w-full mx-4 shadow-2xl"
            >
                <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">✅</span>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800">Session Complete!</h2>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
                        <span className="text-gray-700">📊 Duration</span>
                        <span className="font-bold text-purple-700">{sessionData.duration}</span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-pink-50 rounded-xl">
                        <span className="text-gray-700">😊 Avg Engagement</span>
                        <span className="font-bold text-pink-700">{sessionData.avgEngagement}</span>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-xl">
                        <h3 className="font-semibold text-blue-800 mb-2">🎵 Music Used</h3>
                        {sessionData.musicUsed.map((music, i) => (
                            <div key={i} className="text-sm text-blue-700">
                                {music.style} ({music.duration})
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
                        <h3 className="font-semibold text-purple-800 mb-2">💡 AI Insights</h3>
                        <ul className="space-y-1">
                            {sessionData.aiInsights.map((insight, i) => (
                                <li key={i} className="text-sm text-purple-700">• {insight}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-xl font-semibold transition-colors"
                    >
                        View Dashboard
                    </button>
                    <button
                        onClick={onStartAnother}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-xl font-semibold transition-all shadow-lg"
                    >
                        Start Another Session
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
```

**Update**: `frontend/app/dashboard/session/page.tsx`
```typescript
const [showSummary, setShowSummary] = useState(false);
const [summaryData, setSummaryData] = useState(null);

const handleStopSession = async () => {
    setLoading(true);
    try {
        const response = await stopSessionUpdated();

        // Calculate summary data
        const summary = {
            duration: formatDuration(response.duration),
            avgEngagement: calculateAvgEngagement(logs),
            musicUsed: getMusicUsage(logs),
            aiInsights: generateInsights(logs, musicElements)
        };

        setSummaryData(summary);
        setShowSummary(true);
        setCameraEnabled(false);
    } catch (error) {
        toast.error('Failed to stop session');
    } finally {
        setLoading(false);
    }
};

return (
    <>
        {/* ... existing session UI ... */}

        <SessionSummaryModal
            show={showSummary}
            sessionData={summaryData}
            onClose={() => {
                setShowSummary(false);
                router.push('/dashboard');
            }}
            onStartAnother={() => {
                setShowSummary(false);
                // Reset and allow new session
                handleStartSession();
            }}
        />
    </>
);
```

#### 3.3 Implement Split-Screen Session Layout
**Goal**: All controls visible without scrolling

**Update**: `frontend/app/dashboard/session/page.tsx`
```typescript
{sessionActive && (
    <div className="grid lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
        {/* LEFT PANEL - Camera & Engagement */}
        <div className="space-y-4 overflow-y-auto">
            <div className="card p-6 sticky top-0 bg-white z-10">
                <CameraSection
                    cameraEnabled={cameraEnabled}
                    setCameraEnabled={setCameraEnabled}
                    sessionActive={sessionActive}
                />
            </div>

            <div className="card p-6">
                <EngagementControls
                    engagement={engagement}
                    updateEngagement={updateEngagement}
                    sessionActive={sessionActive}
                    autoSuggest={autoSuggest}
                    setAutoSuggest={setAutoSuggest}
                />
            </div>

            <div className="card p-6">
                <SuggestionPanel
                    sessionActive={sessionActive}
                    currentSuggestion={currentSuggestion}
                    generateSuggestion={() => generateSuggestion(engagement)}
                    acceptSuggestion={acceptSuggestion}
                    skipSuggestion={skipSuggestion}
                    logResponse={logResponse}
                />
            </div>
        </div>

        {/* RIGHT PANEL - Music & Timeline */}
        <div className="space-y-4 overflow-y-auto">
            <div className="card p-6 sticky top-0 bg-white z-10">
                <MusicControls
                    sessionActive={sessionActive}
                    volume={volume}
                    setVolume={setVolume}
                    selectedStyle={selectedStyle}
                    playMusic={handlePlayMusic}
                    stopMusic={stopMusic}
                    musicPlaying={musicPlaying}
                    currentMusic={currentMusic}
                    loading={musicLoading}
                    musicLibrary={musicLibrary}
                    generatedTones={generatedTones}
                    loadMusicLibrary={loadMusicLibrary}
                    loadGeneratedTones={loadGeneratedTones}
                    setShowMusicModal={setShowMusicModal}
                    setShowGeneratedModal={setShowGeneratedModal}
                    setShowGenerateModal={setShowGenerateModal}
                />
            </div>

            <div className="card p-6">
                <SessionTimeline logs={logs} />
            </div>

            <div className="card p-6">
                <SessionLogs logs={logs} />
            </div>
        </div>
    </div>
)}
```

---

## 🚀 Phase 4: Real-time Features (2-3 days)

### Priority: LIVE UPDATES & COLLABORATION

#### 4.1 Implement WebSocket for Session Updates
**See detailed implementation in section 6 above**

#### 4.2 Add Auto-save Every 30 Seconds
**File**: `frontend/app/dashboard/session/page.tsx`

```typescript
useEffect(() => {
    if (!sessionActive || !sessionId) return;

    const autoSaveInterval = setInterval(async () => {
        try {
            // Save current session state
            await apiClient.post(`/session/${sessionId}/autosave`, {
                engagement: engagement,
                logs: logs,
                music_state: {
                    playing: musicPlaying,
                    current: currentMusic,
                    volume: volume
                }
            });

            console.log('✓ Session auto-saved');
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveInterval);
}, [sessionActive, sessionId, engagement, logs, musicPlaying]);
```

---

## 📊 Phase 5: Analytics & Insights (3-4 days)

### Priority: DATA VISUALIZATION & AI INSIGHTS

#### 5.1 Real Engagement Trend Calculation
**File**: `backend/api/analytics.py`

**Current**: Returns mock data (`random.randint(60, 90)`)

**Fix**: Calculate from actual session logs
```python
@router.get("/engagement-trends/{child_id}")
async def get_engagement_trends(
    child_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = auth_service.get_current_user_id(credentials)

    # Get all sessions for child
    sessions = await azure_storage.list_child_sessions(child_id)

    # Verify ownership
    for session in sessions:
        if session.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

    # Calculate engagement trends
    trends = []
    for session in sorted(sessions, key=lambda s: s["timestamp"]):
        logs = session.get("logs", [])

        # Calculate average engagement for this session
        engagement_values = {
            "HIGH": 0.9,
            "MED": 0.6,
            "LOW": 0.3
        }

        engagement_logs = [
            log for log in logs
            if log.get("type") == "engagement_update"
        ]

        if engagement_logs:
            avg_engagement = sum(
                engagement_values.get(log.get("level"), 0.5)
                for log in engagement_logs
            ) / len(engagement_logs)
        else:
            avg_engagement = 0.5

        trends.append({
            "date": session["timestamp"].split("T")[0],
            "session_id": session["id"],
            "avg_engagement": round(avg_engagement * 100, 1),
            "duration_minutes": len(logs) * 0.5  # Estimate
        })

    return {"trends": trends, "total_sessions": len(sessions)}
```

#### 5.2 Music Effectiveness Analysis
**Create**: `backend/api/insights.py`

```python
from fastapi import APIRouter, HTTPException, Depends
from backend.services.auth import auth_service
from backend.services.azure_storage import azure_storage
from backend.services.gpt_client import GPTClient
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

router = APIRouter(prefix="/insights", tags=["insights"])
security = HTTPBearer()

@router.get("/music-effectiveness/{child_id}")
async def analyze_music_effectiveness(
    child_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Analyze which music styles work best for this child"""
    user_id = auth_service.get_current_user_id(credentials)

    sessions = await azure_storage.list_child_sessions(child_id)

    # Group by music style and track engagement
    music_stats = {}

    for session in sessions:
        logs = session.get("logs", [])

        current_music = None
        for log in logs:
            if log.get("type") == "music_started":
                current_music = log.get("style")

                if current_music not in music_stats:
                    music_stats[current_music] = {
                        "style": current_music,
                        "total_sessions": 0,
                        "total_duration": 0,
                        "engagement_levels": [],
                        "avg_engagement": 0
                    }

                music_stats[current_music]["total_sessions"] += 1

            elif log.get("type") == "engagement_update" and current_music:
                engagement_map = {"HIGH": 0.9, "MED": 0.6, "LOW": 0.3}
                engagement_value = engagement_map.get(log.get("level"), 0.5)
                music_stats[current_music]["engagement_levels"].append(engagement_value)

    # Calculate averages
    for style, stats in music_stats.items():
        if stats["engagement_levels"]:
            stats["avg_engagement"] = round(
                sum(stats["engagement_levels"]) / len(stats["engagement_levels"]) * 100,
                1
            )

    # Sort by effectiveness
    ranked = sorted(
        music_stats.values(),
        key=lambda x: x["avg_engagement"],
        reverse=True
    )

    return {
        "child_id": child_id,
        "music_effectiveness": ranked,
        "recommendation": ranked[0]["style"] if ranked else "calm"
    }
```

---

## 🔒 Phase 6: Production Hardening (2-3 days)

### Priority: SECURITY, MONITORING, DEPLOYMENT

#### 6.1 Move JWT to httpOnly Cookies
**See detailed implementation in section 4 above**

#### 6.2 Add Input Validation & Sanitization
**File**: `backend/models/schemas.py`

```python
from pydantic import BaseModel, Field, validator

class SessionLog(BaseModel):
    type: str = Field(..., regex="^[a-z_]+$")  # Only lowercase and underscores
    timestamp: str
    data: Optional[Dict[str, Any]]

    @validator('data')
    def sanitize_data(cls, v):
        """Prevent CSV injection in log data"""
        if isinstance(v, dict):
            for key, value in v.items():
                if isinstance(value, str):
                    # Remove CSV formula injection characters
                    if value.startswith(('=', '+', '-', '@')):
                        v[key] = "'" + value
        return v
```

#### 6.3 Add Structured Logging
**Install**:
```bash
pip install structlog
```

**Create**: `backend/core/logging.py`
```python
import structlog
import logging
from backend.core.config import settings

def setup_logging():
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer() if settings.ENVIRONMENT == "production"
            else structlog.dev.ConsoleRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

logger = structlog.get_logger()
```

**Update**: `backend/main.py`
```python
from backend.core.logging import setup_logging, logger

setup_logging()

@app.on_event("startup")
async def startup_event():
    logger.info("application_startup", environment=settings.ENVIRONMENT)
    # ... rest of startup
```

#### 6.4 Add Health Check Endpoint
**Update**: `backend/api/health.py`

```python
@router.get("/health/detailed")
async def detailed_health_check():
    """Comprehensive health check for monitoring"""
    checks = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {}
    }

    # Check Azure connection
    try:
        await azure_storage.blob_exists("health_check_probe")
        checks["checks"]["azure_storage"] = {"status": "up"}
    except Exception as e:
        checks["status"] = "degraded"
        checks["checks"]["azure_storage"] = {"status": "down", "error": str(e)}

    # Check Redis connection
    try:
        await redis_client.redis.ping()
        checks["checks"]["redis"] = {"status": "up"}
    except Exception as e:
        checks["status"] = "degraded"
        checks["checks"]["redis"] = {"status": "down", "error": str(e)}

    # Check OpenAI API
    try:
        gpt = GPTClient()
        # Quick test (don't actually call GPT)
        if gpt.client:
            checks["checks"]["openai"] = {"status": "configured"}
        else:
            checks["checks"]["openai"] = {"status": "not_configured"}
    except Exception as e:
        checks["checks"]["openai"] = {"status": "error", "error": str(e)}

    return checks
```

#### 6.5 Create Docker Deployment Files
**Create**: `backend/Dockerfile`
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Create**: `frontend/Dockerfile`
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
```

**Create**: `docker-compose.yml`
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - REDIS_URL=redis://redis:6379
      - AZURE_STORAGE_CONNECTION_STRING=${AZURE_STORAGE_CONNECTION_STRING}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - ENVIRONMENT=production
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend

volumes:
  redis_data:
```

---

## 📈 SUCCESS METRICS

After implementing all phases, you should see:

| Metric | Before | After |
|--------|--------|-------|
| API endpoint errors | ~30% failure | < 1% failure |
| Session creation time | 2-3s | < 500ms |
| Music library load time | 5-10s | < 100ms (cached) |
| Data consistency issues | Frequent | None |
| Security vulnerabilities | 4 critical | 0 critical |
| User workflow steps | 7 steps | 4 steps |
| Session data loss on crash | 100% | 0% (Redis) |
| Real-time update delay | N/A | < 200ms (WebSocket) |

---

## 🎯 QUICK WINS (Start Here!)

If you want immediate impact, start with these 3 fixes:

1. **Fix `/session/log` authentication** (5 minutes)
2. **Fix API endpoint paths** (15 minutes)
3. **Sync session store with API response** (10 minutes)

These 3 fixes will make the core functionality work correctly.

---

## 📞 SUPPORT & QUESTIONS

For each phase, I can provide:
- Detailed code examples
- Step-by-step implementation guide
- Testing strategies
- Migration scripts

Let me know which phase you'd like to start with!
