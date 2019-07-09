# 新版本已出，建议前往[NILPPM](https://github.com/nilppm/npm)下载最新版本。此CPM不再维护。

# China Package Manager

![CPM](https://syj-1256052570.cos.ap-shanghai.myqcloud.com/cpm.png)

## WHat is CPM?

CPM 是一套轻量且基础功能完善的私有Node包管理源。它是基于 [clusic](https://github.com/clusic) 的 [rex](https://github.com/clusic/rex) 架构开发，拥有进程负载均衡的特点。它主要提供一整套简易安装模式，用户只需要clone此项目到本地，修改config文件夹下的文件即可运行。它的数据源基于mysql数据库和redis缓存（支持redis集群）,能够有效提高NPM包的下载速度。它还拥有自定义用户系统接入的功能，让企业可以自主接入自己的用户体系，同时可以根据用户的scopes来确定用户提交私有包的权限。

更多查看 [文档](https://cevio.github.io/cpm/)

## Command support

```bash
$ npm login --registry=http://npm.test.cn
$ npm logout --registry=http://npm.test.cn
$ npm install (with no args, in package dir) --registry=http://npm.test.cn
$ npm install [<@scope>/]<name> --registry=http://npm.test.cn
$ npm install [<@scope>/]<name>@<tag> --registry=http://npm.test.cn
$ npm install [<@scope>/]<name>@<version> --registry=http://npm.test.cn
$ npm install [<@scope>/]<name>@<version range> --registry=http://npm.test.cn
$ npm install <git-host>:<git-user>/<repo-name> --registry=http://npm.test.cn
$ npm install <git repo url> --registry=http://npm.test.cn
$ npm install <tarball file> --registry=http://npm.test.cn
$ npm install <tarball url> --registry=http://npm.test.cn
$ npm install <folder> --registry=http://npm.test.cn
$ npm update [-g] [<pkg>...] --registry=http://npm.test.cn
$ npm uninstall [<@scope>/]<pkg>[@<version>]... [-S|--save|-D|--save-dev|-O|--save-optional|--no-save] --registry=http://npm.test.cn
$ npm publish [<tarball>|<folder>] [--tag <tag>] [--otp otpcode] [--dry-run] --registry=http://npm.test.cn
$ npm unpublish [<@scope>/]<pkg>[@<version>] --registry=http://npm.test.cn
$ npm whoami [--registry <registry>] --registry=http://npm.test.cn
$ npm owner add <user> [<@scope>/]<pkg> --registry=http://npm.test.cn
$ npm owner rm <user> [<@scope>/]<pkg> --registry=http://npm.test.cn
$ npm owner ls [<@scope>/]<pkg> --registry=http://npm.test.cn
$ npm deprecate <pkg>[@<version>] <message> --registry=http://npm.test.cn
$ npm view [<@scope>/]<name>[@<version>] --registry=http://npm.test.cn
$ npm dist-tag add <pkg>@<version> [<tag>] --registry=http://npm.test.cn
$ npm dist-tag rm <pkg> <tag> --registry=http://npm.test.cn
$ npm dist-tag ls [<pkg>] --registry=http://npm.test.cn
$ npm access public [<package>] --registry=http://npm.test.cn
$ npm access restricted [<package>] --registry=http://npm.test.cn
```

## Create Your Authorization

你可以建立一个`/app/service/authorization.js`的文件，按照service模块的写法编写，也可以这样：

```bash
clusic add authorization --service
```

我们来看个例子：

```javascript
module.exports = class AuthorizationService extends ContextComponent {
  constructor(ctx) {
    super(ctx);
  }

  async Login(account, password) {
    const user = await ajax.post('/employee/check-password', { account, password });
    return {
      account: user.account,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      scopes: ['@' + account, '@html5', '@node'],
      extra: {}
    }
  }

  async User(account) {
    const user = await ajax.get('/employee/' + account);
    return {
      account: user.account,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      scopes: ['@' + account, '@html5', '@node'],
      extra: {}
    }
  }
};
```

两个函数必须返回的参数有：

- account `string` 用户账号，唯一性的。
- name `string` 用户姓名
- email `string` 用户邮箱
- avatar `string` 用户头像
- scopes `array` 用户私有域数组

至于 `extra` 是额外参数，可以随意传，作用在web界面上。

## License

[MIT](https://opensource.org/licenses/MIT)

Copyright (c) 2018-present, evio shen.
