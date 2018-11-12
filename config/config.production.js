const path = require('path');
module.exports = {
  loginExpire: 3 * 24 * 60 * 60, // 登录有效期 秒
  officialNpmRegistry: 'https://registry.npmjs.com',
  officialNpmReplicate: 'https://replicate.npmjs.com',
  sourceNpmRegistry: 'https://registry.npm.taobao.org',
  sourceNpmWeb: 'https://npm.taobao.org',
  registryHost: 'http://npm.mzftech.cn',
  nfs: path.resolve(process.env.HOME, 'cpm', 'packages'),

  /**
   * 自动获取包顺序
   * 先从sourceNpmRegistry获取，如果没有找到就从officialNpmRegistry获取
   * 也可以自行添加源和顺序
   */
  fetchPackageRegistriesOrder: ['sourceNpmRegistry', 'officialNpmRegistry'],

  /**
   * 是否开启自动获取
   * 如果开启，必须设定 fetchPackageRegistriesOrder 顺序
   * 开启自动获取，将影响下载包的速度，同时影响服务器性能
   * 如果不开启，刚发布到npm的包是无法获取的
   */
  autoFetchPackages: false,
}