# Сборка Android APK

## Требования

| Компонент | Версия | Проверено на |
|---|---|---|
| JDK | 21 | `D:\Tools\jdk-21` |
| Android SDK Platform | 36 (Android 16) | `platforms;android-36` |
| Build-Tools | 36.0.0 | |
| Platform-Tools | 37.0.1 | |
| Node.js | 20+ | 24.21 |
| Gradle | из `android/gradlew` (wrapper) | 9.x |

Переменные окружения для сборки:

```powershell
$env:JAVA_HOME = "D:\Tools\jdk-21"
$env:ANDROID_HOME = "D:\Tools\android-sdk"
$env:ANDROID_SDK_ROOT = "D:\Tools\android-sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"
```

Если Android SDK не установлен:

```powershell
# 1. Скачать command line tools
# https://developer.android.com/studio#command-line-tools-only
# 2. Распаковать в %ANDROID_HOME%\cmdline-tools\latest
# 3. Принять лицензии и установить пакеты
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" --sdk_root=$env:ANDROID_HOME --licenses
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" --sdk_root=$env:ANDROID_HOME `
    "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```

## Локальная сборка

```powershell
cd mobile
npx expo prebuild --platform android --clean   # генерирует android/ из app.json
cd android
.\gradlew.bat assembleRelease
```

Результат:

```
mobile\android\app\build\outputs\apk\release\app-release.apk
```

Установка на подключённое устройство:

```powershell
adb install -r mobile\android\app\build\outputs\apk\release\app-release.apk
```

`android/` и `ios/` не коммитятся: они генерируются из `app.json` (Continuous Native Generation). Любые нативные настройки — только через `app.json` и config-плагины, иначе они потеряются при следующем `prebuild`.

## Подпись

- По умолчанию шаблон Expo подписывает `release` отладочным keystore (`android/app/debug.keystore`), который генерируется при `prebuild`. Такой APK устанавливается на устройства и годится для внутреннего тестирования.
- Для Google Play и обновлений «поверх» нужен постоянный upload-keystore. Он **не хранится в репозитории**: используйте EAS credentials или локальный `keystore.properties` вне git, и не коммитьте пароли.
- При потере keystore обновить опубликованное приложение нельзя — храните его в защищённом месте.

## EAS (облачная сборка)

В `mobile/eas.json` подготовлены профили:

| Профиль | Назначение | Артефакт |
|---|---|---|
| `development` | dev client | APK |
| `preview` | внутреннее тестирование | APK |
| `production` | магазин | AAB |

```powershell
cd mobile
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

Секреты и keystore хранятся на стороне EAS, в репозиторий не попадают.

## Версионирование

Версия и `versionCode` задаются в `mobile/app.json`:

```json
{ "expo": { "version": "1.0.0", "android": { "versionCode": 1 } } }
```

Перед публикацией новой сборки увеличивайте `versionCode` (и `version` для пользователей).

## Типовые проблемы

| Симптом | Причина и решение |
|---|---|
| `JAVA_HOME is not set` / `Unsupported class file major version` | Нужен JDK 21; проверьте `java -version` из `%JAVA_HOME%\bin`. |
| `SDK location not found` | Не задан `ANDROID_HOME`; создайте `mobile/android/local.properties` с `sdk.dir=D:\\Tools\\android-sdk`. |
| `Failed to install the following SDK components` | Не приняты лицензии: `sdkmanager --licenses`. |
| `OutOfMemoryError` при сборке | Увеличьте `org.gradle.jvmargs` в `android/gradle.properties` (например, `-Xmx4096m`). |
| Пустой экран после установки | Проверьте, что `EXPO_PUBLIC_API_URL`/`extra.apiUrl` указывает на доступный сервер и `/health` отвечает. |
