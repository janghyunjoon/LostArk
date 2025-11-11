// routes/lostark.js
const express = require("express");
const axios = require("axios");

const router = express.Router();

const API_BASE = process.env.LOSTARK_API_BASE || "https://developer-lostark.game.onstove.com";
const API_JWT  = process.env.LOSTARK_API_KEY;

const HEADERS = {
  accept: "application/json",
  authorization: `bearer ${API_JWT}`,
};
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// ---- 간단 메모리 캐시 ----
const cache = new Map(); // key -> { data, expire }
const TTL_MS = 30 * 1000;

router.get("/gems/:name", async (req, res) => {
  const { name } = req.params;
  try {
    const r = await fetch(
      `${LOSTARK_API_BASE}/armories/gems/${encodeURIComponent(name)}`,
      {
        headers: {
          Authorization: `bearer ${API_KEY}`,
        },
      }
    );

    if (!r.ok) {
      return res.status(r.status).json({
        message: "Lost Ark Gems API error",
        status: r.status,
      });
    }

    const data = await r.json();
    return res.json(data);
  } catch (err) {
    console.error("Gems route error:", err);
    return res.status(500).json({ message: "Gems proxy error" });
  }
});
function getCache(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expire) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}
function setCache(key, data, ttl = TTL_MS) {
  cache.set(key, { data, expire: Date.now() + ttl });
}

async function loGet(path) {
  const url = `${API_BASE}${path}`;
  const { data } = await axios.get(url, { headers: HEADERS, timeout: 10000 });
  return data;
}

/* =========================================================
   기본 프록시
   ========================================================= */
router.get("/armory/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const key = `armory:${name}`;
    const hit = getCache(key); if (hit) return res.json(hit);
    const data = await loGet(`/armories/characters/${encodeURIComponent(name)}`);
    setCache(key, data);
    res.json(data);
  } catch (err) {
    res.status(err?.response?.status || 500).json({ message: "armory 요청 실패", detail: err?.response?.data || err.message });
  }
});

router.get("/profiles/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const key = `profiles:${name}`;
    const hit = getCache(key); if (hit) return res.json(hit);
    const data = await loGet(`/armories/characters/${encodeURIComponent(name)}/profiles`);
    setCache(key, data);
    res.json(data);
  } catch (err) {
    res.status(err?.response?.status || 500).json({ message: "profiles 요청 실패", detail: err?.response?.data || err.message });
  }
});

router.get("/equipment/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const key = `equipment:${name}`;
    const hit = getCache(key); if (hit) return res.json(hit);
    const data = await loGet(`/armories/characters/${encodeURIComponent(name)}/equipment`);
    setCache(key, data);
    res.json(data);
  } catch (err) {
    res.status(err?.response?.status || 500).json({ message: "equipment 요청 실패", detail: err?.response?.data || err.message });
  }
});

router.get("/engravings/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const key = `engravings:${name}`;
    const hit = getCache(key); if (hit) return res.json(hit);
    const data = await loGet(`/armories/characters/${encodeURIComponent(name)}/engravings`);
    setCache(key, data);
    res.json(data);
  } catch (err) {
    res.status(err?.response?.status || 500).json({ message: "engravings 요청 실패", detail: err?.response?.data || err.message });
  }
});

/* =========================================================
   ⬇️ 툴팁 파싱 라우트 (세부정보 정규화)
   GET /api/lostark/equipment-parsed/:name
   - 각 장비의 Tooltip(JSON 문자열)을 파싱해 detailLines[]로 반환
   ========================================================= */
const TAG_RE = /<[^>]+>/g;
const clean = (html) =>
  (html || "")
    .replace(/\\n/g, "\n")
    .replace(TAG_RE, "")
    .replace(/\s+\n/g, "\n")
    .trim();

function parseTooltipItem(item) {
  // item.Tooltip는 JSON 문자열(키: Element_000 ~) 구조
  let tip;
  try { tip = JSON.parse(item.Tooltip || "{}"); } catch { tip = {}; }

  const lines = [];
  for (const k of Object.keys(tip)) {
    const elm = tip[k]?.value || tip[k];
    if (!elm) continue;

    // 문자열형
    if (typeof elm === "string") {
      const t = clean(elm);
      if (t) lines.push(t);
      continue;
    }

    // 공통적으로 나오는 str/leftStr/rightStr/type 등
    if (elm.str) {
      const t = clean(elm.str);
      if (t) lines.push(t);
    }
    if (elm.leftStr) {
      const t = clean(elm.leftStr);
      if (t) lines.push(t);
    }
    if (elm.rightStr) {
      const t = clean(elm.rightStr);
      if (t) lines.push(t);
    }

    // Element_XXX.content.list 형태
    if (Array.isArray(elm?.content?.list)) {
      for (const row of elm.content.list) {
        const t = clean(row?.contentStr || row?.str || row?.leftStr || row?.rightStr || "");
        if (t) lines.push(t);
      }
    }

    // Element_XXX.Element_000~ 내부에도 반복적으로 존재
    for (const subKey of Object.keys(elm)) {
      const v = elm[subKey];
      if (v && typeof v === "object") {
        const s1 = clean(v?.str || v?.leftStr || v?.rightStr || "");
        if (s1) lines.push(s1);
        if (Array.isArray(v?.content?.list)) {
          for (const row of v.content.list) {
            const t = clean(row?.contentStr || row?.str || row?.leftStr || row?.rightStr || "");
            if (t) lines.push(t);
          }
        }
      }
    }
  }

  // 중복/공백 정리
  const detailLines = Array.from(new Set(lines.filter(Boolean)));

  // 품질/등급 추출(가능한 경우)
  const quality = Number(item?.Quality) || null;
  const grade = item?.Grade || null;

  return {
    type: item.Type,
    name: item.Name,
    grade,
    quality,
    icon: item.Icon,
    detailLines,
  };
}

router.get("/equipment-parsed/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const key = `equipment-parsed:${name}`;
    const hit = getCache(key); if (hit) return res.json(hit);

    const raw = await loGet(`/armories/characters/${encodeURIComponent(name)}/equipment`);
    const arr = Array.isArray(raw) ? raw : [];
    const parsed = arr.map(parseTooltipItem);
    setCache(key, parsed, 20 * 1000); // 20초
    res.json(parsed);
  } catch (err) {
    res.status(err?.response?.status || 500).json({ message: "equipment-parsed 요청 실패", detail: err?.response?.data || err.message });
  }
});

module.exports = router;
