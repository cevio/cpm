const { resolve } = require('path')
const assert = require('assert')

module.exports = app => {
  return (root, opts) => {
    opts = Object.assign({}, opts)
    assert(root, 'root directory is required to serve files')
    opts.root = resolve(root)
    if (opts.index !== false) opts.index = opts.index || 'index.html'

    if (!opts.defer) {
      return async function serve (ctx, next) {
        let done = false

        if (ctx.method === 'HEAD' || ctx.method === 'GET') {
          try {
            done = await send(ctx, ctx.path, opts)
          } catch (err) {
            if (err.status !== 404) {
              throw err
            }
          }
        }

        if (!done) {
          await next()
        }
      }
    }
    return async (ctx, next) => {
      await next()

      if (ctx.method !== 'HEAD' && ctx.method !== 'GET') return
      // response is already handled
      if (ctx.body != null || ctx.status !== 404) return // eslint-disable-line
  
      try {
        await ctx.Service.Index.Send(ctx, ctx.path, opts)
      } catch (err) {
        if (err.status !== 404) {
          throw err
        }
      }
    }
  }
}