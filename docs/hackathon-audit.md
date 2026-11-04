# Итоговый production / hackathon audit

Дата: 5 ноября 2026. Аудит относится к **семи критериям из сообщения пользователя**.
Отдельного приложения с официальными весами/баллами в доступных файлах нет.
Поэтому численная оценка и гарантия максимального балла не выдумываются.

## 1. Что сделано

- Изучены AGENTS.md, README, архитектура, конфигурация, модули/guards/DTO/entities,
  транзакционные сервисы, миграции, seed, Docker и существующие unit/e2e.
- Архитектура сохранена. В architecture.md добавлены требования, схема компонентов,
  схема бизнес-потока и таблица решений с причинами/компромиссами.
- Добавлены scripts/demo-up.mjs и demo-flow.mjs: подготовка одной командой и проверяемый
  двухраундовый HTTP flow до начисления, retry, отказа MCC и запрета редактирования клиентом.
- Bootstrap создаёт отсутствующий .env со случайными отдельными JWT keys, не меняет
  существующий .env и не удаляет БД/volumes. Нужны Node.js/npm и Docker; npm install на хосте не нужен.
- Dockerfile устанавливает зависимости один раз, собирает проект и удаляет dev-пакеты
  перед копированием в runtime. Добавлена передача SEED_DEMO_PASSWORD через Compose.
- Добавлен migration:check / migration:check:prod, завершающийся ошибкой при pending migrations
  или расхождении entities со схемой. synchronize остаётся false, новых миграций не требовалось.
- Добавлен GitHub Actions workflow: install, format/lint, build, чистая PostgreSQL,
  migrations/check, seed, unit/e2e, coverage, Docker demo и HTTP flow, отчёты как artifact.
  Deployment не добавлен: реального target/доступов нет.
- Созданы docs/demo.md с user stories и сценарием презентации и docs/testing.md с матрицей доказательств.
- Добавлен **один прикладной e2e** изоляции покупок/активаций и reference между клиентами.
  Не добавлялись тесты DTO, mapper-функций, стандартных валидаторов или framework boilerplate.
- Добавлен встроенный V8 coverage без новой зависимости, без порога 100%.

## 2. Сопоставление с критериями

«Закрыт локально» означает наличие реализации и фактической проверки в описанном окружении,
а не сертификат production-ready или подтверждение неизвестной официальной рубрики.

| Критерий                   | Статус                                              | Проверяемое доказательство                                                                                                                                        |
| -------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Архитектурные решения      | Закрыт локально                                     | architecture.md соответствует сервисам/entities; причины и компромиссы, две Mermaid-схемы; переписывания архитектуры нет                                          |
| Удобство проверки          | Закрыт локально; доставка через Git не подтверждена | Чистая копия без .env/node_modules/dist прошла demo:up; README, credentials, seed, Swagger, health и HTTP-сценарий доступны                                       |
| CI/CD                      | Частично                                            | Workflow YAML разобран локально, команды install/lint/build/tests/migrations/Docker выполнены; hosted GitHub Actions не запускался, deployment-инфраструктуры нет |
| Тестирование               | Закрыт для ключевых MVP-сценариев                   | 7 unit + 9 real-PostgreSQL e2e, сценарная матрица, V8 HTML/LCOV/JSON и фактический вывод; не заявляется полное покрытие всех комбинаций                           |
| Product/business scenarios | Закрыт локально                                     | User stories сопоставлены с API; два раунда → запуск → витрина → активация → покупка → 10.00 кэшбэка → идемпотентный retry                                        |
| Demo readiness             | Закрыт локально                                     | Одна команда, сценарий на 5 минут, реальные IDs/суммы в JSON; повторный bootstrap сохраняет .env и 13 базовых seed-офферов                                        |
| Проверка качества          | Закрыт в выполненном объёме                         | Clean install, formatter, lint, build, чистые миграции/rollback, seed, тесты, новый Docker volume, healthy и настоящий HTTP flow                                  |

Файлы: [архитектура](architecture.md), [demo](demo.md), [тестирование](testing.md),
[CI](../.github/workflows/ci.yml), [README](../README.md).

## 3. Что выполнено фактически

Основные команды текущего аудита:

```powershell
npm ci --prefer-offline --no-audit --no-fund
npm run format
npm run lint
npm run build
npm run test:coverage
npm run demo:flow
npm run migration:check
npm audit --omit=dev --json
npm audit --json
```

Для проверки чистого checkout создана файловая копия исходников в artifacts/clean-checkout,
без .env, node_modules, dist, .test-dist, coverage и прежних artifacts.
Это не git clone: в исходной директории отсутствует .git/remote.

```powershell
$env:COMPOSE_PROJECT_NAME='cashback-jury-audit'
$env:PORT='3001'
$env:DB_PORT='5433'
$env:DB_DATABASE='cashback_jury_audit'
npm --prefix artifacts/clean-checkout run demo:up
# Затем та же команда повторена на уже подготовленном окружении.
```

Внутри demo:up действительно выполнены:

```text
docker compose config --quiet
docker compose build backend
docker compose up -d --wait --wait-timeout 60 postgres
docker compose run --rm backend npm run migration:run:prod
docker compose run --rm backend npm run migration:check:prod
docker compose run --rm -e ALLOW_DEMO_SEED=true backend npm run seed:prod
docker compose up -d --wait --wait-timeout 60 backend
runDemoFlow() — настоящие HTTP requests к запущенному backend
```

В отдельном новом Docker volume до apply было **0 миграций**, после — 2.
После повторного bootstrap SQL подтвердил 6 demo users и 13 базовых seed-офферов.
Полный flow создаёт дополнительные демонстрационные офферы/покупки намеренно, а не как дубликаты seed.
Хеш .env до/после повторного bootstrap совпал. В чистой копии не появились node_modules или dist:
сборка и зависимости действительно оставались внутри Docker.
JWT keys проверены на различие и случайные значения длиной 96 символов, без вывода значений.

Дополнительно в **собственном временном audit-окружении**:
создана пустая probe-БД → migration check дал ожидаемый exit 1 для pending migrations;
добавлена временная audit_probe колонка → check дал exit 1 для drift и не изменил колонку;
после удаления probe-колонки check снова прошёл. Probe-БД удалена, рабочая БД не затрагивалась.

Workflow проверен локальным YAML parser на синтаксис, три triggers и наличие PostgreSQL service.
Это не проверка исполнения hosted workflow на GitHub.

## 4. Результаты

| Проверка                        | Результат                                                                                     |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| Clean install                   | 556 packages, exit 0                                                                          |
| Formatter / format:check        | Пройдены                                                                                      |
| Lint / build                    | Пройдены, в том числе build внутри Linux Docker                                               |
| Unit tests                      | 7/7                                                                                           |
| PostgreSQL e2e                  | 9/9, включая реальные конкурентные операции и изоляцию клиентов                               |
| Общий test:coverage             | 16/16; HTML, LCOV, JSON и test-results.txt созданы                                            |
| Чистые миграции                 | Обе применены на новом volume; rollback/reapply проверены e2e                                 |
| Migration check                 | Положительный и два отрицательных сценария проверены                                          |
| Seed                            | Выполнен, повторяемость подтверждена SQL и e2e                                                |
| Docker                          | Новый image собран; backend/PostgreSQL healthy                                                |
| HTTP demo                       | Два раунда, история, launch, storefront, activation, cashback 10.00, retry и отказы проверены |
| Production dependency audit     | 3 moderate, 0 high/critical; audit не является «зелёным»                                      |
| Полный dependency audit         | 12 записей: 2 low, 10 moderate, 0 high/critical                                               |
| Hosted CI / external deployment | Не выполнялись и не заявляются успешными                                                      |

Coverage измеряет выбранный исполняемый JS бизнес-файлов, а не весь TypeScript-проект.
Получено 95.81% lines / 75.18% branches в этом ограниченном scope; цель 100% не ставилась.
Пропуски в helpers/ветвях и простых чтениях не закрывались искусственными тестами.

Локальные доказательства после выполнения (генерируются, не коммитятся):
[HTML coverage](../coverage/index.html), [вывод тестов](../coverage/test-results.txt),
[coverage JSON](../coverage/summary.json), [HTTP demo](../artifacts/demo-flow.json),
[чистый checkout demo](../artifacts/fresh-demo-flow.json),
[production audit](../artifacts/dependency-audit-production.json).

Unit/e2e выполнялись на Windows с Node.js 26.13.0; Linux Docker build/runtime — Node.js 24.22.2.
Первый audit build использовал уже имеющийся base image в Docker daemon.
Отсутствие локальных dependencies/.env и чистая БД проверены; загрузка всех слоёв на полностью
пустом компьютере без Docker cache отдельно не измерялась.

## 5. Что ещё мешает подтвердить максимум

1. Нужен реальный доступный URL репозитория в заявке: .git/remote здесь отсутствует,
   транспорт git clone и доступность исходников для жюри не подтверждены.
2. Нужно получить и приложить успешный hosted GitHub Actions run после публикации.
   Наличие YAML и успешные локальные команды не заменяют этот run.
3. Если потребуется реальное внешнее deployment, сначала нужны target, DNS/TLS и доступы.
   Фиктивный deployment не приносит проверяемого результата и не добавлялся.
4. Точные веса/баллы официальной рубрики не предоставлены; текущий отчёт покрывает перечисленные критерии,
   но не может обещать итоговую оценку жюри.

## 6. Известные риски и границы production

- 3 moderate production advisories относятся к TypeORM → glob → minimatch.
  Без проверки совместимости не применялись force/major upgrades; полный аудит включает dev-инструменты.
- Во время schema introspection есть deprecation warning pg о параллельном client.query;
  проверки проходят. Это зависимостный вопрос перед будущим переходом на pg 9, не текущая ошибка запуска.
- Нет подтверждённого публичного deployment, TLS termination, rate limiting login,
  нагрузочных испытаний, backup/restore и failover. Их отсутствие не скрывается за словом production.
- Demo credentials публичны намеренно. .env.example — локальный пример; для внешнего окружения нужны
  собственные секреты и отказ от демонстрационных пользователей.
- Purchase API доверяет пользовательским amount/MCC/purchasedAt **как симулятор**;
  его нельзя выдавать за доверенный банковский источник транзакций.
- Витрина использует простую общую эвристику, а «1% на всё» — категорию без выдуманной
  финансовой механики базового банковского кэшбэка.
- Первый Docker build зависит от сети; повторные seed не продлевают сроки старых запечатанных офферов.
  Demo flow создаёт новый действующий оффер и не переписывает старую историю.

Архитектурные/функциональные допущения подробно сохранены в architecture.md.
Масштабный refactoring, новые слои, ML, внешний банк и тесты ради 100% coverage не добавлялись.
