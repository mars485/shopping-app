# Публикация в RuStore

Материалы для карточки приложения лежат в `store/`. Здесь — требования RuStore, проверки перед загрузкой и порядок действий.

## Требования RuStore к сборке

| Требование | Статус в проекте |
|---|---|
| APK подписан постоянным ключом | да, `CN=Shopping`, SHA-256 `D8:3C:31:…:71:84` |
| 64-битные библиотеки (`arm64-v8a`) | да, universal APK (4 ABI) |
| `targetSdk` актуальный | 36 |
| Уникальный `packageName` | `ru.karpiev.shopping` |
| Растущий `versionCode` при обновлении | 1 (увеличивать перед каждой публикацией) |
| Иконка 512×512 PNG | `store/icon-512.png` |
| Скриншоты телефона | `store/screenshots/` (1080×2412) |
| Политика конфиденциальности по публичной ссылке | <https://mars485.github.io/shopping-app/privacy-policy.html> |
| Доступ для модерации (в приложении есть вход) | тестовый аккаунт, см. ниже |

## Проверка APK перед загрузкой

```powershell
cd D:\Projects\shopping-app

# подпись
& "D:\Tools\android-sdk\build-tools\37.0.0\apksigner.bat" verify --print-certs `
  mobile\dist\shopping-1.0.0-release.apk

# package, версия и ABI
& "D:\Tools\android-sdk\build-tools\37.0.0\aapt2.exe" dump badging `
  mobile\dist\shopping-1.0.0-release.apk | Select-String "package:|native-code|application-label"
```

Ожидаемо: `package: name='ru.karpiev.shopping' versionCode='1' versionName='1.0.0'`,
`native-code: 'arm64-v8a' 'armeabi-v7a' 'x86' 'x86_64'`, подпись `CN=Shopping`.

## Метаданные карточки

Все тексты — в `store/ru/`:

- `description.md` — краткое (до 80 символов) и полное описание, ключевые слова;
- `whats-new.md` — список изменений версии;
- `metadata.json` — package, версия, категория, рейтинг, контакты.

Категория: **Покупки**. Возрастной рейтинг: **0+** (нет пользовательского контента, рекламы и внешних ссылок).

## Доступ для модерации

Модератору нужен рабочий аккаунт, иначе он не увидит основные экраны:

1. Зарегистрируйте отдельный аккаунт, например `review@karpiev.ru` (не личный).
2. Создайте в нём один демонстрационный список с 3–4 товарами и отметьте один товар купленным.
3. В консоли RuStore в поле «Данные для доступа» укажите этот e-mail и пароль.

Пароль тестового аккаунта не храните в репозитории.

## Порядок публикации

1. `mobile\dist\shopping-1.0.0-release.apk` — загрузить в RuStore Консоль.
2. Заполнить карточку: название, краткое и полное описание, «что нового», категория, рейтинг.
3. Добавить иконку `store/icon-512.png` и скриншоты из `store/screenshots/`.
4. Указать публичную ссылку на политику конфиденциальности.
5. Указать контакты поддержки и данные тестового аккаунта.
6. Отправить на модерацию.

## Обновления

- Увеличить `versionCode` в `mobile/app.json`, при необходимости — `version`.
- Собрать APK с тем же upload-keystore (см. `docs/android-build.md`).
- Обновить `store/ru/whats-new.md` и `store/ru/metadata.json`.
- Поставить тег: `git tag v1.0.1 && git push --tags`.

## Публичная ссылка на политику

GitHub Pages включён (source: ветка `main`, каталог `/docs`), Jekyll публикует markdown как HTML:

- политика: <https://mars485.github.io/shopping-app/privacy-policy.html>
- оглавление документации: <https://mars485.github.io/shopping-app/>
- инструкция для RuStore: <https://mars485.github.io/shopping-app/rustore.html>

При изменении `docs/privacy-policy.md` страница обновляется автоматически после пуша в `main` (сборка ~1 минута).
