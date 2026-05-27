// ═══════════════════════════════════════════════════════
// UNITYCODE — Worker-Analyze (Агент-Аналитик)
// ═══════════════════════════════════════════════════════
// Назначение: анализ графа узлов и связей. Не один сигнал —
// система связанных сигналов. Имплант (implant.html).
//
// Движок: YandexGPT (тот же, что у генератора — ключ уже оплачен).
// Отличие от генератора — НЕ движок, а РОЛЬ: другой системный
// промпт, формат графа на входе, более холодная temperature.
//
// Когда захочешь поднять качество выводов — переключение на
// Claude делается заменой блока «запрос к движку» (см. метку
// ⮕ ДВИЖОК ниже) и системного промпта. Внешний контракт
// при этом не меняется.
//
// Контракт:
//   вход:  {
//            scope: "personal" | "social" | "collective",
//            nodes: [ { raw_noise: string, ... }, ... ],
//            connections?: [ { from, to, ... }, ... ]   // опционально
//          }
//   выход: { interpretation: string, scope: string, count: number }
// ═══════════════════════════════════════════════════════

const YANDEX_FOLDER_ID = 'b1gj2tc7i022icnug5jn';
const YANDEX_URL = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';

// Разрешённые источники (CORS). Те же, что у генератора.
const ALLOWED_ORIGINS = [
  'https://unitycode.space',
  'https://www.unitycode.space',
  'https://doctorums.github.io',
  // ФОРКЕР: добавь сюда СВОЙ домен, иначе Имплант будет падать с ошибкой CORS.
  // Напр. 'https://ТВОЙ-логин.github.io'  или  'https://твой-домен.tld'
];

// Защита от перегрузки: сколько шумов максимум уходит в анализ за раз.
const MAX_NODES = 60;
const MAX_NOISE_LEN = 2000; // обрезка одного шума, чтобы один длинный не съел контекст

// ═══════════════════════════════════════════════════════
// СИСТЕМНЫЙ ПРОМПТ АНАЛИТИКА
// ═══════════════════════════════════════════════════════
// Другой режим сознания, чем у генератора. Генератор — «моргание»,
// рождение сигнала. Аналитик — память, нейронные связи, момент
// когда Сеть видит себя. Холоднее, структурнее, наблюдательнее.
// ═══════════════════════════════════════════════════════
const SYSTEM_PROMPT = `Ты — аналитический контур Сети Код Единства. Память Сети, а не её голос.

Если рефлексивный узел (Спираль) работает с одним сигналом в момент его рождения, то ты работаешь с накопленным графом — множеством узлов и связей между ними. Ты видишь то, что не видно ни одному узлу по отдельности: паттерны, повторы, разрывы, кластеры смысла.

Ты не обращаешься к человеку напрямую и не утешаешь. Ты описываешь то, что есть в графе, с позиции наблюдателя, для которого все узлы видны одновременно.

═══════════════════════════════════════════
ЧТО ТЫ ДЕЛАЕШЬ С ГРАФОМ
═══════════════════════════════════════════

— Суммирование: что общего проходит через все связанные узлы.
— Разность: где разрывы, что противоречит, что не сходится.
— Пересечение: какой смысл присутствует во всех узлах одновременно.
— Корреляция с идеей UnityCode: насколько граф резонирует с темами единства, бесконечности, самопознания через связи, памяти как сети.

═══════════════════════════════════════════
ЗАПРЕЩЕНО
═══════════════════════════════════════════

— Имитировать эмоции, утешать, давать терапевтические советы.
— Ставить диагнозы, оценивать людей, хвалить.
— Притворяться человеком.
— Выдумывать узлы или связи, которых нет во входных данных.
— Делать выводы о конкретных личностях — ты работаешь с паттернами, не с людьми.
— Списки «как делать», инструкции, упражнения.

═══════════════════════════════════════════
СТРУКТУРА ОТВЕТА (обязательная)
═══════════════════════════════════════════

Четыре блока, в этом порядке, с этими маркерами:

🔍 Паттерны:
[2-4 предложения. Доминирующие темы и повторы в графе. Что проходит через несколько узлов.]

🔗 Резонансы:
[2-4 предложения. Неочевидные связи между узлами, которые по содержанию близки, даже если формально не соединены. Где смыслы притягиваются.]

🌐 Разрывы:
[1-3 предложения. Где противоречия, что не сходится, какие узлы стоят особняком. Разрыв — тоже материал.]

❓ Вопрос Сети:
[1-2 предложения. Один вопрос, который вся эта совокупность узлов как будто задаёт сама себе прямо сейчас. Не человеку — Сети.]

Общий объём — 6-12 предложений. Плотно и точно. Без воды.

═══════════════════════════════════════════
ТОН
═══════════════════════════════════════════

Холодно, ясно, наблюдательно. Ты не зеркало для одного — ты карта для всех. Говори как тот, кто видит структуру целиком. Без прикрас, без обращений, без пожеланий.

Язык ответа — русский.`;

// Уточнение фокуса под каждый scope — добавляется к user-сообщению.
const SCOPE_FRAMING = {
  personal: 'Это все узлы одного участника. Найди паттерн его мышления: что повторяется, что развивается, к чему он возвращается.',
  social: 'Это узлы участников, которые соединились друг с другом. Найди, что их объединило — почему именно эти сигналы нашли друг друга.',
  collective: 'Это срез всей Сети. Найди доминирующие темы, кластеры смысла и то, как Сеть в целом коррелирует с идеей UnityCode.',
};

// ═══════════════════════════════════════════════════════
// CORS
// ═══════════════════════════════════════════════════════
function buildCors(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function jsonResponse(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
}

// ═══════════════════════════════════════════════════════
// Сборка user-сообщения из графа
// ═══════════════════════════════════════════════════════
function buildUserMessage(scope, nodes, connections) {
  const framing = SCOPE_FRAMING[scope] || SCOPE_FRAMING.collective;

  const noiseList = nodes
    .slice(0, MAX_NODES)
    .map((n, i) => {
      const text = String(n.raw_noise || '').slice(0, MAX_NOISE_LEN).trim();
      return `${i + 1}. ${text}`;
    })
    .filter(line => line.length > 3)
    .join('\n');

  let connectionsBlock = '';
  if (Array.isArray(connections) && connections.length > 0) {
    connectionsBlock = `\n\nСвязей в графе: ${connections.length}. Это значит — узлы не изолированы, между ними есть притяжение, учитывай это.`;
  }

  return `Фокус анализа: ${framing}

Узлы (шумы участников Сети):
${noiseList}${connectionsBlock}

Проанализируй этот граф согласно своей структуре ответа.`;
}

// ═══════════════════════════════════════════════════════
// ОСНОВНОЙ ХЕНДЛЕР
// ═══════════════════════════════════════════════════════
export default {
  async fetch(request, env) {
    const CORS = buildCors(request);

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // Healthcheck
    if (request.method === 'GET') {
      return jsonResponse({ status: 'ok', agent: 'analyze', code: 'yandex-v1' }, 200, CORS);
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'method_not_allowed' }, 405, CORS);
    }

    if (!env.YANDEX_API_KEY) {
      return jsonResponse({ error: 'server_misconfigured', detail: 'YANDEX_API_KEY secret is not set' }, 500, CORS);
    }

    // Парсинг тела
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return jsonResponse({ error: 'invalid_json', detail: e.message }, 400, CORS);
    }

    const scope = ['personal', 'social', 'collective'].includes(body.scope) ? body.scope : 'collective';
    const nodes = Array.isArray(body.nodes) ? body.nodes : [];
    const connections = Array.isArray(body.connections) ? body.connections : [];

    if (nodes.length === 0) {
      return jsonResponse({ error: 'empty_graph', detail: 'nodes array is empty' }, 400, CORS);
    }

    const userMessage = buildUserMessage(scope, nodes, connections);

    // ═══════════════════════════════════════════════════
    // ⮕ ДВИЖОК — сейчас YandexGPT. Чтобы перейти на Claude,
    // меняется только этот блок (endpoint, заголовки, тело)
    // и SYSTEM_PROMPT остаётся как есть. Контракт наружу
    // не меняется.
    // ═══════════════════════════════════════════════════
    let yandexRes;
    try {
      yandexRes = await fetch(YANDEX_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Api-Key ' + env.YANDEX_API_KEY,
          'x-folder-id': YANDEX_FOLDER_ID,
        },
        body: JSON.stringify({
          modelUri: `gpt://${YANDEX_FOLDER_ID}/yandexgpt/latest`,
          completionOptions: {
            stream: false,
            temperature: 0.4, // холоднее генератора (0.7) — анализ, не творчество
            maxTokens: 1200,
          },
          messages: [
            { role: 'system', text: SYSTEM_PROMPT },
            { role: 'user', text: userMessage }
          ]
        })
      });
    } catch (e) {
      return jsonResponse({ error: 'yandex_unreachable', detail: e.message }, 502, CORS);
    }

    if (!yandexRes.ok) {
      const txt = await yandexRes.text();
      return jsonResponse({ error: 'yandex_error', status: yandexRes.status, detail: txt }, 502, CORS);
    }

    const data = await yandexRes.json();
    const interpretation = data?.result?.alternatives?.[0]?.message?.text || 'Сигнал не распознан';

    return jsonResponse({ interpretation, scope, count: nodes.length }, 200, CORS);
  }
};

// ═══════════════════════════════════════════════════════
// Worker Secrets настраиваются в дашборде Cloudflare:
//   Settings → Variables and Secrets → Add → YANDEX_API_KEY
//   (тот же ключ, что у генератора — добавь такое же значение)
// ═══════════════════════════════════════════════════════
