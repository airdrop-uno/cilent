module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'release', // CI/CD相关
        'chore', // 其他修改
        'revert' // 回滚提交
      ]
    ],
    'type-case': [2, 'always', 'lowerCase'],
    'subject-case': [0],
    'subject-max-length': [2, 'always', 50],
    'body-max-line-length': [2, 'always', 72]
  }
}
