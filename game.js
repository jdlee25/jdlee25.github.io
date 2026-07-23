(() => {
  const root = document.querySelector('[data-game="snake"]');
  if (!root) return;

  const canvas = root.querySelector('#snake-canvas');
  const context = canvas.getContext('2d');
  const scoreEl = root.querySelector('#score');
  const highScoreEl = root.querySelector('#high-score');
  const statusEl = root.querySelector('#game-status');
  const cell = 20;
  const columns = canvas.width / cell;
  const rows = canvas.height / cell;
  const speed = 110;
  const directions = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
  };
  let snake;
  let food;
  let direction;
  let queuedDirection;
  let score;
  let highScore = Number.parseInt(localStorage.getItem('jd-snake-high-score') || '0', 10) || 0;
  let timerId = null;
  let running = false;
  let paused = false;
  const enemyCount = 4;
  const enemyExplodeMs = 6000;
  const enemySpawnMs = 2000;
  let enemies = [];
  let enemyPhase = 'active';
  let enemyElapsed = 0;
  let enemySpawnElapsed = 0;
  let enemySpawned = 0;

  const setStatus = (text) => { statusEl.textContent = text; };
  const updateScore = () => { scoreEl.textContent = String(score); highScoreEl.textContent = String(highScore); };
  const sameCell = (a, b) => a.x === b.x && a.y === b.y;
  const randomOpenCell = () => {
    const open = [];
    for (let y = 0; y < rows; y += 1) for (let x = 0; x < columns; x += 1) {
      const occupied = snake.some((part) => part.x === x && part.y === y) ||
        enemies.some((enemy) => enemy.x === x && enemy.y === y) ||
        (food && food.x === x && food.y === y);
      if (!occupied) open.push({ x, y });
    }
    return open[Math.floor(Math.random() * open.length)] || { x: 0, y: 0 };
  };
  const randomFood = () => randomOpenCell();
  const createEnemy = () => {
    const position = randomOpenCell();
    return { ...position, direction: directions[['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)]] };
  };
  const resetEnemies = () => {
    enemies = [];
    enemyPhase = 'active';
    enemyElapsed = 0;
    enemySpawnElapsed = 0;
    enemySpawned = 0;
    for (let index = 0; index < enemyCount; index += 1) enemies.push(createEnemy());
  };
  const updateEnemies = () => {
    enemyElapsed += speed;
    if (enemyPhase === 'active') {
      enemies = enemies.map((enemy) => {
        let nextDirection = enemy.direction;
        if (Math.random() < 0.2) nextDirection = directions[['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)]];
        const next = { x: enemy.x + nextDirection.x, y: enemy.y + nextDirection.y, direction: nextDirection };
        if (next.x < 0 || next.x >= columns || next.y < 0 || next.y >= rows) return { ...enemy, direction: { x: -nextDirection.x, y: -nextDirection.y } };
        return next;
      });
      if (enemyElapsed >= enemyExplodeMs) {
        enemies = [];
        enemyPhase = 'exploding';
        enemyElapsed = 0;
        enemySpawnElapsed = 0;
        enemySpawned = 0;
      }
      return;
    }
    enemySpawnElapsed += speed;
    if (enemySpawned < enemyCount && enemySpawnElapsed >= enemySpawnMs) {
      enemies.push(createEnemy());
      enemySpawned += 1;
      enemySpawnElapsed = 0;
    }
    if (enemySpawned === enemyCount) {
      enemyPhase = 'active';
      enemyElapsed = 0;
    }
  };
  const draw = () => {
    context.fillStyle = '#111827';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#f97316';
    context.fillRect(food.x * cell + 3, food.y * cell + 3, cell - 6, cell - 6);
    snake.forEach((part, index) => {
      context.fillStyle = index === 0 ? '#60a5fa' : '#2563eb';
      context.fillRect(part.x * cell + 1, part.y * cell + 1, cell - 2, cell - 2);
    });
    enemies.forEach((enemy) => {
      context.fillStyle = enemyPhase === 'exploding' ? '#fbbf24' : '#ef4444';
      context.beginPath();
      context.arc(enemy.x * cell + cell / 2, enemy.y * cell + cell / 2, cell / 2 - 3, 0, Math.PI * 2);
      context.fill();
    });
  };
  const reset = () => {
    snake = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
    direction = directions.right;
    queuedDirection = direction;
    score = 0;
    food = randomFood();
    resetEnemies();
    running = false;
    paused = false;
    if (timerId !== null) { window.clearInterval(timerId); timerId = null; }
    updateScore();
    setStatus('Ready');
    draw();
  };
  const setDirection = (next) => {
    const candidate = directions[next];
    if (!candidate || (candidate.x + direction.x === 0 && candidate.y + direction.y === 0)) return;
    queuedDirection = candidate;
  };
  const endGame = () => {
    running = false;
    paused = false;
    if (timerId !== null) { window.clearInterval(timerId); timerId = null; }
    setStatus('Game over');
  };
  const step = () => {
    direction = queuedDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    const hitWall = head.x < 0 || head.x >= columns || head.y < 0 || head.y >= rows;
    const hitSelf = snake.some((part) => sameCell(part, head));
    const hitEnemy = enemies.some((enemy) => sameCell(enemy, head));
    if (hitWall || hitSelf || hitEnemy) { endGame(); return; }
    snake.unshift(head);
    if (sameCell(head, food)) {
      score += 1;
      if (score > highScore) { highScore = score; localStorage.setItem('jd-snake-high-score', String(highScore)); }
      food = randomFood();
      updateScore();
    } else snake.pop();
    updateEnemies();
    draw();
  };
  const start = () => {
    if (running) return;
    if (!snake || statusEl.textContent === 'Game over') reset();
    running = true;
    paused = false;
    setStatus('Playing');
    timerId = window.setInterval(() => { if (!paused) step(); }, speed);
  };
  const pause = () => {
    if (!running) return;
    paused = !paused;
    setStatus(paused ? 'Paused' : 'Playing');
  };
  root.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    const move = event.target.closest('[data-direction]')?.dataset.direction;
    if (action === 'start') start();
    if (action === 'pause') pause();
    if (action === 'restart') { reset(); start(); }
    if (move) setDirection(move);
  });
  document.addEventListener('keydown', (event) => {
    const keys = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
    if (keys[event.key]) { event.preventDefault(); setDirection(keys[event.key]); }
    if (event.key === ' ' && running) { event.preventDefault(); pause(); }
  });
  reset();
})();
