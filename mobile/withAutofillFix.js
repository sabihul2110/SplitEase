const { withAndroidStyles } = require('@expo/config-plugins');

module.exports = function withAutofillFix(config) {
  return withAndroidStyles(config, async (config) => {
    // Find the main AppTheme block in styles.xml
    const appTheme = config.modResults.resources.style.find(
      (style) => style.$.name === 'AppTheme'
    );

    if (appTheme) {
      // Check if our fix is already there to avoid duplicates
      const exists = appTheme.item.some(
        (item) => item.$.name === 'android:autofilledHighlight'
      );

      // If not, inject the command to kill the autofill highlight
      if (!exists) {
        appTheme.item.push({
          $: { name: 'android:autofilledHighlight' },
          _: '@null' 
        });
      }
    }
    return config;
  });
};