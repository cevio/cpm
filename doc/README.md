---
home: true
heroImage: 	https://syj-1256052570.cos.ap-shanghai.myqcloud.com/cpm-outline.png
actionText: 快速搭建 →
actionLink: /guide/
features:
- title: 专注而明确
  details: 我们不设计同步到本地缓存的方案，我们只专注建立私有源的CRUD，兼容NPM公共包的下载。
- title: 简单接入
  details: 为企业提供简便的用户接入体系和自定义的SCOPE权限分离，让不同公司不同用户体系顺利接入。
- title: 可扩展
  details: 基于Clusic架构的Rex框架，企业可以自行开发插件接入，保证可以进行二次开发迭代。
footer: MIT Licensed | Copyright © 2018-present Evio Shen
---

## Install && Update

```bash
# clone from git
$ git clone https://github.com/cevio/cpm.git
$ cd cpm

# install dependencies
$ npm i

# install cli
$ npm i -g @clusic/cli pm2

# run by development
$ npm run dev

# run by production
$ npm run start

# restart system
$ npm run restart

# stop system
$ npm run stop

# update systemn
$ npm run update
```

::: warning
Nodejs版本条件 `>= 8.0.0`
<br />
MySQL版本条件 `>= 5.6.16`
:::