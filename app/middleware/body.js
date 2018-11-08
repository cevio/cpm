const Convert = require('koa-convert');
const Body = require('koa-better-body');
module.exports = Convert(Body({
  fields: 'body',
  files: 'files'
}));