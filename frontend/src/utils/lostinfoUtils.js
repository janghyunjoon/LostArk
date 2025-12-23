import { useLocation, useParams } from "react-router-dom";
import { useMemo } from "react";

/* ?name=닉네임 또는 /lostinfo/:name 지원 */
export function useCharacterName() {
  const { name: paramName } = useParams();
  const { search } = useLocation();
  const qs = useMemo(() => new URLSearchParams(search), [search]);
  const queryName = qs.get("name");
  return (paramName || queryName || "").trim();
}

/** 상/중/하 라인 → 티어 배지 */
export function pickTierBadges(lines = [], limit = 3) {
  const out = [];
  const tierRe =
    /^(상|중|하)\s*([\p{L}\w\s·\-\+\(\)\/]+?)\s*([+\-]?\d+(?:\.\d+)?%?|Lv\.?\s*\d+|\+\d+)?$/u;

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
export function pickEnhanceBadges(lines = []) {
  const res = [];

  const plus = lines.find((l) => /\+\s*\d+/.test(l));
  if (plus) {
    const m = plus.match(/\+(\d+)(?:\s*[×xX]\s*(\d+))?/);
    if (m) res.push({ kind: "plus", text: `+${m[1]}${m[2] ? ` ×${m[2]}` : ""}` });
  }

  const step = lines.find((l) => /(\d+)\s*단계/.test(l));
  if (step) {
    const m = step.match(/(\d+)\s*단계/);
    if (m) res.push({ kind: "step", text: `${m[1]}단계` });
  }

  const highRefine = lines.find((l) => /상급\s*재련/.test(l));
  if (highRefine) res.push({ kind: "high", text: "상급 재련" });

  if (lines.some((l) => /엘릭서/.test(l))) res.push({ kind: "elixir", text: "엘릭서" });
  if (lines.some((l) => /초월/.test(l))) res.push({ kind: "trans", text: "초월" });

  return res.slice(0, 3);
}

/** 팔찌 연마 효과 줄 */
export function pickPolishBadges(lines = [], limit = 3) {
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
export function pickStone(lines = [], limit = 4) {
  const out = [];
  const re = /^([\p{L}\w\s·\-\+\(\)\/]+?)\s*([0-9]+)$/u;

  for (const b of lines) {
    const s = (b || "").replace(/\s+/g, " ").trim();
    const m = s.match(re);
    if (!m) continue;
    const name = m[1].trim();
    const lvl = m[2].trim();
    out.push({
      name,
      lvl,
      danger: /감소|패널티|감소도/.test(name) || lvl === "0",
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** 왼쪽 방어구 전체에서 엘릭서/초월 요약 */
export function summarizeElixirTranscend(allLines = []) {
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
    const m = joined.match(
      /(회심|응징|응축|강맹|정기|정교|고양|단련|침식|속전|정수|분쇄|응보)\s*([0-9]+)\s*단계/
    );
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
export function bucketizeEquip(items = []) {
  const has = (s, k) => (s || "").includes(k);
  const match = (it, keys) => keys.some((k) => has(it.type, k) || has(it.name, k));

  const buckets = {
    leftArmor: [],
    rightAcc: [],
    bracelet: [],
    stone: [],
    compass: [],
    charm: [],
    extra: [],
  };

  const keysLeft = ["무기", "투구", "머리", "어깨", "상의", "하의", "장갑", "방패", "갑옷"];
  const keysAcc = ["목걸이", "귀걸이", "반지"];
  const keysBr = ["팔찌"];
  const keysStone = ["보주", "어빌리티 스톤", "능력 돌", "돌"];
  const keysComp = ["나침반"];
  const keysCharm = ["부적"];

  for (const it of items) {
    if (match(it, keysLeft)) buckets.leftArmor.push(it);
    else if (match(it, keysAcc)) buckets.rightAcc.push(it);
    else if (match(it, keysBr)) buckets.bracelet.push(it);
    else if (match(it, keysStone)) buckets.stone.push(it);
    else if (match(it, keysComp)) buckets.compass.push(it);
    else if (match(it, keysCharm)) buckets.charm.push(it);
    else buckets.extra.push(it);
  }

  return buckets;
}

/** 티어를 CSS class로 */
export function tierClass(tier) {
  if (tier === "상") return "tier-high";
  if (tier === "중") return "tier-mid";
  if (tier === "하") return "tier-low";
  return "";
}
