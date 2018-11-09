const CommonCacheClassicModule = require('@clusic/cache');
const { Expression } = require('@clusic/cache/help');

module.exports = class PackageCache extends CommonCacheClassicModule {
  constructor(...args) {
    super(...args);
  }

  @Expression('/packages/:package')
  async PackageList(args) {
    return await this.ctx.Service.Package.ListCache(args.package);
  }

  @Expression('/package/:package/:version')
  async PackageVersion(args) {
    return await this.ctx.Service.Package.SingleCache(args.package, args.version);
  }
};