// ポップアップスクリプト

class PopupController {
  constructor() {
    this.init();
  }

  init() {
    this.loadCurrentStatus();
    this.setupEventListeners();
    this.displayCurrentUrl();
  }

  // 現在の状態を読み込み
  loadCurrentStatus() {
    chrome.storage.sync.get(['extensionEnabled', 'darkMode', 'animations', 'statistics'], (result) => {
      const isEnabled = result.extensionEnabled !== false; // デフォルトは有効
      
      this.updateStatus(isEnabled);
      this.updateToggleButton(isEnabled);
      
      // 設定の読み込み
      document.getElementById('dark-mode').checked = result.darkMode || false;
      document.getElementById('animations').checked = result.animations !== false;
      document.getElementById('statistics').checked = result.statistics !== false;
    });
  }

  // イベントリスナーの設定
  setupEventListeners() {
    // 拡張機能の有効/無効切り替え
    document.getElementById('toggle-extension').addEventListener('click', () => {
      this.toggleExtension();
    });

    // ページ再読み込み
    document.getElementById('reload-page').addEventListener('click', () => {
      this.reloadPage();
    });

    // 設定の変更
    document.getElementById('dark-mode').addEventListener('change', (e) => {
      this.saveSetting('darkMode', e.target.checked);
      this.applyDarkMode(e.target.checked);
    });

    document.getElementById('animations').addEventListener('change', (e) => {
      this.saveSetting('animations', e.target.checked);
      this.sendMessage('toggleAnimations', e.target.checked);
    });

    document.getElementById('statistics').addEventListener('change', (e) => {
      this.saveSetting('statistics', e.target.checked);
      this.sendMessage('toggleStatistics', e.target.checked);
    });
  }

  // 現在のURLを表示
  displayCurrentUrl() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      const urlDisplay = document.getElementById('current-url');
      
      if (currentTab.url.includes('shugiin.go.jp')) {
        urlDisplay.textContent = '衆議院サイトが検出されました';
        urlDisplay.style.color = '#27ae60';
      } else {
        urlDisplay.textContent = '対象サイトではありません';
        urlDisplay.style.color = '#e74c3c';
      }
    });
  }

  // 拡張機能の有効/無効切り替え
  toggleExtension() {
    chrome.storage.sync.get(['extensionEnabled'], (result) => {
      const newState = !(result.extensionEnabled !== false);
      
      chrome.storage.sync.set({ extensionEnabled: newState }, () => {
        this.updateStatus(newState);
        this.updateToggleButton(newState);
        this.reloadPage();
      });
    });
  }

  // ステータス表示の更新
  updateStatus(isEnabled) {
    const statusText = document.getElementById('status-text');
    const statusDot = document.querySelector('.status-dot');
    
    if (isEnabled) {
      statusText.textContent = 'アクティブ';
      statusDot.style.background = '#27ae60';
    } else {
      statusText.textContent = '無効';
      statusDot.style.background = '#e74c3c';
      statusDot.style.animation = 'none';
    }
  }

  // トグルボタンの更新
  updateToggleButton(isEnabled) {
    const button = document.getElementById('toggle-extension');
    
    if (isEnabled) {
      button.textContent = '拡張機能を無効にする';
      button.classList.add('active');
    } else {
      button.textContent = '拡張機能を有効にする';
      button.classList.remove('active');
    }
  }

  // ページの再読み込み
  reloadPage() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.reload(tabs[0].id);
      window.close();
    });
  }

  // 設定の保存
  saveSetting(key, value) {
    chrome.storage.sync.set({ [key]: value });
  }

  // コンテンツスクリプトにメッセージを送信
  sendMessage(action, data) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: action,
        data: data
      }).catch(() => {
        // エラーは無視（ページが対象サイトでない場合など）
      });
    });
  }

  // ダークモードの適用
  applyDarkMode(isDark) {
    if (isDark) {
      document.body.style.background = 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)';
    } else {
      document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
    
    this.sendMessage('toggleDarkMode', isDark);
  }
}

// DOMが読み込まれた後に初期化
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});