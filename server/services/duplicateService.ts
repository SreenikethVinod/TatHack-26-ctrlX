import Database from 'better-sqlite3';
import { db } from '../db/connection.ts';

export interface DuplicateMatch {
  candidateComplaintId: string;
  candidateReference: string;
  candidateTitle: string;
  category: string;
  confidenceScore: number;
  distanceMeters: number | null;
  daysDifference: number;
  reasons: string[];
}

// Haversine distance in meters
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of Earth in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Tokenized Jaccard similarity for textual descriptions
export function tokenSimilarity(text1: string, text2: string): number {
  const stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'of', 'with', 'near',
  ]);

  const tokenize = (t: string) =>
    new Set(
      t
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w))
    );

  const set1 = tokenize(text1);
  const set2 = tokenize(text2);

  if (set1.size === 0 || set2.size === 0) return 0;

  let intersection = 0;
  for (const item of set1) {
    if (set2.has(item)) intersection++;
  }

  const union = set1.size + set2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export class DuplicateService {
  constructor(private database: Database.Database = db) {}

  public findPotentialDuplicates(complaintId: string): DuplicateMatch[] {
    const target = this.database
      .prepare('SELECT * FROM complaints WHERE id = ? OR reference = ?')
      .get(complaintId, complaintId) as any;

    if (!target) return [];

    const candidates = this.database
      .prepare(
        `SELECT * FROM complaints
         WHERE id != ? AND category = ? AND status NOT IN ('Rejected')`
      )
      .all(target.id, target.category) as any[];

    const matches: DuplicateMatch[] = [];

    const targetTime = new Date(target.created_at).getTime();
    const targetText = `${target.title} ${target.description}`;

    for (const cand of candidates) {
      const reasons: string[] = [];
      let geoScore = 0;
      let distanceMeters: number | null = null;

      if (
        target.latitude !== null &&
        target.longitude !== null &&
        cand.latitude !== null &&
        cand.longitude !== null
      ) {
        distanceMeters = haversineDistanceMeters(
          target.latitude,
          target.longitude,
          cand.latitude,
          cand.longitude
        );

        if (distanceMeters <= 100) {
          geoScore = 1.0;
          reasons.push(`Geographic Proximity: Within ${distanceMeters}m of existing report.`);
        } else if (distanceMeters <= 300) {
          geoScore = 0.7;
          reasons.push(`Geographic Proximity: Close vicinity (${distanceMeters}m).`);
        } else if (distanceMeters <= 600) {
          geoScore = 0.4;
        }
      } else if (target.locality && cand.locality && target.locality.toLowerCase() === cand.locality.toLowerCase()) {
        geoScore = 0.5;
        reasons.push(`Matching Neighborhood / Locality: ${target.locality}.`);
      }

      // Time score
      const candTime = new Date(cand.created_at).getTime();
      const daysDiff = Math.abs((targetTime - candTime) / (1000 * 60 * 60 * 24));
      let timeScore = 0.3;
      if (daysDiff <= 3) {
        timeScore = 1.0;
        reasons.push(`Time Window: Submitted within ${Math.round(daysDiff * 10) / 10} days of each other.`);
      } else if (daysDiff <= 14) {
        timeScore = 0.7;
        reasons.push(`Time Window: Submitted within 2 weeks.`);
      }

      // Text similarity
      const candText = `${cand.title} ${cand.description}`;
      const textScore = tokenSimilarity(targetText, candText);
      if (textScore >= 0.3) {
        reasons.push(`Textual Keyword Overlap: ${(textScore * 100).toFixed(0)}% semantic token overlap.`);
      }

      // Composite Confidence Score: 40% Geo, 35% Text, 15% Time, 10% Category
      const confidence = 0.4 * geoScore + 0.35 * textScore + 0.15 * timeScore + 0.1 * 1.0;

      if (confidence >= 0.55 || (geoScore >= 0.7 && textScore >= 0.25)) {
        matches.push({
          candidateComplaintId: cand.id,
          candidateReference: cand.reference,
          candidateTitle: cand.title,
          category: cand.category,
          confidenceScore: Math.round(confidence * 100) / 100,
          distanceMeters,
          daysDifference: Math.round(daysDiff * 10) / 10,
          reasons,
        });
      }
    }

    return matches.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  public linkDuplicate(params: {
    complaintId: string;
    canonicalComplaintId: string;
    confidenceScore: number;
    reason: string;
    actorId?: string;
  }) {
    const id = `dup-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    this.database
      .prepare(
        `INSERT INTO complaint_duplicate_links (
          id, complaint_id, canonical_complaint_id, confidence_score,
          similarity_reason, confirmed_by, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'suggested', ?)
        ON CONFLICT(complaint_id, canonical_complaint_id) DO UPDATE SET
          confidence_score = excluded.confidence_score,
          similarity_reason = excluded.similarity_reason`
      )
      .run(
        id,
        params.complaintId,
        params.canonicalComplaintId,
        params.confidenceScore,
        params.reason,
        params.actorId || null,
        now
      );

    const actual = this.database
      .prepare('SELECT id, status FROM complaint_duplicate_links WHERE complaint_id = ? AND canonical_complaint_id = ?')
      .get(params.complaintId, params.canonicalComplaintId) as any;

    return { id: actual.id, status: actual.status };
  }

  public confirmDuplicate(linkId: string, confirmedByUserId: string) {
    const link = this.database
      .prepare('SELECT * FROM complaint_duplicate_links WHERE id = ?')
      .get(linkId) as any;

    if (!link) throw new Error('Duplicate link not found.');

    const canonical = this.database
      .prepare('SELECT * FROM complaints WHERE id = ?')
      .get(link.canonical_complaint_id) as any;

    const duplicate = this.database
      .prepare('SELECT * FROM complaints WHERE id = ?')
      .get(link.complaint_id) as any;

    const now = new Date().toISOString();

    // Create or retrieve underlying maintenance issue
    let issueId = canonical.maintenance_issue_id;
    if (!issueId) {
      issueId = `mi-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      this.database
        .prepare(
          `INSERT INTO maintenance_issues (id, title, category, locality, status, primary_complaint_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'OPEN', ?, ?, ?)`
        )
        .run(
          issueId,
          canonical.title,
          canonical.category,
          canonical.locality,
          canonical.id,
          now,
          now
        );

      this.database
        .prepare('UPDATE complaints SET maintenance_issue_id = ? WHERE id = ?')
        .run(issueId, canonical.id);
    }

    const tx = this.database.transaction(() => {
      this.database
        .prepare(
          `UPDATE complaints SET maintenance_issue_id = ?, updated_at = ? WHERE id = ?`
        )
        .run(issueId, now, duplicate.id);

      this.database
        .prepare(
          `UPDATE complaint_duplicate_links SET
            maintenance_issue_id = ?,
            status = 'confirmed',
            confirmed_by = ?
           WHERE id = ?`
        )
        .run(issueId, confirmedByUserId, linkId);
    });

    tx();

    return { success: true, maintenanceIssueId: issueId, status: 'confirmed' };
  }
}

export const duplicateService = new DuplicateService();
