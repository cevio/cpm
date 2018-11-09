const mount = require('koa-mount');
module.exports = async app => {
  app.use(mount('/download', app.Middleware.Static(app.config.nfs)));
  app.use(async (ctx, next) => {
    ctx.onResponseError(error => {
      ctx.status = 422;
      ctx.body = {
        error: error.message
      }
    });
    await next();
  });
};