// Matter.jsモジュール
const Engine = Matter.Engine;
const Render = Matter.Render;
const World = Matter.World;
const Bodies = Matter.Bodies;

// エンジンとレンダラーの作成
let engine;
let render;
let ballInterval;

// ゲームオーバー状態を管理するフラグ
let isGameOver = false;

// ゲーム開始時に呼ばれる関数
function startGame() {
    // 既存のエンジンとレンダラーを破棄（リスタート時用）
    if (engine) {
        World.clear(engine.world);
        Engine.clear(engine);
    }
    if (render) {
        Render.stop(render);
        render.canvas.remove();
    }
    if (ballInterval) {
        clearInterval(ballInterval);
    }
    
    loadCss('css/mergeshot.css');
    
    isGameOver = false;
    document.getElementById('game-over-overlay').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';

    engine = Engine.create();
    render = Render.create({
        element: document.getElementById('game-container'),
        canvas: document.getElementById('gameCanvas'),
        engine: engine,
        options: {
            width: 320,
            height: 480,
            wireframes: false, // 物理演算のワイヤーフレームではなく、実際の形状を表示
            background: '#f7f7f7'
        }
    });

    // ボールが落ちてくる天井と地面を作成
    const ground = Bodies.rectangle(320 / 2, 480, 320, 20, { isStatic: true }); // 地面
    const ceiling = Bodies.rectangle(320 / 2, 0, 320, 20, { isStatic: true }); // 天井 (ボールが出てくる位置)

    World.add(engine.world, [ground, ceiling]);

    // エンジンを実行
    Engine.run(engine);
    Render.run(render);

    // ボールを定期的に生成
    ballInterval = setInterval(addBall, 1000); // 1秒ごとにボールを生成

    // ボールが画面下部に到達したかチェックするイベントリスナー
    Matter.Events.on(engine, 'afterUpdate', function() {
        if (isGameOver) return; // ゲームオーバーなら何もしない

        const bodies = World.allBodies(engine.world);
        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            // 地面以外のボディで、画面下部より下に落ちた場合
            if (!body.isStatic && body.position.y > 480 + 50) { // 画面外に少し余裕を持たせる
                World.remove(engine.world, body);
            }
        }
    });
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


// ボールを追加する関数
function addBall() {
    if (isGameOver) return; // ゲームオーバーならボールを生成しない

    const radius = 20;
    const x = Math.random() * (320 - radius * 2) + radius; // 画面幅内でランダムなX座標
    const ball = Bodies.circle(x, 50, radius, {
        restitution: 0.8, // 反発係数
        friction: 0.001, // 摩擦
        density: 0.005, // 密度
        render: {
            fillStyle: getRandomColor() // ランダムな色を設定
        }
    });
    World.add(engine.world, ball);
}

// ランダムな色を生成する関数
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// ゲームオーバー表示関数（今回は使わないが、将来的に拡張しやすいように残しておく）
function showGameOver() {
    isGameOver = true;
    clearInterval(ballInterval);
    document.getElementById('final-score').innerText = '0'; // スコアはまだないので0
    document.getElementById('game-over-overlay').style.display = 'flex';
}

// HTML要素のイベントリスナー
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('start-game-1').addEventListener('click', () => {
        // スイカゲームのボタンが押されたときも物理ゲームを開始
        startGame();
    });
    document.getElementById('start-game-2').addEventListener('click', () => {
        // 物理ゲームのボタンが押されたとき
        startGame();
    });
    document.getElementById('restart-button').addEventListener('click', () => {
        startGame();
    });

    // 初期状態ではゲーム画面を非表示
    document.getElementById('game-container').style.display = 'none';
});
