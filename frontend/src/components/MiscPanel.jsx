import React from "react";
import { pickPolishBadges, pickStone } from "../utils/lostinfoUtils";
import "../style/components/MiscPanel.scss"

function StoneItem({ it }) {
  const stoneLines = (it.detailLines || []).filter(Boolean);
  const parsed = pickStone(stoneLines, 4);

  return (
    <div className="lostinfo-itemRow">
      {it.icon && <img src={it.icon} alt="" className="lostinfo-itemIcon" />}
      <div className="lostinfo-itemBody">
        <div className="lostinfo-itemHead">
          <span className="lostinfo-itemName" title={it.name}>
            {it.name}
          </span>
          {it.grade && <span className="lostinfo-gradeBadge">{it.grade}</span>}
        </div>

        {parsed.length > 0 && (
          <div className="lostinfo-badgeLine">
            {parsed.map((x, i) => (
              <span
                key={i}
                className={`lostinfo-badge ${x.danger ? "badge-danger" : "badge-default"}`}
              >
                {x.name} {x.lvl}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BraceletItem({ it }) {
  const effects = pickPolishBadges(it.detailLines || [], 3);

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

        {effects.length > 0 && (
          <div className="lostinfo-badgeLine">
            {effects.map((t, i) => (
              <span key={i} className="lostinfo-badgeMuted">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TagRow({ items }) {
  return (
    <div className="lostinfo-rowLine">
      {items.map((it) => (
        <div key={`${it.type}-${it.name}`} className="lostinfo-rowTag" title={it.name}>
          {it.icon && <img src={it.icon} alt="" className="lostinfo-itemIcon" />}
          <span className="lostinfo-rowTagText">{it.name}</span>
        </div>
      ))}
    </div>
  );
}

export default function MiscPanel({ stone, bracelet, compass, charm, gems, gemEffects }) {
  const hasGems = (gems?.length || 0) > 0 || (gemEffects?.length || 0) > 0;

  return (
    <>
      {/* 보주/팔찌 */}
      {(stone.length > 0 || bracelet.length > 0) && (
        <div className="lostinfo-card">
          <h3 className="lostinfo-h3">보주 · 팔찌</h3>

          {stone.length > 0 && (
            <>
              <div className="lostinfo-subTitle">보주</div>
              <div className="lostinfo-colList">
                {stone.map((it) => (
                  <StoneItem key={`${it.type}-${it.name}`} it={it} />
                ))}
              </div>
            </>
          )}

          {bracelet.length > 0 && (
            <>
              <div className="lostinfo-subTitle">팔찌</div>
              <div className="lostinfo-colList">
                {bracelet.map((it) => (
                  <BraceletItem key={`${it.type}-${it.name}`} it={it} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 나침반/부적 */}
      {(compass.length > 0 || charm.length > 0) && (
        <div className="lostinfo-card">
          <h3 className="lostinfo-h3">나침반 · 부적</h3>
          <TagRow items={[...compass, ...charm]} />
        </div>
      )}

      {/* 보석 (하단 전체폭 느낌) */}
      {hasGems && (
        <div className="lostinfo-gemCard">
          <h3 className="lostinfo-h3">보석</h3>

          {gems.length > 0 && (
            <div className="lostinfo-gemRow">
              {gems.map((g, idx) => (
                <div key={idx} className="lostinfo-gemCell">
                  {g.Icon ? (
                    <img src={g.Icon} alt="" className="lostinfo-gemIcon" />
                  ) : (
                    <div className="lostinfo-gemIconPlaceholder">Gem</div>
                  )}
                  <div className="lostinfo-gemName">
                    {g.Name || `${g.Level ?? ""}레벨 보석`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {gemEffects.length > 0 && (
            <div className="lostinfo-gemEffectsRow">
              {gemEffects.map((ef, i) => (
                <span key={i} className="lostinfo-gemEffectTag">
                  {ef.Description || ef.Name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
