module.exports = async (ctx, next) => {
  const error = ctx.error('Unauthorized, please login first.', 401);
  const header = ctx.request.header;
  const authorization = header.authorization;
  if (!authorization) throw error;
  const codes = authorization.split(' ');
  if (codes.length !== 2) throw error;
  const code = codes[1];
  const cache = new ctx.Cache.User(ctx.redis);
  const account = await cache.get('/authorization/:token', { token: code });
  if (!account) throw error;
  ctx.account = account;
  await next();
};