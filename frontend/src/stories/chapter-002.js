// 複製此檔並重新命名為 chapter-002.js；不要直接把此範本匯入 index.js。
export const chapter002 = {
  day4_start: {
    scene: '療養院 — 第四天早晨',
    speaker: '旁白',
    text: '入職適應期已經結束。從今天開始，你需要自行安排每日的五點行動點數，決定如何與病患相處，以及是否要進一步探索療養院的秘密。',
    options: [
      { label: '開始今日的工作', next: 'day4_work' },
    ],
  },

  day4_work: {
    scene: '療養院 — 第四天',
    speaker: '旁白',
    text: '你拿出工作手冊，開始安排今天的工作。五點行動點數將由你自行分配。',
    options: [
      { label: '查看病患安排', next: 'day4_patients' },
    ],
  },

  day4_patients: {
    scene: '療養院 — 第四天',
    speaker: '旁白',
    text: '你準備開始今天的療程。',
    options: [
      { label: '返回工作安排', next: 'day4_work' },
    ],
  },
};
