const {
  Get, Post,
  Order,
  Controller,
  Middleware,
  ApplicationComponent,
} = require('@clusic/method');
const uniq = require('array-uniq');

@Controller('/-/web')
@Order(2)
class WebController extends ApplicationComponent {
  constructor(ctx) {
    super(ctx);
  }
  
  @Get('/search/native')
  async SearchByKeyword() {
    const keyword = this.ctx.query.keyword;
    if (!keyword) return this.ctx.body = [];
    const pathnames = await this.Service.Package.Search(keyword, 1, 5);
    const cache = new this.ctx.Cache.Package(this.ctx.redis);
    this.ctx.body = await Promise.all(pathnames.map(data => {
      return cache.load('PackageList', { package: data.pathname }).then(field => {
        return {
          id: data.id,
          name: field.name,
          description: field.description,
          version: field.version
        }
      })
    }));
  }

  @Get('/search')
  async Search() {
    const keyword = this.ctx.query.keyword;
    const page = Number(this.ctx.query.page || 1);
    const size = Number(this.ctx.query.size || 10);
    const pathnames = await this.Service.Package.Search(keyword, page, size);
    const count = await this.Service.Package.SearchCount(keyword);
    const cache = new this.ctx.Cache.Package(this.ctx.redis);
    const userCache = new this.ctx.Cache.User(this.ctx.redis);
    let result = await Promise.all(pathnames.map(data => cache.load('PackageList', { package: data.pathname })));
    let maintainers = [];
    result.forEach(res => maintainers.push(...res.maintainers.map(m => m.name)));
    maintainers = uniq(maintainers);
    const user = await userCache.load('user', maintainers.map(m => {
      return {
        account: m
      }
    }));
    const userList = {}
    user.forEach(u => {
      userList[u.account] = {
        name: u.name,
        avatar: u.avatar,
        email: u.email
      }
    });
    result = result.map(res => {
      return {
        name: res.name,
        description: res.description,
        mtime: res.time[res['dist-tags'].latest],
        maintainers: res.maintainers.map(m => userList[m.name]),
        version: res['dist-tags'].latest
      }
    });
    this.ctx.body = { count, list: result };
  }

  @Get('/user/:account')
  async GetUserAndPackages() {
    const account = this.ctx.params.account;
    const userCache = new this.ctx.Cache.User(this.ctx.redis);
    const user = await userCache.load('user', {
      account
    });
    if (!user) return this.ctx.body = {
      error: 'can not find the user of ' + account
    }
    const packages = await this.Service.Package.GetPackageByUser(account);
    const cache = new this.ctx.Cache.Package(this.ctx.redis);
    const result = await Promise.all(packages.map(pathname => cache.load('PackageList', { package: pathname })));
    this.ctx.body = {
      user,
      packages: result.map(res => {
        return {
          name: res.name,
          description: res.description,
          mtime: res.time[res['dist-tags'].latest]
        }
      })
    }
  }

  @Post('/users')
  @Middleware('Body')
  async GetUsers() {
    const uids = uniq(this.ctx.request.body);
    if (!uids.length) return this.ctx.body = {};
    const userCache = new this.ctx.Cache.User(this.ctx.redis);
    const result = {};
    const _user = await userCache.load('user', uids.map(uid => {
      return {
        account: uid
      }
    }));
    _user.filter(res => !!res).forEach(user => {
      result[user.account] = {
        name: user.name,
        avatar: user.avatar,
        email: user.email
      }
    });
    this.ctx.body = result;
  }
}

module.exports = WebController;