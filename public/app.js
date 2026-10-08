/* global fetch, document, URLSearchParams */
const CHECK_LABELS = {
  identity: "Identity",
  completeness: "Completeness",
  condition: "Condition",
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}

function fmtList(list) {
  if (!list || !list.length) return "none";
  return list.join(", ");
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ReturnsDesk = {
  org: "",
  lastRecord: null,

  EXAMPLES: {
    "RTN-019": {
      title: "RTN-019 · NOVA hair straightener",
      disposition: "restock",
      grade: "used_very_good",
      product_name: "NOVA hair straightener",
      unit_id: "RTN-019",
      note: "Saved evaluation. Not a new model call. Both labelers agreed: identity PASS, completeness PASS, condition Very Good. policy_v1 restocked a complete Very Good unit.",
      checks: [
        { check_key: "identity", verdict: "PASS", detail: "Looks like the named NOVA hair straightener." },
        { check_key: "completeness", verdict: "PASS", detail: "Straightener, cord, and NOVA box were visible to both labelers." },
        { check_key: "condition", verdict: "PASS", detail: "Amazon grade used_very_good, same as both labelers." },
      ],
    },
    "RTN-001": {
      title: "RTN-001 · Samsung Book laptop",
      disposition: "pending_review",
      grade: "used_very_good",
      product_name: "Samsung Book laptop",
      unit_id: "RTN-001",
      note: "Saved evaluation. Not a new model call. Identity passed. Completeness stayed UNCERTAIN because the adapter and box were not clearly shown. UNCERTAIN is not a pass, so policy_v1 held it.",
      checks: [
        { check_key: "identity", verdict: "PASS", detail: "Both labelers also said the laptop matched." },
        { check_key: "completeness", verdict: "UNCERTAIN", detail: "A cable is visible. The adapter and box are not clear." },
        { check_key: "condition", verdict: "PASS", detail: "Amazon grade used_very_good, same as both labelers." },
      ],
    },
  },

  init() {
    const params = new URLSearchParams(location.search);
    document.getElementById("btnAlpha").onclick = () => this.enterOrg("org_demo_alpha");
    document.getElementById("btnBravo").onclick = () => this.enterOrg("org_demo_bravo");
    document.getElementById("show-019").onclick = () => this.showSaved("RTN-019");
    document.getElementById("show-001").onclick = () => this.showSaved("RTN-001");
    document.getElementById("toggleJson").onclick = () => {
      const el = document.getElementById("jsonDump");
      el.hidden = !el.hidden;
      if (!el.hidden && this.lastRecord) {
        el.textContent = JSON.stringify(this.buildRound3Preview(this.lastRecord), null, 2);
      }
    };

    const lb = document.getElementById("lightbox");
    document.getElementById("lbClose").onclick = () => {
      lb.classList.remove("open");
      lb.hidden = true;
    };
    lb.onclick = (e) => {
      if (e.target === lb) {
        lb.classList.remove("open");
        lb.hidden = true;
      }
    };

    document.querySelector("input[name=photos]").addEventListener("change", (event) => {
      const box = document.getElementById("previews");
      box.innerHTML = "";
      const files = [...event.target.files].slice(0, 8);
      const notes = [];
      for (const file of files) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.onload = () => {
          if (img.naturalWidth < 480 || img.naturalHeight < 480) notes.push(file.name + " is too small to grade");
          document.getElementById("frameNote").textContent = notes.join(". ");
        };
        box.appendChild(img);
      }
    });

    document.getElementById("capture").addEventListener("submit", (e) => this.onGrade(e));

    if (params.get("org") === "org_demo_alpha" || params.get("org") === "org_demo_bravo") {
      this.enterOrg(params.get("org"));
    }
  },

  async enterOrg(organization_id) {
    const res = await fetch("/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ organization_id }),
    });
    if (!res.ok) return;
    this.org = organization_id;
    document.getElementById("who").innerHTML = `<strong>${escapeHtml(this.org)}</strong>`;
    document.getElementById("login").hidden = true;
    document.getElementById("desk").hidden = false;
    await this.loadHistory();
  },

  async onGrade(event) {
    event.preventDefault();
    const form = event.target;
    const error = document.getElementById("formError");
    const busy = document.getElementById("busy");
    const gradeBtn = document.getElementById("gradeBtn");
    error.textContent = "";
    busy.hidden = false;
    gradeBtn.disabled = true;
    try {
      const files = [...form.photos.files].slice(0, 8);
      const photos = [];
      for (const file of files) {
        photos.push({
          filename: file.name,
          media_type: file.type || "image/jpeg",
          data_base64: await fileToBase64(file),
        });
      }
      const res = await fetch("/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          order_id: form.order_id.value,
          unit_id: form.unit_id.value,
          ordered_sku: form.ordered_sku.value,
          ordered_asin: form.ordered_asin.value,
          product_name: form.product_name.value,
          parts_list: form.parts.value.split("\n").map((s) => s.trim()).filter(Boolean),
          operator_label: "desk",
          photos,
        }),
      });
      const record = await res.json();
      error.textContent = res.ok ? "" : record.error || "Could not grade";
      if (!res.ok) return;
      this.showRecord(record);
      this.loadHistory();
    } finally {
      busy.hidden = true;
      gradeBtn.disabled = false;
    }
  },

  async showSaved(id) {
    const ex = this.EXAMPLES[id];
    this.lastRecord = null;
    let images = [];
    try {
      const pack = await (await fetch(`/api/frozen/${id}`)).json();
      images = (pack.photos || []).map((p) => ({
        key: p.url.replace(/^\/images\//, ""),
        quality: p.quality || "photo",
        _url: p.url,
      }));
    } catch (_) {}
    const faux = {
      record_id: id + "-frozen",
      status: "completed",
      captured_at: "frozen evaluation",
      operator_label: "labelers",
      inference_call_count: 0,
      content_hash: "—",
      failure: null,
      organization_id: this.org,
      subject: { product_name: ex.product_name, unit_id: ex.unit_id, order_id: id },
      checks: ex.checks.map((c) => ({ ...c, confidence: null, model_version: "frozen", latency_ms: null })),
      outcome: {
        disposition: ex.disposition,
        rationale: ex.note,
        policy_version: "policy_v1",
      },
      returns: {
        amazon_condition: ex.grade,
        parts_seen: [],
        parts_missing: [],
        parts_not_in_frame: [],
      },
      images,
      overrides: [],
      _frozen: true,
    };
    this.renderResult(faux);
  },

  showRecord(record) {
    this.lastRecord = record;
    this.renderResult(record);
  },

  renderResult(record) {
    const panel = document.getElementById("resultPanel");
    panel.hidden = false;
    const d = record.outcome.disposition;
    const hold =
      d === "pending_review"
        ? `<p class="meta" style="margin-top:10px;color:var(--hold)">Held for a person. UNCERTAIN is not a pass, and a failed call is not a restock.</p>`
        : "";

    document.getElementById("verdictSlot").innerHTML = `
      <div class="verdict-hero ${escapeHtml(d)}">
        <p class="verdict-kicker">${escapeHtml(record.subject.product_name)} · ${escapeHtml(record.subject.unit_id)}</p>
        <p class="verdict-title">${escapeHtml(d.replace(/_/g, " "))}</p>
        <p class="verdict-reason">${escapeHtml(record.outcome.rationale)}</p>
        ${hold}
        ${record.failure ? `<p class="error">${escapeHtml(record.failure)}</p>` : ""}
        <div class="verdict-meta">
          <span class="pill ${escapeHtml(d)}">${escapeHtml(d)}</span>
          <span class="pill">${escapeHtml(record.returns.amazon_condition || "—")}</span>
          <span class="pill">${escapeHtml(record.outcome.policy_version || "policy_v1")}</span>
          <span class="pill">${escapeHtml(record.record_id)}</span>
          ${record._frozen ? `<span class="pill hold">frozen · no model call</span>` : `<span class="pill">${escapeHtml(record.inference_call_count)} call(s)</span>`}
        </div>
      </div>`;

    document.getElementById("poStrip").innerHTML = [
      ["Order", record.subject.order_id || "—"],
      ["Unit", record.subject.unit_id || "—"],
      ["Status", record.status || "—"],
      ["Amazon grade", record.returns.amazon_condition || "—"],
    ]
      .map(([k, v]) => `<div class="po-cell"><span>${k}</span><strong>${escapeHtml(v)}</strong></div>`)
      .join("");

    const checks = record.checks || [];
    const pass = checks.filter((c) => c.verdict === "PASS").length;
    const fail = checks.filter((c) => c.verdict === "FAIL").length;
    const unc = checks.filter((c) => c.verdict === "UNCERTAIN").length;
    document.getElementById("checkSummary").textContent = `${pass} pass · ${fail} fail · ${unc} uncertain`;
    document.getElementById("checks").innerHTML = checks
      .map((c) => {
        const label = CHECK_LABELS[c.check_key] || c.check_key;
        const conf = c.confidence == null ? "no confidence" : "conf " + c.confidence;
        const lat = c.latency_ms == null ? "" : ` · ${c.latency_ms} ms`;
        return `<article class="check-card ${escapeHtml(c.verdict)}">
          <div class="check-top">
            <b>${escapeHtml(label)}</b>
            <span class="pill ${escapeHtml(c.verdict)}">${escapeHtml(c.verdict)}</span>
          </div>
          <p class="check-detail">${escapeHtml(c.detail || "")}</p>
          <p class="check-meta">${escapeHtml(conf)}${escapeHtml(lat)} · ${escapeHtml(c.model_version || "—")}</p>
        </article>`;
      })
      .join("");

    document.getElementById("partsGrid").innerHTML = [
      ["Seen", fmtList(record.returns.parts_seen)],
      ["Missing", fmtList(record.returns.parts_missing)],
      ["Not in frame", fmtList(record.returns.parts_not_in_frame)],
    ]
      .map(([k, v]) => `<div class="parts-cell"><span>${k}</span><strong>${escapeHtml(v)}</strong></div>`)
      .join("");

    const shots = document.getElementById("resultShots");
    const images = record.images || [];
    if (!images.length) {
      shots.innerHTML = `<p class="meta">${record._frozen ? "No frozen photos staged for this case yet." : "No stored images."}</p>`;
    } else {
      shots.innerHTML = images
        .map((image, i) => {
          const src = image._url || `/images/${image.key}`;
          return `<figure class="shot" data-src="${escapeHtml(src)}">
              <img alt="${escapeHtml(image.quality || "photo")}" src="${escapeHtml(src)}" loading="lazy">
              <figcaption>${escapeHtml(image.quality || "shot " + (i + 1))}</figcaption>
            </figure>`;
        })
        .join("");
      shots.querySelectorAll(".shot").forEach((fig) => {
        fig.onclick = () => {
          const lb = document.getElementById("lightbox");
          document.getElementById("lbImg").src = fig.dataset.src;
          lb.hidden = false;
          requestAnimationFrame(() => lb.classList.add("open"));
        };
      });
    }

    document.getElementById("hashText").textContent = record.content_hash || "—";
    document.getElementById("copyHash").onclick = async () => {
      try {
        await navigator.clipboard.writeText(record.content_hash || "");
      } catch (_) {}
    };

    const overrides = record.overrides || [];
    document.getElementById("overrideLog").innerHTML = overrides.length
      ? overrides
          .map(
            (e) =>
              `<p class="meta">${escapeHtml(e.at)} · ${escapeHtml(e.original_disposition)} → ${escapeHtml(e.revised_disposition)} · ${escapeHtml(e.reason)}</p>`
          )
          .join("")
      : "";

    const ovForm = document.getElementById("override");
    ovForm.hidden = !!record._frozen;
    ovForm.onsubmit = async (event) => {
      event.preventDefault();
      const form = event.target;
      const res = await fetch("/records/" + record.record_id + "/override", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          revised_disposition: form.revised_disposition.value,
          reason_code: form.reason_code.value,
          reason: form.reason.value,
          operator_label: "desk",
        }),
      });
      this.showRecord(await res.json());
      this.loadHistory();
    };

    const dump = document.getElementById("jsonDump");
    if (!dump.hidden) {
      dump.textContent = JSON.stringify(
        record._frozen ? { frozen: true, note: record.outcome.rationale } : this.buildRound3Preview(record),
        null,
        2
      );
    }
  },

  buildRound3Preview(record) {
    const map = { identity: "identity_match", completeness: "completeness", condition: "condition" };
    const checks = (record.checks || []).map((c) => ({
      check_key: map[c.check_key] || c.check_key,
      verdict: c.verdict,
      confidence: c.confidence,
      detail: c.detail,
      ...(c.verdict === "UNCERTAIN" ? { uncertain_reason: "insufficient_evidence" } : {}),
    }));
    const verdict = checks.some((c) => c.verdict === "FAIL")
      ? "FAIL"
      : checks.some((c) => c.verdict === "UNCERTAIN")
        ? "UNCERTAIN"
        : "PASS";
    return {
      schema_version: "1.0",
      stage: "returns",
      agent_id: "returns-manager@0.1.0",
      status: record.status === "pending_review" ? "pending" : "completed",
      verdict,
      evidence: {
        record_id: record.record_id,
        subject: { org_id: record.organization_id, subject_id: record.subject.unit_id, unit_scope: "unit" },
        checks,
        decision: {
          verdict,
          outcome: record.outcome.disposition,
          reason: record.outcome.rationale,
          needs_human: record.outcome.disposition === "pending_review",
        },
        payload: {
          amazon_condition: record.returns.amazon_condition,
          parts_missing: record.returns.parts_missing,
        },
        content_hash: record.content_hash,
        note: "Live Round 3 wire format is POST /v1/run",
      },
    };
  },

  async loadHistory() {
    const res = await fetch("/records", { credentials: "same-origin" });
    const rows = await res.json();
    const box = document.getElementById("history");
    if (!rows.length) {
      box.innerHTML = `<p class="meta">No records yet for this organisation.</p>`;
      return;
    }
    box.innerHTML = rows
      .map(
        (row) =>
          `<button type="button" class="hist-tile ${escapeHtml(row.outcome.disposition)}" data-id="${escapeHtml(row.record_id)}">
            <div class="id">${escapeHtml(row.subject.unit_id)} · ${escapeHtml(row.record_id)}</div>
            <div class="out">${escapeHtml((row.outcome.disposition || "").replace(/_/g, " "))}</div>
          </button>`
      )
      .join("");
    box.querySelectorAll(".hist-tile").forEach((btn) => {
      btn.onclick = () => {
        const row = rows.find((r) => r.record_id === btn.dataset.id);
        if (row) this.showRecord(row);
      };
    });
  },
};

const ReturnsEval = {
  async init() {
    const summary = await (await fetch("/api/eval/summary")).json();
    document.getElementById("stats").innerHTML = [
      ["Cases", summary.cases ?? 50],
      ["Graded", summary.graded ?? 47],
      ["Scored (agreed)", summary.scored ?? 40],
      ["Condition match", summary.condition_rate ?? "42.5%"],
    ]
      .map(
        ([k, v], i) =>
          `<div class="stat${i === 3 ? " weak" : ""}"><span>${k}</span><strong>${escapeHtml(String(v))}</strong></div>`
      )
      .join("");

    document.getElementById("ratesBody").innerHTML = (summary.rates || [])
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.check)}</td><td class="mono">${escapeHtml(r.match)}</td><td>${escapeHtml(r.rate)}</td><td>${escapeHtml(r.notes || "—")}</td></tr>`
      )
      .join("");

    const cases = summary.sample_outcomes || [];
    document.getElementById("casesBody").innerHTML = cases
      .map(
        (p) =>
          `<tr>
            <td class="mono">${escapeHtml(p.case_id)}</td>
            <td><span class="pill ${escapeHtml(p.disposition)}">${escapeHtml((p.disposition || "").replace(/_/g, " "))}</span></td>
            <td class="mono ${escapeHtml(p.identity)}">${escapeHtml(p.identity)}</td>
            <td class="mono ${escapeHtml(p.completeness)}">${escapeHtml(p.completeness)}</td>
            <td class="mono ${escapeHtml(p.condition)}">${escapeHtml(p.condition)}</td>
            <td class="mono">${escapeHtml(p.amazon_grade || "—")}</td>
          </tr>`
      )
      .join("");
  },
};

const ReturnsFailures = {
  async init() {
    const dig = await (await fetch("/api/eval/failures")).json();
    const el = document.getElementById("failList");
    const failed = dig.failures || [];
    if (!failed.length) {
      el.innerHTML = `<p class="meta">No failure digest loaded.</p>`;
      return;
    }
    el.innerHTML = failed
      .map(
        (f) => `<article class="fail-card">
          <h3>${escapeHtml(f.id)} · ${escapeHtml(f.title || "")}</h3>
          <p class="meta">${escapeHtml(f.kind || "")}</p>
          <p class="meta">${escapeHtml(f.detail || "")}</p>
        </article>`
      )
      .join("");
  },
};
