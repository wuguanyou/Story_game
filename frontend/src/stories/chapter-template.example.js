// 複製此檔並重新命名為 chapter-002.js；不要直接把此範本匯入 index.js。
export const chapter002 = {
  chapter2_start: {
    scene: '場景標題',
    speaker: '角色名稱',
    text: '這裡放對話或旁白。',
    // 可自行擴充 background、character、effects 等欄位，前端元件也要配合。
    options: [{ label: '下一步', next: 'chapter2_end' }],
  },
  chapter2_end: { scene: '場景標題', speaker: '旁白', text: '章節暫時結束。', options: [] },
};
