const compareVersions = require('compare-versions');
const { ContextComponent } = require('@clusic/method');

module.exports = class IndexService extends ContextComponent {
  constructor(ctx) {
    super(ctx);
    this.table = 'version';
  }

  async Create(pid, name, description, account, shasum, tarball, size, info) {
    const res = await this.ctx.mysql.insert(this.table, {
      pid, name, description, account, shasum, tarball, size,
      package: info,
      ctime: new Date()
    });
    return res.insertId;
  }

  async Check(pid, version) {
    const result = await this.ctx.mysql.exec(`SELECT name FROM ?? WHERE pid=?`, this.table, pid);
    if (!result.length) return true;
    const versions = result.map(res => res.name).sort(compareVersions);
    const maxVersion = versions[versions.length - 1];
    return compareVersions(version, maxVersion) === 1;
  }
};