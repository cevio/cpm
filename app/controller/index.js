const {
  Get, Put, Delete,
  Order,
  Controller,
  Middleware,
  ApplicationComponent,
} = require('@clusic/method');
const crypto = require('crypto');
const fs = require('mz/fs');
const path = require('path');
const mkdirp = require('mz-modules/mkdirp');

@Controller('/')
@Order(2)
class IndexController extends ApplicationComponent {
  constructor(ctx) {
    super(ctx);
  }
  
  @Get('(/)?')
  async welcome() {
    this.ctx.body = 'Welcome to use Rex';
  }

  @Put(':package/-rev/:rev')
  @Middleware('Login')
  @Middleware('Body')
  async updatePackage() {
    const pkg = this.ctx.request.body;
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

    }
    if (maintainers) {
      const _maintainers = await this.Service.Maintainer.Read(packageId);
      if (_maintainers.map(user => user.account).indexOf(this.ctx.account) === -1) throw this.ctx.error('you are not in maintainers list, you are not the member of ' + pathname, 403);
      await this.Service.Maintainer.Update(packageId, maintainers);
    }
    await cache.build('packagedata', { package: pathname });
    this.ctx.body = {
      ok: true
    }
  }

  @Get(':package(.*)')
  async package() {
    const cache = new this.ctx.Cache.Package(this.ctx.redis);
    const pathname = this.ctx.params.package;
    const privatePackage = await cache.load('packagedata', { package: pathname });
    this.ctx.type = 'application/json; charset=utf-8';
    if (privatePackage) {
      this.ctx.body = privatePackage;
    } else {
      this.ctx.body = await this.Service.Package.Fetch(pathname);
    }
  }

  @Put(':package(.*)')
  @Middleware('Login')
  @Middleware('Body')
  async Publish() {
    const pkg = this.ctx.request.body;
    const username = this.ctx.account;
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


    if (!this.Service.Package.packageNameRegExp.test(name)) throw this.ctx.error('invalid: wrong package name: ' + name, 403);
    const exec = this.Service.Package.packageNameRegExp.exec(name);
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
    this.ctx.onErrorCatch(() => fs.unlink(tarballPath));
    const cache = new this.ctx.Cache.Package(this.ctx.redis);
    await cache.build('packagedata', { package: name });
    this.ctx.status = 200;
    this.ctx.body = {
      ok: true,
      dist: pkg.versions[version].dist.tarball
    }
  }
}

module.exports = IndexController;