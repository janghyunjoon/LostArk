import React, { useMemo } from "react";
import {
  pickEnhanceBadges,
  pickTierBadges,
  summarizeElixirTranscend,
  tierClass,
} from "../utils/lostinfoUtils";
import "../style/components/ArmorPanel.scss"

function ArmorItem({ it }) {
  const badgesEnh = pickEnhanceBadges(it.detailLines || []);
  const tiers = pickTierBadges(it.detailLines || [], 2);

  return (
    <div className="lostinfo-itemRow">
      {it.icon && <img src={it.icon} alt="" className="lostinfo-itemIcon" />}
      <div className="lostinfo-itemBody">
        <div className="lostinfo-itemHead">
          <span className="lostinfo-itemName" title={it.name}>
            {it.name}
          </span>
          {typeof it.quality === "number" && (
            <span className="lostinfo-qBadge">{it.quality}</span>
          )}
        </div>

        <div className="lostinfo-badgeLine">
          {badgesEnh.map((b, i) => (
            <span key={`en-${i}`} className="lostinfo-badgeMuted">
              {b.text}
            </span>
          ))}
          {tiers.map((t, i) => (
            <span
              key={`t-${i}`}
              className={`lostinfo-badge ${tierClass(t.tier)}`}
              title={`${t.tier} ${t.text} ${t.val || ""}`}
            >
              {t.tier}&nbsp;{t.text}
              {t.val ? ` ${t.val}` : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ArmorPanel({ leftArmor }) {
  const leftAllLines = useMemo(
    () => leftArmor.flatMap((it) => it.detailLines || []),
    [leftArmor]
  );
  const exSum = useMemo(() => summarizeElixirTranscend(leftAllLines), [leftAllLines]);

  const showSummary =
    exSum.elixirPct ||
    exSum.refineSum ||
    exSum.refineStep ||
    exSum.transSum ||
    exSum.transAvg;

  return (
    <div className="lostinfo-card">
      <h3 className="lostinfo-h3">무기 · 방어구</h3>

      <div className="lostinfo-colList">
        {leftArmor.length ? (
          leftArmor.map((it) => <ArmorItem key={`${it.type}-${it.name}`} it={it} />)
        ) : (
          <div className="lostinfo-empty">정보 없음</div>
        )}
      </div>

      {showSummary && (
        <div className="lostinfo-summaryRow">
          {(exSum.elixirPct || exSum.refineSum || exSum.refineStep) && (
            <div className="lostinfo-summaryBox">
              <div className="lostinfo-summaryTitle">
                엘릭서 {exSum.elixirPct || ""}
              </div>
              <div className="lostinfo-summaryList">
                {exSum.refineSum && <span>연성 합계 {exSum.refineSum}</span>}
                {exSum.refineStep && <span>{exSum.refineStep}</span>}
              </div>
            </div>
          )}

          {(exSum.transSum || exSum.transAvg) && (
            <div className="lostinfo-summaryBox">
              <div className="lostinfo-summaryTitle">초월</div>
              <div className="lostinfo-summaryList">
                {exSum.transSum && <span>합계 {exSum.transSum}</span>}
                {exSum.transAvg && <span>평균 {exSum.transAvg}</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
