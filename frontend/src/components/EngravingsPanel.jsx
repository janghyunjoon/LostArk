import React from "react";
import "../style/components/EngravingsPanel.scss"

export default function EngravingsPanel({ engravings }) {
  return (
    <div className="lostinfo-card">
      <h3 className="lostinfo-h3">각인</h3>

      {engravings?.Effects?.length ? (
        <ul className="lostinfo-engList">
          {engravings.Effects.map((e) => (
            <li key={e.Name} className="lostinfo-engItem">
              <strong>{e.Name}</strong>
              <span className="lostinfo-engDesc">{e.Description}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="lostinfo-empty">각인 정보 없음</div>
      )}
    </div>
  );
}
