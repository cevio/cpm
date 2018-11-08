const Request = require('request');
const { ContextComponent } = require('@clusic/method');

module.exports = class PackageService extends ContextComponent {
  constructor(ctx) {
    super(ctx);
    this.table = 'package';
    this.packageNameRegExp = /^((\@([a-zA-Z0-9_\.\-]+))\/)?([a-zA-Z0-9_\.\-]+)$/;
  }

  async Get(url, name) {
    return await new Promise((resolve, reject) => {
      Request.get(url + '/' + name, (err, response, body) => {
        if (err) return reject(err);
        resolve(body);
      });
    })
  }

  async Fetch(name) {
    if (this.app.config.autoFetchPackages) {
      for (let i = 0; i < this.app.config.fetchPackageRegistriesOrder.length; i++) {
        const url = this.app.config[this.app.config.fetchPackageRegistriesOrder[i]];
        const result = JSON.parse(await this.Get(url, name));
        if (!result.error) return result;
      }
      return {"error": "Not found"};
    }
    return await this.Get(this.app.config.sourceNpmRegistry, name);
  }

  async Create(scope, name, pathname) {
    const res = await this.ctx.mysql.insert(this.table, {
      scope, name, pathname,
      ctime: new Date()
    });
    return res.insertId;
  }

  async Read(pathname) {
    return await this.ctx.mysql.exec(`SELECT id FROM ?? WHERE pathname=?`, this.table, pathname);
  }

  async Cache(pathname) {
    const UserCache = new this.ctx.Cache.User(this.ctx.redis);
    let result, $verions = {}, $vids = {}, distTags = {};
    let pkg = await this.ctx.mysql.exec(`SELECT id FROM ?? WHERE pathname=?`, this.table, pathname);
    if (!pkg.length) return;
    const tags = await this.ctx.mysql.exec(`SELECT vid, name FROM ?? WHERE pid=?`, this.Service.Tag.table, pkg[0].id);
    if (!tags.length) return;
    const versions = await this.ctx.mysql.exec('SELECT id, name, package FROM ?? WHERE pid=?', this.Service.Version.table, pkg[0].id);
    if (!versions.length) return;

    for (let i = 0; i < versions.length; i++) {
      const version = versions[i];
      if (!version.package) continue;
      version.package = JSON.parse(decodeURIComponent(version.package));
      const readme = version.package.readme;
      delete version.package.readme;
      if (version.id === tags[0].vid) {
        result = JSON.parse(JSON.stringify(version.package));
        result.readme = readme;
        result._id = result.name;
        delete result.dist;
      }
      $verions[version.name] = version.package;
      $vids[version.id] = version.name;
    }

    for (let j = 0; j < tags.length; j++) {
      const tag = tags[j];
      if (!$vids[tag.vid]) return;
      distTags[tag.name] = $vids[tag.vid];
    }

    if (!distTags.latest || !result) return;

    const maintainers = [];
    const users = await this.Service.Maintainer.Read(pkg[0].id);
    for (let i = 0; i < users.length; i++) {
      const user = users[i].account;
      const _user = await UserCache.load('user', { account: user });
      if (_user) {
        maintainers.push({
          name: user,
          email: _user.email
        });
      }
    }

    result.maintainers = maintainers;
    result.versions = $verions;
    result['dist-tags'] = distTags;
    return result;
  }
};