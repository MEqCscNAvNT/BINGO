/* =========================================
   BINGO PARTY Ver 1.00 - Main Script
   ========================================= */

// --- グローバル設定 ---
const STORAGE_KEY = 'bingo_party_v1_data';
const MAX_NUM = 75;

// --- DOM要素取得 ---
const elOpeningScreen = document.getElementById('opening-screen');
const elMainWrapper = document.getElementById('main-wrapper');
const elEnterBtn = document.getElementById('enter-btn');

const elCurrentNum = document.getElementById('current-number');
const elStatus = document.getElementById('status-text');
const elHistory = document.getElementById('history-board');
const elNpcArea = document.getElementById('npc-area');
const elStartBtn = document.getElementById('start-btn');
const elResetBtn = document.getElementById('reset-btn');

// 音量メニュー関連
const elBgmToggle = document.getElementById('bgm-toggle-btn');
const elBgmMenu = document.getElementById('bgm-menu');
const elBgmClose = document.getElementById('bgm-close-btn');
const elBgmSlider = document.getElementById('bgm-slider');
const elBgmVal = document.getElementById('bgm-val');
const elVolBtns = document.querySelectorAll('.vol-btn');

// オーディオ要素
const bgmPlayer = document.getElementById('bgm-player');
const seDrum = document.getElementById('se-drum');
const seCymbal = document.getElementById('se-cymbal');
const seHit = document.getElementById('se-hit');
const seReach = document.getElementById('se-reach');
const seWin = document.getElementById('se-win');

// ゲーム状態変数
let availableNumbers = [];
let drawnNumbers = [];
let isAnimating = false;
let npcs = []; // NPCオブジェクト管理配列
let seVolume = 0.3; // SE音量初期値

// --- NPC定義 (画像やセリフ) ---
const NPC_DATA_DEF = [
  { 
    name: "しばいぬ君", 
    imgFile: "image/npc1.png", 
    lines: { 
      hit: ["わん！", "くんくん...", "そこだワン！"], 
      reach: ["わおーん！(リーチ)", "尻尾ふりふり(リーチ)"], 
      bingo: ["わんわんお！(BINGO!)", "遠吠え(BINGO)"] 
    } 
  },
  { 
    name: "みけねこ", 
    imgFile: "image/npc2.png", 
    lines: { 
      hit: ["にゃん", "爪とぎカリカリ", "毛づくろい中"], 
      reach: ["フゴー！(リーチ)", "みゃおーん！(リーチ)"], 
      bingo: ["シャーッ！(BINGO!)", "ちゅーるくれ(BINGO)"] 
    } 
  },
  { 
    name: "くまさん", 
    imgFile: "image/npc3.png", 
    lines: { 
      hit: ["がお", "むしゃむしゃ", "冬眠したい"], 
      reach: ["がおおーん！(リーチ)", "立ち上がった！(リーチ)"], 
      bingo: ["がうがう！(BINGO!)", "鮭ゲット(BINGO)"] 
    } 
  }
];

/* =========================================
   初期化 & イベントリスナー
   ========================================= */

// ページ読み込み時
window.addEventListener('load', () => {
  bgmPlayer.volume = 0.3; // BGM初期音量
  initGame(); // ゲーム初期化
});

// STARTボタン (オープニング)
elEnterBtn.addEventListener('click', () => {
  elOpeningScreen.classList.add('hidden');
  elMainWrapper.classList.add('visible');
  
  // ユーザー操作をトリガーにBGM再生
  if(bgmPlayer.paused) {
    bgmPlayer.play().catch(e => console.log("BGM Play Error:", e));
  }
});

// 音量メニュー開閉
elBgmToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  elBgmMenu.classList.toggle('show');
});
elBgmClose.addEventListener('click', (e) => {
  e.stopPropagation();
  elBgmMenu.classList.remove('show');
});

// 画面外クリックでメニューを閉じる
document.addEventListener('click', (e) => {
  if (elBgmMenu.classList.contains('show')) {
    if (!elBgmMenu.contains(e.target) && !elBgmToggle.contains(e.target)) {
      elBgmMenu.classList.remove('show');
    }
  }
});

// SE音量ボタン
elVolBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // UI更新
    elVolBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // 値更新
    const vol = parseFloat(btn.getAttribute('data-vol'));
    seVolume = vol;
  });
});

// BGMスライダー
elBgmSlider.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  bgmPlayer.volume = val;
  elBgmVal.textContent = Math.round(val * 100);
});

// ゲーム操作ボタン
elStartBtn.addEventListener('click', startDraw);
elResetBtn.addEventListener('click', resetGame);


/* =========================================
   ゲームロジック関数
   ========================================= */

// --- 初期化 ---
function initGame() {
  const saved = loadData();
  
  // 履歴ボードのDOM作成
  elHistory.innerHTML = '';
  for(let i=1; i<=MAX_NUM; i++) {
    let d = document.createElement('div');
    d.className = 'hist-cell'; 
    d.id = `hist-${i}`; 
    d.textContent = i;
    elHistory.appendChild(d);
  }

  if (saved) {
    // === 続きから再開 ===
    availableNumbers = saved.availableNumbers;
    drawnNumbers = saved.drawnNumbers;
    elCurrentNum.textContent = saved.currentNumText;
    elStatus.textContent = saved.statusText;
    
    // 履歴反映
    drawnNumbers.forEach(num => {
      document.getElementById(`hist-${num}`).classList.add('active');
    });
    if (drawnNumbers.length > 0) {
      document.getElementById(`hist-${drawnNumbers[drawnNumbers.length-1]}`).classList.add('latest');
    }

    // NPC復元 (保存データ内のカード情報を使用)
    elNpcArea.innerHTML = '';
    npcs = saved.npcs.map((savedNpc, idx) => {
      const staticData = NPC_DATA_DEF[idx];
      return renderNPC(staticData, savedNpc.card, idx);
    });
    
    // NPC状態(穴・リーチ・ビンゴ)の見た目更新
    refreshNpcDisplay();

  } else {
    // === 新規ゲーム ===
    availableNumbers = [];
    drawnNumbers = [];
    for(let i=1; i<=MAX_NUM; i++) availableNumbers.push(i);
    
    elCurrentNum.textContent = "--";
    elStatus.textContent = "BINGO START!";
    
    elNpcArea.innerHTML = '';
    npcs = NPC_DATA_DEF.map((data, idx) => {
      const card = createBingoCard();
      return renderNPC(data, card, idx);
    });
  }

  // ボタン状態
  elStartBtn.disabled = false;
  elResetBtn.disabled = false;
  
  // 終了判定
  if (availableNumbers.length === 0 && drawnNumbers.length > 0) {
    elStartBtn.textContent = "完";
    elStartBtn.disabled = true;
  }
}

// --- 抽選開始 ---
function startDraw() {
  if (isAnimating || availableNumbers.length === 0) return;
  isAnimating = true;
  elStartBtn.disabled = true; 
  elResetBtn.disabled = true;
  elStatus.textContent = "抽選中...";
  
  // SE: ドラムロール
  playSe('drum'); 
  
  // 前回最新の強調を解除
  const oldLatest = document.querySelector('.hist-cell.latest');
  if(oldLatest) oldLatest.classList.remove('latest');
  
  // フキダシを消す
  npcs.forEach(npc => npc.elBubble.classList.remove('show'));

  // アニメーション (数字パラパラ)
  const timer = setInterval(() => {
    elCurrentNum.textContent = Math.floor(Math.random() * MAX_NUM) + 1;
  }, 60);

  // 2.5秒後に確定
  setTimeout(() => {
    clearInterval(timer);
    finalize();
  }, 2500);
}

// --- 確定処理 ---
function finalize() {
  stopSe('drum'); 
  playSe('cymbal'); 

  // 数字決定
  const idx = Math.floor(Math.random() * availableNumbers.length);
  const num = availableNumbers[idx];
  availableNumbers.splice(idx, 1);
  drawnNumbers.push(num);
  elCurrentNum.textContent = num;
  
  // 履歴更新
  const hCell = document.getElementById(`hist-${num}`);
  hCell.classList.add('active', 'latest');

  // NPC判定
  let statusUpdates = [];
  let highestEvent = 0; // 0:なし, 1:hit, 2:reach, 3:bingo

  npcs.forEach(npc => {
    if(npc.isBingo) return; // 既に上がってる人は無視

    let hit = false;
    // 穴あけチェック
    for(let c=0; c<5; c++){
      for(let r=0; r<5; r++){
        if(npc.card[c][r] === num) {
          hit = true;
          const cell = document.getElementById(`npc-${npc.id}-c${c}-r${r}`);
          if(cell) cell.classList.add('hit');
        }
      }
    }

    if(hit) {
      if(highestEvent < 1) highestEvent = 1;
      
      const state = checkBingoState(npc, drawnNumbers);
      let lineType = null;

      if (state === 2) { 
        // BINGO
        npc.isBingo = true;
        npc.elContainer.classList.add('bingo');
        npc.elContainer.classList.remove('reach');
        lineType = 'bingo'; 
        statusUpdates.push(`${npc.name} BINGO!`);
        highestEvent = 3;
      } else if (state === 1) { 
        // REACH
        if(!npc.isReach) {
          npc.isReach = true;
          npc.elContainer.classList.add('reach');
          lineType = 'reach'; 
          statusUpdates.push(`${npc.name} REACH!`);
          if(highestEvent < 2) highestEvent = 2;
        } else { 
          lineType = 'hit'; 
        }
      } else { 
        // HIT
        lineType = 'hit'; 
      }

      // セリフ表示
      if (lineType) {
        const linesArr = npc.lines[lineType];
        const randomLine = linesArr[Math.floor(Math.random() * linesArr.length)];
        npc.elBubble.textContent = randomLine;
        npc.elBubble.classList.add('show');
      }
    }
  });

  // リアクションSE (少し遅延)
  setTimeout(() => {
    if (highestEvent === 3) playSe('win');
    else if (highestEvent === 2) playSe('reach');
    else if (highestEvent === 1) playSe('hit');
  }, 800);

  // ステータス更新
  if (statusUpdates.length > 0) elStatus.textContent = statusUpdates.join(' / ');
  else elStatus.textContent = `${num} 番`;

  // データ保存
  saveData();

  isAnimating = false;
  elResetBtn.disabled = false;
  
  if (availableNumbers.length === 0) {
    elStartBtn.textContent = "完";
    elStatus.textContent = "終了";
    saveData();
  } else {
    elStartBtn.disabled = false;
  }
}

// --- データ管理 ---
function saveData() {
  const data = {
    availableNumbers,
    drawnNumbers,
    npcs: npcs.map(n => ({ name: n.name, card: n.card, id: n.id })),
    currentNumText: elCurrentNum.textContent,
    statusText: elStatus.textContent
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch(e) { return null; }
}

function resetGame() {
  if(confirm("データをリセットして最初から始めますか？")) {
    localStorage.removeItem(STORAGE_KEY);
    // ページリロードでリセット効果
    location.reload();
  }
}

// --- ユーティリティ ---

// ビンゴカード生成
function createBingoCard() {
  let card = [];
  const ranges = [[1,15], [16,30], [31,45], [46,60], [61,75]];
  for (let col = 0; col < 5; col++) {
    let nums = [];
    const [min, max] = ranges[col];
    for(let i=min; i<=max; i++) nums.push(i);
    // シャッフル
    for(let i=nums.length-1; i>0; i--){
      const j = Math.floor(Math.random()*(i+1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    const selected = nums.slice(0, 5);
    if(col===2) selected[2] = 0; // FREE
    card.push(selected);
  }
  return card;
}

// NPC描画
function renderNPC(data, card, idx) {
  const container = document.createElement('div');
  container.className = 'npc-container'; 
  container.id = `npc-container-${idx}`;
  
  // 左エリア
  const leftGroup = document.createElement('div'); leftGroup.className = 'npc-left-group';
  const bubble = document.createElement('div'); bubble.className = 'speech-bubble'; bubble.textContent = "...";
  leftGroup.appendChild(bubble);
  
  const imgBox = document.createElement('div'); imgBox.className = 'npc-img-box';
  const img = document.createElement('img'); img.src = data.imgFile; img.className = 'npc-img';
  img.onerror = function() { 
    this.style.display='none'; imgBox.style.background='#ccc'; imgBox.textContent='NO IMG'; 
    imgBox.style.display='flex'; imgBox.style.alignItems='center'; imgBox.style.justifyContent='center'; 
  };
  imgBox.appendChild(img); leftGroup.appendChild(imgBox);
  
  const nameDiv = document.createElement('div'); nameDiv.className = 'npc-name'; nameDiv.textContent = data.name;
  leftGroup.appendChild(nameDiv); container.appendChild(leftGroup);
  
  // 右エリア
  const rightGroup = document.createElement('div'); rightGroup.className = 'npc-right-group';
  const cardBg = document.createElement('div'); cardBg.className = 'mini-card-bg';
  const grid = document.createElement('div'); grid.className = 'mini-grid';
  
  for(let r=0; r<5; r++){
    for(let c=0; c<5; c++){
      const cell = document.createElement('div'); cell.className = 'mini-cell'; cell.id = `npc-${idx}-c${c}-r${r}`;
      const val = card[c][r];
      if(val===0) { cell.classList.add('free'); cell.textContent = "★"; } else { cell.textContent = val; }
      grid.appendChild(cell);
    }
  }
  cardBg.appendChild(grid); rightGroup.appendChild(cardBg); container.appendChild(rightGroup);
  elNpcArea.appendChild(container);
  
  return { 
    name: data.name, card: card, id: idx, 
    lines: data.lines, elContainer: container, elBubble: bubble,
    isBingo: false, isReach: false
  };
}

// 復元時の表示更新
function refreshNpcDisplay() {
  npcs.forEach(npc => {
    // 穴あけ
    for(let c=0; c<5; c++){
      for(let r=0; r<5; r++){
        if (npc.card[c][r] === 0 || drawnNumbers.includes(npc.card[c][r])) {
          const cell = document.getElementById(`npc-${npc.id}-c${c}-r${r}`);
          if(cell) {
             if(npc.card[c][r] === 0) cell.classList.add('free');
             else cell.classList.add('hit');
          }
        }
      }
    }
    // 状態
    const state = checkBingoState(npc, drawnNumbers);
    if (state === 2) {
      npc.isBingo = true;
      npc.elContainer.classList.add('bingo');
    } else if (state === 1) {
      npc.isReach = true;
      npc.elContainer.classList.add('reach');
    }
  });
}

// ビンゴ状態チェック (0:なし, 1:リーチ, 2:ビンゴ)
function checkBingoState(npc, drawns) {
  let marked = Array(5).fill(0).map(() => Array(5).fill(false));
  for(let c=0; c<5; c++){
    for(let r=0; r<5; r++){
      const val = npc.card[c][r];
      if(val === 0 || drawns.includes(val)) marked[c][r] = true;
    }
  }
  let bingoCount = 0; let reachCount = 0;
  const checkLine = (arr) => {
    const count = arr.filter(b => b).length;
    if (count === 5) bingoCount++;
    if (count === 4) reachCount++;
  };
  
  // 縦・横
  for(let c=0; c<5; c++) checkLine(marked[c]);
  for(let r=0; r<5; r++) {
    let row = []; for(let c=0; c<5; c++) row.push(marked[c][r]); checkLine(row);
  }
  // 斜め
  checkLine([marked[0][0], marked[1][1], marked[2][2], marked[3][3], marked[4][4]]);
  checkLine([marked[4][0], marked[3][1], marked[2][2], marked[1][3], marked[0][4]]);
  
  if (bingoCount > 0) return 2;
  if (reachCount > 0) return 1;
  return 0;
}

// SE再生ラッパー
function playSe(type) {
  if (seVolume === 0) return;
  
  let target = null;
  if (type === 'drum') target = seDrum;
  else if (type === 'cymbal') target = seCymbal;
  else if (type === 'hit') target = seHit;
  else if (type === 'reach') target = seReach;
  else if (type === 'win') target = seWin;

  if (target) {
    target.volume = seVolume;
    target.currentTime = 0;
    target.play().catch(()=>{});
  }
}

function stopSe(type) {
  if (type === 'drum') { seDrum.pause(); seDrum.currentTime = 0; }

}

/* =========================================
   キーボード操作 (スペースキー対応)
   ========================================= */
document.addEventListener('keydown', (e) => {
  // スペースキーが押されたかチェック
  if (e.code === 'Space') {
    e.preventDefault(); // スペースキーによる画面スクロールを防止

    // A. オープニング画面が表示されている場合
    if (!elOpeningScreen.classList.contains('hidden')) {
      elEnterBtn.click(); // STARTボタンをクリックしたことにする
      return;
    }

    // B. メイン画面の場合
    // 抽選中でなく、かつボタンが押せる状態（終了していない）なら実行
    if (!isAnimating && !elStartBtn.disabled) {
      
      // もし音量メニューが開いていたら閉じる（邪魔にならないように）
      if (elBgmMenu.classList.contains('show')) {
        elBgmMenu.classList.remove('show');
      }

      // 抽選開始
      startDraw();
    }
  }
});
