# PROGRESS.md

Текущ статус на desk-presence-tracking-system — чети този файл заедно с CLAUDE.md, about_me.md, business_info.md за пълна картина.

## Готово и работещо (Phase 1)

**Node-RED pipeline (единствен източник на истина за писане в базата):**
- Gateway script различава `single_push` (desk/1/presence → sat/stood toggle) от `double_push` (desk/1/session → старт/край на работна сесия)
- `long_push` не се разпознава надеждно от този BLU Button хардуер — ползваме `double_push`
- Две PostgreSQL таблици: `desk_sessions` (сурови sat/stood записи с duration_seconds) и `work_sessions` (обобщени работни сесии с totals + day_of_week)
- `work_sessions` вече ползва INSERT-at-start + UPDATE-at-end pattern (не единичен INSERT в края) — `session_end IS NULL` означава активна сесия в момента. UPDATE-ът матчва по captured `id` (през `RETURNING id`), НЕ по timestamp — timestamp matching се провали тихо (виж gotchas по-долу)
- Live dashboard в Node-RED (Dashboard 2.0): Current status, Duration brояч, Last Session Info, Sat/Stood pie chart, Last presence таблица
- Mosquitto мигриран в Docker Compose (`docker/docker-compose.yml`), `restart: unless-stopped`, потвърдено оцелява реален Windows reboot

**FastAPI слой (`api/main.py`, чете само от PostgreSQL, никога не пише):**
- `run_query(query, params=None)` helper — connect → RealDictCursor → execute → fetchall → close
- `GET /sessions/recent` — последните 10 desk_sessions записа
- `GET /work-sessions` — последните 10 work_sessions записа
- `GET /status` — текущ статус + elapsed_seconds, чете `get_active_session()` (session_end IS NULL проверка) за да различи "out of office" от sat/stood
- CORS разрешен за `http://localhost:5173`

**React frontend (`frontend/`, Vite + React + JS):**
- Sidebar layout с dummy nav табове (само Overview е реален досега)
- `App.jsx` поллва `/status` на 3s и `/work-sessions` на 5s
- Current Status + Duration cards горе, Last Session pie chart (Recharts) + Recent Sessions таблица долу
- **Готча:** default Vite scaffold тук НЕ беше празен — `index.css` имаше `#root { width:1126px; text-align:center; ... }`, чупеше custom layout-a. Изчистен до `body { margin: 0; }`

**Batch automation:**
- `scripts/start-session.bat` — меню Start/End Session, Check Status (проверява Docker/Mosquitto, порт 1880 Node-RED, порт 8000 FastAPI), Exit

## В момента — активен, НЕРЕШЕН бъг

`/status` endpoint-ът връща грешно голямо `elapsed_seconds` (напр. 10969-11134s) по време на активна сесия, вместо реалистично малко число (~200s).

Логиката би трябвало: ако последният `desk_sessions` запис е ПРЕДИ текущия `session_start` (стар, от предишна сесия), fallback към `session_start` като reference точка, не към стария запис.

**Силно подозрение:** редактираният `main.py` никога не е бил реално picked up от running Uvicorn процеса.

**Следващи стъпки за диагностика:**
1. Потвърди че файлът на диска реално съдържа новата if/else логика
2. Провери Uvicorn терминала за "WatchFiles detected changes... Reloading" около момента на редакцията
3. При съмнение — спри Uvicorn напълно (Ctrl+C) и рестартирай чисто с `uvicorn main:app --reload`, не разчитай на --reload
4. Ретествай `/status` веднага след чист рестарт, с прясно издърпани session_start/desk_sessions timestamps за директно сравнение

## Друга чакаща задача (по-малка)

В `App.jsx`, добави филтър, който още не е приложен:
```javascript
const completedSessions = workSessions.filter((s) => s.session_end !== null);
const lastSession = completedSessions[0];
```
Нужно е защото "Last Session" chart/summary в момента показва текущо ОТВОРЕНАТА сесия (с null totals → празен chart), вместо последната РЕАЛНО завършена.

## По-нататъшен план (не спешно)

- CSV export от Node-RED
- Портиране на out-of-office/session-active логиката е вече частично готово във FastAPI (виж бъга по-горе за довършване)
- Свързване на `/sessions/recent` и `/work-sessions` към Desks/Sessions/Reports nav табовете (в момента dummy placeholders)
- По-дългосрочно: multi-employee архитектура (52 служителя) — текущата flow-context single-global-state логика в Node-RED би трябвало да се рефакторира на per-desk-ID keyed state преди даScale-не отвъд 1 потребител. Обсъдено концептуално, не implementирано.

## Ключови технически gotchas (пълен списък, за да не се повтарят)

1. `node-red-contrib-postgresql` иска параметри в `msg.params`, НЕ `msg.payload`
2. "server does not support SSL connections" → SSL=false в config node Connection таб
3. Верижна заявка след INSERT на същия msg изисква `delete msg.params` първо
4. Никога не разклонявай един function node към ДВА postgresql nodes паралелно — дублирани INSERT-и
5. SELECT-last-10 окачен directamente от INSERT function node-а (вместо от изхода на самия postgresql INSERT node) кара живата таблица да изостава с един запис — провери тази жица след всяка редакция на upstream nodes
6. Docker user-defined мрежи дават DNS по име само за explicit добавени контейнери
7. Не можеш да добавиш нов `-p` порт към съществуващ контейнер — трябва stop/rm/recreate
8. `docker-compose` трябва да се изпълнява от папката с docker-compose.yml
9. Забравяне да нулираш `lastChangeTime` при старт на сесия причинява огромна фалшива продължителност в първия sat/stood период
10. **Никога не match-вай UPDATE по timestamp, преминал през независими stringification стъпки** — ползвай captured primary key. Postgres UPDATE/DELETE, матчващ 0 реда, е тих успех, не грешка — лесно се пропуска без explicit row-count проверка
