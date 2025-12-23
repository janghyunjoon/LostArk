import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../style/pages/LostInfo.scss";

import CharacterProfileCard from "../components/CharacterProfileCard";
import ArmorPanel from "../components/ArmorPanel";
import AccessoriesPanel from "../components/AccessoriesPanel";
import EngravingsPanel from "../components/EngravingsPanel";
import MiscPanel from "../components/MiscPanel";

import { bucketizeEquip, useCharacterName } from "../utils/lostinfoUtils";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function LostInfo() {
  const navigate = useNavigate();
  const name = useCharacterName();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [profile, setProfile] = useState(null);
  const [equipmentParsed, setEquipmentParsed] = useState([]);
  const [engravings, setEngravings] = useState(null);
  const [gems, setGems] = useState([]);
  const [gemEffects, setGemEffects] = useState([]);

  useEffect(() => {
    if (!name) {
      setErr("검색어(캐릭터명)가 없습니다.");
      setProfile(null);
      setEquipmentParsed([]);
      setEngravings(null);
      setGems([]);
      setGemEffects([]);
      return;
    }

    let alive = true;
    setLoading(true);
    setErr("");
    setProfile(null);
    setEquipmentParsed([]);
    setEngravings(null);
    setGems([]);
    setGemEffects([]);

    Promise.all([
      fetch(`${API_BASE}/api/lostark/profiles/${encodeURIComponent(name)}`),
      fetch(`${API_BASE}/api/lostark/equipment-parsed/${encodeURIComponent(name)}`),
      fetch(`${API_BASE}/api/lostark/engravings/${encodeURIComponent(name)}`),
      fetch(`${API_BASE}/api/lostark/gems/${encodeURIComponent(name)}`),
    ])
      .then(async ([p, e, g, gm]) => {
        if (!p.ok || !e.ok || !g.ok) {
          const msgs = [];
          if (!p.ok) msgs.push(`profiles:${p.status}`);
          if (!e.ok) msgs.push(`equipment:${e.status}`);
          if (!g.ok) msgs.push(`engravings:${g.status}`);
          throw new Error(msgs.join(", "));
        }

        const pJson = await p.json();
        const eJson = await e.json();
        const gJson = await g.json();

        let gmJson = null;
        if (gm.ok) gmJson = await gm.json();
        else console.warn("Gem API error:", gm.status);

        if (!alive) return;

        setProfile(pJson || null);
        setEquipmentParsed(Array.isArray(eJson) ? eJson : []);
        setEngravings(gJson || null);

        let gemsArr = [];
        let effectsArr = [];

        if (gmJson) {
          if (Array.isArray(gmJson.Gems)) gemsArr = gmJson.Gems;
          else if (Array.isArray(gmJson)) gemsArr = gmJson;
          if (Array.isArray(gmJson.Effects)) effectsArr = gmJson.Effects;
        } else if (Array.isArray(pJson?.Gems)) {
          gemsArr = pJson.Gems;
        }

        setGems(gemsArr);
        setGemEffects(effectsArr);
      })
      .catch((error) => {
        if (!alive) return;
        console.error(error);
        setErr(error?.message || "요청 중 오류가 발생했습니다.");
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [name]);

  const buckets = useMemo(() => bucketizeEquip(equipmentParsed), [equipmentParsed]);
  const onBack = () => navigate(-1);

  return (
    <div className="lostinfo-wrap">
      <div className="lostinfo-headerRow">
        <button onClick={onBack} className="lostinfo-backBtn">
          ← 뒤로
        </button>
        <h1 className="lostinfo-title">{name ? `캐릭터: ${name}` : "캐릭터 조회"}</h1>
      </div>

      {loading && <div className="lostinfo-skeleton">불러오는 중...</div>}
      {err && !loading && <div className="lostinfo-error">⚠ {err}</div>}

      {!loading && !err && (
        <div className="lostinfo-layout">
          <CharacterProfileCard name={name} profile={profile} />

          <section className="lostinfo-rightCol">
            <ArmorPanel leftArmor={buckets.leftArmor} />
            <AccessoriesPanel rightAcc={buckets.rightAcc} />
            <EngravingsPanel engravings={engravings} />
            <MiscPanel
              stone={buckets.stone}
              bracelet={buckets.bracelet}
              compass={buckets.compass}
              charm={buckets.charm}
              gems={gems}
              gemEffects={gemEffects}
            />
          </section>
        </div>
      )}
    </div>
  );
}
