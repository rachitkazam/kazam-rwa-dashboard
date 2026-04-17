import { useState, useEffect, useMemo, useCallback } from "react";
import Papa from "papaparse";

// ═══════════════════════════════════════════════════════════
// GOOGLE SHEETS PUBLISHED CSV URLs
// ═══════════════════════════════════════════════════════════
const SHEETS = {
  master: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8DOTWVjesipRMah7trHQ2DTYjVUAW1wHBAAh5wvZMbHcQvROjpPKhZ7fmPkXxEDPP1QTgSZA0fBvj/pub?gid=179090357&single=true&output=csv",
  billing: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8DOTWVjesipRMah7trHQ2DTYjVUAW1wHBAAh5wvZMbHcQvROjpPKhZ7fmPkXxEDPP1QTgSZA0fBvj/pub?gid=595941328&single=true&output=csv",
  payments: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8DOTWVjesipRMah7trHQ2DTYjVUAW1wHBAAh5wvZMbHcQvROjpPKhZ7fmPkXxEDPP1QTgSZA0fBvj/pub?gid=1477460575&single=true&output=csv",
  users: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8DOTWVjesipRMah7trHQ2DTYjVUAW1wHBAAh5wvZMbHcQvROjpPKhZ7fmPkXxEDPP1QTgSZA0fBvj/pub?gid=385125383&single=true&output=csv",
};

// ═══════════════════════════════════════════════════════════
// CSV FETCHER
// ═══════════════════════════════════════════════════════════
async function fetchCSV(url) {
  const res = await fetch(url);
  const text = await res.text();
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (r) => resolve(r.data),
      error: (e) => reject(e),
    });
  });
}

// ═══════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════
const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const fmt = (n) => "₹" + num(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fk = (n) => num(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTH_ORDER = [
  "Jun24-Dec24","Jan 2025","Feb 2025","Mar 2025","Apr 2025","May 2025","Jun 2025",
  "Jul 2025","Aug 2025","Sep 2025","Oct 2025","Nov 2025","Dec 2025",
  "Jan 2026","Feb 2026","Mar 2026","Apr 2026","May 2026",
];
const monthIdx = (m) => { const i = MONTH_ORDER.indexOf(m); return i >= 0 ? i : 99; };
const yearOf = (m) => { const y = m.match(/\d{4}/); return y ? y[0] : "2025"; };

// ═══════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════
const T = {
  bg: "#f6f7f9", card: "#ffffff", border: "#e4e7ee", borderLight: "#f0f1f4",
  text: "#111827", textSec: "#6b7280", textTer: "#9ca3af",
  accent: "#0d9488", accentDark: "#0f766e", accentBg: "#ccfbf1",
  green: "#16a34a", greenBg: "#dcfce7",
  red: "#dc2626", redBg: "#fef2f2",
  yellow: "#d97706", yellowBg: "#fffbeb",
  radius: 10, radiusSm: 6,
  font: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
  fontMono: "'JetBrains Mono', 'SF Mono', monospace",
};

// ═══════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════
const Badge = ({ status }) => {
  const m = { Paid: { bg: T.greenBg, c: T.green }, Pending: { bg: T.redBg, c: T.red }, Partial: { bg: T.yellowBg, c: T.yellow }, Active: { bg: T.greenBg, c: T.green }, Current: { bg: T.accentBg, c: T.accent }, Disconnected: { bg: T.redBg, c: T.red } };
  const s = m[status] || m.Pending;
  return <span style={{ background: s.bg, color: s.c, padding: "3px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, letterSpacing: 0.3, whiteSpace: "nowrap" }}>{status}</span>;
};

const Card = ({ children, style, accent }) => (
  <div style={{ background: T.card, border: `1px solid ${accent ? T.accent : T.border}`, borderRadius: T.radius, padding: "22px 26px", marginBottom: 14, transition: "box-shadow 0.2s", ...style }}>{children}</div>
);

const Row = ({ label, value, vs, last }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: last ? "none" : `1px solid ${T.borderLight}` }}>
    <span style={{ color: T.textSec, fontSize: 14 }}>{label}</span>
    <span style={{ color: T.text, fontSize: 14, fontWeight: 600, textAlign: "right", ...vs }}>{value}</span>
  </div>
);

const Stat = ({ label, value, sub }) => (
  <Card style={{ flex: 1, minWidth: 180 }}>
    <div style={{ fontSize: 12, color: T.textSec, fontWeight: 500, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 700, color: T.text, lineHeight: 1.1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: T.textTer, marginTop: 6 }}>{sub}</div>}
  </Card>
);

const Spinner = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
    <div style={{ width: 32, height: 32, border: `3px solid ${T.border}`, borderTopColor: T.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>
);

// ═══════════════════════════════════════════════════════════
// AREA CHART (SVG)
// ═══════════════════════════════════════════════════════════
const AreaChart = ({ data, lk, vk }) => {
  if (!data?.length) return null;
  const vals = data.map(d => num(d[vk]));
  const max = Math.max(...vals) * 1.12 || 1;
  const W = 680, H = 240, PX = 44, PY = 16;
  const cw = W - PX * 2, ch = H - PY * 2;
  const pts = vals.map((v, i) => [PX + (i / Math.max(vals.length - 1, 1)) * cw, PY + ch - (v / max) * ch]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0]},${PY + ch} L${pts[0][0]},${PY + ch} Z`;
  const grid = [0, .25, .5, .75, 1];
  return (
    <svg viewBox={`0 0 ${W} ${H + 36}`} style={{ width: "100%", maxHeight: 300 }}>
      <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent} stopOpacity=".22" /><stop offset="100%" stopColor={T.accent} stopOpacity=".02" /></linearGradient></defs>
      {grid.map((f, i) => { const y = PY + i / 4 * ch; const v = Math.round(max * (1 - f)); return <g key={i}><line x1={PX} y1={y} x2={PX + cw} y2={y} stroke={T.border} strokeDasharray="3 3" /><text x={PX - 6} y={y + 4} textAnchor="end" fill={T.textTer} fontSize="9" fontFamily={T.font}>{v}</text></g>; })}
      <path d={area} fill="url(#ag)" /><path d={line} fill="none" stroke={T.accent} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={T.accent} stroke="#fff" strokeWidth="2" />)}
      {data.map((d, i) => { const x = PX + (i / Math.max(data.length - 1, 1)) * cw; return <text key={i} x={x} y={H + 22} textAnchor="middle" fill={T.textTer} fontSize="8.5" fontFamily={T.font} transform={`rotate(-35,${x},${H + 22})`}>{d[lk]}</text>; })}
    </svg>
  );
};

// Bar chart
const BarChart = ({ data, lk, vk }) => {
  if (!data?.length) return null;
  const maxV = Math.max(...data.map(d => num(d[vk]))) || 1;
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 150, padding: "0 4px" }}>
      {data.map((d, i) => {
        const h = (num(d[vk]) / maxV) * 130;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 8, color: T.textTer }}>{Math.round(num(d[vk]))}</span>
            <div style={{ width: "100%", maxWidth: 36, height: Math.max(h, 2), background: `linear-gradient(180deg, ${T.accent}, ${T.accent}99)`, borderRadius: "3px 3px 0 0" }} />
            <span style={{ fontSize: 7, color: T.textTer, transform: "rotate(-45deg)", transformOrigin: "center", whiteSpace: "nowrap", marginTop: 2 }}>{String(d[lk]).replace("20", "'")}</span>
          </div>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════════════════════
function LoginPage({ onLogin, loading }) {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const go = () => { setErr(""); onLogin(email.trim().toLowerCase(), (e) => setErr(e)); };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(145deg, #0c1222 0%, #162032 50%, #0f1b2d 100%)", fontFamily: T.font }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div style={{ background: "#fff", borderRadius: 16, padding: "48px 40px", width: 400, maxWidth: "92vw" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
          </div>
          <span style={{ fontSize: 26, fontWeight: 800, color: T.text, letterSpacing: -0.8 }}>Kazam</span>
        </div>
        <p style={{ color: T.textSec, fontSize: 14, margin: "4px 0 32px", fontWeight: 400 }}>RWA Electricity Reimbursement Portal</p>
        <label style={{ fontSize: 13, fontWeight: 500, color: T.textSec, display: "block", marginBottom: 6 }}>Your registered email</label>
        <input type="email" placeholder="e.g. society@gmail.com" value={email}
          onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && go()}
          style={{ width: "100%", padding: "13px 16px", border: `1.5px solid ${err ? T.red : T.border}`, borderRadius: T.radius, fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: T.font, transition: "border 0.2s" }}
        />
        {err && <p style={{ color: T.red, fontSize: 13, margin: "8px 0 0", fontWeight: 500 }}>{err}</p>}
        <button onClick={go} disabled={loading}
          style={{ width: "100%", padding: 14, background: loading ? T.textTer : T.accent, color: "#fff", border: "none", borderRadius: T.radius, fontSize: 15, fontWeight: 600, cursor: loading ? "wait" : "pointer", marginTop: 16, fontFamily: T.font, transition: "background 0.2s" }}>
          {loading ? "Loading..." : "Sign In"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════
function Nav({ active, setActive, name, onLogout }) {
  const tabs = ["Home", "Usage", "Agreement", "Payments", "Contact"];
  return (
    <div style={{ background: "#fff", borderBottom: `1.5px solid ${T.border}`, padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActive(t)} style={{
            padding: "16px 18px", border: "none", background: "none", cursor: "pointer", fontSize: 13.5, fontWeight: active === t ? 700 : 450, fontFamily: T.font,
            color: active === t ? T.text : T.textSec, borderBottom: `2px solid ${active === t ? T.accent : "transparent"}`, marginBottom: -1.5, whiteSpace: "nowrap", transition: "all 0.15s",
          }}>{t}</button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 0" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.text, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
        <button onClick={onLogout} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, cursor: "pointer", color: T.textSec, fontSize: 12, padding: "5px 12px", fontFamily: T.font, fontWeight: 500 }}>Logout</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HOME — BILLING STATEMENTS
// ═══════════════════════════════════════════════════════════
function HomePage({ billing, society, onDetail }) {
  const [filter, setFilter] = useState("All");
  const [yearF, setYearF] = useState("All years");
  const years = useMemo(() => {
    const s = new Set(); billing.forEach(b => { const y = yearOf(b.month); s.add(y); });
    return ["All years", ...Array.from(s).sort().reverse()];
  }, [billing]);
  const sorted = useMemo(() => [...billing].sort((a, b) => monthIdx(b.month) - monthIdx(a.month)), [billing]);
  const filtered = sorted.filter(b => {
    if (filter !== "All" && b.payment_status !== filter) return false;
    if (yearF !== "All years" && !b.month.includes(yearF)) return false;
    return true;
  });

  const Pill = ({ label, active, onClick }) => (
    <button onClick={onClick} style={{ padding: "5px 16px", borderRadius: 20, border: `1px solid ${T.border}`, cursor: "pointer", background: active ? T.text : "#fff", color: active ? "#fff" : T.text, fontSize: 12.5, fontWeight: 500, fontFamily: T.font, transition: "all 0.15s" }}>{label}</button>
  );

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 18px" }}>Billing Statements</h1>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {["All", "Paid", "Pending"].map(f => <Pill key={f} label={f} active={filter === f} onClick={() => setFilter(f)} />)}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 22, flexWrap: "wrap" }}>
        {years.map(y => <Pill key={y} label={y} active={yearF === y} onClick={() => setYearF(y)} />)}
      </div>
      {filtered.length === 0 && <Card><p style={{ color: T.textSec, textAlign: "center", margin: 20 }}>No billing records found.</p></Card>}
      {filtered.map((b, i) => (
        <Card key={i} style={{ cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }} onClick={() => onDetail(b)}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{b.month}</span>
              <Badge status={b.payment_status} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{fmt(b.total_billing)}</span>
              <span style={{ color: T.textTer, fontSize: 13 }}>View details ›</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DETAIL — BILLING BREAKDOWN
// ═══════════════════════════════════════════════════════════
function DetailPage({ bill, society, onBack }) {
  const elecBill = num(bill.electricity_billing);
  const sFeAmt = num(bill.society_fee_amount);
  const total = num(bill.total_billing);
  const paid = num(bill.paid_amount);
  const pending = num(bill.pending_amount);

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: T.textSec, fontSize: 14, padding: 0, fontFamily: T.font, marginBottom: 6 }}>← Back to Statements</button>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 22px" }}>{bill.month}</h1>
      <Card>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>Billing Breakdown</h3>
        <Row label={`Electricity Reimbursement (₹${num(bill.rate_per_kwh).toFixed(2)}/kWh)`} value={fmt(elecBill)} />
        <div style={{ padding: "6px 0 10px 18px", color: T.textTer, fontSize: 13, borderBottom: `1px solid ${T.borderLight}` }}>
          Consumption: {fk(bill.consumption_kwh)} kWh
        </div>
        {sFeAmt > 0 && <Row label={`Society Fee (₹${num(bill.society_fee_per_kwh).toFixed(0)}/kWh)`} value={fmt(sFeAmt)} />}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 0 10px" }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Total Payout</span>
          <span style={{ fontWeight: 800, fontSize: 26 }}>{fmt(total)}</span>
        </div>
        <Row label="Paid" value={fmt(paid)} vs={{ color: T.green }} />
        <Row label="Balance" value={fmt(pending)} vs={{ color: pending > 0.5 ? T.red : T.green }} last />
      </Card>
      {bill.utr && bill.utr !== "nan" && bill.utr.trim() && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Payment History</h3>
            <Badge status={bill.payment_status} />
          </div>
          {bill.transaction_date && bill.transaction_date !== "nan" && <div style={{ fontSize: 14, fontWeight: 600 }}>{bill.transaction_date}</div>}
          <div style={{ fontSize: 13, color: T.textSec, fontFamily: T.fontMono }}>UTR: {bill.utr}</div>
          <div style={{ fontSize: 15, fontWeight: 700, textAlign: "right", marginTop: 4 }}>{fmt(bill.paid_amount)}</div>
        </Card>
      )}
      <Card>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 10px" }}>GST Invoice</h3>
        <div style={{ border: `2px dashed ${T.border}`, borderRadius: T.radius, padding: "36px 20px", textAlign: "center", color: T.textTer }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>☁</div>
          <div style={{ fontSize: 14 }}>Upload your GST invoice for this month.</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Click to upload or drag and drop.</div>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// USAGE
// ═══════════════════════════════════════════════════════════
function UsagePage({ billing }) {
  const sorted = useMemo(() => [...billing].sort((a, b) => monthIdx(a.month) - monthIdx(b.month)), [billing]);
  const totalKwh = sorted.reduce((s, b) => s + num(b.consumption_kwh), 0);
  const totalBilled = sorted.reduce((s, b) => s + num(b.total_billing), 0);
  const cum = useMemo(() => { let c = 0; return sorted.map(b => { c += num(b.consumption_kwh); return { month: b.month, kwh: c }; }); }, [sorted]);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 18px" }}>Usage</h1>
      <div style={{ display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
        <Stat label="Total Consumption" value={`${fk(totalKwh)} kWh`} />
        <Stat label="Total Billed" value={fmt(totalBilled)} />
      </div>
      <Card>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: T.textSec, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: 0.6 }}>Cumulative Consumption (kWh)</h3>
        <AreaChart data={cum} lk="month" vk="kwh" />
      </Card>
      <Card>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: T.textSec, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: 0.6 }}>Monthly Consumption (kWh)</h3>
        <BarChart data={sorted} lk="month" vk="consumption_kwh" />
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// AGREEMENT
// ═══════════════════════════════════════════════════════════
function AgreementPage({ society }) {
  const hasLink = society.agreement_link && society.agreement_link !== "" && society.agreement_link !== "nan" && society.agreement_link.includes("drive.google.com");
  const hasBillLink = society.electricity_bill_link && society.electricity_bill_link !== "" && society.electricity_bill_link !== "nan" && society.electricity_bill_link.includes("drive.google.com");

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 18px" }}>Agreement</h1>
      <Card style={{ background: "#f8fafc", border: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.textSec }}>
          <span style={{ fontSize: 16 }}>ℹ</span> To change any details, email <a href="mailto:support@kazam.in" style={{ color: T.accent, fontWeight: 500 }}>support@kazam.in</a>
        </div>
      </Card>

      {/* Documents row — Agreement + Electricity Bill side by side */}
      <div style={{ display: "flex", gap: 14, marginBottom: 0, flexWrap: "wrap" }}>
        <Card style={{ flex: 1, minWidth: 260, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Agreement Copy</h3>
            </div>
            <p style={{ fontSize: 12.5, color: T.textSec, margin: 0 }}>
              {hasLink ? "Your signed agreement with Kazam." : "Not yet uploaded."}
            </p>
          </div>
          {hasLink ? (
            <a href={society.agreement_link} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 20px", background: T.accent, color: "#fff", borderRadius: T.radiusSm, fontSize: 13, fontWeight: 600, fontFamily: T.font, textDecoration: "none", transition: "background 0.15s" }}
              onMouseOver={e => e.currentTarget.style.background = T.accentDark}
              onMouseOut={e => e.currentTarget.style.background = T.accent}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download
            </a>
          ) : (
            <span style={{ padding: "10px 20px", background: T.borderLight, color: T.textTer, borderRadius: T.radiusSm, fontSize: 13, fontWeight: 500, textAlign: "center" }}>Not available</span>
          )}
        </Card>

        <Card style={{ flex: 1, minWidth: 260, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.yellow} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Electricity Bill</h3>
            </div>
            <p style={{ fontSize: 12.5, color: T.textSec, margin: 0 }}>
              {hasBillLink ? "Sample electricity bill for reference." : "Not yet uploaded."}
            </p>
          </div>
          {hasBillLink ? (
            <a href={society.electricity_bill_link} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 20px", background: T.text, color: "#fff", borderRadius: T.radiusSm, fontSize: 13, fontWeight: 600, fontFamily: T.font, textDecoration: "none", transition: "opacity 0.15s" }}
              onMouseOver={e => e.currentTarget.style.opacity = "0.85"}
              onMouseOut={e => e.currentTarget.style.opacity = "1"}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              View Bill
            </a>
          ) : (
            <span style={{ padding: "10px 20px", background: T.borderLight, color: T.textTer, borderRadius: T.radiusSm, fontSize: 13, fontWeight: 500, textAlign: "center" }}>Not available</span>
          )}
        </Card>
      </div>

      <Card accent>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Current Terms</h3>
          <Badge status="Current" />
        </div>
        <Row label="CPO (Charge Point Operator)" value={society.cpo_name || "Vida"} />
        <Row label="Electricity Rate" value={`₹${num(society.electricity_rate).toFixed(2)}/kWh`} />
        <Row label="Electricity Duty" value={society.electricity_duty || "Inclusive"} />
        <Row label="Finalized Rate" value={`₹${num(society.finalized_rate).toFixed(2)}/kWh`} />
        <Row label="Society Fee" value={num(society.society_fee) > 0 ? `₹${num(society.society_fee).toFixed(0)}/kWh` : "None"} />
        <Row label="No. of Chargers" value={society.no_of_chargers || "—"} />
        <Row label="Status" value={<Badge status={society.status || "Active"} />} />
        {society.agreement_date && society.agreement_date !== "" && society.agreement_date !== "nan" && (
          <Row label="Agreement Date" value={society.agreement_date} last />
        )}
      </Card>
      <Card>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px" }}>Your Bank Details</h3>
        {society.ac_holder && society.ac_holder !== "nan" && <>
          <div style={{ fontSize: 12, color: T.textTer, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>A/C Holder</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{society.ac_holder}</div>
        </>}
        {society.ac_number && society.ac_number !== "nan" && society.ac_number !== "" && <>
          <div style={{ fontSize: 12, color: T.textTer, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>Account Number</div>
          <div style={{ fontSize: 14, fontWeight: 600, fontFamily: T.fontMono, marginBottom: 14 }}>{society.ac_number}</div>
        </>}
        {society.ifsc && society.ifsc !== "nan" && <>
          <div style={{ fontSize: 12, color: T.textTer, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>IFSC</div>
          <div style={{ fontSize: 14, fontWeight: 600, fontFamily: T.fontMono, marginBottom: 14 }}>{society.ifsc}</div>
        </>}
        {society.bank_name && society.bank_name !== "nan" && <>
          <div style={{ fontSize: 12, color: T.textTer, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>Bank</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{society.bank_name}</div>
        </>}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════
function PaymentsPage({ payments }) {
  const sorted = useMemo(() => [...payments].sort((a, b) => (b.transaction_date || "").localeCompare(a.transaction_date || "")), [payments]);
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 18px" }}>Payments</h1>
      <Card>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px" }}>Payment History</h3>
        {sorted.length === 0 && <p style={{ color: T.textSec, textAlign: "center", padding: 20 }}>No payment records found.</p>}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            {sorted.length > 0 && (
              <thead>
                <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                  {["Date", "Billing Period", "UTR", "Amount"].map(h => (
                    <th key={h} style={{ textAlign: h === "Amount" ? "right" : "left", padding: "8px 10px", color: T.textSec, fontWeight: 500, fontSize: 12.5, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {sorted.map((p, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                  <td style={{ padding: "11px 10px", whiteSpace: "nowrap" }}>{(p.transaction_date || "").replace("nan", "—")}</td>
                  <td style={{ padding: "11px 10px" }}>{(p.payment_month || "").replace("nan", "—")}</td>
                  <td style={{ padding: "11px 10px", fontFamily: T.fontMono, fontSize: 12 }}>{(p.utr || "").replace("nan", "—")}</td>
                  <td style={{ padding: "11px 10px", textAlign: "right", fontWeight: 600 }}>{fmt(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CONTACT
// ═══════════════════════════════════════════════════════════
function ContactPage({ society }) {
  const hasMap = society.google_maps_link && society.google_maps_link !== "" && society.google_maps_link !== "nan" && society.google_maps_link.includes("http");

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 18px" }}>Contact</h1>
      <Card>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px" }}>Kazam Support</h3>
        <Row label="General Support" value={<a href="mailto:support@kazam.in" style={{ color: T.accent, fontWeight: 500 }}>support@kazam.in</a>} />
        <Row label="Billing Queries" value={<a href="mailto:finance@kazam.in" style={{ color: T.accent, fontWeight: 500 }}>finance@kazam.in</a>} last />
      </Card>
      <Card>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px" }}>Your Society</h3>
        <Row label="Society" value={society.society_name} />
        <Row label="City" value={society.city} />
        <Row label="State" value={society.state} />
        <Row label="CPO" value={society.cpo_name || "Vida"} />
        {society.poc_name && society.poc_name !== "nan" && <Row label="POC" value={society.poc_name} />}
        {society.poc_phone && society.poc_phone !== "nan" && <Row label="Phone" value={society.poc_phone} />}
        {society.rwa_email && society.rwa_email !== "nan" && <Row label="Email" value={society.rwa_email} last={!hasMap} />}
        {hasMap && (
          <Row label="Location" value={
            <a href={society.google_maps_link} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, color: T.accent, fontWeight: 600, textDecoration: "none", fontSize: 13 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Open in Google Maps
            </a>
          } last />
        )}
      </Card>
      {society.address && society.address !== "nan" && (
        <Card>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 10px" }}>Address</h3>
          <p style={{ color: T.textSec, fontSize: 14, margin: 0, lineHeight: 1.5 }}>{society.address}</p>
          {society.pincode && society.pincode !== "nan" && <p style={{ color: T.textSec, fontSize: 14, margin: "4px 0 0" }}>PIN: {String(society.pincode).replace(".0", "")}</p>}
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState("Home");
  const [detailBill, setDetailBill] = useState(null);
  const [societyId, setSocietyId] = useState(null);
  const [loginSocName, setLoginSocName] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  // Data stores
  const [users, setUsers] = useState(null);
  const [master, setMaster] = useState(null);
  const [billing, setBilling] = useState(null);
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState(null);

  // Load user sheet on mount
  useEffect(() => {
    fetchCSV(SHEETS.users).then(setUsers).catch(e => setError("Failed to load. Please refresh."));
  }, []);

  // Login handler
  const handleLogin = useCallback((email, onErr) => {
    if (!email) { onErr("Please enter your email."); return; }
    if (!users) { onErr("Loading... please wait."); return; }
    const match = users.find(u => (u.email || "").trim().toLowerCase() === email);
    if (!match) { onErr("Email not found. Contact support@kazam.in for access."); return; }
    const sid = match.society_id;
    const sname = match.society_name || "";
    setLoading(true);
    setDataLoading(true);
    setSocietyId(sid);
    setLoginSocName(sname);
    // Load remaining data
    Promise.all([fetchCSV(SHEETS.master), fetchCSV(SHEETS.billing), fetchCSV(SHEETS.payments)])
      .then(([m, b, p]) => { setMaster(m); setBilling(b); setPayments(p); setDataLoading(false); setLoading(false); })
      .catch(() => { setError("Failed to load data. Please refresh."); setLoading(false); setDataLoading(false); });
  }, [users]);

  const handleLogout = () => { setSocietyId(null); setLoginSocName(""); setPage("Home"); setDetailBill(null); setMaster(null); setBilling(null); setPayments(null); };
  const handleNav = (p) => { setPage(p); setDetailBill(null); };

  // Not logged in
  if (!societyId) {
    return <LoginPage onLogin={handleLogin} loading={loading} />;
  }

  // Loading data
  if (dataLoading || !master || !billing || !payments) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: T.font }}>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <div style={{ textAlign: "center" }}>
          <Spinner />
          <p style={{ color: T.textSec, fontSize: 14, marginTop: 12 }}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: T.font }}>
        <Card style={{ maxWidth: 400, textAlign: "center" }}>
          <p style={{ color: T.red, fontWeight: 600 }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{ padding: "10px 24px", background: T.accent, color: "#fff", border: "none", borderRadius: T.radiusSm, cursor: "pointer", fontFamily: T.font }}>Refresh</button>
        </Card>
      </div>
    );
  }

  // Filter data for this society
  const sidClean = (societyId || "").trim();
  const society = master.find(m => (m.society_id || "").trim() === sidClean)
    || master.find(m => (m.society_name || "").trim().toLowerCase() === (loginSocName || "").trim().toLowerCase())
    || {};
  const myBilling = billing.filter(b => (b.society_id || "").trim() === sidClean || (b.society_name || "").trim() === (society.society_name || "").trim());
  const socName = society.society_name || loginSocName || sidClean;
  const myPayments = payments.filter(p => (p.society_id || "").trim() === sidClean || (p.society_name || "").trim() === socName.trim());

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font, color: T.text }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <Nav active={detailBill ? "Home" : page} setActive={handleNav} name={socName} onLogout={handleLogout} />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px 60px" }}>
        {page === "Home" && !detailBill && <HomePage billing={myBilling} society={society} onDetail={(b) => { setDetailBill(b); setPage("Detail"); }} />}
        {page === "Detail" && detailBill && <DetailPage bill={detailBill} society={society} onBack={() => { setDetailBill(null); setPage("Home"); }} />}
        {page === "Usage" && <UsagePage billing={myBilling} />}
        {page === "Agreement" && <AgreementPage society={society} />}
        {page === "Payments" && <PaymentsPage payments={myPayments} />}
        {page === "Contact" && <ContactPage society={society} />}
      </div>
    </div>
  );
}
