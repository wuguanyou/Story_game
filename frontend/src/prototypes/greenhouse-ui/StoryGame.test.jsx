import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import StoryGame from './StoryGame.jsx';
import App from './PrototypeApp.jsx';

afterEach(() => { cleanup(); localStorage.clear(); vi.useRealTimers(); vi.restoreAllMocks(); });
const props = () => ({ progress: { node: 'start', history: [] }, settings: { reducedMotion: false }, onChoice: vi.fn(), onSave: vi.fn(), onLoad: vi.fn(), onReset: vi.fn(), onExit: vi.fn() });

describe('劇情畫面模板', () => {
  it('逐字對話可立即揭露並選擇分支；離開畫面清除計時器', () => {
    vi.useFakeTimers();
    const input = props();
    const { container, unmount } = render(<StoryGame {...input}/>);
    expect(container.querySelector('.vn-choices').hasAttribute('inert')).toBe(true);
    act(() => vi.advanceTimersByTime(100));
    fireEvent.click(screen.getByRole('button', { name: '顯示完整對話' }));
    expect(container.querySelector('.vn-choices').hasAttribute('inert')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: '輕輕敲門' }));
    expect(input.onChoice).toHaveBeenCalledWith({ label: '輕輕敲門', next: 'left' });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('對話紀錄顯示過去選擇與目前對話；Esc 返回原操作位置', () => {
    render(<StoryGame {...props()} progress={{ node: 'left', history: [{ from: 'start', next: 'left', label: '輕輕敲門' }] }}/>);
    const trigger = screen.getByRole('button', { name: '紀錄' });
    trigger.focus(); fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: '對話紀錄' });
    expect(within(dialog).getByText('輕輕敲門')).toBeTruthy();
    expect(within(dialog).getByText('房內的聲音')).toBeTruthy();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBe(null);
    expect(document.activeElement).toBe(trigger);
  });

  it('隱藏介面後可透過 Esc 還原焦點', () => {
    render(<StoryGame {...props()}/>);
    const hide = screen.getByRole('button', { name: '隱藏介面' });
    fireEvent.click(hide);
    expect(screen.getByRole('button', { name: /顯示介面/ })).toBe(document.activeElement);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: /顯示介面/ })).toBe(null);
    expect(document.activeElement).toBe(hide);
  });

  it('主選單進入預覽、存檔後可讀取同一分支', () => {
    render(<App/>);
    fireEvent.click(screen.getByRole('button', { name: '拉動吊燈開關，點亮溫室' }));
    fireEvent.click(screen.getByRole('button', { name: '開始遊戲' }));
    fireEvent.click(screen.getByRole('button', { name: '進入流程預覽' }));
    fireEvent.click(screen.getByRole('button', { name: '顯示完整對話' }));
    fireEvent.click(screen.getByRole('button', { name: '輕輕敲門' }));
    fireEvent.click(screen.getByRole('button', { name: '存檔' }));
    expect(JSON.parse(localStorage.getItem('greenhouse-ui-progress-v1')).node).toBe('left');
    fireEvent.click(screen.getByRole('button', { name: '選單' }));
    fireEvent.click(screen.getByRole('button', { name: '返回主選單' }));
    fireEvent.click(screen.getByRole('button', { name: '拉動吊燈開關，點亮溫室' }));
    fireEvent.click(screen.getByRole('button', { name: '繼續遊戲' }));
    expect(screen.getByText('療養院・病房門前')).toBeTruthy();
    expect(screen.getByText('房內的聲音')).toBeTruthy();
  });
});
