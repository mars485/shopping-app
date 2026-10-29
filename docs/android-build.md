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

- Без `mobile/keystore.properties` release-сборка подписывается отладочным ключом (`android/app/debug.keystore` из `prebuild`) — годится для внутренних APK, но не для Google Play и не для обновлений «поверх» опубликованного приложения.
- Постоянный upload-keystore подключён config-плагином `mobile/plugins/withReleaseSigning.js`: он прописан в `app.json` и при `expo prebuild` добавляет в `android/app/build.gradle` signing-конфигурацию `shoppingRelease`, читающую `mobile/keystore.properties`. Правки переживают перегенерацию `android/`.

### Постоянный upload-keystore

Создан на этой машине:

| Параметр | Значение |
|---|---|
| Файл | `C:\Users\ainur\.keys\shopping\upload.keystore` (вне репозитория) |
| Alias | `shopping` |
| Тип | PKCS12, RSA 2048 |
| Срок действия | до 2056-10-21 |
| SHA-256 сертификата | `D8:3C:31:C3:83:CA:70:CB:94:00:B1:2C:8B:77:43:CA:EF:AC:3A:DC:EF:8B:D6:01:DD:4C:31:D6:75:4F:71:84` |
| Пароль | `C:\Users\ainur\.keys\shopping\password.txt` |

`mobile/keystore.properties` (в `.gitignore`, в репозиторий не попадает):

```properties
storeFile=C:/Users/ainur/.keys/shopping/upload.keystore
storePassword=<пароль>
keyAlias=shopping
keyPassword=<пароль>
```

Пересоздать ключ (только если старый утерян и приложение ещё не опубликовано):

```powershell
& "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -v -storetype PKCS12 `
  -keystore C:\Users\ainur\.keys\shopping\upload.keystore -alias shopping `
  -keyalg RSA -keysize 2048 -validity 10950 `
  -dname "CN=Shopping, OU=Mobile, O=Karpiev, L=Almaty, ST=Almaty, C=KZ"
```

Проверить, каким ключом подписан APK:

```powershell
& "$env:ANDROID_HOME\build-tools\37.0.0\apksigner.bat" verify --print-certs `
  mobile\android\app\build\outputs\apk\release\app-release.apk
```

> ВАЖНО: keystore и пароль нужно сохранить в защищённом месте (менеджер паролей + резервная копия). При потере ключа обновить опубликованное приложение невозможно. Никогда не коммитьте keystore, `keystore.properties` и пароли.
>
> APK, подписанный новым ключом, не устанавливается поверх ранее установленного debug-APK (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`) — приложение нужно удалить и поставить заново (локальная сессия и кэш при этом теряются, данные на сервере остаются).
>
> Чтобы проверить правки поверх уже установленной debug-сборки, временно уберите `mobile/keystore.properties` (сборка снова подпишется debug-ключом), установите APK с `adb install -r`, а затем верните файл и соберите финальный подписанный APK.

## EAS (облачная сборка)

В `mobile/eas.json` подготовлены профили:

| Профиль | Назначение | Артефакт | Подпись |
|---|---|---|---|
| `development` | dev client | APK | EAS credentials |
| `preview` | внутреннее тестирование | APK | EAS credentials |
| `production` | магазин | AAB | EAS credentials |

```powershell
cd mobile
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform android --profile production   # AAB для Play
```

`credentialsSource: "remote"` означает, что keystore хранится на серверах EAS, а не в репозитории. Первый `eas build` предложит сгенерировать новый ключ или загрузить существующий — при публикации в Play используйте **тот же** upload-keystore, что и для локальных сборок, либо один раз настройте EAS:

```powershell
cd mobile
npx eas-cli@latest credentials --platform android
# Android → production → Keystore: upload existing → указать C:\Users\ainur\.keys\shopping\upload.keystore
```

После этого AAB из EAS и локальный APK будут подписаны одним сертификатом, а Google Play (Play App Signing) продолжит подпись для пользователей.


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
