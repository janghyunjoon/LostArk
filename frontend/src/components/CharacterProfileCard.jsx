import React from "react";
import "../style/components/CharacterProfileCard.scss"

export default function CharacterProfileCard({ name, profile }) {
  return (
    <section className="lostinfo-leftCol">
      <div className="lostinfo-cardProfile">
        {profile?.CharacterImage ? (
          <img
            src={profile.CharacterImage}
            alt={`${name} 프로필`}
            className="lostinfo-profileImg"
          />
        ) : (
          <div className="lostinfo-profileImgPlaceholder">이미지 없음</div>
        )}

        <div className="lostinfo-profileBody">
          <div className="lostinfo-profileNameRow">
            <span className="lostinfo-profileName">{name}</span>
            <span className="lostinfo-profileClass">
              {profile?.CharacterClassName || "-"}
            </span>
          </div>

          <div className="lostinfo-profileItemLevel">{profile?.ItemAvgLevel || "-"}</div>

          <div className="lostinfo-profileMetaGrid">
            <div>
              <span className="lostinfo-label">서버</span>
              <span>{profile?.ServerName || "-"}</span>
            </div>
            <div>
              <span className="lostinfo-label">길드</span>
              <span>{profile?.GuildName || "-"}</span>
            </div>
            <div>
              <span className="lostinfo-label">칭호</span>
              <span>{profile?.Title || "-"}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
