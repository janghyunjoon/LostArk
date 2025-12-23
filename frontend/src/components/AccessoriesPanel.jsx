import React from "react";
import { pickTierBadges, tierClass } from "../utils/lostinfoUtils";
import "../style/components/AccessoriesPanel.scss"

function AccItem({ it }) {
  const tiers = pickTierBadges(it.detailLines || [], 3);

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

        {tiers.length > 0 && (
          <div className="lostinfo-badgeLine">
            {tiers.map((t, i) => (
              <span key={i} className={`lostinfo-badge ${tierClass(t.tier)}`}>
                {t.tier}&nbsp;{t.text}
                {t.val ? ` ${t.val}` : ""}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AccessoriesPanel({ rightAcc }) {
  return (
    <div className="lostinfo-card">
      <h3 className="lostinfo-h3">악세사리</h3>

      <div className="lostinfo-colList">
        {rightAcc.length ? (
          rightAcc.map((it) => <AccItem key={`${it.type}-${it.name}`} it={it} />)
        ) : (
          <div className="lostinfo-empty">악세사리 정보 없음</div>
        )}
      </div>
    </div>
  );
}
