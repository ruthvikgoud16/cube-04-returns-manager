import { Pool, PoolClient } from "pg";
import { contentHash } from "../evidence/build";
import { EvidenceRecord, OverrideEntry } from "../types";
import { StoredImage, Store } from "./memoryStore";

export class PostgresStore implements Store {
  constructor(private pool: Pool) {}

  async save(record: EvidenceRecord, images: StoredImage[]): Promise<void> {
    await this.tx(record.organization_id, async (client) => {
      await client.query(
        `INSERT INTO return_records
          (record_id, organization_id, client_id, unit_id, captured_at, status, disposition, body)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          record.record_id,
          record.organization_id,
          record.client_id,
          record.subject.unit_id,
          record.captured_at,
          record.status,
          record.outcome.disposition,
          record,
        ]
      );
      for (const image of images) {
        await client.query(
          `INSERT INTO return_images (object_key, organization_id, record_id, content_type)
           VALUES ($1,$2,$3,$4)`,
          [image.key, image.organization_id, record.record_id, image.content_type]
        );
      }
    });
  }

  async get(organizationId: string, recordId: string): Promise<EvidenceRecord | null> {
    return this.tx(organizationId, async (client) => {
      const result = await client.query(`SELECT body FROM return_records WHERE record_id = $1`, [recordId]);
      return (result.rows[0]?.body as EvidenceRecord) ?? null;
    });
  }

  async list(organizationId: string): Promise<EvidenceRecord[]> {
    return this.tx(organizationId, async (client) => {
      const result = await client.query(`SELECT body FROM return_records ORDER BY captured_at DESC`);
      return result.rows.map((row) => row.body as EvidenceRecord);
    });
  }

  async getImage(organizationId: string, key: string): Promise<StoredImage | null> {
    return this.tx(organizationId, async (client) => {
      const result = await client.query(
        `SELECT object_key, organization_id, content_type FROM return_images WHERE object_key = $1`,
        [key]
      );
      const row = result.rows[0];
      if (!row) return null;
      return {
        key: row.object_key,
        organization_id: row.organization_id,
        content_type: row.content_type,
        bytes: Buffer.alloc(0),
      };
    });
  }

  async addOverride(organizationId: string, recordId: string, override: OverrideEntry): Promise<EvidenceRecord | null> {
    return this.tx(organizationId, async (client) => {
      const current = await client.query(`SELECT body FROM return_records WHERE record_id = $1`, [recordId]);
      const record = current.rows[0]?.body as EvidenceRecord | undefined;
      if (!record) return null;
      record.overrides.push(override);
      record.outcome = {
        ...record.outcome,
        disposition: override.revised_disposition,
        rationale: `${record.outcome.rationale} Override: ${override.reason}`,
      };
      const { content_hash, ...rest } = record;
      void content_hash;
      record.content_hash = contentHash(rest);
      await client.query(
        `UPDATE return_records SET body = $2, disposition = $3, status = $4 WHERE record_id = $1`,
        [recordId, record, record.outcome.disposition, record.status]
      );
      return record;
    });
  }

  private async tx<T>(organizationId: string, fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`SELECT set_config('app.organization_id', $1, true)`, [organizationId]);
      const value = await fn(client);
      await client.query("COMMIT");
      return value;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}
