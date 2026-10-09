import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import { db } from '../db/connection.ts';

const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Validates actual file bytes to prevent MIME-type spoofing
 */
export function detectMimeTypeFromBuffer(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: RIFF ... WEBP
  const riff = buffer.toString('ascii', 0, 4);
  const webp = buffer.toString('ascii', 8, 12);
  if (riff === 'RIFF' && webp === 'WEBP') {
    return 'image/webp';
  }

  return null;
}

export interface SaveEvidenceInput {
  complaintId: string;
  evidenceType: 'initial' | 'resolution';
  originalFilename: string;
  buffer: Buffer;
  uploadedByUserId: string;
}

export class EvidenceService {
  constructor(private database: Database.Database = db) {}

  public saveEvidence(input: SaveEvidenceInput) {
    if (input.buffer.length > MAX_FILE_SIZE) {
      throw new Error(`File size (${(input.buffer.length / 1024 / 1024).toFixed(1)}MB) exceeds maximum permitted limit of 5MB.`);
    }

    const detectedMime = detectMimeTypeFromBuffer(input.buffer);
    if (!detectedMime || !ALLOWED_MIME_TYPES.has(detectedMime)) {
      throw new Error('Unsupported or fraudulent file content. Only authentic JPEG, PNG, and WebP images are permitted.');
    }

    const complaint = this.database
      .prepare('SELECT id, status FROM complaints WHERE id = ? OR reference = ?')
      .get(input.complaintId, input.complaintId) as any;

    if (!complaint) {
      throw new Error(`Complaint not found: ${input.complaintId}`);
    }

    const ext = detectedMime === 'image/jpeg' ? 'jpg' : detectedMime === 'image/png' ? 'png' : 'webp';
    const safeStorageName = `ev-${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const storagePath = path.join(UPLOADS_DIR, safeStorageName);

    // Cryptographic SHA-256 digest
    const sha256Hash = crypto.createHash('sha256').update(input.buffer).digest('hex');

    // Save to disk securely
    fs.writeFileSync(storagePath, input.buffer);

    const attachmentId = `att-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    const tx = this.database.transaction(() => {
      this.database
        .prepare(
          `INSERT INTO attachments (
            id, complaint_id, evidence_type, original_filename, storage_filename,
            storage_path, mime_type, size_bytes, sha256_hash, uploaded_by,
            uploaded_at, verification_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
        )
        .run(
          attachmentId,
          complaint.id,
          input.evidenceType,
          path.basename(input.originalFilename).slice(0, 100),
          safeStorageName,
          storagePath,
          detectedMime,
          input.buffer.length,
          sha256Hash,
          input.uploadedByUserId,
          now
        );

      // If initial evidence, update complaint image_url reference
      if (input.evidenceType === 'initial') {
        this.database
          .prepare('UPDATE complaints SET image_url = ?, updated_at = ? WHERE id = ?')
          .run(`/api/evidence/${attachmentId}/file`, now, complaint.id);
      } else if (input.evidenceType === 'resolution') {
        this.database
          .prepare('UPDATE complaints SET after_image_url = ?, updated_at = ? WHERE id = ?')
          .run(`/api/evidence/${attachmentId}/file`, now, complaint.id);
      }

      // Record in complaint history
      const histId = `hist-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
      this.database
        .prepare(
          `INSERT INTO complaint_history (
            id, complaint_id, previous_status, new_status, event_type,
            actor_id, actor_name, actor_role, public_update, explanation, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          histId,
          complaint.id,
          complaint.status,
          complaint.status,
          'EVIDENCE_UPLOADED',
          input.uploadedByUserId,
          'Civic Participant',
          'Verified Uploader',
          `New ${input.evidenceType} photographic evidence uploaded (SHA-256: ${sha256Hash.substring(0, 12)}...).`,
          `File size: ${(input.buffer.length / 1024).toFixed(1)} KB, MIME: ${detectedMime}`,
          now
        );
    });

    tx();

    return {
      id: attachmentId,
      complaintId: complaint.id,
      evidenceType: input.evidenceType,
      fileUrl: `/api/evidence/${attachmentId}/file`,
      sha256Hash,
      mimeType: detectedMime,
      sizeBytes: input.buffer.length,
      verificationStatus: 'pending',
    };
  }

  public verifyEvidence(params: {
    evidenceId: string;
    reviewer: { id: string; name: string; role: string };
    decision: 'verified' | 'rejected';
    reason?: string;
    notes?: string;
  }) {
    const att = this.database
      .prepare('SELECT * FROM attachments WHERE id = ?')
      .get(params.evidenceId) as any;

    if (!att) throw new Error('Evidence record not found.');

    if (params.decision === 'rejected' && (!params.reason || params.reason.trim().length < 5)) {
      throw new Error('A detailed reason is mandatory when rejecting resolution evidence.');
    }

    const complaint = this.database
      .prepare('SELECT * FROM complaints WHERE id = ?')
      .get(att.complaint_id) as any;

    const now = new Date().toISOString();
    const verId = `ver-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
    const histId = `hist-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;

    const tx = this.database.transaction(() => {
      this.database
        .prepare(
          `UPDATE attachments SET
            verification_status = ?,
            verified_by = ?,
            verification_reason = ?,
            verified_at = ?
           WHERE id = ?`
        )
        .run(params.decision, params.reviewer.id, params.reason || null, now, att.id);

      this.database
        .prepare(
          `INSERT INTO resolution_verifications (
            id, complaint_id, reviewer_id, status, rejection_reason, notes, verified_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          verId,
          att.complaint_id,
          params.reviewer.id,
          params.decision,
          params.decision === 'rejected' ? params.reason : null,
          params.notes || null,
          now
        );

      let targetStatus = complaint.status;
      let updateMsg = `Resolution evidence #${att.id.substring(0, 8)} ${params.decision.toUpperCase()}.`;

      if (params.decision === 'rejected') {
        // Evidence rejected: Send complaint back to In Progress
        targetStatus = 'In Progress';
        updateMsg = `Resolution evidence rejected: ${params.reason}. Issue reverted to "In Progress".`;

        this.database
          .prepare(
            `UPDATE complaints SET status = 'In Progress', resolved_at = null, updated_at = ? WHERE id = ?`
          )
          .run(now, complaint.id);
      }

      this.database
        .prepare(
          `INSERT INTO complaint_history (
            id, complaint_id, previous_status, new_status, event_type,
            actor_id, actor_name, actor_role, public_update, explanation, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          histId,
          complaint.id,
          complaint.status,
          targetStatus,
          params.decision === 'verified' ? 'EVIDENCE_VERIFIED' : 'EVIDENCE_REJECTED',
          params.reviewer.id,
          params.reviewer.name,
          params.reviewer.role || 'Supervisory Official',
          updateMsg,
          params.reason || params.notes || null,
          now
        );
    });

    tx();

    return { success: true, decision: params.decision, verificationId: verId };
  }

  public getEvidenceFile(evidenceId: string): { path: string; mimeType: string } | null {
    const att = this.database
      .prepare('SELECT storage_path, mime_type FROM attachments WHERE id = ?')
      .get(evidenceId) as any;

    if (!att || !fs.existsSync(att.storage_path)) return null;

    return { path: att.storage_path, mimeType: att.mime_type };
  }

  public listEvidenceForComplaint(complaintId: string) {
    return this.database
      .prepare('SELECT * FROM attachments WHERE complaint_id = ? ORDER BY uploaded_at ASC')
      .all(complaintId);
  }
}

export const evidenceService = new EvidenceService();
