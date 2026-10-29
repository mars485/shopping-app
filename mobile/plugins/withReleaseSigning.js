/**
 * Подключает постоянный upload-keystore к release-сборке Android.
 *
 * Пароли и путь к файлу ключа не хранятся в репозитории: конфигурация читается
 * из `mobile/keystore.properties` (файл в .gitignore, создаётся вручную).
 * Если файла нет, release-сборка подписывается отладочным ключом — как раньше.
 *
 * Использование: плагин прописан в app.json, применяется при `expo prebuild`.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const KEYSTORE_PROPERTIES = '../keystore.properties';

function addSigningConfig(contents) {
  if (contents.includes('shoppingRelease')) {
    return contents;
  }

  const signingBlock = `signingConfigs {
        shoppingRelease {
            def keystorePropsFile = rootProject.file("${KEYSTORE_PROPERTIES}")
            if (keystorePropsFile.exists()) {
                def keystoreProps = new Properties()
                keystorePropsFile.withInputStream { keystoreProps.load(it) }
                storeFile file(keystoreProps['storeFile'])
                storePassword keystoreProps['storePassword']
                keyAlias keystoreProps['keyAlias']
                keyPassword keystoreProps['keyPassword']
            }
        }`;

  return contents.replace('signingConfigs {', signingBlock);
}

function useReleaseKeystore(contents) {
  // В шаблоне Expo release-вариант подписывается debug-ключом:
  //   signingConfig signingConfigs.debug
  //   def enableShrinkResources = ...
  return contents.replace(
    /signingConfig signingConfigs\.debug(\s+def enableShrinkResources)/,
    `signingConfig rootProject.file("${KEYSTORE_PROPERTIES}").exists() ? signingConfigs.shoppingRelease : signingConfigs.debug$1`,
  );
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    const gradle = cfg.modResults;
    if (gradle.language !== 'groovy') {
      return cfg;
    }
    gradle.contents = useReleaseKeystore(addSigningConfig(gradle.contents));
    return cfg;
  });
};
