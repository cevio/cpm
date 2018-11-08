const { ContextComponent } = require('@clusic/method');

module.exports = class IndexService extends ContextComponent {
  constructor(ctx) {
    super(ctx);
    this.table = 'tag';
  }

  async Create(name, pid, vid) {
    const res = await this.ctx.mysql.insert(this.table, {
      name, vid, pid,
      ctime: new Date(),
      mtime: new Date()
    });
    return res.insertId;
  }

  async Update(id, vid) {
    return await this.ctx.mysql.update(this.table, {
      vid,
      mtime: new Date()
    }, 'id=?', id);
  }

  async GetByPidAndName(pid, name) {
    return await this.ctx.mysql.exec(`SELECT id from ?? WHERE pid=? AND name=?`, this.table, pid, name);
  }

  async Add(name, pid, vid) {
    const res = await this.GetByPidAndName(pid, name);
    if (res.length) return await this.Update(res[0].id, vid);
    return await this.Create(name, pid, vid);
  }
};