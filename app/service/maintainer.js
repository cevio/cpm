const intersect = require('@evio/intersect');
const { ContextComponent } = require('@clusic/method');

module.exports = class MaintainerService extends ContextComponent {
  constructor(ctx) {
    super(ctx);
    this.table = 'maintainer'
  }

  async Create(account, pid) {
    const res = await this.ctx.mysql.insert(this.table, {
      account, pid,
      ctime: new Date()
    });
    return res.insertId;
  }

  async Read(pid) {
    return await this.ctx.mysql.exec(`SELECT account FROM ?? WHERE pid=?`, this.table, pid);
  }

  async Delete(pid, account) {
    return await this.ctx.mysql.delete(this.table, 'pid=? AND account=?', pid, account);
  }

  async Update(pid, maintainers) {
    const oldMaintainers = (await this.Read(pid)).map(user => user.account);
    const res = intersect(oldMaintainers, maintainers.map(user => user.name));
    if (res.adds.length) {
      for (let i = 0; i < res.adds.length; i++) {
        await this.Create(res.adds[i], pid);
      }
    }
    if (res.removes.length) {
      for (let j = 0; j < res.removes.length; j++) {
        if (res.removes[j] === this.ctx.account) {
          throw this.ctx.error('you are one of the maintainers, you can not delete yourself', 400);
        } else {
          await this.Delete(pid, res.removes[j]);
        }
      }
    }
  }
};