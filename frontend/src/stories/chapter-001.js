// 這是中性示範劇情，題材確定後可直接替換。
// id 必須唯一；每個選項 next 必須指向一個存在的 id。
export const chapter001 = {
  // =========================
  // DAY 1 — 入職第一天
  // =========================

  start: {
    scene: '療養院入口',
    speaker: '旁白',
    text: '清晨，你帶著新任職的文件，來到了植心療養院。這座療養院位於遠離市區的地方，周圍被樹木包圍。空氣中瀰漫著淡淡的草木氣息。你抬頭望向建築，深吸一口氣，推開了大門。',
    options: [
      { label: '進入療養院', next: 'day1_director' },
    ],
  },

  day1_director: {
    scene: '院長室',
    speaker: '院長',
    text: '「歡迎來到植心療養院。希望你能在這裡適應得愉快。」院長將一份文件放在桌上。「在正式開始工作之前，有幾件事情需要提醒你。每位病患都有自己的狀況，請不要急著下判斷。每天的工作時間有限，你需要妥善安排自己的時間。」',
    options: [
      { label: '仔細聆聽院長的說明', next: 'day1_rules' },
      { label: '詢問療養院的工作安排', next: 'day1_schedule' },
    ],
  },

  day1_rules: {
    scene: '院長室',
    speaker: '院長',
    text: '「治療需要耐心。理性、理解與適當的陪伴，都是重要的。至於療養院的其他規定，你可以慢慢熟悉。每天你有五點行動點數（AP），請自行安排訪談、觀察以及其他工作。」院長停頓了一下。「記住，不要擅自前往未開放的區域。」',
    options: [
      { label: '了解，記住院長的提醒', next: 'day1_patientA' },
    ],
  },

  day1_schedule: {
    scene: '院長室',
    speaker: '院長',
    text: '「每天的行動點數為五點。你可以將時間分配給病患訪談、病患觀察、探索療養院或其他工作。不同的行動會帶來不同的結果。」院長將工作手冊交給你。',
    options: [
      { label: '收下工作手冊', next: 'day1_patientA' },
    ],
  },

  day1_patientA: {
    scene: '病房 A — 窗邊',
    speaker: '旁白',
    text: '你按照院長的安排，來到第一間病房。窗邊坐著一名青年，他正望著窗外。桌上放著一個水壺。聽見你的腳步聲，他微微轉頭，卻沒有主動開口。',
    options: [
      { label: '主動向他打招呼', next: 'day1_patientA_greet' },
      { label: '先觀察他的周圍', next: 'day1_patientA_observe' },
    ],
  },

  day1_patientA_greet: {
    scene: '病房 A — 窗邊',
    speaker: '許樂天',
    text: '「……新來的？」他看了你一眼。「如果是要問問題，就直接問吧。」他的語氣平淡，似乎不太期待這次談話。',
    options: [
      { label: '介紹自己的工作', next: 'day1_patientA_intro' },
      { label: '詢問他今天的心情', next: 'day1_patientA_mood' },
    ],
  },

  day1_patientA_observe: {
    scene: '病房 A — 窗邊',
    speaker: '旁白',
    text: '窗邊的桌子整理得相當整齊。水壺始終放在固定的位置，窗戶也被擦拭得很乾淨。青年似乎察覺到你的視線，淡淡地說：「有什麼事嗎？」',
    options: [
      { label: '向他介紹自己', next: 'day1_patientA_intro' },
      { label: '詢問他為什麼喜歡坐在窗邊', next: 'day1_patientA_mood' },
    ],
  },

  day1_patientA_intro: {
    scene: '病房 A — 窗邊',
    speaker: '許樂天',
    text: '「許樂天。」他簡短地回答。「名字而已，沒什麼好記的。」他重新望向窗外，似乎不打算繼續談下去。',
    options: [
      { label: '尊重他的沉默', next: 'day1_end' },
      { label: '詢問他是否需要什麼', next: 'day1_patientA_need' },
    ],
  },

  day1_patientA_mood: {
    scene: '病房 A — 窗邊',
    speaker: '許樂天',
    text: '「心情？」他稍微皺起眉頭。「每天都差不多。你們真的需要問這種問題嗎？」他將視線移回窗外。',
    options: [
      { label: '表示自己只是想了解他', next: 'day1_patientA_need' },
      { label: '不再追問', next: 'day1_end' },
    ],
  },

  day1_patientA_need: {
    scene: '病房 A — 窗邊',
    speaker: '許樂天',
    text: '「不需要。」他回答得很快。過了一會兒，他又補充：「至少現在不需要。」這次，他沒有立刻轉開視線。',
    options: [
      { label: '結束今天的訪談', next: 'day1_end' },
    ],
  },

  day1_end: {
    scene: '療養院走廊',
    speaker: '旁白',
    text: '第一天的工作終於結束。你拿著工作手冊，走在安靜的走廊上。院長的提醒、病房裡的沉默，以及這座療養院的規定，都讓你感到有些不安。明天，你將認識另外兩位病患。',
    options: [
      { label: '進入第二天', next: 'day2_start' },
    ],
  },

  // =========================
  // DAY 2 — 認識另外兩位病患
  // =========================

  day2_start: {
    scene: '療養院走廊 — 上午',
    speaker: '旁白',
    text: '第二天早晨，你翻閱昨天收到的工作手冊。今天的安排是認識另外兩位病患。你整理好文件，前往病房 B。',
    options: [
      { label: '前往病房 B', next: 'day2_patientB' },
    ],
  },

  day2_patientB: {
    scene: '病房 B',
    speaker: '旁白',
    text: '病房裡，一名青年正在整理桌上的物品。看到你進來，他立刻站起身。「您好！您是新來的治療師嗎？」他露出笑容，似乎想讓你感到自在。',
    options: [
      { label: '向他介紹自己', next: 'day2_patientB_intro' },
      { label: '詢問他最近的生活', next: 'day2_patientB_daily' },
    ],
  },

  day2_patientB_intro: {
    scene: '病房 B',
    speaker: '陳堅強',
    text: '「我是陳堅強！如果有什麼需要幫忙的地方，請一定要告訴我。」他說完後，又有些不好意思地笑了笑。「抱歉，我好像說得太多了。」',
    options: [
      { label: '告訴他不必一直道歉', next: 'day2_patientB_response' },
      { label: '詢問他是否習慣幫助別人', next: 'day2_patientB_daily' },
    ],
  },

  day2_patientB_daily: {
    scene: '病房 B',
    speaker: '陳堅強',
    text: '「最近還算不錯吧！每天都有事情可以做，也能幫忙整理病房。」他停了一下。「只要大家都能好好相處，我就很開心了。」',
    options: [
      { label: '詢問他是否也照顧自己', next: 'day2_patientB_response' },
    ],
  },

  day2_patientB_response: {
    scene: '病房 B',
    speaker: '陳堅強',
    text: '「我嗎？沒關係的。我已經習慣了。」他笑著回答，但你注意到他似乎不太擅長談論自己的需求。',
    options: [
      { label: '結束訪談並前往下一間病房', next: 'day2_patientC' },
    ],
  },

  day2_patientC: {
    scene: '病房 C',
    speaker: '旁白',
    text: '下午，你來到病房 C。房間裡的氣氛與前兩間完全不同。桌上的物品擺放得有些凌亂，一名青年坐在椅子上，雙手交叉，似乎對你的到來並不感興趣。',
    options: [
      { label: '主動打招呼', next: 'day2_patientC_greet' },
      { label: '詢問他是否知道你今天會來', next: 'day2_patientC_ask' },
    ],
  },

  day2_patientC_greet: {
    scene: '病房 C',
    speaker: '張惟巧',
    text: '「又來一個？」他挑了挑眉。「你們每天都這麼忙嗎？還是只是想確認我有沒有乖乖待在這裡？」',
    options: [
      { label: '說明自己只是來認識他', next: 'day2_patientC_response' },
      { label: '詢問他對療養院的看法', next: 'day2_patientC_ask' },
    ],
  },

  day2_patientC_ask: {
    scene: '病房 C',
    speaker: '張惟巧',
    text: '「知道又怎樣？」他靠在椅背上。「這裡的事情可不是你們說了算。」他的語氣帶著明顯的不耐煩。',
    options: [
      { label: '保持冷靜，繼續談話', next: 'day2_patientC_response' },
      { label: '不勉強他繼續談', next: 'day2_end' },
    ],
  },

  day2_patientC_response: {
    scene: '病房 C',
    speaker: '張惟巧',
    text: '「隨便。」他低下頭，似乎不想再多說。過了一會兒，他突然問：「你真的覺得這裡的所有規定都合理嗎？」',
    options: [
      { label: '回答自己還需要了解更多', next: 'day2_end' },
      { label: '告訴他規定有時需要被理解', next: 'day2_end' },
    ],
  },

  day2_end: {
    scene: '療養院走廊 — 傍晚',
    speaker: '旁白',
    text: '一天的訪談結束了。三位病患的性格截然不同。許樂天的冷淡、陳堅強的過度體貼，以及張惟巧的不信任，都讓你開始思考：在這座療養院裡，真正需要被理解的究竟是什麼？',
    options: [
      { label: '進入第三天', next: 'day3_start' },
    ],
  },

  // =========================
  // DAY 3 — 探索療養院
  // =========================

  day3_start: {
    scene: '療養院 — 上午',
    speaker: '旁白',
    text: '第三天早晨，院長安排你熟悉療養院的其他工作區域。你走在走廊上，偶然發現一扇平時不太有人使用的門。門牌上寫著「前任治療師工作室」。',
    options: [
      { label: '查看工作室', next: 'day3_office' },
    ],
  },

  day3_office: {
    scene: '前任治療師工作室',
    speaker: '旁白',
    text: '工作室內沒有太多物品，書架上放著幾本舊書，桌面則留有一些文件。房間看起來已經很久沒有被整理過了。你注意到桌子的抽屜似乎沒有完全關上。',
    options: [
      { label: '檢查桌上的文件', next: 'day3_documents' },
      { label: '查看抽屜', next: 'day3_drawer' },
    ],
  },

  day3_documents: {
    scene: '前任治療師工作室',
    speaker: '旁白',
    text: '文件記錄著過去的治療工作，但部分頁面被抽走了。留下的內容提到病患的情緒變化、院內植物，以及某些不尋常的觀察。你無法確定這些記錄是否完整。',
    options: [
      { label: '繼續查看抽屜', next: 'day3_drawer' },
    ],
  },

  day3_drawer: {
    scene: '前任治療師工作室',
    speaker: '旁白',
    text: '抽屜裡有一本舊筆記本。部分文字已經模糊，但你仍能讀到幾句話：「治療並不只是表面上的症狀……院內的植物……與病患的情緒變化存在某種關聯。」你將筆記本的內容記下，決定日後再仔細研究。',
    options: [
      { label: '離開工作室', next: 'day3_afternoon' },
    ],
  },

  day3_afternoon: {
    scene: '員工休息室 — 下午',
    speaker: '旁白',
    text: '下午，你前往員工休息室。幾名工作人員正在聊天。當你提到前任治療師的工作室時，談話突然安靜了下來。',
    options: [
      { label: '詢問前任治療師的事情', next: 'day3_staff' },
      { label: '不再追問，觀察周圍', next: 'day3_evening' },
    ],
  },

  day3_staff: {
    scene: '員工休息室',
    speaker: '工作人員',
    text: '「前任治療師嗎？那已經是很久以前的事情了。」一名工作人員低聲回答。「聽說他離開之前，對療養院的一些事情有不同的看法。不過，這些事情最好還是不要隨便談論。」',
    options: [
      { label: '感謝對方並離開', next: 'day3_evening' },
    ],
  },

  day3_evening: {
    scene: '療養院庭院 — 傍晚',
    speaker: '旁白',
    text: '傍晚，你走到庭院。療養院的植物在夕陽下顯得格外安靜。你注意到部分植物的葉片似乎與其他植物不同，但你還不清楚這些植物與病患之間究竟有什麼關聯。',
    options: [
      { label: '仔細觀察植物', next: 'day3_plants' },
      { label: '回到自己的工作區', next: 'day3_end' },
    ],
  },

  day3_plants: {
    scene: '療養院庭院 — 傍晚',
    speaker: '旁白',
    text: '你仔細觀察庭院中的植物。幾株植物被單獨放置在不同的位置，旁邊沒有標示名稱。你將這個發現記在工作手冊中，或許之後能找到更多相關資料。',
    options: [
      { label: '回到自己的工作區', next: 'day3_end' },
    ],
  },

  day3_end: {
    scene: '療養院 — 夜晚',
    speaker: '旁白',
    text: '第三天結束了。前任治療師的筆記、工作人員的反應，以及庭院中不尋常的植物，都讓你對療養院產生更多疑問。接下來的日子，你將有更多時間安排病患訪談與探索。你將工作手冊放在桌上，準備迎接明天。',
    options: [
      { label: '結束入職適應期', next: 'day4_start' },
    ],
  },
};

