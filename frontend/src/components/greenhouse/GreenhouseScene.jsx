// 醫院場景隱在黑暗中，骷髏美術由 TitleScreen 分層呈現。
export default function GreenhouseScene() {
  return <svg className="greenhouse-scene" viewBox="0 0 1440 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <radialGradient id="hospital-ambient" cx=".76" cy=".42" r=".62"><stop stopColor="#16201f"/><stop offset=".55" stopColor="#070b0c"/><stop offset="1" stopColor="#000"/></radialGradient>
      <linearGradient id="hospital-wall" x2="0" y2="1"><stop stopColor="#9dafaa" stopOpacity=".06"/><stop offset="1" stopColor="#9dafaa" stopOpacity="0"/></linearGradient>
      <pattern id="hospital-tiles" width="100" height="75" patternUnits="userSpaceOnUse"><path d="M100 0H0V75" fill="none" stroke="#6d7e79" strokeOpacity=".055"/></pattern>
    </defs>
    <rect width="1440" height="1000" fill="url(#hospital-ambient)"/>
    <path d="M790 160H1420V750H790Z" fill="url(#hospital-tiles)"/>
    <path d="M960 190H1300V680H960Z" fill="url(#hospital-wall)" stroke="#6d817b" strokeOpacity=".06"/>
    <g stroke="#87958f" fill="none" strokeWidth="2" opacity=".075">
      <path d="M0 750H1440M960 190V680M1073 190V680M1187 190V680M1300 190V680M960 400H1300"/>
      <path d="M1320 380V775M1288 775H1351M1294 381H1345M1308 381V410M1333 381V410"/>
      <path d="M1328 410H1339V448H1328ZM1333 448Q1360 503 1325 575"/>
      <path d="M873 759V698Q873 683 889 683H1127Q1143 683 1143 698V759M854 759H1161M880 759V804M1130 759V804"/>
    </g>
    <path d="M884 677Q957 659 1128 676L1136 718H882Z" fill="#7e9186" opacity=".025"/>
    <path d="M1300 750L1440 1000M790 750L669 1000" stroke="#718278" strokeOpacity=".035"/>
  </svg>;
}
