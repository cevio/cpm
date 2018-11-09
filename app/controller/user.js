const {
  Get, Put,
  Order,
  Controller,
  Middleware,
  ApplicationComponent,
} = require('@clusic/method');

@Controller('/-/user')
@Order(1)
class UserController extends ApplicationComponent {
  constructor(ctx) {
    super(ctx);
  }

  @Get('/org.couchdb.user::account')
  async ShowUser() {
    const account = this.ctx.params.account;
    const user = await this.Service.Authorization.User(account);
    const userExists = await this.Service.User.FindUserByAccount(account);
    const cache = new this.ctx.Cache.User(this.ctx.redis);
    if (!userExists) {
      await this.Service.User.Add(account, user.name, user.email, user.avatar, user.scopes, user.extra);
    } else {
      await this.Service.User.Update(userExists.id, user.name, user.email, user.avatar, user.scopes, user.extra);
    }
    await cache.build('user', { account });
    this.ctx.body = {
      _id: 'org.couchdb.user:' + account,
      name: user.account,
      email: user.email,
      type: 'user',
      avatar: user.avatar,
      scopes: user.scopes
    };
  }
  
  /**
   * @public
   * @desc 认证用户登录
   * @api {string} /-/user/org.couchdb.user:{account}
   * @param path.account {string} 账号
   * @param body.name {string} 用户名
   * @param body.password {string} 密码
   * @return { ok<boolean>, id<string>, rev<string> }
   */
  @Put('/org.couchdb.user::account')
  @Middleware('Body')
  async Login() {
    const account = this.ctx.params.account;
    const name = this.ctx.request.body.name;
    const password = this.ctx.request.body.password;

    if (!name || !password) throw this.ctx.error('paramError:params missing, name, email or password missing.', 422);

    const user = await this.Service.Authorization.Login(name, password).catch(e => Promise.reject(this.ctx.error('user is invaild or password is invaild: ' + e.message, 401)));
    const userExists = await this.Service.User.FindUserByAccount(account);
    const cache = new this.ctx.Cache.User(this.ctx.redis);

    await this.ctx.mysql.begin();
    await this.ctx.redis.begin();

    if (!userExists) {
      await this.Service.User.Add(account, user.name, user.email, user.avatar, user.scopes, user.extra);
    } else {
      await this.Service.User.Update(userExists.id, user.name, user.email, user.avatar, user.scopes, user.extra);
    }

    const base64 = Buffer.from(name + ':' + password, 'utf8').toString('base64');
    await cache.build('user', { account });
    await cache.set('/authorization/:token', { token: base64 }, account);
    await cache.expire('/authorization/:token', { token: base64 }, this.app.config.loginExpire);

    this.ctx.status = 201;
    this.ctx.body = {
      ok: true,
      id: 'org.couchdb.user:' + account,
      rev: base64
    };
  }
}

module.exports = UserController;