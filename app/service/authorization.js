const axios = require('axios');
const { ContextComponent } = require('@clusic/method');
const ajax = axios.create({
  baseURL: 'http://auth.mzftech.cn/cnpm'
});

ajax.interceptors.response.use(response => response.data, error => {
  const response = error.response;
  if (response && response.data) return Promise.reject(makeErrorWithCode(response.data, response.status));
  return Promise.reject(error);
})

module.exports = class AuthorizationService extends ContextComponent {
  constructor(ctx) {
    super(ctx);
  }

  async Login(account, password) {
    const user = await ajax.post('/employee/check-password', { account, password });
    return {
      account: user.account,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      scopes: ['@' + account, '@html5', '@node'],
      extra: {
        department: user.department,
        position: user.position,
        mobile: user.mobile,
        gender: user.gender,
        isleader: user.isleader,
        english_name: user.english_name,
        telephone: user.telephone,
        qr_code: user.qr_code,
        alias: user.alias
      }
    }
  }

  async User(account) {
    const user = await ajax.get('/employee/' + account);
    return {
      account: user.account,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      scopes: ['@' + account, '@html5', '@node'],
      extra: {
        department: user.department,
        position: user.position,
        mobile: user.mobile,
        gender: user.gender,
        isleader: user.isleader,
        english_name: user.english_name,
        telephone: user.telephone,
        qr_code: user.qr_code,
        alias: user.alias
      }
    }
  }
};

function makeErrorWithCode(str, code = 500) {
  const err = new Error(str);
  if (code < 100) code = 900 + code;
  if (code > 699) code = 500;
  err.status = code;
  return err;
}
