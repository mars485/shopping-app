# Shopping

Семейное приложение для списков покупок. Мобильный клиент — React Native / Expo SDK 58 / TypeScript, бэкенд — FastAPI + PostgreSQL.

**Продакшн-API:** https://shopping.karpiev.ru

## Что уже работает

- Регистрация и вход по e-mail/паролю, JWT-сессия на 7 дней.
- Несколько списков покупок, поиск по спискам и товарам.
- Товары: название, количество, единица (шт/кг/г/л/мл/упак), цена за единицу, отметка «куплено».
- Итоговая сумма списка и прогресс покупок (считаются на клиенте и на сервере).
- Семейный доступ: владелец открывает список по e-mail зарегистрированного пользователя, участник видит и редактирует товары.
- Офлайн-режим: кэш списков на устройстве, оптимистичные изменения с откатом при ошибке, автосинхронизация при возврате в приложение.
- Токен доступа хранится в SecureStore (Android Keystore / iOS Keychain).
- Тёмная и светлая темы, русская локализация.

## Структура репозитория

```
backend/            FastAPI-приложение (единый main.py), Dockerfile
mobile/             Expo-приложение (Expo Router, src/app)
  src/api/          типизированный клиент и DTO бэкенда
  src/state/        AuthProvider, ListsProvider (оптимистичные мутации)
  src/components/   UI-кит и компоненты списков
  src/app/          экраны Expo Router
  src/lib/          форматирование, валидация, JWT, хранилище
docs/               API, архитектура мобильного клиента, сборка APK
compose.yml         PostgreSQL + API для собственного развёртывания
deploy.sh           запуск стека через docker compose
```

## Быстрый старт (мобильный клиент)

Требования: Node.js 20+, npm, Android SDK для локальной сборки (см. `docs/android-build.md`).

```powershell
cd D:\Projects\shopping-app\mobile
npm install
npm start          # Expo dev server
npm run android    # запуск на устройстве/эмуляторе
```

Адрес API берётся из `EXPO_PUBLIC_API_URL`, затем из `app.json` → `expo.extra.apiUrl`, иначе используется прод-адрес.

```powershell
$env:EXPO_PUBLIC_API_URL = "http://192.168.1.250:8000"
npm start
```

## Проверки

```powershell
cd mobile
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # jest + @testing-library/react-native
```

Интеграционные тесты против запущенного бэкенда:

```powershell
$env:SHOPPING_E2E_URL = "http://127.0.0.1:8000"
npm run test:integration
```

Подробности — в `docs/mobile.md`.

## Сборка APK

```powershell
cd mobile
npx expo prebuild --platform android --clean
cd android
.\gradlew.bat assembleRelease
```

Готовый файл: `mobile/android/app/build/outputs/apk/release/app-release.apk`.

Подпись release-сборки настраивается один раз: постоянный upload-keystore лежит **вне репозитория**, а `mobile/keystore.properties` (в `.gitignore`) подключается config-плагином `mobile/plugins/withReleaseSigning.js` при `prebuild`. Если файла нет, release подписывается отладочным ключом. Подробности, проверка сертификата и EAS-профили — в `docs/android-build.md`.

## Документация

- `docs/api.md` — фактические контракты API и ограничения бэкенда.
- `docs/mobile.md` — архитектура клиента, состояние, офлайн, безопасность.
- `docs/android-build.md` — локальная сборка APK и EAS.
- `docs/roadmap.md` — план и статус задач.

## Бэкенд

Production-развёртывание живёт отдельно (Proxmox + Traefik) и без явного согласования не изменяется. Локальный стек:

```bash
cp .env.example .env   # или используйте deploy.sh
./deploy.sh
```

## Безопасность

- Пароли на сервере — PBKDF2-SHA256, 300 000 итераций.
- JWT подписывается `SECRET_KEY`, срок жизни 7 дней; на клиенте — SecureStore.
- В репозиторий не попадают `.env`, keystore, APK и токены.
- Изменения продакшн-сервера требуют явного разрешения владельца.
