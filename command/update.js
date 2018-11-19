const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const unzip = require('unzip');
const request = require('request');
const progress = require('request-progress');
const randomString = require("randomstring");
const { Signale } = require('signale');
const githubZipUrl = 'https://codeload.github.com/cevio/cpm/zip/master';
const cmd = new Signale({
  interactive: true,
  scope: 'cpm'
});

const cwd = process.cwd();
const projectDir = cwd;
const filename = path.resolve(cwd, randomString.generate() + '.zip');
const dir = path.resolve(randomString.generate());

run();

async function run() {
  await download(cmd, githubZipUrl, filename);
  fs.mkdirSync(dir);
  cmd.await('unpacking zip package ...');
  await unPack(filename, dir);
  cmd.success('unpack success, next ...');
  const targetDir = selectProjectDir(dir);  
  cmd.await('Copying files...');
  fse.copySync(targetDir, projectDir);
  fse.removeSync(filename);
  fse.removeSync(dir);
  cmd.success('Update success!');
}


function download(cmd, url, filename) {
  return new Promise((resolve, reject) => {
    cmd.await('[0%] connecting ...');
    progress(request(url))
    .on('progress', function (state) {
      cmd.await(
        '[%s] [%s] [%s]',
        parseInt(state.percent * 100) + '%',
        state.size.transferred + '/' + state.size.total,
        state.time.elapsed + 's/' + state.time.remaining + 's'
      );
    })
    .on('error', reject)
    .on('end', function () {
      cmd.success('[100%] - download success.');
      resolve();
    })
    .pipe(fs.createWriteStream(filename));
  });
}

function unPack(file, dir) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(file)
    .pipe(unzip.Extract({ path: dir }))
    .on('error', reject)
    .on('close', resolve);
  })
}

function selectProjectDir(dir) {
  const dirs = fs.readdirSync(dir);
  if (dirs.length !== 1) throw new Error('Unpack package catch error');
  return path.resolve(dir, dirs[0]);
}