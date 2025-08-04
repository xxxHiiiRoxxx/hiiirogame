// ゲーム設定
const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 500;
const CONTAINER_HEIGHT = 450; // 果物が落ちる容器の高さ
const GRAVITY = 0.5; // 重力
const MERGE_THRESHOLD = 0.8; // 結合判定の閾値 (果物同士の距離が半径の合計の何倍以下で結合するか)

// ゲーム要素 (HTML要素の取得)
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('current-score');
const nextFruitImg = document.getElementById('next-fruit-img'); // next-fruit-img要素を取得
const nextFruitTextDisplay = document.getElementById('next-fruit-text'); // 次の果物のテキスト表示用要素を追加 (HTML側に追加が必要です)
const gameOverOverlay = document.getElementById('game-over-overlay');
const finalScoreDisplay = document.getElementById('final-score');

// キャンバスのサイズ設定
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// script.js 内の fruitTypes の定義
const fruitTypes = [
    { name: 'cherry', radius: 15, color: '#FF0000', score: 1, text: '🍒' },
    { name: 'strawberry', radius: 20, color: '#FF4500', score: 3, text: '🍓' },
    { name: 'grapes', radius: 25, color: '#800080', score: 6, text: '🍇' },
    { name: 'dekopan', radius: 30, color: '#FFA500', score: 10, text: '🍊' },
    { name: 'persimmon', radius: 35, color: '#FF8C00', score: 15, text: '🍋' }, 
    { name: 'apple', radius: 40, color: '#008000', score: 21, text: '🍎' },
    { name: 'pear', radius: 45, color: '#FFFF00', score: 28, text: '🍐' },
    { name: 'peach', radius: 50, color: '#FF69B4', score: 36, text: '🍑' },
    { name: 'pineapple', radius: 55, color: '#DAA520', score: 45, text: '🍍' },
    { name: 'melon', radius: 60, color: '#ADFF2F', score: 55, text: '🍈' },
    { name: 'watermelon', radius: 65, color: '#228B22', score: 66, text: '🍉' }
];

// 果物の画像パス (今回は色で描画するため主に色を使用、これは参考として保持)
const fruitImages = {
    'cherry': 'https://via.placeholder.com/30/FF0000?text=C',
    'strawberry': 'https://via.placeholder.com/40/FF4500?text=S',
    'grapes': 'https://via.placeholder.com/50/800080?text=G',
    'dekopon': 'https://via.placeholder.com/60/FFA500?text=D',
    'persimmon': 'https://via.placeholder.com/70/FF8C00?text=P',
    'apple': 'https://via.placeholder.com/80/008000?text=A',
    'pear': 'https://via.placeholder.com/90/FFFF00?text=P',
    'peach': 'https://via.placeholder.com/100/FF69B4?text=P',
    'pineapple': 'https://via.placeholder.com/110/DAA520?text=P',
    'melon': 'https://via.placeholder.com/120/ADFF2F?text=M',
    'watermelon': 'https://via.placeholder.com/130/228B22?text=W'
};

// ゲームの状態変数
let fruits = []; // 正しく空の配列で初期化
let currentScore = 0;
let nextFruitType = null; // 次に落ちる果物の種類
let droppingFruit = null; // 現在落下中の果物（クリックで決定されるまでマウス追従）
let mouseX = CANVAS_WIDTH / 2; // マウスのX座標
let gameOver = false;
let lastFrameTime = 0; // requestAnimationFrameのdeltaTime計算用

// Fruitクラスの定義
class Fruit {
    constructor(x, y, typeIndex) {
        this.typeIndex = typeIndex;
        this.type = fruitTypes[typeIndex];
        this.x = x;
        this.y = y;
        this.radius = this.type.radius;
        this.color = this.type.color;
        this.vx = 0; // x方向の速度
        this.vy = 0; // y方向の速度
        this.isDropped = false; // プレイヤーが落とした後、物理演算を開始するか
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.closePath();

        // 果物の中心にテキストを描画
        ctx.fillStyle = '#000000'; // 文字の色を黒に設定
        // 果物の半径に応じて文字サイズを調整。最小サイズを設けることで小さすぎる果物でも読めるようにする
        ctx.font = `${Math.max(10, this.radius * 0.8)}px Arial`;
        ctx.textAlign = 'center'; // 文字を中央揃えに
        ctx.textBaseline = 'middle'; // ベースラインを中央に
        ctx.fillText(this.type.text, this.x, this.y); // 果物の中心に文字を描画
    }

    update() {
        if (this.isDropped) {
            this.vy += GRAVITY; // 重力適用
        }

        this.x += this.vx;
        this.y += this.vy;

        // 左右の壁との衝突判定と反発
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx *= -0.5; // 跳ね返り (エネルギー損失あり)
        } else if (this.x + this.radius > CANVAS_WIDTH) {
            this.x = CANVAS_WIDTH - this.radius;
            this.vx *= -0.5;
        }

        // 下の壁（容器の底）との衝突判定と反発
        if (this.y + this.radius > CONTAINER_HEIGHT) {
            this.y = CONTAINER_HEIGHT - this.radius;
            this.vy *= -0.3; // 摩擦で減速 (より大きなエネルギー損失)
            if (Math.abs(this.vy) < 0.5) { // ほとんど動かないなら停止
                this.vy = 0;
            }
        }
    }
}

// 新しい果物を生成し、次の果物として設定
function generateNextFruit() {
    // 最初の方の小さい果物からランダムに選択
    const minFruitIndex = 0; // チェリー
    const maxFruitIndex = 4; // カキ
    const randomIndex = Math.floor(Math.random() * (maxFruitIndex - minFruitIndex + 1)) + minFruitIndex;
    nextFruitType = fruitTypes[randomIndex]; // 次の果物の種類を決定

    // next-fruit-img 要素に背景色を設定 (これは既存のUI要素への設定)
    nextFruitImg.style.backgroundColor = nextFruitType.color;

    // next-fruit-text 要素にテキストを設定 (HTML側に <span id="next-fruit-text"></span> などが必要です)
    if (nextFruitTextDisplay) {
        nextFruitTextDisplay.textContent = nextFruitType.text;
    }
}

// ゲーム開始/リスタート時の初期化処理
function startGame() {
    fruits = []; // 果物リストをクリア
    currentScore = 0;
    scoreDisplay.textContent = currentScore; // スコア表示をリセット
    gameOver = false;
    gameOverOverlay.style.display = 'none'; //ゲームオーバー画面を非表示
   
    loadCss('css/suica.css');
    
    generateNextFruit();//最初の次の果物を生成
    droppingFruit = null; // 落下中の果物をリセット
    mouseX = CANVAS_WIDTH / 2; // マウスX座標もリセット
    lastFrameTime = performance.now(); // 最初のフレーム時間を設定
    requestAnimationFrame(gameLoop); // ゲームループを開始
}

// CSSファイルを動的に読み込むヘルパー関数
function loadCss(filename) {
    const head = document.getElementsByTagName('head')[0];
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = filename;
    link.id = 'dynamic-game-css'; // 後で削除するためにIDを付けておく
    // 既存の動的に読み込まれたCSSがあれば削除
    const existingCss = document.getElementById('dynamic-game-css');
    if (existingCss) {
        existingCss.remove();
    }
    head.appendChild(link);
}


// スコアを更新する関数
function updateScore(points) {
    currentScore += points;
    scoreDisplay.textContent = currentScore;
}

// 果物同士の衝突検出と結合処理
function handleCollisions() {
    for (let i = 0; i < fruits.length; i++) {
        const fruitA = fruits[i];
        fruitA.update(); // 各果物の物理状態を更新

        for (let j = i + 1; j < fruits.length; j++) {
            const fruitB = fruits[j];
            const dx = fruitB.x - fruitA.x;
            const dy = fruitB.y - fruitA.y;
            const distance = Math.sqrt(dx * dx + dy * dy); // 2つの果物間の距離
            const minDistance = fruitA.radius + fruitB.radius; // 衝突とみなす最小距離

            if (distance < minDistance) {
                // 衝突している場合
                // 同じ種類の果物で、次の種類がある場合、結合する
                if (fruitA.typeIndex === fruitB.typeIndex && fruitA.typeIndex + 1 < fruitTypes.length) {
                    const newFruitIndex = fruitA.typeIndex + 1;
                    const newFruitX = (fruitA.x + fruitB.x) / 2; // 結合位置は2つの果物の中間
                    const newFruitY = (fruitA.y + fruitB.y) / 2;
                    // 結合した2つの果物をリストから削除
                    fruits.splice(j, 1);
                    fruits.splice(i, 1);
                    i--; // 1つ削除されたのでインデックスを調整

                    // 新しい（より大きな）果物を生成してリストに追加
                    const newFruit = new Fruit(newFruitX, newFruitY, newFruitIndex);
                    newFruit.isDropped = true; // 結合で生成された果物も物理演算対象
                    fruits.push(newFruit);
                    updateScore(newFruit.type.score); // スコア加算

                    // 結合が発生したら、このフレームの衝突処理を一旦終了し、次のフレームで再計算
                    // これにより、連鎖反応が起きやすくなる
                    return;
                } else {
                    // 結合しない衝突の場合、押し出し処理 (めり込み防止)
                    const overlap = minDistance - distance; // 重なっている距離
                    const angle = Math.atan2(dy, dx); // 衝突角度
                    const pushX = Math.cos(angle) * overlap * 0.5;
                    const pushY = Math.sin(angle) * overlap * 0.5;

                    fruitA.x -= pushX;
                    fruitA.y -= pushY;
                    fruitB.x += pushX;
                    fruitB.y += pushY;
                    // 簡易的な速度の交換（反発）
                    const tempVxA = fruitA.vx;
                    const tempVyA = fruitA.vy;
                    fruitA.vx = fruitB.vx * 0.7; // 0.7は簡易的な反発係数
                    fruitA.vy = fruitB.vy * 0.7;
                    fruitB.vx = tempVxA * 0.7;
                    fruitB.vy = tempVyA * 0.7;
                }
            }
        }
    }
}

// ゲームオーバー判定
function checkGameOver() {
    // 容器の上部から一定の高さ以上にはみ出している果物があればゲームオーバー
    // ただし、新しい果物を落とす場所（Y=30）より上に上がったら判定
    for (const fruit of fruits) {
        if (fruit.y - fruit.radius < -50 && fruit.vy < 0.1 && Math.abs(fruit.vx) < 0.1) {
            // 落下中の果物ではなく、停止状態で上にはみ出していたら
            gameOver = true;
            break;
        }
    }

    if (gameOver) {
        finalScoreDisplay.textContent = currentScore;
        gameOverOverlay.style.display = 'flex'; // ゲームオーバー画面を表示
    }
}

// メインのゲームループ
function gameLoop(currentTime) {
    if (gameOver) return; // ゲームオーバーならループを停止

    const deltaTime = (currentTime - lastFrameTime) / 1000; // 前回のフレームからの時間差（秒）
    lastFrameTime = currentTime;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); // キャンバスをクリア

    // 容器の描画
    ctx.beginPath();
    ctx.moveTo(0, CONTAINER_HEIGHT);
    ctx.lineTo(CANVAS_WIDTH, CONTAINER_HEIGHT);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();

    // === ここから「次の果物」の描画ロジック ===
    if (nextFruitType) {
        const displayX = CANVAS_WIDTH - 50; // キャンバスの右上に表示する位置
        const displayY = 50;

        // まず果物の色付き円を描画
        ctx.beginPath();
        ctx.arc(displayX, displayY, nextFruitType.radius, 0, Math.PI * 2);
        ctx.fillStyle = nextFruitType.color;
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.closePath();

        // 次に果物のテキストを描画
        ctx.fillStyle = '#000000'; // 文字の色
        ctx.font = `${Math.max(10, nextFruitType.radius * 0.8)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(nextFruitType.text, displayX, displayY);
    }
    // === 「次の果物」の描画ロジックここまで ===

    // 落下前の果物の描画（マウスに追従）
    if (droppingFruit) {
        droppingFruit.draw();
    }

    // 既存の果物を更新・描画
    handleCollisions(); // 衝突処理と果物の位置更新
    fruits.forEach(fruit => fruit.draw());

    checkGameOver(); // ゲームオーバー判定

    requestAnimationFrame(gameLoop); // 次のフレームを要求
}

// マウス移動イベントリスナー（落下前の果物のX座標を更新）
canvas.addEventListener('mousemove', (e) => {
    if (gameOver) return;
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left; // キャンバス内でのマウスX座標

    // 現在落とす準備をしている果物があれば、そのX座標を更新
    if (!droppingFruit) {
        // 次の果物の種類が決定されていることを確認
        if (nextFruitType) {
            droppingFruit = new Fruit(mouseX, 30, fruitTypes.indexOf(nextFruitType));
            droppingFruit.isDropped = false; // まだ落とされていない状態
        }
    }
    // droppingFruitがnullでないことを確認してからx座標を更新
    if (droppingFruit) {
        // 果物が左右の壁からはみ出さないように制限
        droppingFruit.x = Math.max(droppingFruit.radius, Math.min(CANVAS_WIDTH - droppingFruit.radius, mouseX));
    }
});
// マウスクリックイベントリスナー（果物を落とす）
canvas.addEventListener('click', () => {
    if (gameOver) return;
    if (droppingFruit) {
        droppingFruit.isDropped = true; // 落下を開始
        fruits.push(droppingFruit); // 果物リストに追加
        droppingFruit = null; // 落下させたので、次の果物を準備するまでクリア
        generateNextFruit(); // 次の果物を生成
    }
});

// ゲーム開始処理の呼び出し
startGame();
