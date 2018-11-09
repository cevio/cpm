# China Package Manager

简称 CPM

## WHat is CPM?

CPM 是一套轻量且基础功能完善的私有Node包管理源。它是基于 [clusic](https://github.com/clusic) 的 [rex](https://github.com/clusic/rex) 架构开发，拥有进程负载均衡的特点。它主要提供一整套简易安装模式，用户只需要clone此项目到本地，修改config文件夹下的文件即可运行。它的数据源基于mysql数据库和redis缓存（支持redis集群）,能够有效提高NPM包的下载速度。它还拥有自定义用户系统接入的功能，让企业可以自主接入自己的用户体系，同时可以根据用户的scopes来确定用户提交私有包的权限。

## Dependencies

- node >= 8.0.0
- Databases:
  - [mysql](https://dev.mysql.com/downloads/): >= 5.6.16
  - redis

## Usage

```bash
# clone from git
$ git clone https://github.com/cevio/cpm.git
$ cd cpm

# install dependencies
$ npm i

# install cli
$ npm i -g @clusic/cli pm2

# development
$ npm run dev

# production
$ npm run start

# restart
$ npm run restart

# stop
$ npm run stop
```

## Config

配置有两个地方需要修改

**config/config.{env}.js**

`{env}`表示你的环境变量，一般开发是 `config.development.js`，生产环境是`config.production.js`。你可以自由修改参数配置。

**config/plugin.{env}.js**

`{env}`同上。一般是用来配置插件的数据，这里我们需要根据环境不通来修改mysql和redis的数据配置。

完成这2步，恭喜你，那么你可以使用CPM来。

## Command support

假设我们的服务域名是 http://npm.test.cn

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
```

当然在每个命令后面写上 `--registry=http://npm.test.cn` 比较繁琐，那么我们可以自己生成一个命令叫cpm简化它。

```javascript
#!/usr/bin/env node

const childProcess = require('child_process');
const argv = process.argv.slice(2);
argv.push('--registry=http://npm.test.cn');
childProcess.spawn('npm', argv, { stdio: 'inherit' });
```

> 虽然没有支持全部命令，但是对于我们的使用已经完全足够。在接下来的计划众，我们将尽可能支持更多的命令。

## Create Your Authorization

你可以建立一个`/app/service/authorization.js`的文件，按照service模块的写法编写，也可以这样：

```bash
clusic add authorization --service
```

此文件作用就是自定义用户认证体系，有2个函数需要实现：`async Login() {}` 与 `async User() {}`

我们来看个例子：

```javascript
const axios = require('axios');
const { ContextComponent } = require('@clusic/method');
const ajax = axios.create({
  baseURL: 'http://auth.mzftech.cn/cnpm'
});

ajax.interceptors.response.use(response => response.data, error => {
  const response = error.response;
  if (response && response.data) return Promise.reject(makeErrorWithCode(response.data, response.status));
  return Promise.reject(error);
})

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
      extra: {
        department: user.department,
        position: user.position,
        mobile: user.mobile,
        gender: user.gender,
        isleader: user.isleader,
        english_name: user.english_name,
        telephone: user.telephone,
        qr_code: user.qr_code,
        alias: user.alias
      }
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
      extra: {
        department: user.department,
        position: user.position,
        mobile: user.mobile,
        gender: user.gender,
        isleader: user.isleader,
        english_name: user.english_name,
        telephone: user.telephone,
        qr_code: user.qr_code,
        alias: user.alias
      }
    }
  }
};

function makeErrorWithCode(str, code = 500) {
  const err = new Error(str);
  if (code < 100) code = 900 + code;
  if (code > 699) code = 500;
  err.status = code;
  return err;
}
```

两个函数必须返回的参数有：

- account `string` 用户账号，唯一性的。
- name `string` 用户姓名
- email `string` 用户邮箱
- avatar `string` 用户头像
- scopes `array` 用户私有域数组

至于 `extra` 是额外参数，可以随意传，作用在web界面上。

## How to contribute

- Clone the project
- Checkout a new branch
- Add new features or fix bugs in the new branch
- Make a pull request and we will review it ASAP