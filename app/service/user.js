const { ContextComponent } = require('@clusic/method');

module.exports = class UserService extends ContextComponent {
  constructor(ctx) {
    super(ctx);
    this.table = 'user';
  }

  async FindUserByAccount(account) {
    const result = await this.ctx.mysql.exec(`SELECT id FROM ?? WHERE account=?`, this.table, account);
    if (result.length) return result[0];
  }

  async Add(account, name, email, avatar, scopes, extra) {
    const options = { account, name, email, avatar };
    if (extra) options.extra = JSON.stringify(extra);
    if (!scopes) scopes = [];
    if (!Array.isArray(scopes)) scopes = [scopes];
    this.CheckScopesRule(scopes);
    options.scopes = JSON.stringify(scopes);
    options.ctime = new Date();
    options.mtime = new Date();
    return await this.ctx.mysql.insert(this.table, options);
  }

  async Update(id, name, email, avatar, scopes, extra) {
    const options = { name, email, avatar };
    if (extra) options.extra = JSON.stringify(extra);
    if (!scopes) scopes = [];
    if (!Array.isArray(scopes)) scopes = [scopes];
    this.CheckScopesRule(scopes);
    options.scopes = JSON.stringify(scopes);
    options.mtime = new Date();
    await this.ctx.mysql.update(this.table, options, 'id=?', id);
  }

  CheckScopesRule(scopes) {
    for (let i = 0; i < scopes.length; i++) {
      const scope = scopes[i];
      if (!/^\@/.test(scope)) {
        throw this.ctx.error('scope must be preficed in ' + scope, 403);
      }
    }
  }
};