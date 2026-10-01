import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { contentHash } from "../evidence/build";
import { EvidenceRecord, OverrideEntry } from "../types";

export interface StoredImage {
  key: string;
  organization_id: string;
  bytes: Buffer;
  content_type: string;
}

export interface Store {
  save(record: EvidenceRecord, images: StoredImage[]): Promise<void>;
  get(organizationId: string, recordId: string): Promise<EvidenceRecord | null>;
  list(organizationId: string): Promise<EvidenceRecord[]>;
  getImage(organizationId: string, key: string): Promise<StoredImage | null>;
  addOverride(organizationId: string, recordId: string, override: OverrideEntry): Promise<EvidenceRecord | null>;
}

export class MemoryStore implements Store {
  private records: EvidenceRecord[] = [];
  private images: StoredImage[] = [];

  async save(record: EvidenceRecord, images: StoredImage[]): Promise<void> {
    this.records.push(record);
    this.images.push(...images);
  }

  async get(organizationId: string, recordId: string): Promise<EvidenceRecord | null> {
    return this.records.find((r) => r.organization_id === organizationId && r.record_id === recordId) ?? null;
  }

  async list(organizationId: string): Promise<EvidenceRecord[]> {
    return this.records.filter((r) => r.organization_id === organizationId);
  }

  async getImage(organizationId: string, key: string): Promise<StoredImage | null> {
    return this.images.find((img) => img.organization_id === organizationId && img.key === key) ?? null;
  }

  async addOverride(organizationId: string, recordId: string, override: OverrideEntry): Promise<EvidenceRecord | null> {
    const record = await this.get(organizationId, recordId);
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
    return record;
  }
}

export class FileBlobStore implements Store {
  constructor(private inner: Store, private dir: string) {}

  async save(record: EvidenceRecord, images: StoredImage[]): Promise<void> {
    for (const image of images) {
      if (!image.key.startsWith(`${image.organization_id}/`)) {
        throw new Error("image key escaped its organization");
      }
      const full = path.join(this.dir, image.key);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, image.bytes);
    }
    await this.inner.save(record, images.map((img) => ({ ...img, bytes: Buffer.alloc(0) })));
  }

  get(organizationId: string, recordId: string) {
    return this.inner.get(organizationId, recordId);
  }
  list(organizationId: string) {
    return this.inner.list(organizationId);
  }
  addOverride(organizationId: string, recordId: string, override: OverrideEntry) {
    return this.inner.addOverride(organizationId, recordId, override);
  }
  async getImage(organizationId: string, key: string): Promise<StoredImage | null> {
    const meta = await this.inner.getImage(organizationId, key);
    if (!meta) return null;
    if (!key.startsWith(`${organizationId}/`) || key.includes("..")) return null;
    const bytes = await readFile(path.join(this.dir, key));
    return { ...meta, bytes };
  }
}
