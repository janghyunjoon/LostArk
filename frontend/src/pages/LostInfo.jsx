import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/* ?name=닉네임 또는 /lostinfo/:name 지원 */
function useCharacterName() {
  const { name: paramName } = useParams();
  const { search } = useLocation();
  const qs = useMemo(() => new URLSearchParams(search), [search]);
  const queryName = qs.get("name");
  return (paramName || queryName || "").trim();
}

/* -------------------------- 공통 추출기 -------------------------- */
/** 상/중/하 라인 → 티어 배지 */
const TIER_COLOR = { "상": "#f0a74b", "중": "#7aa7ff", "하": "#69c3ff" };
function pickTierBadges(lines = [], limit = 3) {
  const out = [];
  const tierRe = /^(상|중|하)\s*([\p{L}\w\s·\-\+\(\)\/]+?)\s*([+\-]?\d+(?:\.\d+)?%?|Lv\.?\s*\d+|\+\d+)?$/u;
  for (const raw of lines) {
    const s = (raw || "").replace(/\s+/g, " ").trim();
    const m = s.match(tierRe);
    if (!m) continue;
    const [, tier, text, val] = m;
    out.push({ tier, text: text.trim(), val: val?.trim() || "" });
    if (out.length >= limit) break;
  }
  return out;
}

/** 강화/재련/상급재련/초월·엘릭서 문구 추출 */
function pickEnhanceBadges(lines = []) {
  const res = [];

  // +22 ×40, +21 형태
  const plus = lines.find(l => /\+\s*\d+/.test(l));
  if (plus) {
    const m = plus.match(/\+(\d+)(?:\s*[×xX]\s*(\d+))?/);
    if (m) {
      res.push({ kind: "plus", text: `+${m[1]}${m[2] ? ` ×${m[2]}` : ""}` });
    }
  }

  // 재련 n단계 / 상급 재련
  const step = lines.find(l => /(\d+)\s*단계/.test(l));
  if (step) {
    const m = step.match(/(\d+)\s*단계/);
    if (m) res.push({ kind: "step", text: `${m[1]}단계` });
  }
  const highRefine = lines.find(l => /상급\s*재련/.test(l));
  if (highRefine) res.push({ kind: "high", text: "상급 재련" });

  // 엘릭서 / 초월 키워드(아이템 수준에서 보이면 표시)
  if (lines.some(l => /엘릭서/.test(l))) res.push({ kind: "elixir", text: "엘릭서" });
  if (lines.some(l => /초월/.test(l))) res.push({ kind: "trans", text: "초월" });

  return res.slice(0, 3);
}

/** 팔찌 연마 효과 줄 */
function pickPolishBadges(lines = [], limit = 3) {
  const out = [];
  for (const s0 of lines) {
    const s = (s0 || "").replace(/\s+/g, " ").trim();
    if (/연마/.test(s)) {
      out.push(s.replace(/연마(?:\s*효과)?\s*:?/g, "").trim());
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** 보주(어빌리티 스톤) 세공 줄 → "원한 3" 등 */
function pickStone(badges = [], limit = 4) {
  const out = [];
  const re = /^([\p{L}\w\s·\-\+\(\)\/]+?)\s*([0-9]+)$/u;
  for (const b of badges) {
    const s = (b || "").replace(/\s+/g, " ").trim();
    const m = s.match(re);
    if (!m) continue;
    const name = m[1].trim(); const lvl = m[2].trim();
    out.push({ name, lvl, danger: /감소|패널티|감소도/.test(name) || lvl === "0" });
    if (out.length >= limit) break;
  }
  return out;
}

/** 왼쪽 방어구 전체에서 엘릭서/초월 요약 */
function summarizeElixirTranscend(allLines = []) {
  const joined = allLines.join("\n");
  const elixirPct = (() => {
    const m = joined.match(/엘릭서\s*([0-9]+(?:\.[0-9]+)?)\s*%/);
    return m ? `${m[1]}%` : null;
  })();
  const refineSum = (() => {
    const m = joined.match(/연성\s*합계\s*([0-9]+)\s*레벨/);
    return m ? `${m[1]}레벨` : null;
  })();
  const refineStep = (() => {
    const m = joined.match(/(회심|응징|응축|강맹|정기|정교|고양|단련|침식|속전|정수|분쇄|응보)\s*([0-9]+)\s*단계/);
    return m ? `${m[1]} ${m[2]}단계` : null;
  })();
  const transSum = (() => {
    const m = joined.match(/초월\s*합계\s*([0-9]+)/);
    return m ? m[1] : null;
  })();
  const transAvg = (() => {
    const m = joined.match(/평균\s*([0-9]+(?:\.[0-9]+)?)\s*단계/);
    return m ? `${m[1]}단계` : null;
  })();
  return { elixirPct, refineSum, refineStep, transSum, transAvg };
}

/* -------------------------- 장비 버킷 -------------------------- */
function bucketizeEquip(items = []) {
  const has = (s, k) => (s || "").includes(k);
  const match = (it, keys) => keys.some((k) => has(it.type, k) || has(it.name, k));

  const buckets = { leftArmor: [], rightAcc: [], bracelet: [], stone: [], compass: [], charm: [], extra: [] };
  const keysLeft  = ["무기", "투구", "머리", "어깨", "상의", "하의", "장갑", "방패", "갑옷"];
  const keysAcc   = ["목걸이", "귀걸이", "반지"];
  const keysBr    = ["팔찌"];
  const keysStone = ["보주", "어빌리티 스톤", "능력 돌", "돌"];
  const keysComp  = ["나침반"];
  const keysCharm = ["부적"];

  for (const it of items) {
    if (match(it, keysLeft))      buckets.leftArmor.push(it);
    else if (match(it, keysAcc))  buckets.rightAcc.push(it);
    else if (match(it, keysBr))   buckets.bracelet.push(it);
    else if (match(it, keysStone))buckets.stone.push(it);
    else if (match(it, keysComp)) buckets.compass.push(it);
    else if (match(it, keysCharm))buckets.charm.push(it);
    else                          buckets.extra.push(it);
  }
  return buckets;
}

/* =============================================================== */

export default function LostInfo() {
  const navigate = useNavigate();
  const name = useCharacterName();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [profile, setProfile] = useState(null);
  const [equipmentParsed, setEquipmentParsed] = useState([]);
  const [engravings, setEngravings] = useState(null);

  useEffect(() => {
    if (!name) {
      setErr("검색어(캐릭터명)가 없습니다.");
      setProfile(null); setEquipmentParsed([]); setEngravings(null);
      return;
    }
    let alive = true;
    setLoading(true);
    setErr("");
    setProfile(null); setEquipmentParsed([]); setEngravings(null);

    Promise.all([
      fetch(`${API_BASE}/api/lostark/profiles/${encodeURIComponent(name)}`),
      fetch(`${API_BASE}/api/lostark/equipment-parsed/${encodeURIComponent(name)}`),
      fetch(`${API_BASE}/api/lostark/engravings/${encodeURIComponent(name)}`),
    ])
      .then(async ([p, e, g]) => {
        if (!p.ok || !e.ok || !g.ok) {
          const msgs = [];
          if (!p.ok) msgs.push(`profiles:${p.status}`);
          if (!e.ok) msgs.push(`equipment:${e.status}`);
          if (!g.ok) msgs.push(`engravings:${g.status}`);
          throw new Error(msgs.join(", "));
        }
        const [pJson, eJson, gJson] = await Promise.all([p.json(), e.json(), g.json()]);
        if (!alive) return;
        setProfile(pJson || null);
        setEquipmentParsed(Array.isArray(eJson) ? eJson : []);
        setEngravings(gJson || null);
      })
      .catch((error) => {
        if (!alive) return;
        setErr(error?.message || "요청 중 오류가 발생했습니다.");
      })
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, [name]);

  const buckets = useMemo(() => bucketizeEquip(equipmentParsed), [equipmentParsed]);
  const leftAllLines = useMemo(
    () => buckets.leftArmor.flatMap((it) => it.detailLines || []),
    [buckets.leftArmor]
  );
  const exSum = useMemo(() => summarizeElixirTranscend(leftAllLines), [leftAllLines]);

  const onBack = () => navigate(-1);

  /* ----------------------- 컴팩트 행 렌더러 ----------------------- */
  const ItemCompactLeft = ({ it }) => {
    const badgesEnh = pickEnhanceBadges(it.detailLines || []);   // +강화/재련/상급/엘릭서/초월
    const tiers = pickTierBadges(it.detailLines || [], 2);       // 상/중/하 2개만
    return (
      <div style={st.itemRow}>
        {it.icon && <img src={it.icon} alt="" style={st.itemIcon} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={st.itemHead}>
            <span style={st.itemName} title={it.name}>{it.name}</span>
            {typeof it.quality === "number" && <span style={st.qBadge}>{it.quality}</span>}
          </div>
          <div style={st.badgeLine}>
            {badgesEnh.map((b, i) => (
              <span key={`en-${i}`} style={st.badgeMuted}>{b.text}</span>
            ))}
            {tiers.map((t, i) => (
              <span key={`t-${i}`} style={{ ...st.badge, background: TIER_COLOR[t.tier] || "#3a3f46" }}>
                {t.tier}&nbsp;{t.text}{t.val ? ` ${t.val}` : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const ItemCompactAcc = ({ it }) => {
    const tiers = pickTierBadges(it.detailLines || [], 3);
    return (
      <div style={st.itemRow}>
        {it.icon && <img src={it.icon} alt="" style={st.itemIcon} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={st.itemHead}>
            <span style={st.itemName} title={it.name}>{it.name}</span>
            {typeof it.quality === "number" && <span style={st.qBadge}>{it.quality}</span>}
          </div>
          {tiers.length > 0 && (
            <div style={st.badgeLine}>
              {tiers.map((t, i) => (
                <span key={i} style={{ ...st.badge, background: TIER_COLOR[t.tier] || "#3a3f46" }}>
                  {t.tier}&nbsp;{t.text}{t.val ? ` ${t.val}` : ""}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const ItemCompactBracelet = ({ it }) => {
    const effects = pickPolishBadges(it.detailLines || [], 3);
    return (
      <div style={st.itemRow}>
        {it.icon && <img src={it.icon} alt="" style={st.itemIcon} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={st.itemHead}>
            <span style={st.itemName} title={it.name}>{it.name}</span>
            {typeof it.quality === "number" && <span style={st.qBadge}>{it.quality}</span>}
          </div>
          {effects.length > 0 && (
            <div style={st.badgeLine}>
              {effects.map((t, i) => (
                <span key={i} style={st.badgeMuted}>{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const ItemCompactStone = ({ it }) => {
    const stoneLines = (it.detailLines || []).filter(Boolean);
    const parsed = pickStone(stoneLines, 4);
    return (
      <div style={st.itemRow}>
        {it.icon && <img src={it.icon} alt="" style={st.itemIcon} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={st.itemHead}>
            <span style={st.itemName} title={it.name}>{it.name}</span>
            {it.grade && <span style={st.gradeBadge}>{it.grade}</span>}
          </div>
          {parsed.length > 0 && (
            <div style={st.badgeLine}>
              {parsed.map((x, i) => (
                <span key={i} style={{ ...st.badge, background: x.danger ? "#5a2e2e" : "#3a3f46" }}>
                  {x.name} {x.lvl}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ---------------------------- 렌더 ---------------------------- */
  return (
    <div style={st.wrap}>
      <div style={st.headerRow}>
        <button onClick={onBack} style={st.backBtn}>← 뒤로</button>
        <h1 style={{ margin: 0 }}>{name ? `캐릭터: ${name}` : "캐릭터 조회"}</h1>
      </div>

      {loading && <div style={st.skeleton}>불러오는 중...</div>}
      {err && !loading && <div style={st.error}>⚠ {err}</div>}

      {!loading && !err && (
        <div style={st.layout}>
          {/* 좌: 캐릭터 이미지 + 기본 정보 + 방어구 */}
          <section style={st.leftCol}>
            <div style={st.card}>
              {profile?.CharacterImage ? (
                <img src={profile.CharacterImage} alt={`${name} 프로필`} style={st.profileImg} />
              ) : (
                <div style={st.profileImgPlaceholder}>이미지 없음</div>
              )}
              <div style={{ marginTop: 10 }}>
                <div style={st.row}><span style={st.label}>클래스</span><span>{profile?.CharacterClassName || "-"}</span></div>
                <div style={st.row}><span style={st.label}>아이템 레벨</span><span>{profile?.ItemAvgLevel || "-"}</span></div>
                <div style={st.row}><span style={st.label}>서버</span><span>{profile?.ServerName || "-"}</span></div>
                <div style={st.row}><span style={st.label}>길드</span><span>{profile?.GuildName || "-"}</span></div>
              </div>
            </div>

            <div style={st.card}>
              <h3 style={st.h3}>무기 · 방어구</h3>
              <div style={st.colList}>
                {buckets.leftArmor.length
                  ? buckets.leftArmor.map((it) => (
                      <ItemCompactLeft key={`${it.type}-${it.name}`} it={it} />
                    ))
                  : <div style={st.empty}>정보 없음</div>}
              </div>

              {(exSum.elixirPct || exSum.refineSum || exSum.refineStep || exSum.transSum || exSum.transAvg) && (
                <div style={st.summaryRow}>
                  {exSum.elixirPct && (
                    <div style={st.summaryBox}>
                      <div style={st.summaryTitle}>엘릭서</div>
                      <div style={st.summaryList}>
                        <span>예상치 {exSum.elixirPct}</span>
                        {exSum.refineSum && <span>연성 합계 {exSum.refineSum}</span>}
                        {exSum.refineStep && <span>{exSum.refineStep}</span>}
                      </div>
                    </div>
                  )}
                  {(exSum.transSum || exSum.transAvg) && (
                    <div style={st.summaryBox}>
                      <div style={st.summaryTitle}>초월</div>
                      <div style={st.summaryList}>
                        {exSum.transSum && <span>합계 {exSum.transSum}</span>}
                        {exSum.transAvg && <span>평균 {exSum.transAvg}</span>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* 우: 악세/팔찌/보주/보석 + 나침반·부적 */}
          <section style={st.rightCol}>
            <div style={st.card}>
              <h3 style={st.h3}>악세 · 팔찌 · 보주 · 보석</h3>

              {buckets.rightAcc.length > 0 && (
                <>
                  <div style={st.subTitle}>악세사리</div>
                  <div style={st.colList}>
                    {buckets.rightAcc.map((it) => (
                      <ItemCompactAcc key={`${it.type}-${it.name}`} it={it} />
                    ))}
                  </div>
                </>
              )}

              {buckets.stone.length > 0 && (
                <>
                  <div style={st.subTitle}>보주</div>
                  <div style={st.colList}>
                    {buckets.stone.map((it) => (
                      <ItemCompactStone key={`${it.type}-${it.name}`} it={it} />
                    ))}
                  </div>
                </>
              )}

              {buckets.bracelet.length > 0 && (
                <>
                  <div style={st.subTitle}>팔찌</div>
                  <div style={st.colList}>
                    {buckets.bracelet.map((it) => (
                      <ItemCompactBracelet key={`${it.type}-${it.name}`} it={it} />
                    ))}
                  </div>
                </>
              )}

              {Array.isArray(profile?.Gems) && profile.Gems.length > 0 && (
                <>
                  <div style={st.subTitle}>보석</div>
                  <ul style={st.gemGrid}>
                    {profile.Gems.map((g, idx) => (
                      <li key={idx} style={st.gemCell}>
                        {g?.Icon ? <img src={g.Icon} alt="" style={st.gemIcon} /> : <div style={st.gemIconPlaceholder}>Gem</div>}
                        <div style={st.gemName}>{g?.Name || `${g?.Level ?? ""}레벨 보석`}</div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {(buckets.compass.length > 0 || buckets.charm.length > 0) && (
              <div style={st.card}>
                <h3 style={st.h3}>나침반 · 부적</h3>
                <div style={st.rowLine}>
                  {[...buckets.compass, ...buckets.charm].map((it) => (
                    <div key={`${it.type}-${it.name}`} style={st.rowTag}>
                      {it.icon && <img src={it.icon} alt="" style={st.itemIcon} />}
                      <span style={{ whiteSpace: "nowrap" }}>{it.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={st.card}>
              <h3 style={st.h3}>각인</h3>
              {engravings?.Effects?.length ? (
                <ul style={st.engList}>
                  {engravings.Effects.map((e) => (
                    <li key={e.Name} style={st.engItem}>
                      <strong>{e.Name}</strong>
                      <span style={{ opacity: 0.8, marginLeft: 6 }}>{e.Description}</span>
                    </li>
                  ))}
                </ul>
              ) : <div style={st.empty}>각인 정보 없음</div>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ styles ------------------------------ */
const st = {
  wrap: { width: "95%", maxWidth: 1400, margin: "28px auto", color: "#eee", fontFamily: "Noto Sans KR, sans-serif" },
  headerRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  backBtn: { background: "#2a2a2a", color: "#eee", border: "1px solid #444", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 13 },

  skeleton: { background: "#1f1f1f", border: "1px solid #333", borderRadius: 12, padding: 16, textAlign: "center", fontSize: 13 },
  error: { background: "#2a1f1f", border: "1px solid #633", color: "#ff9b9b", borderRadius: 12, padding: 12, fontSize: 13 },

  layout: { display: "grid", gridTemplateColumns: "360px 1fr", gap: 12 },
  leftCol: {}, rightCol: { display: "grid", gap: 12 },

  card: { background: "#1f2224", border: "1px solid #2e3134", borderRadius: 12, padding: 12 },

  profileImg: { width: "100%", height: 340, objectFit: "cover", borderRadius: 10, background: "#141618" },
  profileImgPlaceholder: { height: 340, borderRadius: 10, background: "#141618", border: "1px dashed #3a3d41", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 12 },

  row: { display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 },
  label: { opacity: 0.75 },

  h3: { margin: "0 0 8px 0", fontSize: 16 },
  subTitle: { fontSize: 12, opacity: 0.85, margin: "8px 0 6px" },

  colList: { display: "grid", gap: 6 },
  itemRow: { display: "flex", alignItems: "center", gap: 8, background: "#222528", border: "1px solid #33363a", borderRadius: 8, padding: "6px 8px" },
  itemIcon: { width: 32, height: 32, borderRadius: 6, objectFit: "cover", flex: "0 0 32px" },
  itemHead: { display: "flex", alignItems: "center", gap: 6 },
  itemName: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 420, fontSize: 13 },

  badgeLine: { display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 },
  badge: { display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 6px", borderRadius: 999, fontSize: 11, lineHeight: 1 },
  badgeMuted: { display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 6px", borderRadius: 999, fontSize: 11, lineHeight: 1, background: "#2f343a" },

  qBadge: { display: "inline-block", minWidth: 24, textAlign: "center", padding: "1px 6px", borderRadius: 6, fontSize: 11, background: "#2d3136", border: "1px solid #444" },
  gradeBadge: { marginLeft: 6, fontSize: 10, padding: "1px 6px", borderRadius: 999, background: "#2d3034", border: "1px solid #444", opacity: 0.9 },

  gemGrid: { listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 6 },
  gemCell: { background: "#222528", border: "1px solid #33363a", borderRadius: 8, padding: 8, display: "grid", justifyItems: "center", gap: 4 },
  gemIcon: { width: 28, height: 28, borderRadius: 6, objectFit: "cover" },
  gemIconPlaceholder: { width: 28, height: 28, border: "1px dashed #444", borderRadius: 6, display: "grid", placeItems: "center", fontSize: 10, color: "#888" },
  gemName: { fontSize: 11, textAlign: "center", opacity: 0.85 },

  rowLine: { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" },
  rowTag: { display: "flex", alignItems: "center", gap: 6, background: "#222528", border: "1px solid #33363a", borderRadius: 999, padding: "4px 8px", fontSize: 11 },

  engList: { margin: 0, paddingLeft: 16, display: "grid", gap: 4, fontSize: 13 },
  engItem: { lineHeight: 1.35 },

  empty: { opacity: 0.7, fontSize: 13 },

  /* 엘릭서/초월 요약 박스(컴팩트) */
  summaryRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 },
  summaryBox: { background: "#1b1e21", border: "1px solid #32363a", borderRadius: 8, padding: 8, display: "grid", gap: 4 },
  summaryTitle: { fontSize: 11, opacity: 0.85 },
  summaryList: { display: "flex", flexWrap: "wrap", gap: 6, fontSize: 12, opacity: 0.95 },
};
