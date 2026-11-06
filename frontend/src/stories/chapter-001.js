// 這是中性示範劇情，題材確定後可直接替換。
// id 必須唯一；每個選項 next 必須指向一個存在的 id。
export const chapter001 = {
  start: {
    scene: '示範場景 A', speaker: '旁白',
    text: '你來到一個路口。這只是測試劇情系統的占位內容，並非正式故事。',
    options: [
      { label: '走向左邊', next: 'left' },
      { label: '走向右邊', next: 'right' },
      { label: '留在原地觀察', next: 'observe' },
    ],
  },
  left: { scene: '示範場景 B', speaker: '旁白', text: '你選擇了左邊。這裡可以接續任意劇情。', options: [{ label: '回到起點', next: 'start' }] },
  right: { scene: '示範場景 C', speaker: '旁白', text: '你選擇了右邊。劇情分支已成功切換。', options: [{ label: '回到起點', next: 'start' }] },
  observe: { scene: '示範場景 D', speaker: '旁白', text: '你決定先觀察周圍。', options: [{ label: '回到起點', next: 'start' }] },
};
