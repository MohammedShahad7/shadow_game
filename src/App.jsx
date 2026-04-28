import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

const SIZE = 10;
const MAX_LEVEL = 20;

function hasPath(start, end, walls) {
  const q = [start];
  const seen = new Set([`${start.x},${start.y}`]);

  while (q.length) {
    const cur = q.shift();

    if (cur.x === end.x && cur.y === end.y) return true;

    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];

    for (let [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const key = `${nx},${ny}`;

      if (
        nx > 0 &&
        ny > 0 &&
        nx < SIZE - 1 &&
        ny < SIZE - 1 &&
        !walls.has(key) &&
        !seen.has(key)
      ) {
        seen.add(key);
        q.push({ x: nx, y: ny });
      }
    }
  }

  return false;
}

function randomFree(walls, used = []) {
  while (true) {
    const x = Math.floor(Math.random() * (SIZE - 2)) + 1;
    const y = Math.floor(Math.random() * (SIZE - 2)) + 1;

    const blocked =
      walls.has(`${x},${y}`) ||
      used.some((p) => p.x === x && p.y === y) ||
      (x === 1 && y === 1);

    if (!blocked) return { x, y };
  }
}

function makeLevel(level) {
  while (true) {
    const walls = new Set();

    for (let i = 0; i < SIZE; i++) {
      walls.add(`0,${i}`);
      walls.add(`${SIZE - 1},${i}`);
      walls.add(`${i},0`);
      walls.add(`${i},${SIZE - 1}`);
    }

    const totalWalls = Math.min(4 + level * 2, 28);

    for (let i = 0; i < totalWalls; i++) {
      const x = Math.floor(Math.random() * (SIZE - 2)) + 1;
      const y = Math.floor(Math.random() * (SIZE - 2)) + 1;

      if (!(x === 1 && y === 1)) walls.add(`${x},${y}`);
    }

    const key = randomFree(walls);
    const exit = randomFree(walls, [key]);

    if (
      hasPath({ x: 1, y: 1 }, key, walls) &&
      hasPath(key, exit, walls)
    ) {
      return { walls, key, exit };
    }
  }
}

export default function App() {
  const [level, setLevel] = useState(1);
  const [player, setPlayer] = useState({ x: 1, y: 1 });
  const [hasKey, setHasKey] = useState(false);
  const [time, setTime] = useState(60);
  const [score, setScore] = useState(0);
  const [enemies, setEnemies] = useState([]);

  const [showIntro, setShowIntro] = useState(true);

  const [popup, setPopup] = useState({
    show: false,
    text: ""
  });

  const data = useMemo(() => makeLevel(level), [level]);

  function restartGame() {
    setLevel(1);
    setScore(0);
    setTime(60);
    setPlayer({ x: 1, y: 1 });
    setHasKey(false);
    setEnemies([]);
    setPopup({ show: false, text: "" });

    setShowIntro(false);
  }

  useEffect(() => {
    setPlayer({ x: 1, y: 1 });
    setHasKey(false);

    const ghostCount = 1 + Math.floor((level - 1) / 5);

    let arr = [];

    for (let i = 0; i < ghostCount; i++) {
      arr.push({
        x: SIZE - 2 - i,
        y: SIZE - 2
      });
    }

    setEnemies(arr);
  }, [level]);

  useEffect(() => {
    if (popup.show || showIntro) return;

    const t = setInterval(() => {
      setTime((v) => v - 1);
    }, 1000);

    return () => clearInterval(t);
  }, [popup, showIntro]);

  useEffect(() => {
    if (time <= 0) {
      setPopup({ show: true, text: "⏰ Time Over!" });
      setEnemies([]);
    }
  }, [time]);

  function move(dx, dy) {
    if (popup.show || showIntro) return;

    const nx = player.x + dx;
    const ny = player.y + dy;

    if (data.walls.has(`${nx},${ny}`)) return;

    setPlayer({ x: nx, y: ny });

    if (nx === data.key.x && ny === data.key.y && !hasKey) {
      setHasKey(true);
      setScore((s) => s + 50);
    }

    if (nx === data.exit.x && ny === data.exit.y && hasKey) {
      if (level < MAX_LEVEL) {
        setLevel((l) => l + 1);
        setTime((t) => t + 15);
        setScore((s) => s + 100);
      } else {
        setPopup({ show: true, text: "🏆 You Beat All 20 Levels!" });
      }
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowUp" || e.key === "w") move(0, -1);
      if (e.key === "ArrowDown" || e.key === "s") move(0, 1);
      if (e.key === "ArrowLeft" || e.key === "a") move(-1, 0);
      if (e.key === "ArrowRight" || e.key === "d") move(1, 0);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (popup.show || showIntro) return;

    const speed = Math.max(150, 600 - level * 20);

    const t = setInterval(() => {
      setEnemies((old) =>
        old.map((g) => {
          const dx = Math.sign(player.x - g.x);
          const dy = Math.sign(player.y - g.y);

          const nx = g.x + (Math.random() > 0.5 ? dx : 0);
          const ny = g.y + (Math.random() > 0.5 ? dy : 0);

          if (data.walls.has(`${nx},${ny}`)) return g;

          return { x: nx, y: ny };
        })
      );
    }, speed);

    return () => clearInterval(t);
  }, [player, level, data, popup, showIntro]);

  useEffect(() => {
    enemies.forEach((g) => {
      if (g.x === player.x && g.y === player.y) {
        setPopup({ show: true, text: "👻 Ghost Caught You!" });
        setEnemies([]);
      }
    });
  }, [enemies, player]);

  const cells = [];

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let cls = "tile floor";
      let txt = "";

      if (data.walls.has(`${x},${y}`)) cls = "tile wall";

      else if (x === player.x && y === player.y) {
        // 🔥 KEY FEATURE: PLAYER CHANGES COLOR AFTER PICKING KEY
        cls = hasKey ? "tile player player-key" : "tile player";
        txt = "🧍";
      }

      else if (enemies.some((g) => g.x === x && g.y === y)) {
        cls = "tile enemy";
        txt = "👻";
      }

      else if (!hasKey && x === data.key.x && y === data.key.y) {
        cls = "tile key";
        txt = "🔑";
      }

      else if (x === data.exit.x && y === data.exit.y) {
        cls = "tile exit";
        txt = "🚪";
      }

      cells.push(
        <div key={`${x}-${y}`} className={cls}>
          {txt}
        </div>
      );
    }
  }

  const min = Math.floor(time / 60);
  const sec = time % 60;

  return (
    <div className="game">
      <h1 className="title">🌑 Shadow Escape</h1>

      <div className="hud">
        <span>Level: {level}/{MAX_LEVEL}</span>
        <span>Time: {min}:{sec < 10 ? "0" + sec : sec}</span>
        <span>Score: {score}</span>
        <span>Ghosts: {enemies.length}</span>
      </div>

      {showIntro && (
        <div className="popup">
          <div className="popup-box">
            <h2>How To Play</h2>

            <p style={{ lineHeight: "1.9", fontSize: "18px", textAlign: "left" }}>
              🔑 First take the key.<br />
              🚪 Then go to the door and level up.<br />
              👻 Ghost = Game Over.<br />
              ⏰ Start: 1 minute.<br />
              ➕ +15 sec per level.<br />
              👻 +1 ghost every 5 levels.<br />
              📈 Difficulty increases every level.
            </p>

            <button onClick={() => setShowIntro(false)}>
              Start Game
            </button>
          </div>
        </div>
      )}

      {!popup.show && !showIntro && (
        <div className="board">{cells}</div>
      )}

      {popup.show && (
        <div className="popup">
          <div className="popup-box">
            <h2>{popup.text}</h2>
            <button onClick={restartGame}>Restart Game</button>
          </div>
        </div>
      )}
    </div>
  );
}