import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  vue: {
    overrides: {
      // TODO: remove after @antfu/eslint-config update contains eslint-plugin-vue bump.
      'vue/no-unused-refs': 'off',
      'vue/max-attributes-per-line': ['error', {
        singleline: { max: 3 },
        multiline: { max: 1 },
      }],
    },
  },
})
