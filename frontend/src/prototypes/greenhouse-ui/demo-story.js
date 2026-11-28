// 劇情畫面模板的介面預覽文字，非正式劇情或角色設定。
// id 必須唯一；每個選項 next 必須指向一個存在的 id。
export const chapter001 = {
  start: {
    scene: '療養院・走廊', speaker: '旁白',
    text: '走廊盡頭的燈還亮著。消毒水的氣味裡，混著一絲潮濕的青草味。你停在門前，聽見房內傳來細微的窸窣聲。',
    options: [
      { label: '輕輕敲門', next: 'left' },
      { label: '查看門邊的紀錄', next: 'right' },
      { label: '先停下來，聽一會兒', next: 'observe' },
    ],
  },
  left: { scene: '療養院・病房門前', speaker: '房內的聲音', text: '「……請進。」\n短暫的沉默後，門縫裡漏出一句很輕的回答。', options: [{ label: '回到走廊，重新預覽', next: 'start' }] },
  right: { scene: '療養院・病房門前', speaker: '旁白', text: '紙頁的邊角微微捲起。一小段藤蔓沿著紀錄板攀生，遮住了原本的字跡。', options: [{ label: '回到走廊，重新預覽', next: 'start' }] },
  observe: { scene: '療養院・走廊', speaker: '旁白', text: '你沒有急著打破寂靜。燈光下，一片細小的葉影緩緩晃動。', options: [{ label: '回到走廊，重新預覽', next: 'start' }] },
};


export const START_NODE = 'start';
export const story = chapter001;
