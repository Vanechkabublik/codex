# Проверка бизнес-сценариев

Цель — доказать надёжность ключевых сценариев, а не получить 100% coverage.
Основные доказательства — HTTP e2e с реальной PostgreSQL и проверки чистых бизнес-политик.
DTO, getters, mapper-функции и NestJS boilerplate специально не тестируются ради процента.
Унаследованный маленький config test сохранён; он не служит доказательством бизнес-покрытия.

## Матрица сценариев

Ссылки ведут на реальные тесты; названия в колонке «Доказательство» совпадают с фрагментами
вывода node:test. Это покрытие сценариев, а не обещание проверки всех комбинаций данных.

| ID               | Сценарий и ожидаемый результат                                                                                                                                          | Доказательство                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| AUTH             | Login, две конкурентные ротации (один победитель), replay старого refresh отклонён, logout отзывает access/refresh, хеши не попадают в API                              | e2e: auth: protects endpoints…                                                       |
| WORKFLOW         | Создание → первый раунд: APPROVED / CHANGES_REQUESTED / APPROVED → правки → новый snapshot/round → три параллельных APPROVED → READY_TO_LAUNCH                          | e2e: full workflow preserves two rounds…                                             |
| HISTORY          | Два разных снимка, шесть старых/новых решений, события всех стадий, UPDATE/DELETE истории отвергаются БД, позднее решение закрытого раунда запрещено                    | тот же full workflow                                                                 |
| ACTIVATION       | Только доступный оффер; конкурентные повторные активации возвращают один id и одну строку БД                                                                            | e2e: client storefront, concurrent idempotent activation…                            |
| PURCHASE         | Подходящие MCC/срок, 10% от 100.00 = 10.00; конкурентный повтор покупки и последующий retry возвращают тот же purchase/accrual; изменённый payload с reference даёт 409 | тот же concurrent idempotent activation…                                             |
| CLIENT-ISOLATION | Второй клиент не читает чужую покупку/активации, не может подменить clientId; reference изолирован между клиентами                                                      | e2e: purchase ownership and idempotency references…                                  |
| ACCESS           | CLIENT не создаёт/правит внутренний оффер; владелец не правит чужой; mass assignment status/role отклонён, невалидный оффер не отправляется                             | e2e: authorization, ownership, mass assignment…                                      |
| REVIEW           | Конкурентный duplicate review даёт 201/409; пустой комментарий запрещён; ADMIN не подменяет согласующего; REJECTED терминален                                           | e2e: duplicate reviews conflict…                                                     |
| BUDGET           | Неактивированный оффер, неверный MCC и нехватка бюджета дают сохранённые причины; две покупки на остаток одного начисления дают ACCRUED/DECLINED без перерасхода        | e2e: declines for no activation…                                                     |
| EXPIRY           | Истёкший оффер не виден; историческая покупка на границе endsAt сохраняет OFFER_EXPIRED                                                                                 | e2e: expired offer is absent…                                                        |
| STOREFRONT       | Максимум семь, фиксированная категория «1% на всё», стабильный порядок; повтор seed не увеличивает каталог                                                              | e2e: seed is safely repeatable…                                                      |
| MONEY            | HALF_UP, точная граница бюджета, округление в ноль, интервал [startsAt, endsAt), соответствие MCC                                                                       | unit: cashback-policy.test.ts                                                        |
| POLICY           | Приоритет решений, независимость направлений, полнота/копирование снимка, владение и запрет правки запущенного оффера                                                   | unit: offer-policy.test.ts                                                           |
| JWT-POLICY       | Наша конфигурация изолирует access/refresh, проверяет issuer/audience/algorithm и срок                                                                                  | unit: tokens.test.ts; lifecycle доказан e2e, не тестами внутренностей JWT-библиотеки |
| MIGRATIONS       | Чистая случайная БД → apply → rollback обеих миграций → apply, без synchronize                                                                                          | before hook e2e и отдельный migration:check                                          |
| HTTP-DEMO        | Полный двухраундовый flow, витрина, активация, покупка, начисление, retry, неверный MCC и запрет клиенту редактирования                                                 | scripts/demo-flow.mjs, artifacts/demo-flow.json                                      |

Файлы: [e2e](../test/e2e/mvp.test.ts), [политика оффера](../test/unit/offer-policy.test.ts),
[расчёт](../test/unit/cashback-policy.test.ts), [JWT policy](../test/unit/tokens.test.ts).

## Воспроизводимый отчёт

```powershell
npm ci
npm run test:unit
npm run test:e2e
# Либо один запуск обоих наборов с численным отчётом:
npm run test:coverage
```

Нужна PostgreSQL из .env; E2E создают собственную случайную cashback_e2e_<uuid> БД
и удаляют только её. Учётной записи нужно CREATE DATABASE.
Временная БД не использует данные жюри или рабочие демо-данные.

Coverage использует встроенный Node V8 без новой зависимости.
Формат и флаги соответствуют [Node.js test runner](https://nodejs.org/download/release/v24.22.1/docs/api/test.html).
Команда создаёт:

- coverage/index.html — таблица покрытия бизнес-файлов;
- coverage/lcov.info — стандартный LCOV для CI;
- coverage/summary.json — численные показатели по файлам;
- coverage/test-results.txt — фактический вывод unit + e2e и итоговые pass/fail.

Область: services, policies, guards и JWT strategy. Декораторы, DTO, entities, controllers,
mappers (отдельные файлы) и конфигурационный boilerplate не являются целью отчёта.
Генерируемые TypeScript-helpers внутри измеряемого JS-файла остаются в численных метриках.
Метрика измеряет исполняемый JavaScript в .test-dist, а не source-map coverage TypeScript
или процент всего репозитория. Случайно неисполненные строки — повод оценить риск,
а не автоматически дописывать тесты. Порогов 100% нет.

## Что не доказано

Нагрузочные испытания, распределённые сбои, failover/backup PostgreSQL,
публичное размещение, работа внешнего frontend и реальные банковские интеграции не проверялись.
E2E проверяют конкурирующие запросы в одном backend и одной PostgreSQL, а не кластер.
CI-файл готов, но его размещение не равно успешному запуску hosted GitHub Actions:
такой запуск необходимо отдельно подтвердить в реальном удалённом репозитории.
