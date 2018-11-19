const path = require('path');
const mount = require('koa-mount');
const static = require('koa-static');
const WebResourcePath = path.resolve(__dirname, 'web');
module.exports = async app => {
  if (!app.Service.Authorization) {
    throw new Error('You should setup your own `UserService` first');
  }
  app.use(static(WebResourcePath, {
    gzip: true
  }));
  app.use(mount('/download', static(app.config.nfs)));
  app.use(async (ctx, next) => {
    ctx.onResponseError(error => {
      ctx.status = 422;
      ctx.body = {
        error: error.message
      }
    });
    console.log(ctx)
    await next();
  });
};