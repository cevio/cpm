---
sidebarDepth: 4
---
# 搭建

CPM搭建的前提条件是：

- Nodejs >= 8.0.0
- MySQL >= 5.6.16
- Redis 无限制

请先搭建好以上的环境。

## 下载

我们需要从[Github](https://github.com/cevio/cpm)下载我们的程序。

```bash
$ git clone https://github.com/cevio/cpm.git
```

请下载稳定的master分支，其他分支仅开发使用，不建议下载。下载完毕后打开 `database.sql` 文件，创建mysql数据库。

## 依赖

安装必要的依赖，以便我们可以验证程序是否可以启动。

```bash
$ npm i -g @clusic/cli pm2
$ cd cpm
$ npm i
```

`@clusic/cli` 是clusic架构的开发工具。

## 开发调试

```bash
$ npm run dev
```

安装完毕依赖，我们即可以启动程序。但是你会发现报错，因为我们没有指定用户验证体系。

```bash
Error: You should setup your own `UserService` first
    at module.exports (/Users/shenyunjie/code/mzftech/cpm/app.bootstrap.js:7:11)
    at WorkerService.createService (/Users/shenyunjie/code/mzftech/cpm/node_modules/@clusic/rex/lib/app.js:106:15)
    at process._tickCallback (internal/process/next_tick.js:68:7)
    at Function.Module.runMain (internal/modules/cjs/loader.js:744:11)
    at startup (internal/bootstrap/node.js:285:19)
    at bootstrapNodeJSCore (internal/bootstrap/node.js:739:3)
```

请不要紧张，这是非常正常的。

## 修改配置

配置有两个地方需要修改:

- **config/config.{env}.js** `{env}`表示你的环境变量，一般开发是 `config.development.js`，生产环境是 `config.production.js`。你可以自由修改参数配置。注意`registryHost`属性必须修改为你自己的`http://127.0.0.1:7002`，否则下载包会报错，如果上线后，请直接修改为你的域名，比如`http://npm.example.com`。
- **config/plugin.{env}.js** `{env}`同上。一般是用来配置插件的数据，这里我们需要根据环境不通来修改`mysql`和`redis`的数据配置。注意，redis如果需要支持集群模式，请将redis的配置下面的`options`编程一个等价数据结构的数组即可。

完成上面修改后，我们仅需要支持下用户即可。

## 用户体系

用户体系分两个函数需要实现：

- `Login()` 登入验证函数
- `User()` 用户查询函数

我们需要运行命令：

```bash
$ clusic add authorization --service
```

程序的`app/service/`下面会自动创建一个文件叫`authorization.js`，这个文件就是我们的用户体系文件。

为了测试启动，我们可以直接复制下面代码来快速创建用户体系函数：

```javascript
const { ContextComponent } = require('@clusic/method');
module.exports = class AuthorizationService extends ContextComponent {
  constructor(ctx) {
    super(ctx);
  }

  async Login(account, password) {
    return {
      account: account,
      name: account,
      email: account + '@cpm.com',
      avatar: 'https://i.loli.net/2017/08/21/599a521472424.jpg',
      scopes: ['@' + account, '@html5', '@node'],
      extra: {}
    }
  }

  async User(account) {
    return {
      account: account,
      name: account,
      email: account + '@cpm.com',
      avatar: 'https://i.loli.net/2017/08/21/599a521472424.jpg',
      scopes: ['@' + account, '@html5', '@node'],
      extra: {}
    }
  }
};
```

保存后，你可以在项目根目录下通过以下命令启动查看：

```bash
$ npm run dev
```

打开`http://127.0.0.1:7002`即可看到我们的页面。恭喜你，那么你可以使用CPM了。

## 命令支持

CPM支持以下的命令组合：

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

对于内部私有包而言，这些命令已经足够使用，如果需要扩展，可以自行扩展，或者在 [Github](https://github.com/cevio/cpm/issues) 上提Issue给我，我酌情考虑添加升级。

## 简化命令

在每个命令后面写上 --registry=http://npm.test.cn 比较繁琐，那么我们可以自己生成一个命令叫cpm简化它。你可以通过 [yeoman](http://yeoman.io/) 开始创建你们的CPM命令：

```javascript
const childProcess = require('child_process');
const argv = process.argv.slice(2);
argv.push('--registry=http://npm.test.cn');
childProcess.spawn('npm', argv, { stdio: 'inherit' });
```

请修改上面的`http://npm.test.cn`为你自己的服务地址。

原理是在我们通过`cpm` 命令代替 `npm` 命令的时候，在命令的最末尾加上一个 `--registry=http://npm.test.cn` 指向我们的 Registry。

我们完全可以用`cpm`代替掉`npm`了。比如

```bash
$ cpm login
$ cpm install vue
$ cpm publish
```

其他简化命令的方法有很多，你可以下载`npm install nrm -g`等来切换。

## 深入用户体系

上面有一串测试用的代码，我们来剖析下。不论是`Login`还是`User`函数都返回如下的数据结构：

- account `string` 用户账号，唯一性的。
- name `string` 用户姓名
- email `string` 用户邮箱
- avatar `string` 用户头像
- scopes `array` 用户私有域数组

至于 `extra` 是额外参数，可以随意传，作用在web界面上。而`scope`，你可以通过自己的逻辑代码给不同用户提供可以上传的`scopes`作用域。

:::warning
scopes作用域作用结果都是在用户执行`cpm login`后生效。如果你改动过代码，需要用户重新登录生效。
:::

## 上线

上线生成环境需要将`production`配置完整才能上线，上到服务器后运行命令：

```bash
$ npm run start
```

## 更新

考虑到一般企业拥有自己的gitlab，当然会clone一份到自己的仓库，所以请在clone后执行`rm -rf .git`，清除源仓库的引用。你可以提交本程序到你自己的仓库。更新的时候只需要运行

```bash
npm run update
```

执行完毕这个命令，我们会从github上将master分支的代码通过zip包模式下载，覆盖到本地，当然这是全量覆盖的。由于您的git仓库的存在，所以可以对比出修改了哪些文件，你可以revert或者自己处理非app/下的文件内容，一般都是配置。然后修改提交上线即可。

如果是在线上，当然是`git pull`拉去你已经本地更新好的文件，然后通过命令：

```bash
$ npm run restart
```

## 感谢

感谢大家使用CPM，如有疑问请提交issue，我会帮忙解答。