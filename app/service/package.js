const crypto = require('crypto');
const fs = require('mz/fs');
const path = require('path');
const mkdirp = require('mz-modules/mkdirp');
const Request = require('request');
const { ContextComponent } = require('@clusic/method');

module.exports = class PackageService extends ContextComponent {
  constructor(ctx) {
    super(ctx);
    this.table = 'package';
    this.packageNameRegExp = /^((\@([a-zA-Z0-9_\.\-]+))\/)?([a-zA-Z0-9_\.\-]+)$/;
  }

  async Get(url, name, version) {
    return await new Promise((resolve, reject) => {
      url += '/' + name;
      if (version) url += '/' + version;
      Request.get(url, (err, response, body) => {
        if (err) return reject(err);
        resolve(body);
      });
    })
  }

  async Fetch(name, version) {
    if (this.app.config.autoFetchPackages) {
      for (let i = 0; i < this.app.config.fetchPackageRegistriesOrder.length; i++) {
        const url = this.app.config[this.app.config.fetchPackageRegistriesOrder[i]];
        const result = JSON.parse(await this.Get(url, name, version));
        if (!result.error) return result;
      }
      return {"error": "Not found"};
    }
    return await this.Get(this.app.config.sourceNpmRegistry, name, version);
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

  async SingleCache(pathname, version) {
    let pkg = await this.ctx.mysql.exec(`SELECT id FROM ?? WHERE pathname=?`, this.table, pathname);
    if (!pkg.length) return;
    const versions = await this.ctx.mysql.exec('SELECT id, name, package FROM ?? WHERE pid=? AND name=?', this.Service.Version.table, pkg[0].id, version);
    if (!versions.length) return;
    return JSON.parse(decodeURIComponent(versions[0].package));
  }

  async ListCache(pathname) {
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

  async ListPackages(pathname) {
    const cache = new this.ctx.Cache.Package(this.ctx.redis);
    const privatePackage = await cache.load('PackageList', { package: pathname });
    if (privatePackage) return privatePackage;
    return await this.Fetch(pathname);
  }

  async VersionPackage(pathname, version) {
    const cache = new this.ctx.Cache.Package(this.ctx.redis);
    const privatePackage = await cache.load('PackageVersion', { package: pathname, version });
    if (privatePackage) return privatePackage;
    return await this.Fetch(pathname, version);
  }

  async Publish(pkg, username) {
    const name = pkg.name;
    const filename = Object.keys(pkg._attachments || {})[0];
    const version = Object.keys(pkg.versions || {})[0];
    const distTags = pkg['dist-tags'] || {};
    const tarballPath = path.resolve(this.app.config.nfs, filename);
    
    if (!filename) throw this.ctx.error('attachment_error: package._attachments is empty', 400);
    if (!version) throw this.ctx.error('version_error:package.versions is empty', 400);
    if (pkg.maintainers.map(maintainer => maintainer.name).indexOf(username) === -1) {
      throw this.ctx.error('you are not in maintainers list', 403);
    }

    if (!Object.keys(distTags).length) throw this.ctx.error('invalid: dist-tags should not be empty', 400);


    if (!this.packageNameRegExp.test(name)) throw this.ctx.error('invalid: wrong package name: ' + name, 403);
    const exec = this.packageNameRegExp.exec(name);
    const scope = exec[2];
    const alias = exec[4];
    if (!scope) throw this.ctx.error('forbidden: you can publish package only by scopes', 403);

    const userCache = new this.ctx.Cache.User(this.ctx.redis);
    const user = await userCache.load('user', { account: username });
    if (!user) throw this.ctx.error('forbidden: you are not a normalize user in registry', 403);
    const dbScopes = JSON.parse(user.scopes);
    if (dbScopes.indexOf(scope) === -1) throw this.ctx.error('forbidden: you can not publish package on ' + scope, 403);

    const attachment = pkg._attachments[filename];
    const tarballBuffer = Buffer.from(attachment.data, 'base64');
    if (tarballBuffer.length !== attachment.length) {
      throw this.ctx.error(`size_wrong: Attachment size ${attachment.length} not match download size ${tarballBuffer.length}`, 400);
    }

    let shasum = crypto.createHash('sha1');
    shasum.update(tarballBuffer);
    shasum = shasum.digest('hex');

    if (pkg.versions[version].dist) {
      pkg.versions[version].dist.tarball = this.app.config.registryHost + '/download/' + filename;
      if (pkg.versions[version].dist.shasum !== shasum) {
        throw this.ctx.error(`shasum_wrong: Attachment shasum ${shasum} not match download size ${pkg.versions[version].dist.shasum}`, 400);
      }
    }

    await this.ctx.mysql.begin();
    await this.ctx.redis.begin();

    let packageId, firstTime = false;
    const packages = await this.Service.Package.Read(name);
    if (!packages.length) {
      packageId = await this.Service.Package.Create(scope, alias, name);
      firstTime = true;
    } else {
      packageId = packages[0].id;
    }

    const Maintainer = await this.Service.Maintainer.Read(packageId);

    if (!firstTime) {
      if (Maintainer.map(maintainer => maintainer.account).indexOf(username) === -1) {
        throw this.ctx.error('you have no right to publish package with ' + name, 403);
      }
    } else {
      await this.Service.Maintainer.Create(username, packageId);
    }
    
    if (!(await this.Service.Version.Check(packageId, version))) throw this.ctx.error('forbidden: cannot publish pre-existing version: ' + version, 403);
    if (pkg.versions[version].dist) {
      pkg.versions[version].dist.size = attachment.length;
    }
    const vid = await this.Service.Version.Create(
      packageId, version, pkg.description, username, shasum, filename, attachment.length, 
      encodeURIComponent(JSON.stringify(pkg.versions[version]))
    );
    const tags = [];
    for (var t in distTags) tags.push([t, vid]);
    if (!distTags.latest) {
      const latest = await this.Service.Tag.GetByPidAndName(packageId, 'latest');
      if (!latest.length) {
        tags.push(['latest', vid]);
      }
    }

    for (let i = 0; i < tags.length; i++) {
      await this.Service.Tag.Add(tags[i][0], packageId, tags[i][1]);
    }

    await mkdirp(path.dirname(tarballPath));
    await fs.writeFile(tarballPath, tarballBuffer);
    this.ctx.onErrorCatch(async () => await fs.unlink(tarballPath));
    const cache = new this.ctx.Cache.Package(this.ctx.redis);
    await cache.build('PackageVersion', { package: name, version });
    return await cache.build('PackageList', { package: name });
  }

  async UpdatePackage(pkg) {
    const pathname = pkg._id;
    const maintainers = pkg.maintainers;
    const versions = pkg.versions;
    const cache = new this.ctx.Cache.Package(this.ctx.redis);
    const packages = await this.Service.Package.Read(pathname);
    if (!packages.length) throw this.ctx.error('can not find package width ' + pathname, 403);
    const packageId = packages[0].id;
    await this.ctx.mysql.begin();
    await this.ctx.redis.begin();
    if (versions) {
      // 处理版本
    }
    if (maintainers) {
      const _maintainers = await this.Service.Maintainer.Read(packageId);
      if (_maintainers.map(user => user.account).indexOf(this.ctx.account) === -1) throw this.ctx.error('you are not in maintainers list, you are not the member of ' + pathname, 403);
      await this.Service.Maintainer.Update(packageId, maintainers);
    }
    await cache.build('PackageList', { package: pathname });
  }
};