# CivicPulse Backend API Documentation

## 1. Overview & Architecture
CivicPulse provides a reliable, secure, and maintainable civic issue management backend built on Node.js 22, Express, TypeScript, and SQLite 3 with Write-Ahead Logging (WAL) and enforced foreign keys.

- **Base URL**: `/api`
- **Authentication**: Supports `Authorization: Bearer <jwt_token>` and backwards-compatible `x-demo-user-id` header (validated against real SQL user records).
- **Default Port**: `3000` (`process.env.PORT`)
- **Database File**: `data/civic.sqlite`

---

## 2. Roles & Permissions
| Role | System Enum | Permissions |
| :--- | :--- | :--- |
| **Citizen** | `CITIZEN` | Submit complaints, view public issues, track personal issues, vote/endorse |
| **Panchayat Officer** | `PANCHAYAT_OFFICER` | Review complaints, update status, record meaningful actions, assign departments, add notes |
| **Supervisor** | `SUPERVISOR` | Inactivity cycle reviews, verify resolution evidence, generate maintenance plans, departmental escalation reviews |
| **District Reviewer** | `DISTRICT_REVIEWER` | Review District Review Queue (Level 3 escalations), disposition district actions, return complaints |
| **Administrator** | `ADMIN` | Full access, user management, SLA policy updates, emergency resolution verification bypass |

---

## 3. Complaint Lifecycle & Transitions
The state transitions are enforced by `LifecycleService`:
```
Submitted ───────────► Acknowledged ─────────► In Progress ─────────► Resolved ─────────► Closed
    │                       │                       │                     │
    ├─► Rejected            ├─► Blocked             ├─► Stalled           └─► Reopened
    ├─► More Info Required  ├─► Scheduled           ├─► Blocked
    └─► Escalated           ├─► Approved            └─► Deferred
                            └─► Deferred
```
*Note: Moving to `Closed` strictly requires verified resolution evidence or photographic proof.*

---

## 4. API Endpoints Reference

### Core & Health
- **`GET /api/health`**
  - **Access**: Public
  - **Response**:
    ```json
    {
      "status": "healthy",
      "timestamp": "2026-10-09T13:50:00.000Z",
      "platform": "CivicPulse Municipal Platform",
      "version": "2.0.0-production",
      "database": "SQLite 3 (WAL mode with relational foreign keys)",
      "scheduler": "Active in-process accountability escalation engine"
    }
    ```

### Authentication
- **`GET /api/auth/users`**
  - **Access**: Public / Demo
  - **Response**: `{ "users": User[] }`
- **`GET /api/auth/me`**
  - **Access**: Authenticated (`x-demo-user-id` or Bearer token)
  - **Response**: `{ "user": User }`
- **`POST /api/auth/register`**
  - **Payload**: `{ "name": "string", "email": "string", "password": "string", "role": "CITIZEN" | "PANCHAYAT_OFFICER" | ... }`
  - **Response**: `{ "success": true, "user": User, "token": "jwt_token" }`
- **`POST /api/auth/login`**
  - **Payload**: `{ "email": "string", "password": "string" }`
  - **Response**: `{ "success": true, "user": User, "token": "jwt_token" }`

### Complaints CRUD & Tracking
- **`GET /api/complaints`**
  - **Query Params**: `category`, `status`, `priority`, `department`, `locality`, `search`, `reporterId`
  - **Response**: `{ "complaints": Complaint[], "count": 16 }`
- **`GET /api/complaints/:id`**
  - **Response**: `{ "complaint": Complaint, "history": HistoryEntry[], "notes": Note[] }`
- **`GET /api/complaints/track/:reference`**
  - **Example**: `/api/complaints/track/CP-2026-001`
  - **Response**: Sanitized citizen tracking record with history and public notes.
- **`POST /api/complaints`**
  - **Payload**:
    ```json
    {
      "title": "Deep Pothole in Crosswalk",
      "description": "Hazardous road pothole posing vehicular damage risk.",
      "category": "road_damage",
      "address": "742 4th Ave",
      "locality": "Oakwood North",
      "safetyRisk": true
    }
    ```
  - **Response**: `{ "success": true, "complaint": Complaint, "message": "Registered with CP-2026-..." }`
- **`PATCH /api/complaints/:id/status`**
  - **Access**: Authorized Official / Admin
  - **Payload**: `{ "status": "In Progress", "publicUpdate": "Crew dispatched." }`
- **`PATCH /api/complaints/:id/priority`**
  - **Access**: Authorized Official / Admin
  - **Payload**: `{ "priority": "Critical", "overrideReason": "Near middle school zone entrance." }`
- **`PATCH /api/complaints/:id/assignment`**
  - **Access**: Authorized Official / Admin
  - **Payload**: `{ "department": "Public Works & Roads", "note": "Assigned to road maintenance squad." }`
- **`POST /api/complaints/:id/votes`**
  - **Access**: Citizen / Authenticated
  - **Response**: `{ "success": true, "votesCount": 15, "message": "Your endorsement was recorded successfully." }`
- **`POST /api/complaints/:id/notes`**
  - **Access**: Official / Admin
  - **Payload**: `{ "note": "Technician ordered replacement sleeve.", "visibility": "internal" | "public" }`
- **`GET /api/complaints/:id/history`**
  - **Response**: `{ "history": HistoryEntry[] }`
- **`GET /api/complaints/:id/timeline`**
  - **Response**: `{ "complaintId": "string", "reference": "CP-2026-001", "timeline": HistoryEntry[] }`

### Accountability & Escalation Engine
- **`POST /api/complaints/:id/actions`**
  - **Access**: Official / Admin
  - **Payload**:
    ```json
    {
      "actionType": "INSPECTION_COMPLETED",
      "description": "Physical inspection completed and repair scheduled.",
      "nextActionDeadlineHours": 48
    }
    ```
  - **Effect**: Resets `inactivity_cycle = 0`, updates status from `Stalled` to `In Progress`, and resets `next_action_deadline`.
- **`POST /api/complaints/:id/blocker`**
  - **Access**: Official / Admin
  - **Payload**:
    ```json
    {
      "reason": "Awaiting permit from Highway Authority",
      "responsibleParty": "State Highway Authority",
      "nextReviewDate": "2026-10-15T09:00:00Z"
    }
    ```
- **`GET /api/escalations`**
  - **Query Params**: `status`, `level`, `department`
  - **Response**: `{ "escalations": EscalationRecord[], "count": 1 }`
- **`GET /api/escalations/district-queue`**
  - **Access**: District Reviewer / Admin
  - **Response**: `{ "districtQueue": EscalationRecord[], "count": 1 }`
- **`PATCH /api/escalations/:id/status`**
  - **Access**: District Reviewer / Admin
  - **Payload**: `{ "escalationStatus": "RETURNED_TO_PANCHAYAT" | "CLOSED" | "ACTION_REQUIRED", "reviewOutcome": "..." }`
- **`POST /api/escalations/run-worker`**
  - **Effect**: Triggers the idempotent scheduled escalation cycle on-demand.

### Duplicate Detection
- **`GET /api/complaints/:id/duplicates`**
  - **Response**: Returns candidates matching category, Haversine proximity (< 300m), time window, and token similarity.
- **`POST /api/complaints/:id/duplicates/link`**
  - **Payload**: `{ "canonicalComplaintId": "cmp-001", "confidenceScore": 0.88, "reason": "Close vicinity on 4th Ave." }`
- **`POST /api/duplicates/:linkId/confirm`**
  - **Effect**: Creates shared `maintenance_issue_id` and groups underlying works while preserving individual complaint tracking IDs.

### Resource-Constrained Maintenance Planning
- **`POST /api/planning/generate`**
  - **Payload**:
    ```json
    {
      "budgetLimit": 15000,
      "crewCount": 4,
      "hoursPerCrew": 40,
      "department": "Public Works & Roads"
    }
    ```
  - **Response**: Returns greedy heuristic plan with resource utilization percentages, allocated items, deferred items with reasons, and FIFO baseline comparison.
- **`GET /api/planning/:id`**
  - **Response**: Detailed plan and items breakdown.

### Resolution Evidence & Verification
- **`POST /api/complaints/:id/evidence`**
  - **Payload**: `{ "evidenceType": "resolution", "fileBase64": "data:image/jpeg;base64,...", "filename": "repair.jpg" }`
  - **Validation**: Checks magic bytes (JPEG/PNG/WebP), rejects files > 5MB, calculates SHA-256 cryptographic hash.
- **`GET /api/evidence/:id/file`**
  - **Response**: Serves authentic evidence image with correct MIME header.
- **`POST /api/evidence/:id/verify`**
  - **Access**: Supervisory Official / Admin
  - **Payload**: `{ "decision": "verified" | "rejected", "reason": "...", "notes": "..." }`
- **`POST /api/complaints/:id/reopen`**
  - **Payload**: `{ "reason": "Pothole patch sinkage re-occurred after heavy rain." }`

### Analytics & Reporting
- **`GET /api/analytics`**
  - **Response**: Full `AnalyticsData` matching existing Transparency page specifications.
- **`GET /api/analytics/accountability`**
  - **Response**: Granular metrics on stalled issues, 3-cycle escalations, and district review backlog.
- **`POST /api/reset-demo-data`**
  - **Response**: Seeds SQL database with initial 16 verified complaints, users, and demo accounts.
