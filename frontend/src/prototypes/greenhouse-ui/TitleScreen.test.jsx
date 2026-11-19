import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from './PrototypeApp.jsx';
import RootApp from '../../App.jsx';

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: '拉動吊燈開關，點亮溫室' }));
}

describe('遊戲標題畫面', () => {
  it('只有指定預覽參數才進入模板，原首頁仍可使用', () => {
    window.history.replaceState(null, '', '/?prototype=greenhouse-ui');
    const view = render(<RootApp/>);
    expect(screen.getByRole('button', { name: '拉動吊燈開關，點亮溫室' })).toBeTruthy();
    window.history.replaceState(null, '', '/');
    view.rerender(<RootApp/>);
    expect(screen.getByRole('button', { name: '開始示範劇情' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '拉動吊燈開關，點亮溫室' })).toBe(null);
  });
  it('開場隱藏主選單；開燈與關燈會切換互動區域', () => {
    const { container } = render(<App/>);
    const reveal = container.querySelector('.gh-reveal');
    expect(reveal.hasAttribute('inert')).toBe(true);
    openMenu();
    expect(reveal.hasAttribute('inert')).toBe(false);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('植心溫室');
    expect(screen.getByRole('button', { name: '繼續遊戲' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '拉動吊燈開關，關閉燈光' }));
    expect(reveal.hasAttribute('inert')).toBe(true);
  });

  it('全螢幕設定可分類、保存並恢復預設；Esc 關閉後恢復焦點', () => {
    const { container } = render(<App/>);
    openMenu();
    const trigger = screen.getByRole('button', { name: '遊戲設定' });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog');
    expect(dialog.classList.contains('gh-config')).toBe(true);
    fireEvent.click(within(dialog).getByRole('switch', { name: '減少動態效果' }));
    fireEvent.click(within(dialog).getByRole('tab', { name: '文字' }));
    fireEvent.click(within(dialog).getByRole('button', { name: '較大' }));
    expect(JSON.parse(localStorage.getItem('greenhouse-ui-settings-v1'))).toEqual({ textSize: 'large', reducedMotion: true });
    expect(container.querySelector('.greenhouse-app').classList.contains('text-large')).toBe(true);
    fireEvent.click(within(dialog).getByRole('button', { name: '恢復預設設定' }));
    expect(JSON.parse(localStorage.getItem('greenhouse-ui-settings-v1'))).toEqual({ textSize: 'standard', reducedMotion: false });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBe(null);
    expect(document.activeElement).toBe(trigger);
  });

  it('方向鍵在主選單略過無存檔的繼續遊戲', () => {
    render(<App/>);
    openMenu();
    const start = screen.getByRole('button', { name: '開始遊戲' });
    start.focus();
    fireEvent.keyDown(start, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '遊戲設定' }));
  });

  it('無法保存設定時仍套用設定並提示', () => {
    const { container } = render(<App/>);
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: '遊戲設定' }));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    fireEvent.click(screen.getByRole('switch', { name: '減少動態效果' }));
    expect(container.querySelector('.greenhouse-app').classList.contains('reduce-motion')).toBe(true);
    expect(screen.getByText(/瀏覽器無法保存/)).toBeTruthy();
  });
});
