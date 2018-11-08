const CommonCacheClassicModule = require('@clusic/cache');
const { Expression } = require('@clusic/cache/help');

module.exports = class UserCache extends CommonCacheClassicModule {
  constructor(...args) {
    super(...args);
  }

  @Expression('/user/:account')
  async user(args) {
    const result = await this.ctx.mysql.exec(`SELECT * FROM user WHERE account=?`, args.account);
    if (result.length) {
      const user = result[0];
      if (user.extra) {
        user.extra = JSON.parse(user.extra);
      }
      return user;
    }
  }
};