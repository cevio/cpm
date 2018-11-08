const CommonCacheClassicModule = require('@clusic/cache');
const { Expression } = require('@clusic/cache/help');

module.exports = class PackageCache extends CommonCacheClassicModule {
  constructor(...args) {
    super(...args);
  }

  @Expression('/package/:package(.*)')
  async packagedata(args) {
    return await this.ctx.Service.Package.Cache(args.package);
  }
};