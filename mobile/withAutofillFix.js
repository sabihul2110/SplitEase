const { withAndroidStyles } = require('@expo/config-plugins');

module.exports = function withAutofillFix(config) {
  return withAndroidStyles(config, async (config) => {
    // Find the main AppTheme block in styles.xml
    const appTheme = config.modResults.resources.style.find(
      (style) => style.$.name === 'AppTheme'
    );

    if (appTheme) {
      // Look for the autofill highlight item
      const existingItem = appTheme.item.find(
        (item) => item.$.name === 'android:autofilledHighlight'
      );

      if (existingItem) {
        // If it exists (e.g., set to @null from before), overwrite it safely
        existingItem._ = '@android:color/transparent';
      } else {
        // Otherwise, create it cleanly
        appTheme.item.push({
          $: { name: 'android:autofilledHighlight' },
          _: '@android:color/transparent' 
        });
      }
    }
    return config;
  });
};