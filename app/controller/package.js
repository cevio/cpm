const {
  Get, Post, Put, Delete,
  Controller,
  Middleware,
  ApplicationComponent,
} = require('@clusic/method');

@Controller('/-/package')
class PackageController extends ApplicationComponent {
  constructor(ctx) {
    super(ctx);
  }
  
  @Post('/:package/access')
  @Middleware('Login')
  @Middleware('Body')
  async Access() {
    const pkg = await this.Service.Package.Read(this.ctx.params.package);
    if (!pkg.length) throw this.ctx.error('No cpm packages like ' + this.ctx.params.package, 423);
    if (this.ctx.request.body.access !== 'public') {
      return this.ctx.body = {
        ok: false,
        message: 'only public setted'
      }
    }
    this.ctx.body = {
      ok: true
    }
  }

  @Get('/:package/collaborators')
  @Middleware('Login')
  async Collaborator() {
    const _res = await this.Service.Package.ListPackages(this.ctx.params.package);
    const res = typeof _res === 'string' ? JSON.parse(_res) : _res;
    const result = {};
    res.maintainers.forEach(user => result[user.name] = 'read-write');
    this.ctx.body = result;
  }

  @Get('/:package/dist-tags')
  async DistTags() {
    const _res = await this.Service.Package.ListPackages(this.ctx.params.package);
    const res = typeof _res === 'string' ? JSON.parse(_res) : _res;
    this.ctx.body = res['dist-tags'];
  }

  @Put('/:package/dist-tags/:tag?')
  @Middleware('Login')
  @Middleware('Body')
  async PutDistTag() {
    const pathname = this.ctx.params.package;
    const tag = this.ctx.params.tag || 'latest';
    const version = this.ctx.request.body;
    const cache = new this.ctx.Cache.Package(this.ctx.redis);
    const _res = await this.Service.Package.ListPackages(this.ctx.params.package);
    const res = typeof _res === 'string' ? JSON.parse(_res) : _res;
    if (res.maintainers.map(m => m.name).indexOf(this.ctx.account) === -1) throw this.ctx.error('You have no rights.');
    if (!res.versions[version]) throw this.ctx.error('can not find the version ' + version);
    const packageResult = await this.Service.Package.Read(pathname);
    if (!packageResult.length) throw this.ctx.error('can not find the package of ' + pathname);
    const packageId = packageResult[0].id;
    const versions = await this.Service.Version.Read(packageId, version);
    if (!versions.length) throw this.ctx.error('can not find the version ' + version);
    const vid = versions[0].id;
    await this.Service.Tag.Add(tag, packageId, vid);
    this.ctx.body = await cache.build('PackageList', { package: pathname });
  }

  @Delete('/:package/dist-tags/:tag?')
  @Middleware('Login')
  async DeleteDistTag() {
    const pathname = this.ctx.params.package;
    const tag = this.ctx.params.tag || 'latest';
    const cache = new this.ctx.Cache.Package(this.ctx.redis);
    const _res = await this.Service.Package.ListPackages(this.ctx.params.package);
    const res = typeof _res === 'string' ? JSON.parse(_res) : _res;
    if (res.maintainers.map(m => m.name).indexOf(this.ctx.account) === -1) throw this.ctx.error('You have no rights.');
    if (tag === 'latest') throw this.ctx.error('can no delete tag of latest');
    const packageResult = await this.Service.Package.Read(pathname);
    if (!packageResult.length) throw this.ctx.error('can not find the package of ' + pathname);
    const packageId = packageResult[0].id;
    await this.Service.Tag.Delete(packageId, tag);
    this.ctx.body = await cache.build('PackageList', { package: pathname });
  }
}

module.exports = PackageController;