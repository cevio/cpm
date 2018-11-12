const fs = require('mz/fs');
const { ContextComponent } = require('@clusic/method');

const {
  normalize,
  basename,
  extname,
  resolve,
  parse,
  sep
} = require('path');

module.exports = class IndexService extends ContextComponent {
  constructor(ctx) {
    super(ctx);
  }

  async Total() {
    const packages = await this.ctx.mysql.exec('SELECT COUNT(id) AS count FROM ??', this.Service.Package.table);
    const users = await this.ctx.mysql.exec('SELECT COUNT(id) AS count FROM ??', this.Service.User.table);
    const versions = await this.ctx.mysql.exec('SELECT COUNT(id) AS count FROM ??', this.Service.Version.table);
    const nfs = await fs.stat(this.app.config.nfs);
    return {
      db_name: 'Registry',
      data_size: nfs.size,
      total: {
        package: packages[0].count,
        user: users[0].count,
        version: versions[0].count
      }
    }
  }
};