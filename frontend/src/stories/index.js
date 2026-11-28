// 往後新增章節：從 ./chapter-002.js 匯入並合併。
import { chapter001 } from './chapter-001.js';
import { chapter002 } from './chapter-002.js';

export const START_NODE = 'start';
export const story = { ...chapter001, ...chapter002 };
export const INITIAL_PROGRESS = { node: START_NODE, history: [] };
