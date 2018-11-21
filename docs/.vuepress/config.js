module.exports = {
  title: 'CPM',
  description: '一套轻量化的NPM私有源管理程序',
  markdown: {
    lineNumbers: true
  },
  themeConfig: {
    displayAllHeaders: true,
    repo: 'cevio/cpm',
    repoLabel: 'GitHub',
    docsDir: 'docs',
    editLinks: true,
    editLinkText: '帮助我们改善此页面！',
    nav: [
      { text: '简介', link: '/' },
      { text: '搭建', link: '/guide/' }
    ],
    sidebar: {
      '/guide/': [
        ''
      ]
    }
  }
}