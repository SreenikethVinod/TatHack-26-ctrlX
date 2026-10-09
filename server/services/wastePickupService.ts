import Database from 'better-sqlite3';
import { db as defaultDb } from '../db/connection.ts';
import { notificationService } from './notificationService.ts';

export interface CreatePickupInput {
  userId: string;
  userName: string;
  userPhone: string;
  userEmail?: string;
  wasteType: string;
  estimatedWeight?: string;
  pickupDate: string;
  timeSlot: string;
  address: string;
  locality: string;
  pincode?: string;
  specialInstructions?: string;
  imageUrl?: string;
}

export interface WastePickupRecord {
  id: string;
  reference: string;
  userId: string;
  userName: string;
  userPhone: string;
  userEmail: string | null;
  wasteType: string;
  estimatedWeight: string | null;
  pickupDate: string;
  timeSlot: string;
  address: string;
  locality: string;
  pincode: string | null;
  specialInstructions: string | null;
  imageUrl: string | null;
  status: 'Requested' | 'Scheduled' | 'Dispatched' | 'Completed' | 'Cancelled';
  assignedCrew: string | null;
  assignedVehicle: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

function mapRow(row: any): WastePickupRecord {
  return {
    id: row.id,
    reference: row.reference,
    userId: row.user_id,
    userName: row.user_name,
    userPhone: row.user_phone,
    userEmail: row.user_email || null,
    wasteType: row.waste_type,
    estimatedWeight: row.estimated_weight || null,
    pickupDate: row.pickup_date,
    timeSlot: row.time_slot,
    address: row.address,
    locality: row.locality,
    pincode: row.pincode || null,
    specialInstructions: row.special_instructions || null,
    imageUrl: row.image_url || null,
    status: row.status as any,
    assignedCrew: row.assigned_crew || null,
    assignedVehicle: row.assigned_vehicle || null,
    notes: row.notes || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at || null,
  };
}

export class WastePickupService {
  constructor(private db: Database.Database = defaultDb) {}

  public generateReference(): string {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `WM-${year}-${rand}`;
  }

  public createPickup(input: CreatePickupInput): WastePickupRecord {
    const id = `wp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const reference = this.generateReference();
    const now = new Date().toISOString();

    // Recommend vehicle and crew based on waste type
    let assignedCrew = 'Ward Sanitation Rapid Crew';
    let assignedVehicle = 'EcoVan Compactor #04';

    if (input.wasteType === 'bulk_furniture') {
      assignedCrew = 'Heavy Salvage & Moving Squad';
      assignedVehicle = 'Hydraulic Flatbed Truck #07';
    } else if (input.wasteType === 'electronic_waste') {
      assignedCrew = 'E-Waste Certified Unit';
      assignedVehicle = 'Secure Hazardous Transporter #02';
    } else if (input.wasteType === 'construction_debris') {
      assignedCrew = 'Heavy Debris Clearing Crew';
      assignedVehicle = 'Hydraulic Tipper Dump Truck #05';
    } else if (input.wasteType === 'garden_green') {
      assignedCrew = 'Green Waste & Composting Unit';
      assignedVehicle = 'Mulcher Tipper Van #12';
    } else if (input.wasteType === 'hazardous_chemical') {
      assignedCrew = 'Chemical & Bio-Safety Crew';
      assignedVehicle = 'Hazardous Containment Truck #01';
    }

    const stmt = this.db.prepare(`
      INSERT INTO waste_pickups (
        id, reference, user_id, user_name, user_phone, user_email,
        waste_type, estimated_weight, pickup_date, time_slot,
        address, locality, pincode, special_instructions, image_url,
        status, assigned_crew, assigned_vehicle, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Requested', ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      reference,
      input.userId,
      input.userName,
      input.userPhone,
      input.userEmail || null,
      input.wasteType,
      input.estimatedWeight || 'Medium (10-30 kg)',
      input.pickupDate,
      input.timeSlot,
      input.address,
      input.locality,
      input.pincode || null,
      input.specialInstructions || null,
      input.imageUrl || null,
      assignedCrew,
      assignedVehicle,
      now,
      now
    );

    // Notify user of confirmation
    try {
      const notifId = `notif-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      this.db.prepare(`
        INSERT INTO notifications (id, user_id, complaint_id, complaint_reference, complaint_title, type, title, message, read, created_at)
        VALUES (?, ?, ?, ?, ?, 'WASTE_PICKUP_BOOKED', 'Waste Collection Scheduled', ?, 0, ?)
      `).run(
        notifId,
        input.userId,
        id,
        reference,
        `Waste Pickup: ${input.wasteType.replace('_', ' ').toUpperCase()}`,
        `Your on-demand waste pickup (${reference}) is booked for ${input.pickupDate} during ${input.timeSlot}. Assigned vehicle: ${assignedVehicle}.`,
        now
      );
    } catch (e) {
      console.warn('Could not create notification for pickup', e);
    }

    return this.getPickupById(id)!;
  }

  public listPickups(filter?: { userId?: string; status?: string; search?: string }): WastePickupRecord[] {
    let sql = 'SELECT * FROM waste_pickups WHERE 1=1';
    const params: any[] = [];

    if (filter?.userId) {
      sql += ' AND user_id = ?';
      params.push(filter.userId);
    }

    if (filter?.status && filter.status !== 'all') {
      sql += ' AND status = ?';
      params.push(filter.status);
    }

    if (filter?.search?.trim()) {
      const term = `%${filter.search.trim().toLowerCase()}%`;
      sql += ' AND (LOWER(reference) LIKE ? OR LOWER(address) LIKE ? OR LOWER(locality) LIKE ? OR LOWER(waste_type) LIKE ?)';
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY datetime(created_at) DESC';

    const rows = this.db.prepare(sql).all(...params);
    return rows.map(mapRow);
  }

  public getPickupById(idOrRef: string): WastePickupRecord | null {
    const row = this.db.prepare(
      'SELECT * FROM waste_pickups WHERE id = ? OR reference = ?'
    ).get(idOrRef, idOrRef);
    return row ? mapRow(row) : null;
  }

  public updateStatus(
    id: string,
    update: {
      status: 'Requested' | 'Scheduled' | 'Dispatched' | 'Completed' | 'Cancelled';
      assignedCrew?: string;
      assignedVehicle?: string;
      notes?: string;
    }
  ): WastePickupRecord | null {
    const current = this.getPickupById(id);
    if (!current) return null;

    const now = new Date().toISOString();
    const completedAt = update.status === 'Completed' ? now : current.completedAt;

    this.db.prepare(`
      UPDATE waste_pickups
      SET status = ?,
          assigned_crew = COALESCE(?, assigned_crew),
          assigned_vehicle = COALESCE(?, assigned_vehicle),
          notes = COALESCE(?, notes),
          completed_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      update.status,
      update.assignedCrew || null,
      update.assignedVehicle || null,
      update.notes || null,
      completedAt,
      now,
      id
    );

    // Send status update notification to citizen
    try {
      const notifId = `notif-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      this.db.prepare(`
        INSERT INTO notifications (id, user_id, complaint_id, complaint_reference, complaint_title, type, title, message, read, created_at)
        VALUES (?, ?, ?, ?, ?, 'WASTE_PICKUP_STATUS', 'Waste Pickup Status Updated', ?, 0, ?)
      `).run(
        notifId,
        current.userId,
        current.id,
        current.reference,
        `Waste Pickup: ${current.wasteType.toUpperCase()}`,
        `Your collection order ${current.reference} status is now: ${update.status}. Crew: ${update.assignedCrew || current.assignedCrew}.`,
        now
      );
    } catch (e) {
      console.warn('Could not notify status update', e);
    }

    return this.getPickupById(id);
  }

  public cancelPickup(id: string, userId?: string): { success: boolean; message: string } {
    const current = this.getPickupById(id);
    if (!current) {
      return { success: false, message: 'Pickup booking not found' };
    }

    if (userId && current.userId !== userId) {
      return { success: false, message: 'Unauthorized to cancel this booking' };
    }

    if (current.status === 'Completed') {
      return { success: false, message: 'Cannot cancel a completed pickup' };
    }

    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE waste_pickups
      SET status = 'Cancelled', updated_at = ?
      WHERE id = ?
    `).run(now, id);

    return { success: true, message: 'Waste pickup cancelled successfully' };
  }

  public getStats(): {
    totalBookings: number;
    completed: number;
    dispatched: number;
    pending: number;
    ecoDivertedKg: number;
  } {
    const totalRow = this.db.prepare('SELECT count(*) as c FROM waste_pickups').get() as any;
    const completedRow = this.db.prepare("SELECT count(*) as c FROM waste_pickups WHERE status = 'Completed'").get() as any;
    const dispatchedRow = this.db.prepare("SELECT count(*) as c FROM waste_pickups WHERE status IN ('Dispatched', 'Scheduled')").get() as any;
    const pendingRow = this.db.prepare("SELECT count(*) as c FROM waste_pickups WHERE status = 'Requested'").get() as any;

    const completedCount = completedRow?.c || 0;
    // Each completed bulk pickup diverts approximately 45 kg on average from landfills
    const ecoDivertedKg = completedCount * 45;

    return {
      totalBookings: totalRow?.c || 0,
      completed: completedCount,
      dispatched: dispatchedRow?.c || 0,
      pending: pendingRow?.c || 0,
      ecoDivertedKg,
    };
  }
}

export const wastePickupService = new WastePickupService();
