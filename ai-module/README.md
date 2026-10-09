# CivicPulse AI Forensics & Severity Module (`ai-module/`)

A self-contained, decoupled AI module designed to perform:
1. **Real vs AI-Generated Image Forensics** (detects Midjourney, DALL-E, Stable Diffusion, FLUX synthetic smoothing & artifacts vs authentic optical grain/grit).
2. **Municipal Hazard Severity Triage** (Low / Medium / High / Critical rating with 0–100 score and rationale).

---

## 💡 Why This Exists (Merge-Conflict Proof)
When multiple teammates push modifications to the main GitHub repository, integrating code directly inside scattered server and client files often leads to merge conflicts whenever `git pull` is run.

`ai-module/` is entirely isolated in this single directory:
- **No dependencies on your teammate's internal database models or custom routers.**
- **Can run independently as a sidecar service on port `5001` or mounted with 1 line.**
- **If your team updates `server/` or `src/`, this module remains intact and unbroken.**

---

## 🚀 Usage Options

### Option 1: Standalone Microservice (Recommended for Zero Conflicts)
Run the AI engine as an independent local microservice on port **5001**:

```bash
npm run ai
# or
npx tsx ai-module/server.ts
```

Your frontend or any backend script can then call:
```http
POST http://localhost:5001/verify
Content-Type: application/json

{
  "title": "Severe road sinkhole",
  "category": "road_damage",
  "imageUrl": "data:image/jpeg;base64,..."
}
```

**Health Check:**
```http
GET http://localhost:5001/health
```

---

### Option 2: 1-Line Express Route Mount
If you want the AI endpoints served directly by your team's main Express server (`server.ts`):

```ts
import { aiRouter } from './ai-module';

// In server.ts:
app.use('/api/ai', aiRouter);
```
This exposes `POST /api/ai/verify` and `GET /api/ai/health`.

---

### Option 3: Direct TypeScript Import in Backend Code
You can import the triage engine directly anywhere:

```ts
import { verifyAndTriageImage } from './ai-module';

const result = await verifyAndTriageImage({
  title: 'Burst water pipe',
  category: 'water_supply',
  imageUrl: 'https://example.com/photo.jpg',
  safetyRisk: true,
});

console.log(result.isAuthentic);        // true / false
console.log(result.authenticityScore);  // 0 - 100
console.log(result.visualSeverity);     // 'Low' | 'Medium' | 'High' | 'Critical'
console.log(result.severityScore);       // 0 - 100
```

---

### Option 4: Drop-In React UI Component
Render the verified results cleanly without any dummy parameters:

```tsx
import { AIVerifierCard } from './ai-module';

<AIVerifierCard verification={verificationResult} />
```

Or compact badge mode:
```tsx
<AIVerifierCard verification={verificationResult} compact />
```

---

## 🔄 How to Pull Newer Code from GitHub Without Conflicts
Because `ai-module/` lives in its own dedicated directory:

1. When your teammates push changes to `main`:
   ```bash
   git pull origin main
   ```
2. Your `ai-module/` files will not conflict because your teammates haven't edited files inside `ai-module/`.
3. To test your application with the AI service:
   - Run the main app: `npm run dev` (Port 3000)
   - In another terminal: `npm run ai` (Port 5001)

---

## 🔑 Environment Variables
Create or verify your `.env` file contains:
```env
GEMINI_API_KEY=your_gemini_api_key_here
AI_PORT=5001
```
*(If no API key is provided, the engine automatically falls back to deterministic heuristic forensics so development is never blocked).*
