const compareVersions = require('compare-versions');
const { ContextComponent } = require('@clusic/method');

module.exports = class IndexService extends ContextComponent {
  constructor(ctx) {
    super(ctx);
    this.table = 'version';
  }

  async Create(pid, name, description, account, shasum, tarball, size, rev, info) {
    const res = await this.ctx.mysql.insert(this.table, {
      pid, name, description, account, shasum, tarball, size, rev,
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

  async Delete(pid, version) {
    return await this.ctx.mysql.delete(this.table, 'pid=? AND name=?', pid, version);
  }

  async DeleteAll(pid) {
    const names = await this.ctx.mysql.exec(`SELECT name FROM ?? WHERE pid=?`, this.table, pid);
    await this.ctx.mysql.delete(this.table, 'pid=?', pid);
    return names.map(version => version.name);
  }

  async DeleteVersion(pathname, version) {
    const packages = await this.Service.Package.Read(pathname);
    if (!packages.length) throw this.ctx.error('can not find the package of ' + pathname, 403);
    const packageId = packages[0].id;
    const res = await this.ctx.mysql.exec(`SELECT id FROM ?? WHERE pid=? AND name=?`, this.table, packageId, version);
    if (!res.length) throw this.ctx.error(`can not find version ${version} on ${pathname}`, 403);
    await this.ctx.mysql.begin();
    await this.ctx.redis.begin();
    await this.Delete(packageId, version);
    const cache = new this.ctx.Cache.Package(this.ctx.redis);
    await cache.delete('PackageVersion', { package: pathname, version });
    return await cache.build('PackageList', { package: pathname });
  }

  async Deprecate(pid, version, text) {
    return await this.ctx.mysql.update(this.table, {
      package: text
    }, 'pid=? AND name=?', pid, version);
  }
};