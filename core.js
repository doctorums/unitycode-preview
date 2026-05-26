/* ============================================================================
   CORE.JS  —  НЕСУЩАЯ СТЕНА. НЕ РЕДАКТИРУЙ ПРИ ФОРКЕ.
   ----------------------------------------------------------------------------
   Этот файл собирает портал из значений portal.config.js: применяет тему,
   рисует навигацию (пять пунктов, неизменный порядок), подвал, фон.
   Хочешь что-то поменять — меняй portal.config.js, а не этот файл.
   Правка этого файла может разорвать совместимость твоего форка с Сетью.
============================================================================ */
(function () {
  const C = window.PORTAL_CONFIG;
  if (!C) { console.error("portal.config.js не загружен"); return; }

  // — Тема: прокидываем цвета и шрифты в CSS-переменные —
  const t = C.theme, r = document.documentElement.style;
  r.setProperty("--bg", t.bg);     r.setProperty("--fg", t.fg);
  r.setProperty("--muted", t.muted); r.setProperty("--accent", t.accent);
  r.setProperty("--danger", t.danger);
  r.setProperty("--font-display", t.fontDisplay);
  r.setProperty("--font-body", t.fontBody);
  r.setProperty("--font-mono", t.fontMono);

  document.title = C.identity.name + (C.identity.tagline ? " · " + C.identity.tagline : "");

  // — НАВИГАЦИЯ. Порядок и состав фиксированы. Это контракт. —
  // Пять пунктов, всегда эти, всегда в этом порядке. Меняются только подписи (в конфиге).
  const NAV = [
    { key: "entry", file: "index.html" },
    { key: "tools", file: "tools.html" },
    { key: "mirror", file: "mirror.html" },
    { key: "base",  file: "base.html"  },
    { key: "net",   file: "net.html"   },
  ];

  window.UC = {
    config: C,

    // Рисует шапку с навигацией. active = ключ текущей страницы.
    mountNav(active) {
      const nav = NAV.map(item => {
        const label = C.menu[item.key];
        const cls = item.key === active ? ' class="active"' : "";
        return `<a href="${item.file}"${cls}>${label}</a>`;
      }).join("");
      const header = document.createElement("header");
      header.className = "uc-header";
      header.innerHTML =
        `<div class="uc-brand">${C.identity.name}</div><nav class="uc-nav">${nav}</nav>`;
      document.body.prepend(header);
    },

    // Рисует подвал с дисклеймером.
    mountFooter() {
      const f = document.createElement("footer");
      f.className = "uc-footer";
      f.textContent = C.disclaimer;
      document.body.appendChild(f);
    },

    // Тихий фон: дрейфующие узлы и редкие связи. Атмосфера, не нагрузка.
    mountField() {
      const cv = document.createElement("canvas");
      cv.className = "uc-field";
      document.body.prepend(cv);
      const ctx = cv.getContext("2d");
      let w, h, pts;
      const N = 46;
      function resize() {
        w = cv.width = innerWidth; h = cv.height = innerHeight;
        pts = Array.from({ length: N }, () => ({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - .5) * .15, vy: (Math.random() - .5) * .15,
        }));
      }
      function tick() {
        ctx.clearRect(0, 0, w, h);
        const acc = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#d8d2c4";
        for (const p of pts) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
        }
        for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
          const a = pts[i], b = pts[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 130) {
            ctx.globalAlpha = (1 - d / 130) * 0.12;
            ctx.strokeStyle = acc; ctx.lineWidth = .5;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        ctx.globalAlpha = .5; ctx.fillStyle = acc;
        for (const p of pts) { ctx.beginPath(); ctx.arc(p.x, p.y, 1.1, 0, 7); ctx.fill(); }
        ctx.globalAlpha = 1;
        requestAnimationFrame(tick);
      }
      addEventListener("resize", resize); resize(); tick();
    },

    // Подключение к Supabase, если реквизиты заданы. Иначе null → локальный режим.
    db: null,
    async initDb() {
      const { supabaseUrl, supabaseAnonKey } = C.backend;
      if (!supabaseUrl || !supabaseAnonKey) return null;
      if (!window.supabase) { console.warn("Supabase SDK не подключён"); return null; }
      this.db = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
      return this.db;
    },
  };
})();
