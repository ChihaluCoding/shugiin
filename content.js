// 衆議院サイト モダナイザー - メインスクリプト

class ShugiinModernizer {
  constructor() {
    this.isEnabled = true;
    this.settings = {
      darkMode: false,
      animations: true,
      statistics: true
    };
    this.init();
  }

  init() {
    // 設定を読み込み
    this.loadSettings().then(() => {
      // ページが完全に読み込まれた後に実行
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.modernizePage());
      } else {
        this.modernizePage();
      }
    });

    // メッセージリスニング
    this.setupMessageListener();
  }

  // 設定を読み込み
  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get([
        'extensionEnabled', 
        'darkMode', 
        'animations', 
        'statistics'
      ]);
      
      this.isEnabled = result.extensionEnabled !== false;
      this.settings.darkMode = result.darkMode || false;
      this.settings.animations = result.animations !== false;
      this.settings.statistics = result.statistics !== false;
    } catch (error) {
      console.log('設定の読み込みに失敗しました（Chrome拡張機能外での実行）');
    }
  }

  // メッセージリスナーの設定
  setupMessageListener() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
          case 'toggleDarkMode':
            this.toggleDarkMode(request.data);
            break;
          case 'toggleAnimations':
            this.toggleAnimations(request.data);
            break;
          case 'toggleStatistics':
            this.toggleStatistics(request.data);
            break;
        }
        sendResponse({ success: true });
      });
    }
  }

  modernizePage() {
    if (!this.isEnabled) return;

    // メインコンテナにクラスを追加
    document.body.classList.add('shugiin-modernizer');
    
    // ページのモダナイズを実行
    this.addSearchFilter();
    this.modernizeTable();
    
    if (this.settings.statistics) {
      this.addStatistics();
      this.addSeatChart();
    }
    
    this.improveAccessibility();
    
    if (this.settings.animations) {
      this.addAnimations();
    }
    
    this.setupMobileOptimization();

    // ダークモードの適用
    if (this.settings.darkMode) {
      document.body.classList.add('dark-mode');
    }
    
    console.log('衆議院サイトがモダナイズされました！');
  }

  // ダークモードの切り替え
  toggleDarkMode(enabled) {
    this.settings.darkMode = enabled;
    if (enabled) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  // アニメーションの切り替え
  toggleAnimations(enabled) {
    this.settings.animations = enabled;
    const animatedElements = document.querySelectorAll('.fade-in, .slide-in');
    animatedElements.forEach(el => {
      if (enabled) {
        el.style.animation = '';
      } else {
        el.style.animation = 'none';
      }
    });
  }

  // 統計表示の切り替え
  toggleStatistics(enabled) {
    this.settings.statistics = enabled;
    const statsContainer = document.querySelector('.stats-cards');
    const chartContainer = document.querySelector('.seat-chart-container');
    
    if (statsContainer) {
      statsContainer.style.display = enabled ? 'grid' : 'none';
    }
    if (chartContainer) {
      chartContainer.style.display = enabled ? 'block' : 'none';
    }
  }

  // 検索・フィルター機能を追加
  addSearchFilter() {
    const table = document.querySelector('table');
    if (!table) return;

    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-filter fade-in';
    searchContainer.innerHTML = `
      <input type="text" class="search-input" placeholder="会派名で検索..." />
      <div class="filter-info" style="margin-top: 1rem; color: #7f8c8d; font-size: 0.9rem;">
        <span id="total-count"></span>件の会派が表示されています
      </div>
    `;

    table.parentNode.insertBefore(searchContainer, table);

    const searchInput = searchContainer.querySelector('.search-input');
    const totalCount = searchContainer.querySelector('#total-count');

    // 初期カウントを設定
    this.updateCount(totalCount);

    searchInput.addEventListener('input', (e) => {
      this.filterTable(e.target.value, totalCount);
    });
  }

  // テーブルのフィルタリング
  filterTable(searchTerm, countElement) {
    const table = document.querySelector('table');
    if (!table) return;

    const rows = table.querySelectorAll('tbody tr');
    let visibleCount = 0;

    rows.forEach(row => {
      const partyName = row.querySelector('td:first-child');
      if (partyName) {
        const text = partyName.textContent.toLowerCase();
        const isVisible = text.includes(searchTerm.toLowerCase());
        
        row.style.display = isVisible ? '' : 'none';
        if (isVisible && !this.isSummaryRow(row)) visibleCount++;
      }
    });

    countElement.textContent = visibleCount;
  }

  // カウントを更新
  updateCount(countElement) {
    const table = document.querySelector('table');
    if (!table) return;

    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const validRows = rows.filter(row => !this.isSummaryRow(row));
    countElement.textContent = validRows.length;
  }

  // テーブルのモダナイズ
  modernizeTable() {
    const table = document.querySelector('table');
    if (!table) return;

    table.classList.add('slide-in');

    // テーブルヘッダーの改善
    const headers = table.querySelectorAll('th');
    headers.forEach((header, index) => {
      if (index === 0) header.textContent = '会派名';
      if (index === 1) header.textContent = '略称';
      if (index === 2) header.textContent = '所属議員数';
    });

    // モバイル用のデータラベルを追加
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      cells.forEach((cell, index) => {
        switch(index) {
          case 0:
            cell.setAttribute('data-label', '会派名');
            break;
          case 1:
            cell.setAttribute('data-label', '略称');
            break;
          case 2:
            cell.setAttribute('data-label', '所属議員数');
            break;
        }
      });
    });

    // 行にホバー効果とクリック機能を追加
    rows.forEach(row => {
      row.addEventListener('click', () => {
        const partyName = row.querySelector('td:first-child')?.textContent;
        if (partyName) {
          this.showPartyDetails(partyName);
        }
      });
    });
  }

  // 会派詳細を表示（模擬機能）
  showPartyDetails(partyName) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    `;

    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 15px;
        padding: 2rem;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease;
      ">
        <h3 style="margin-top: 0; color: #2c3e50;">${partyName}</h3>
        <p style="color: #7f8c8d; margin-bottom: 2rem;">
          この会派の詳細情報を表示する機能を実装予定です。
          <br>現在は模擬表示となっています。
        </p>
        <button style="
          background: linear-gradient(45deg, #3498db, #9b59b6);
          color: white;
          border: none;
          padding: 0.75rem 2rem;
          border-radius: 25px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
        " onclick="this.parentElement.parentElement.remove()">
          閉じる
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    // クリックで閉じる
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // 統計情報を追加
  addStatistics() {
    const table = document.querySelector('table');
    if (!table) return;

    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const dataRows = rows.filter(row => !this.isSummaryRow(row));
    if (!dataRows.length) return;

    let totalMembers = 0;
    let totalFemaleMembers = 0;
    let totalParties = dataRows.length;

    dataRows.forEach(row => {
      const memberCell = row.querySelector('td:last-child');
      if (memberCell) {
        const text = memberCell.textContent;
        const memberMatch = text.match(/(\d+)/);
        const femaleMatch = text.match(/（(\d+)）/);

        if (memberMatch) {
          totalMembers += parseInt(memberMatch[1], 10);
        }
        if (femaleMatch) {
          totalFemaleMembers += parseInt(femaleMatch[1], 10);
        }
      }
    });

    const femaleRatio = totalMembers ? ((totalFemaleMembers / totalMembers) * 100).toFixed(1) : '0.0';

    const statsContainer = document.createElement('div');
    statsContainer.className = 'stats-cards fade-in';
    statsContainer.innerHTML = `
      <div class="stat-card">
        <div class="stat-number">${totalParties}</div>
        <div class="stat-label">会派数</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${totalMembers}</div>
        <div class="stat-label">総議員数</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${totalFemaleMembers}</div>
        <div class="stat-label">女性議員数</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${femaleRatio}%</div>
        <div class="stat-label">女性議員比率</div>
      </div>
    `;

    table.parentNode.insertBefore(statsContainer, table);
  }

  // 議席グラフを追加
  addSeatChart() {
    const table = document.querySelector('table');
    if (!table) return;

    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const dataRows = rows.filter(row => !this.isSummaryRow(row));
    if (!dataRows.length) return;

    // 各党のデータを収集
    const parties = [];
    let totalSeats = 0;

    dataRows.forEach(row => {
      const nameCell = row.querySelector('td:first-child');
      const abbrevCell = row.querySelector('td:nth-child(2)');
      const seatsCell = row.querySelector('td:last-child');
      
      if (nameCell && seatsCell) {
        const name = nameCell.textContent.trim();
        const abbrev = abbrevCell ? abbrevCell.textContent.trim() : '';
        const seatsMatch = seatsCell.textContent.match(/(\d+)/);
        
        if (seatsMatch) {
          const seats = parseInt(seatsMatch[1], 10);
          totalSeats += seats;
          parties.push({ name, abbrev, seats });
        }
      }
    });

    // 党ごとの色を定義
    const partyColors = {
      '自由民主党・無所属の会': '#e74c3c',
      '立憲民主党・無所属': '#3498db',
      '日本維新の会': '#f39c12',
      '国民民主党・無所属クラブ': '#2ecc71',
      '公明党': '#9b59b6',
      'れいわ新選組': '#e91e63',
      '日本共産党': '#e74c3c',
      '有志・改革の会': '#34495e',
      '参政党': '#16a085',
      '減税保守こども': '#f1c40f',
      '無所属': '#95a5a6'
    };

    // 与党と野党を分類
    const rulingParties = ['自由民主党・無所属の会'];
    let rulingSeats = 0;
    let oppositionSeats = 0;

    parties.forEach(party => {
      if (rulingParties.includes(party.name)) {
        rulingSeats += party.seats;
      } else {
        oppositionSeats += party.seats;
      }
    });

    const majority = Math.ceil(totalSeats / 2);

    // グラフコンテナを作成
    const chartContainer = document.createElement('div');
    chartContainer.className = 'seat-chart-container fade-in';
    
    // 党ごとのグラフを生成
    const partiesChart = this.createSemicircleChart(parties, totalSeats, majority, partyColors, '政党別議席数');
    
    // 与野党グラフを生成
    const coalitionParties = [
      { name: '与党', seats: rulingSeats, color: '#e74c3c' },
      { name: '野党', seats: oppositionSeats, color: '#3498db' }
    ];
    const coalitionChart = this.createSemicircleChart(coalitionParties, totalSeats, majority, null, '与野党別議席数', true);

    chartContainer.innerHTML = `
      <h2 class="seat-chart-title">🏛️ 議席配分グラフ</h2>
      ${partiesChart}
      <div style="margin-top: 4rem;"></div>
      ${coalitionChart}
    `;

    table.parentNode.insertBefore(chartContainer, table);
  }

  // 半円グラフを作成
  createSemicircleChart(parties, totalSeats, majority, partyColors, title, isCoalition = false) {
    const radius = 200;
    const centerX = 250;
    const centerY = 240;
    const strokeWidth = 60;
    const innerRadius = radius - strokeWidth / 2;

    let currentAngle = 0; // 左端から開始（180度）
    const startAngle = Math.PI; // 180度（ラジアン）

    // 与党リスト
    const rulingParties = ['自由民主党・無所属の会'];

    let svgPaths = '';
    let legendHTML = '';

    parties.forEach((party, index) => {
      const percentage = (party.seats / totalSeats) * 100;
      const sweepAngle = (party.seats / totalSeats) * Math.PI; // 半円なのでπまで
      
      const color = isCoalition ? party.color : (partyColors[party.name] || this.getRandomColor(index));
      
      // 与党かどうかを判定
      const isRulingParty = !isCoalition && rulingParties.includes(party.name);

      // 円弧の開始点と終了点を計算
      const startX = centerX + innerRadius * Math.cos(startAngle + currentAngle);
      const startY = centerY + innerRadius * Math.sin(startAngle + currentAngle);
      const endAngle = startAngle + currentAngle + sweepAngle;
      const endX = centerX + innerRadius * Math.cos(endAngle);
      const endY = centerY + innerRadius * Math.sin(endAngle);

      // 大きい円弧かどうか（180度より大きいか）
      const largeArcFlag = sweepAngle > Math.PI ? 1 : 0;

      svgPaths += `
        <path
          d="M ${startX} ${startY} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${endX} ${endY}"
          fill="none"
          stroke="${color}"
          stroke-width="${strokeWidth}"
          opacity="0.9"
          class="chart-segment"
          data-party="${party.name}"
          data-seats="${party.seats}"
        >
          <title>${party.name}: ${party.seats}議席 (${percentage.toFixed(1)}%)</title>
        </path>
      `;

      legendHTML += `
        <div class="legend-item${(isCoalition && party.name === '与党') || isRulingParty ? ' ruling-party' : ''}">
          <div class="legend-color" style="background: ${color};"></div>
          <div class="legend-info">
            <div class="legend-name">${party.name}</div>
            <div class="legend-seats">${party.seats}議席<span class="legend-percentage">(${percentage.toFixed(1)}%)</span></div>
          </div>
        </div>
      `;

      currentAngle += sweepAngle;
    });

    // 過半数ラインを計算
    const majorityAngle = startAngle + (majority / totalSeats) * Math.PI;
    const majorityLineStartR = innerRadius - strokeWidth / 2;
    const majorityLineEndR = innerRadius + strokeWidth / 2;
    const majorityX1 = centerX + majorityLineStartR * Math.cos(majorityAngle);
    const majorityY1 = centerY + majorityLineStartR * Math.sin(majorityAngle);
    const majorityX2 = centerX + majorityLineEndR * Math.cos(majorityAngle);
    const majorityY2 = centerY + majorityLineEndR * Math.sin(majorityAngle);
    const majorityLabelR = radius + 50;
    const majorityLabelX = centerX + majorityLabelR * Math.cos(majorityAngle);
    const majorityLabelY = centerY + majorityLabelR * Math.sin(majorityAngle);

    return `
      <div style="margin-bottom: 3rem;">
        <h3 style="text-align: center; color: #00d4ff; font-size: 1.5rem; margin-bottom: 2rem;">${title}</h3>
        <div class="chart-wrapper">
          <div class="semicircle-chart">
            <svg viewBox="0 0 500 260" xmlns="http://www.w3.org/2000/svg">
              <!-- 各党の円弧 -->
              ${svgPaths}
              <!-- 過半数ライン -->
              <line
                x1="${majorityX1}"
                y1="${majorityY1}"
                x2="${majorityX2}"
                y2="${majorityY2}"
                stroke="#ff4757"
                stroke-width="4"
                stroke-dasharray="8,4"
                opacity="1"
              />
              <circle cx="${majorityX2}" cy="${majorityY2}" r="8" fill="#ff4757" opacity="1" />
              
              <!-- 過半数ラベルの背景 -->
              <rect
                x="${majorityLabelX - 50}"
                y="${majorityLabelY - 20}"
                width="100"
                height="40"
                fill="rgba(255, 71, 87, 0.9)"
                rx="15"
                stroke="#ff4757"
                stroke-width="2"
              />
              <text
                x="${majorityLabelX}"
                y="${majorityLabelY + 10}"
                fill="#ffffff"
                font-size="16"
                font-weight="bold"
                text-anchor="middle"
                style="text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);"
              >過半数 ${majority}</text>

            </svg>
            <div class="chart-center-text">
              <div class="chart-total">${totalSeats}</div>
              <div class="chart-label">総議席数</div>
            </div>
          </div>
        </div>
        <div class="chart-legend">
          ${legendHTML}
        </div>
      </div>
    `;
  }

  // ランダムな色を生成
  getRandomColor(index) {
    const colors = [
      '#e74c3c', '#3498db', '#f39c12', '#2ecc71', '#9b59b6',
      '#e91e63', '#34495e', '#16a085', '#f1c40f', '#95a5a6'
    ];
    return colors[index % colors.length];
  }

  // 集計行かどうかを判定
  isSummaryRow(row) {
    const nameCell = row.querySelector('td:first-child');
    if (!nameCell) return false;

    const normalized = nameCell.textContent.replace(/\s+/g, '').trim();
    return normalized === '計';
  }

  // アクセシビリティの改善
  improveAccessibility() {
    // スキップリンクを追加
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'メインコンテンツへスキップ';
    skipLink.className = 'sr-only';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      z-index: 100000;
      border-radius: 4px;
    `;

    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px';
    });

    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });

    document.body.insertBefore(skipLink, document.body.firstChild);

    // メインコンテンツにIDを追加
    const table = document.querySelector('table');
    if (table) {
      table.id = 'main-content';
      table.setAttribute('role', 'table');
      table.setAttribute('aria-label', '衆議院会派別所属議員数一覧');
    }

    // テーブルヘッダーにスコープを追加
    const headers = document.querySelectorAll('th');
    headers.forEach(header => {
      header.setAttribute('scope', 'col');
    });
  }

  // アニメーションを追加
  addAnimations() {
    // 要素の遅延表示
    const animatedElements = document.querySelectorAll('.fade-in, .slide-in');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.1 });

    animatedElements.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'all 0.6s ease';
      observer.observe(el);
    });
  }

  // モバイル最適化
  setupMobileOptimization() {
    // ビューポートメタタグを追加
    if (!document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1.0';
      document.head.appendChild(viewport);
    }

    // タッチデバイス用のジェスチャーサポート
    if ('ontouchstart' in window) {
      document.body.classList.add('touch-device');
      
      // スワイプでテーブルをスクロール
      let startX, startY, distX, distY;
      const table = document.querySelector('table');
      
      if (table) {
        table.addEventListener('touchstart', (e) => {
          const touch = e.touches[0];
          startX = touch.pageX;
          startY = touch.pageY;
        });

        table.addEventListener('touchmove', (e) => {
          if (!startX || !startY) return;
          
          const touch = e.touches[0];
          distX = touch.pageX - startX;
          distY = touch.pageY - startY;
          
          if (Math.abs(distX) > Math.abs(distY)) {
            e.preventDefault(); // 水平スクロールを優先
          }
        });
      }
    }
  }
}

// 拡張機能が有効な場合のみ実行
if (window.location.hostname === 'www.shugiin.go.jp') {
  new ShugiinModernizer();
}