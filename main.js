document.addEventListener('DOMContentLoaded', () => {
    // HTMLの要素を取得
    const startScreen = document.getElementById('start-screen');
    const gameContainer = document.getElementById('game-container');
    const startGame1Button = document.getElementById('start-game-1');
    const startGame2Button = document.getElementById('start-game-2');

    // ゲームスクリプトを読み込むための関数
    function loadGameScript(scriptName) {
        // 既存のゲームスクリプトがあれば削除（ゲーム切り替え時に必要）
        const existingScript = document.querySelector('script[data-game-script]');
        if (existingScript) {
            existingScript.remove();
        }

        // 新しいscriptタグを作成してbodyの末尾に追加
        const script = document.createElement('script');
        script.src = scriptName;
        script.setAttribute('data-game-script', 'true'); // 識別用属性
        document.body.appendChild(script);
    }
    
    // Matter.jsライブラリを読み込むための関数
    function loadMatterJS(callback) {
        // すでに読み込まれていなければ追加
        if (!document.querySelector('script[src="matter.js"]')) {
            const matterScript = document.createElement('script');
            matterScript.src = 'matter.js';
            matterScript.onload = callback; // 読み込み完了後にcallbackを実行
            document.body.appendChild(matterScript);
        } else {
            callback(); // すでに読み込み済みなら即callbackを実行
        }
    }


    // 「前のゲーム」ボタンが押されたときの処理
    startGame1Button.addEventListener('click', () => {
        startScreen.style.display = 'none'; // スタート画面を隠す
        gameContainer.style.display = 'block'; // ゲーム画面を表示
        loadGameScript('suicagame/script.js'); // 前のゲームのスクリプトを読み込む
    });

    // 「物理ゲーム」ボタンが押されたときの処理
    startGame2Button.addEventListener('click', () => {
        startScreen.style.display = 'none'; // スタート画面を隠す
        gameContainer.style.display = 'block'; // ゲーム画面を表示
        
        // Matter.jsを読み込んでから、物理ゲームのスクリプトを読み込む
        loadMatterJS(() => {
            loadGameScript('physics_game.js'); 
        });
    });
});
