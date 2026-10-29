# Сборка Android APK

## Требования

| Компонент | Версия | Проверено на |
|---|---|---|
| JDK | 21 | `D:\Tools\jdk-21` |
| Android SDK Platform | 37 (`compileSdk 37`, `targetSdk 36`, `minSdk 24`) | `platforms;android-37.0` |
| Build-Tools | 37.0.0 | `build-tools;37.0.0` |
| NDK | 27.1.12297006 | `ndk;27.1.12297006` |
| CMake + Ninja | 3.31.6 (ninja 1.12.1) | `cmake;3.31.6` |
| Platform-Tools | 37.0.1 | |
| Node.js | 20+ | 24.21 |
| Gradle | из `android/gradlew` (wrapper) | 9.4.1 |

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
    "platform-tools" "platforms;android-37.0" "build-tools;37.0.0" `
    "ndk;27.1.12297006" "cmake;3.31.6"
```

Версии `compileSdk`, `targetSdk`, `minSdk`, NDK и CMake определяет сам проект через Expo/AGP; `sdkmanager` ставят ровно то, что требует сборка.

## Windows: длинные пути и CMake

Собственные модули RN (`react-native-reanimated`, `react-native-safe-area-context`) генерируют объектные пути CMake длиной больше 260 символов, и `ninja` падает с ошибкой вида:

```
ninja: error: mkdir(CMakeFiles/reanimated.dir/D_/Projects/...): No such file or directory
```

Что должно быть выполнено (проверено на этой машине):

1. Включены длинные пути Windows: `HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem\LongPathsEnabled = 1`.
2. Используется CMake 3.31 или новее (в нём `ninja` 1.12, который умеет длинные пути). Встроенный в AGP CMake 3.22.1 с этой задачей не справляется даже при включённом `LongPathsEnabled`. Путь к CMake задаётся в `mobile/android/local.properties` (файл не коммитится):

   ```properties
   sdk.dir=D\:\\Tools\\android-sdk
   cmake.dir=D\:\\Tools\\android-sdk\\cmake\\3.31.6
   ```

3. Если проект лежит в глубоком каталоге, помогает сборка из короткого пути (например, `D:\m`) — это уменьшает итоговые пути ещё на несколько десятков символов.

Признак того, что версия CMake подхватилась: в логе сборки есть `D:/Tools/android-sdk/cmake/3.31.6/...`, а задачи `:react-native-reanimated:buildCMakeRelWithDebInfo[...]` завершаются успешно.

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

## Проверка на Android-эмуляторе

Локальный бэкенд доступен эмулятору по `http://10.0.2.2:8000`, но cleartext-трафик в Android 9+ по умолчанию запрещён. Для отладочной сборки:

```powershell
# 1. В сгенерированном android/app/src/main/AndroidManifest.xml добавить в <application>:
#    android:usesCleartextTraffic="true"
# 2. Собрать APK с адресом локального API (JS-бандл пересоберётся):
Remove-Item -Recurse -Force android\app\build\generated\assets
$env:EXPO_PUBLIC_API_URL = "http://10.0.2.2:8000"
cd android; .\gradlew.bat assembleRelease
```

Такие правки живут только в сгенерированном `android/` (он не коммитится) — после проверки их нужно откатить, а релизный APK собрать с `https://shopping.karpiev.ru`.

Эмулятор:

```powershell
& "$env:ANDROID_HOME\emulator\emulator.exe" -avd shopping_test -no-window -no-audio -no-snapshot -no-boot-anim -gpu swiftshader_indirect -memory 2048
adb install -r -t android\app\build\outputs\apk\release\app-release.apk
```

Проверено на AVD `shopping_test` (Android 15, API 35, x86_64): установка, запуск, регистрация, создание списка, добавление товара, отметка «куплено», перезапуск приложения с сохранением данных; в `logcat` нет `FATAL EXCEPTION` и ошибок `ReactNativeJS`.

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
| `ninja: error: mkdir(...): No such file or directory` | Длинные пути Windows: включите `LongPathsEnabled`, поставьте CMake 3.31+ и укажите `cmake.dir` в `android/local.properties` (см. раздел выше). |
| `OutOfMemoryError` при сборке | Увеличьте `org.gradle.jvmargs` в `android/gradle.properties` (например, `-Xmx4096m`). |
| Пустой экран после установки | Проверьте, что `EXPO_PUBLIC_API_URL`/`extra.apiUrl` указывает на доступный сервер и `/health` отвечает. |
| Приложение не видит локальный бэкенд по `http://` | Начиная с Android 9 cleartext запрещён: для отладочной сборки нужен `android:usesCleartextTraffic="true"` и адрес `http://10.0.2.2:8000` для эмулятора. |
