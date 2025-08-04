
  
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

//script読み込み関数
function loadScript(url, { async = true, defer = false } = {}) {
  
  const script = document.createElement('script');
  script.src = url;
  script.async = async;
  script.defer = defer;
  
  script.onload = () => {
    console.log(`Loaded: ${url}`);
  };
  script.onerror = () => {
    console.error(`Failed to load: ${url}`);
  };
  
  document.head.appendChild(script);
  init();
}


// 初期化
function init() {
  
  //スタイルシート
  loadCss('/css/mergeshot.css');
  
  // 画面サイズを調整
  adjustCanvasSize();
  
  console.log('関数初期化');
// Matter.js設定
const Engine = Matter.Engine;
const Render = Matter.Render;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Events = Matter.Events;
const Vector = Matter.Vector;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;

console.log('関数初期化終わり');

// ゲーム設定
let CANVAS_WIDTH = 800;
let CANVAS_HEIGHT = 600;
let CANNON_X, CANNON_Y;
let scaleFactor = 1;

let engine, render, world;
let cannon, cannonAngle = -Math.PI / 2;
let balls = new Map();
let blocks = new Map();
let gameScore = 0;
let ammoCount = 10;
let blockSpawnTimer = 0;
let gameRunning = true;

  // エンジン作成
  engine = Engine.create();
  world = engine.world;
  engine.world.gravity.y = 0.8;
  
  // レンダラー作成
  render = Render.create({
    element: document.getElementById('gameContainer'),
    canvas: document.getElementById('gameCanvas'),
    engine: engine,
    options: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      wireframes: false,
      background: 'transparent',
      showAngleIndicator: false,
      showVelocity: false
    }
  });
  
  // 壁を作成
  createWalls();
  
  // 大砲を作成
  createCannon();
  
  // イベントリスナー
  setupEventListeners();
  
  // 衝突検出
  setupCollisionDetection();
  
  // ゲームループ開始
  Engine.run(engine);
  Render.run(render);
  gameLoop();
}

function adjustCanvasSize() {
        const gameContainer = document.getElementById('gameContainer');
        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight;
        
        // アスペクト比を維持しながらサイズ調整
        const aspectRatio = 4 / 3; // 800:600の比率
        
        if (containerWidth / containerHeight > aspectRatio) {
            // 高さに合わせる
            CANVAS_HEIGHT = Math.min(600, containerHeight - 40);
            CANVAS_WIDTH = CANVAS_HEIGHT * aspectRatio;
        } else {
            // 幅に合わせる
            CANVAS_WIDTH = Math.min(800, containerWidth - 40);
            CANVAS_HEIGHT = CANVAS_WIDTH / aspectRatio;
        }
        
        // 最小サイズの確保
        CANVAS_WIDTH = Math.max(400, CANVAS_WIDTH);
        CANVAS_HEIGHT = Math.max(300, CANVAS_HEIGHT);
        
        CANNON_X = CANVAS_WIDTH / 2;
        CANNON_Y = 80 * (CANVAS_HEIGHT / 600);
        
        scaleFactor = CANVAS_WIDTH / 800;
        
        // キャンバスサイズを設定
        const canvas = document.getElementById('gameCanvas');
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        canvas.style.width = CANVAS_WIDTH + 'px';
        canvas.style.height = CANVAS_HEIGHT + 'px';
    }
    
function createWalls() {
        const wallThickness = 20 * scaleFactor;
        
        // 左壁
        const leftWall = Bodies.rectangle(wallThickness/2, CANVAS_HEIGHT/2, wallThickness, CANVAS_HEIGHT, {
            isStatic: true,
            render: { fillStyle: '#2c3e50' }
        });
        
        // 右壁
        const rightWall = Bodies.rectangle(CANVAS_WIDTH - wallThickness/2, CANVAS_HEIGHT/2, wallThickness, CANVAS_HEIGHT, {
            isStatic: true,
            render: { fillStyle: '#2c3e50' }
        });
        
        // 下壁（ボール回収用）
        const bottomWall = Bodies.rectangle(CANVAS_WIDTH/2, CANVAS_HEIGHT + 10, CANVAS_WIDTH, 20, {
            isStatic: true,
            isSensor: true,
            render: { fillStyle: '#34495e' },
            label: 'bottomCollector'
        });

        // V字型の障害物（スケール調整）
        const leftTriangleX = 200 * scaleFactor;
        const rightTriangleX = 600 * scaleFactor;
        const triangleY = 450 * scaleFactor;
        
        const leftTriangle = Bodies.fromVertices(leftTriangleX, triangleY, [
            { x: 0, y: 0 },
            { x: 60 * scaleFactor, y: 0 },
            { x: 30 * scaleFactor, y: -40 * scaleFactor }
        ], {
            isStatic: true,
            render: { fillStyle: '#7f8c8d' }
        });

        const rightTriangle = Bodies.fromVertices(rightTriangleX, triangleY, [
            { x: 0, y: 0 },
            { x: 60 * scaleFactor, y: 0 },
            { x: 30 * scaleFactor, y: -40 * scaleFactor }
        ], {
            isStatic: true,
            render: { fillStyle: '#7f8c8d' }
        });

        World.add(world, [leftWall, rightWall, bottomWall, leftTriangle, rightTriangle]);
    }

function createCannon() {
        const cannonRadius = 25 * scaleFactor;
        cannon = Bodies.circle(CANNON_X, CANNON_Y, cannonRadius, {
            isStatic: true,
            render: { fillStyle: '#555' }
        });
        World.add(world, cannon);
        updateCannonVisual();
        updateAimLine();
    }

function setupEventListeners() {
        const canvas = document.getElementById('gameCanvas');
        const fireButton = document.getElementById('fireButton');
        
        // タッチとマウス両方に対応
        function getEventPos(e) {
            const rect = canvas.getBoundingClientRect();
            if (e.touches && e.touches[0]) {
                return {
                    x: e.touches[0].clientX - rect.left,
                    y: e.touches[0].clientY - rect.top
                };
            }
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
        
        function updateAim(e) {
            e.preventDefault();
            const pos = getEventPos(e);
            cannonAngle = Math.atan2(pos.y - CANNON_Y, pos.x - CANNON_X);
            updateCannonVisual();
            updateAimLine();
        }
        
        // マウスイベント
        canvas.addEventListener('mousemove', updateAim);
        
        // タッチイベント
        canvas.addEventListener('touchmove', updateAim, { passive: false });
        canvas.addEventListener('touchstart', updateAim, { passive: false });
        
        // 発射ボタン
        fireButton.addEventListener('click', fireBall);
        fireButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            fireBall();
        }, { passive: false });
        
        // 画面回転対応
        window.addEventListener('resize', () => {
            adjustCanvasSize();
            if (render) {
                render.canvas.width = CANVAS_WIDTH;
                render.canvas.height = CANVAS_HEIGHT;
                render.options.width = CANVAS_WIDTH;
                render.options.height = CANVAS_HEIGHT;
            }
        });
        
        // 画面のタッチスクロールを防止
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
    }

function updateCannonVisual() {
        const cannonElement = document.getElementById('cannon');
        cannonElement.style.left = (CANNON_X - 30 * scaleFactor) + 'px';
        cannonElement.style.top = (CANNON_Y - 30 * scaleFactor) + 'px';
        cannonElement.style.transform = `rotate(${cannonAngle + Math.PI/2}rad)`;
    }

function updateAimLine() {
        const aimLine = document.getElementById('aimLine');
        const lineLength = 100 * scaleFactor;
        
        aimLine.style.left = CANNON_X + 'px';
        aimLine.style.top = CANNON_Y + 'px';
        aimLine.style.width = lineLength + 'px';
        aimLine.style.transform = `rotate(${cannonAngle}rad)`;
        aimLine.style.transformOrigin = 'left center';
    }

function fireBall() {
        if (ammoCount <= 0) return;

        const power = 15;
        const ball = Bodies.circle(CANNON_X, CANNON_Y, 15, {
            restitution: 0.8,
            render: { fillStyle: '#3498db' },
            label: 'ball'
        });

        const velocity = {
            x: Math.cos(cannonAngle) * power,
            y: Math.sin(cannonAngle) * power
        };

        Body.setVelocity(ball, velocity);
        World.add(world, ball);

        // ボールにランダムな数字を割り当て
        const number = Math.floor(Math.random() * 4) + 1;
        balls.set(ball.id, { body: ball, number: number });

        ammoCount--;
        updateUI();
        
        // ボールの視覚的表現を更新
        updateBallVisual(ball, number);
    }

function updateBallVisual(ball, number) {
        ball.render.fillStyle = getBallColor(number);
        
        // 数字をボールに描画するためのカスタムレンダリング
        Events.on(render, 'afterRender', () => {
            const ctx = render.canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(number.toString(), ball.position.x, ball.position.y + 5);
        });
    }

function getBallColor(number) {
        const colors = {
            1: '#3498db',
            2: '#2ecc71',
            4: '#f39c12',
            8: '#e74c3c',
            16: '#9b59b6'
        };
        return colors[number] || '#3498db';

        const x = Math.random() * (CANVAS_WIDTH - 100) + 50;
        const y = CANVAS_HEIGHT - 50;
        const width = 60;
        const height = 30;

        const block = Bodies.rectangle(x, y, width, height, {
            isStatic: true,
            render: { fillStyle: '#e74c3c' },
            label: 'block'
        });

        const hitPoints = Math.floor(Math.random() * 5) + 1;
        blocks.set(block.id, { body: block, hitPoints: hitPoints, maxHitPoints: hitPoints });

        World.add(world, block);
        updateBlockVisual(block, hitPoints);
    }

function updateBlockVisual(block, hitPoints) {
        const intensity = hitPoints / 5;
        block.render.fillStyle = `rgb(${231 * intensity}, ${76 * intensity}, ${60 * intensity})`;
    }

function setupCollisionDetection() {
        Events.on(engine, 'collisionStart', (event) => {
            event.pairs.forEach((pair) => {
                const { bodyA, bodyB } = pair;
                
                // ボールとブロックの衝突
                if ((bodyA.label === 'ball' && bodyB.label === 'block') ||
                    (bodyA.label === 'block' && bodyB.label === 'ball')) {
                    
                    const ball = bodyA.label === 'ball' ? bodyA : bodyB;
                    const block = bodyA.label === 'block' ? bodyA : bodyB;
                    
                    handleBallBlockCollision(ball, block);
                }
                
                // ボールと回収エリアの衝突
                if ((bodyA.label === 'ball' && bodyB.label === 'bottomCollector') ||
                    (bodyA.label === 'bottomCollector' && bodyB.label === 'ball')) {
                    
                    const ball = bodyA.label === 'ball' ? bodyA : bodyB;
                    collectBall(ball);
                }

                // ボール同士の衝突（マージ）
                if (bodyA.label === 'ball' && bodyB.label === 'ball') {
                    handleBallMerge(bodyA, bodyB);
                }
            });
        });
    }

function handleBallBlockCollision(ball, block) {
        const blockData = blocks.get(block.id);
        if (!blockData) return;

        blockData.hitPoints--;
        
        if (blockData.hitPoints <= 0) {
            // ブロック破壊
            World.remove(world, block);
            blocks.delete(block.id);
            
            // 新しいボールを追加
            const ballData = balls.get(ball.id);
            if (ballData) {
                ammoCount += blockData.maxHitPoints;
                gameScore += blockData.maxHitPoints * 10;
            }
        } else {
            updateBlockVisual(block, blockData.hitPoints);
        }
        
        updateUI();
    }

function handleBallMerge(ballA, ballB) {
        const dataA = balls.get(ballA.id);
        const dataB = balls.get(ballB.id);
        
        if (!dataA || !dataB || dataA.number !== dataB.number) return;

        // 新しいマージされたボールを作成
        const newNumber = dataA.number * 2;
        const avgPos = {
            x: (ballA.position.x + ballB.position.x) / 2,
            y: (ballA.position.y + ballB.position.y) / 2
        };

        // 古いボールを削除
        World.remove(world, [ballA, ballB]);
        balls.delete(ballA.id);
        balls.delete(ballB.id);

        // 新しいボールを作成
        const mergedBall = Bodies.circle(avgPos.x, avgPos.y, 15, {
            restitution: 0.8,
            render: { fillStyle: getBallColor(newNumber) },
            label: 'ball'
        });

        World.add(world, mergedBall);
        balls.set(mergedBall.id, { body: mergedBall, number: newNumber });
        updateBallVisual(mergedBall, newNumber);

        gameScore += newNumber;
        updateUI();
    }

function collectBall(ball) {
        const ballData = balls.get(ball.id);
        if (ballData) {
            ammoCount += ballData.number;
            World.remove(world, ball);
            balls.delete(ball.id);
            updateUI();
        }
    }
function gameLoop() {
        if (!gameRunning) return;

        blockSpawnTimer++;
        
        // ブロックを定期的にスポーン
        if (blockSpawnTimer > 180) { // 約3秒
            spawnBlock();
            blockSpawnTimer = 0;
        }

        // ブロックを上に押し上げる
        blocks.forEach((blockData) => {
            Body.translate(blockData.body, { x: 0, y: -0.5 });
        });

        requestAnimationFrame(gameLoop);
    }

function updateUI() {
        document.getElementById('ammoCount').textContent = ammoCount;
        document.getElementById('score').textContent = gameScore;
        
        // 発射ボタンの状態更新
        const fireButton = document.getElementById('fireButton');
        fireButton.disabled = ammoCount <= 0;
    }
    
(async () => {
  try {
    await loadScript('/mergeshot/matter.js');
    
  } catch (e) {
    console.error('読み込み失敗:', e);
  }
})();