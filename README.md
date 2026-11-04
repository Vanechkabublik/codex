# Cashback Offers Backend

Рабочий backend MVP на NestJS 11, TypeScript, PostgreSQL 16 и TypeORM 0.3.
Фронтенд запускается отдельно. Модель и допущения — [docs/architecture.md](docs/architecture.md);
правила разработки — [AGENTS.md](AGENTS.md).

## Проверка жюри одной командой

Получите исходники из репозитория, указанного в заявке, и перейдите в его корень.
Установите Docker Desktop / Docker Compose и Node.js 22+ с npm, затем выполните:

```powershell
npm run demo:up
```

Предварительный npm install не требуется. Команда сама создаст отсутствующий .env со случайными
JWT keys, соберёт Docker image, подготовит БД/миграции/seed, запустит backend, проверит health
и выполнит полный двухраундовый demo flow через HTTP до начисления кэшбэка и проверки retry.
Существующие .env и данные сохраняются. Первый запуск зависит от скорости скачивания образа
и npm-зависимостей. Dockerfile устанавливает зависимости один раз и удаляет dev-пакеты после build.

Откройте [Swagger](http://localhost:3000/api/docs).
Сценарий презентации и аккаунты: [docs/demo.md](docs/demo.md).
Результат прогона: artifacts/demo-flow.json (IDs и суммы, без JWT/паролей).
Повторить только API-сценарий: npm run demo:flow.

Матрица проверяемых бизнес-сценариев и coverage: [docs/testing.md](docs/testing.md).
Итоговый аудит по перечисленным критериям: [docs/hackathon-audit.md](docs/hackathon-audit.md).

## Быстрый запуск

Нужны Node.js 22+, npm и Docker Compose. В контейнере используется Node.js 24.

```powershell
# Копировать только при первом запуске; существующий .env не перезаписывать.
Copy-Item .env.example .env
npm ci
docker compose up -d postgres
npm run migration:run
npm run seed
npm run start:dev
```

API: http://localhost:3000/api.
Swagger UI: http://localhost:3000/api/docs, JSON: http://localhost:3000/api/docs-json.
Health: GET /api/health/live и /api/health/ready (503 при недоступной БД).
При старте PostgreSQL должен быть доступен.

## Environment variables

| Переменная                              | Назначение                                                                 |
| --------------------------------------- | -------------------------------------------------------------------------- |
| NODE_ENV                                | development / test / production                                            |
| PORT                                    | HTTP порт, по умолчанию 3000                                               |
| DB_HOST / DB_PORT                       | PostgreSQL host / port                                                     |
| DB_USERNAME / DB_PASSWORD / DB_DATABASE | Подключение к БД, без хардкода                                             |
| DB_SSL                                  | true/false; при true сертификат проверяется                                |
| JWT_ACCESS_SECRET                       | Отдельный секрет access JWT, минимум 32 символа                            |
| JWT_REFRESH_SECRET                      | Другой секрет refresh JWT, минимум 32 символа                              |
| JWT_ACCESS_TTL_SECONDS                  | Срок access, по умолчанию 900 секунд                                       |
| JWT_REFRESH_TTL_SECONDS                 | Срок refresh, по умолчанию 604800 секунд                                   |
| CORS_ORIGIN                             | Разрешённый origin отдельного frontend, по умолчанию http://localhost:5173 |
| SEED_DEMO_PASSWORD                      | Необязательный пароль для новых seed-пользователей                         |
| ALLOW_DEMO_SEED                         | Для seed в production требуется true                                       |

.env.example содержит локальные демонстрационные значения. Для реального окружения замените
JWT secrets и пароль БД; .env исключён из Git. JWT secrets должны различаться.
Приложение проверяет конфигурацию при старте и не выводит значения секретов в ошибки.

## Docker

```powershell
docker compose build backend
docker compose up -d postgres
docker compose run --rm backend npm run migration:run:prod
docker compose run --rm -e ALLOW_DEMO_SEED=true backend npm run seed:prod
docker compose up -d backend
```

Миграции выполняются явно до запуска новой версии приложения.
Backend использует postgres:5432 внутри сети Compose; DB_HOST/DB_PORT из .env служат
для локального Node.js. База сохраняется в named volume. Не удаляйте volume для обычного перезапуска.

## Миграции

synchronize и migrationsRun выключены. Есть две миграции:

1. InitialMvpSchema1793827359604 — 11 доменных таблиц, FK, enum, checks, indexes и unique constraints.
2. ImmutableAudit1793827359605 — неизменяемость снимков, аудита, решений и финансовых записей; согласованность результата проверки кэшбэка.

```powershell
npm run migration:show
npm run migration:check
npm run migration:run
npm run migration:revert
npm run migration:create -- src/database/migrations/NextChange
npm run migration:generate -- src/database/migrations/NextChange
npm run build
npm run migration:run:prod
```

Generate требует доступную БД. Проверяйте SQL, не изменяйте уже применённые миграции.
Таблица typeorm_migrations служебная, не входит в 11 доменных таблиц.
Используется расширение uuid-ossp; локальный PostgreSQL-пользователь может его создавать.

## Demo users и seed

```powershell
npm run seed
# Для скомпилированного приложения:
npm run seed:prod
```

Пароль всех новых демо-пользователей: **DemoPass123!**.
При SEED_DEMO_PASSWORD используется его значение. Существующие пароли seed не меняет.

| Email                 | Role               |
| --------------------- | ------------------ |
| owner@demo.local      | OFFER_OWNER        |
| product@demo.local    | PRODUCT_MANAGER    |
| analyst@demo.local    | ANALYST            |
| operations@demo.local | OPERATIONS_MANAGER |
| client@demo.local     | CLIENT             |
| admin@demo.local      | ADMIN              |

Seed безопасно повторяемый: не удаляет историю, не перезаписывает существующих пользователей
или офферы. Параллельные запуски сериализуются advisory lock.
Создаются 13 офферов: DRAFT, UNDER_REVIEW, CHANGES_REQUESTED, PARTIALLY_APPROVED,
APPROVED, REJECTED и семь READY_TO_LAUNCH. Состояния получаются через настоящие бизнес-сервисы.
Даты готовых офферов действуют на момент первого seed; повторный seed не продлевает их сроки.

## Основные endpoints

Все пути ниже начинаются с /api. В Swagger есть request/response DTO и Bearer authorization.

| Метод и путь                             | Доступ / назначение                                             |
| ---------------------------------------- | --------------------------------------------------------------- |
| POST /auth/login                         | Публичный login: email, password                                |
| POST /auth/refresh                       | Публичный refresh: refreshToken; ротация                        |
| POST /auth/logout                        | refreshToken; отзыв сессии, 204                                 |
| GET /auth/me, GET /users/me              | Текущий пользователь                                            |
| GET /users                               | ADMIN, публичные профили без хешей                              |
| POST /offers                             | OFFER_OWNER / ADMIN, создать неполный или полный черновик       |
| GET /offers                              | Сотрудники; владелец видит свои, остальные — все; фильтр status |
| GET /offers/:id                          | Карточка, текущий раунд, решения, pendingRoles, launchBlockers  |
| PATCH /offers/:id                        | Владелец / ADMIN, только DRAFT или CHANGES_REQUESTED            |
| POST /offers/:id/submit                  | Владелец / ADMIN, валидация и новый снимок/раунд                |
| GET /offers/:id/current-round            | Карточка с текущим раундом и причинами блокировки               |
| GET /offers/:id/rounds                   | Раунды со снимками и всеми решениями                            |
| GET /offers/:id/rounds/:roundId/reviews  | Решения конкретного раунда (не более трёх)                      |
| POST /offers/:id/rounds/:roundId/reviews | Согласующая роль; decision и обязательный comment               |
| GET /offers/:id/history                  | Аудит изменений и событий                                       |
| POST /offers/:id/ready-to-launch         | Владелец / ADMIN, финальная проверка                            |
| GET /storefront                          | CLIENT, максимум 7 офферов и baseCategory «1% на всё»           |
| PUT /offers/:id/activation               | CLIENT, идемпотентная активация                                 |
| GET /activations                         | CLIENT, свои активации с клиентскими полями офферов             |
| POST /purchases                          | CLIENT, демонстрационная покупка и результат кэшбэка            |
| GET /purchases                           | CLIENT — свои, ADMIN — все                                      |
| GET /purchases/:id                       | Покупка, evaluation и accrual либо причина отказа               |

Списки пользователей, офферов, раундов, событий, активаций и покупок:
page=1, limit=20 (максимум 100), ответ {items,total,page,limit}.
page ограничен 1–1000000. Витрина ограничена семью, решения — тремя по определению.
Ошибка ввода — 400, отсутствие авторизации — 401, запрет — 403, нет ресурса — 404,
конфликт состояния/идемпотентности — 409. Бизнес-отказы кэшбэка сохраняются и возвращаются с 200.

## Workflow

Создать черновик → submit → три **параллельных** решения.
Частичное одобрение даёт PARTIALLY_APPROVED, запрос изменений — CHANGES_REQUESTED,
отказ имеет приоритет и даёт REJECTED, три APPROVED дают APPROVED.
Владелец исправляет CHANGES_REQUESTED и повторно отправляет: новый снимок и новый раунд,
старые решения остаются. REJECTED в MVP окончательный.
READY_TO_LAUNCH получается отдельным вызовом после полного согласования и проверки срока.

ADMIN может просматривать все офферы, создавать/редактировать разрешённые черновики и
запускать полностью согласованные офферы. Он не подменяет роли согласующих и не обходит state machine.
Владелец не может менять чужой оффер. Произвольные status/role/ownerId в DTO отклоняются.

## Пример покупки

Сначала войдите клиентом, получите /storefront и активируйте offerId через PUT.
Покупка содержит одну выбранную офферную программу; amount — строка decimal:

```json
{
  "offerId": "UUID оффера",
  "reference": "test-purchase-001",
  "amount": "1000.00",
  "mcc": "5411",
  "purchasedAt": "2026-11-05T12:00:00.000Z"
}
```

Используйте фактическое время после активации, не будущее.
Reference уникален в пределах клиента. Повтор того же payload возвращает прежний результат;
изменение payload с тем же reference даёт 409. POST /purchases возвращает 200 и при первом,
и при повторном вызове. Денежные поля и проценты в запросах/ответах — строки.

Кэшбэк считается Decimal, округление HALF_UP до двух знаков; лимит — общий бюджет оффера.
Если полного бюджета недостаточно, частичная выплата не создаётся.
Причины отказа: OFFER_NOT_ACTIVATED, OFFER_NOT_READY, MCC_NOT_ELIGIBLE,
OFFER_NOT_STARTED, OFFER_EXPIRED, PAYOUT_LIMIT_EXCEEDED, CASHBACK_ROUNDED_TO_ZERO.
Запись покупки, evaluation, accrual и расход бюджета атомарны.

## Тесты и проверки

```powershell
npm run format
npm run format:check
npm run lint
npm run build
npm run test:unit
npm run test:e2e
# Вместо двух отдельных прогонов — unit + e2e и бизнес-coverage:
npm run test:coverage
```

npm test запускает unit tests. Используется стандартный node:test; TypeScript тестов
компилируется в игнорируемый .test-dist. Unit tests не требуют PostgreSQL.

E2E требуют запущенную PostgreSQL из .env и право CREATE DATABASE (локальный Compose его даёт).
Каждый запуск создаёт случайную cashback_e2e_<uuid> базу, применяет миграции, проверяет их rollback,
повторно применяет, запускает HTTP API на свободном порту и затем удаляет только свою временную БД.
Рабочая БД и её записи не очищаются.

Покрыты: два раунда и история, независимые/параллельные решения, запуск, витрина,
конкурентные активации, покупки и расход бюджета, повторное начисление, негативные условия,
роли, владение, DTO/mass assignment, rotation/replay/logout, JWT validation и seed.
Проверка TypeORM schema:log не обнаружила расхождения entities со схемой.

Coverage создаёт coverage/index.html, LCOV, JSON и фактический вывод тестов.
Это покрытие выбранной бизнес-логики в исполняемом JS, не всего TypeScript-репозитория;
нет порога 100%. Матрица сценариев и ограничения измерения — в docs/testing.md.

## CI/CD

.github/workflows/ci.yml запускается на push, pull_request и вручную в GitHub Actions:
Node.js 24, npm ci, format/lint, build, чистая PostgreSQL 16, apply/check migrations, seed,
unit + e2e с coverage, полный Docker demo и HTTP flow. Отчёты сохраняются как CI artifact.
Локальный эквивалент: команды из разделов проверок и npm run demo:up.

Сам hosted workflow нужно подтвердить запуском после публикации в реальном GitHub-репозитории.
В текущей директории нет .git/remote; URL репозитория и hosted-run не выдумываются.
Реального deployment target/доступов нет, поэтому deployment-job не добавлен.
Docker image и миграционные команды готовы для будущего deployment.

## Проверенный результат MVP

Проверено 5 ноября 2026:

- formatter / format:check, lint и build — успешно;
- 7 unit tests и 9 e2e сценариев с реальным PostgreSQL — успешно;
- миграции применены на чистой БД, rollback обеих и повторное применение проверены;
- seed повторяется без дублей и без удаления истории;
- полный Docker build, migration:run:prod и seed:prod внутри образа — успешно;
- backend и PostgreSQL в Compose имеют статус healthy;
- реальные HTTP login/me, storefront, activation, purchase и повтор покупки проверены;
- Swagger и health доступны, кэшбэк начисляется один раз.

## Ограничения и зависимости

Это демонстрационный backend без реальных банковских интеграций. Таргетинг без ML:
PARTNER сначала, затем ближайшая дата окончания и UUID; одинаковый набор для клиентов
при одинаковых доступных данных. Активировать впервые можно только оффер из текущих семи.
«1% на всё» — обязательная категория витрины; расчёты базового банковского кэшбэка не заданы кейсом.

Все допущения, включая одну роль на пользователя, одну программу на покупку, UTC-интервал
[startsAt, endsAt), двухзначную денежную точность и отсутствие частичных выплат, описаны в architecture.md.

package-lock.json закрепляет зависимости. Override multer 2.5+ сохраняет NestJS 11
и устраняет известную high-уязвимость его транзитивной зависимости.
npm audit --omit=dev сейчас содержит 3 moderate-записи в цепочке TypeORM 0.3 → glob → minimatch;
автоматический переход на TypeORM 1 не применялся из-за необходимости проверки совместимости.
Полный аудит с dev-зависимостями сообщает 12 записей: 2 low и 10 moderate, без high/critical.
