// 分层护栏：node scripts/check-layers.js
//
// 为什么需要它：config 重构把「环境变量只有一个出口」与「依赖只能向下」定成了规则，而规则没有护栏
// 就会在几次迭代后悄悄失效（utils/ 就是这么变成杂物抽屉的）。本脚本静态扫描 require 字符串，
// **不 require 被测文件**——config/*.js 在 require 期会求值 env 并可能抛错，扫文本才是零副作用。
//
// 十二条断言：
//  ① process.env 只允许出现在 config/env.js（全项目唯一 env 出口）
//     —— 例外 scripts/check-errors.js 与 scripts/check-refs.js：两条护栏都必须在 require
//     业务模块之前注入占位值（config/env.js 的必填项在 require 期校验；见各自文件注释）
//  ② 依赖只能向下：每层禁止依赖上层的表见 LAYER_RULES（config 是共享内核，不依赖任何项目模块）
//  ③ @config/env 只允许 config/ 内部与 app.js / seed.js 引用：消费者一律走 @config/<domain>
//  ④ utils/ 必须是纯函数：禁 I/O（fs / child_process）、禁第三方运行时（sharp / sequelize）、
//     禁进程引导（dotenv / module-alias）、禁业务数据（@models / @services / @jobs）。
//     判据：同一输入必得同一输出、不碰磁盘/数据库/网络/子进程 —— 碰了的属于 services 或 jobs
//  ⑤ 时间口径白名单：北京日期只有 utils/date.js 一个实现；命名/展示类时间可以用进程本地日历，
//     但必须显式登记（LOCAL_CALENDAR_ALLOWLIST，见 README「访问统计」末条）。用进程本地零点取
//     「今天」在生产（进程时区可能是 UTC）会与库里的 +08:00 墙钟错开 8 小时——访问日志筛选、
//     工作台「今日新增」、归档分组三处都因此实修过
//  ⑥ 运行期日志必须经 utils/log.js 的格式化函数：不许直接 console 写字符串（行格式只有一个出处，
//     scripts/ 除外——那是人看的命令行输出，且 check-errors.js 靠猴补丁 console 做断言）
//  ⑦ /uploads/ 前缀只允许出现在 utils/uploadUrl.js：拼 URL 用 toUploadUrl、剥 pathname 用
//     storagePathFromPathname（改前散在 vo 与派生层里手拼，换前缀会漏改）
//  ⑧ controller 的入参一律经 DTO：不许 req.body.X / req.query.X 这种字段直读（整对象交 DTO 可以）
//  ⑨ 口令哈希的唯一出口是 services/auth/password.js：bcrypt 不许在别处 import（轮数也只在那里）
//  ⑩ dto/vo 的 @-依赖只允许共享内核 @errors / @utils / @config（改前文档与护栏各说一套：
//     README 写「只依赖 @errors」，而 dto/setting.dto.js 与 vo/setting.vo.js 在用 @config/settings）
//  ⑪ 别名表两处一致：package.json 的 _moduleAliases 与 jsconfig.json 的 paths 是同一张表
//     （运行期认前者、编辑器认后者），加别名不许只改一处
//  ⑫ controllers/ 不许出现 sequelize.transaction：多步写 / check-then-act（含没有 DB 兜底的守卫）
//     一律下沉 services 且同事务（README 承诺的「controller 里 0 事务」由这条守着）。
//     改前那道「至少保留一个管理员」的守卫就是漏在这里：计数与删除两条独立语句 + 无唯一约束兜底
//
// 特性：零依赖、不连库、不占端口；退出码非 0 = 有违规。
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// 扫描范围：显式列出（不递归整个仓库，避开 frontend/ 与产物目录）
const SCAN_DIRS = ['config', 'controllers', 'dto', 'errors', 'jobs', 'middleware', 'models', 'routes', 'scripts', 'services', 'utils', 'vo'];
const SCAN_FILES = ['app.js', 'seed.js', 'bootstrap.js'];

// 断言①：允许出现 process.env 的文件（仓库相对路径）
const ENV_ALLOWLIST = new Set(['config/env.js', 'scripts/check-errors.js', 'scripts/check-refs.js']);

// 断言②：每层禁止依赖的别名前缀。没列出的层（routes / controllers / scripts / 顶层入口）不设限
const LAYER_RULES = {
  // config = 共享内核：不依赖任何项目模块（只用 node 内置、第三方包、config/ 内部相对引用）
  config: ['@errors', '@utils', '@models', '@dto', '@vo', '@middleware', '@controllers', '@routes', '@services', '@jobs'],
  // errors = 共享内核（唯一允许的例外是 @config：errors/translate/multer.js 用上传限额拼错误文案）
  errors: ['@utils', '@models', '@dto', '@vo', '@middleware', '@controllers', '@routes', '@services', '@jobs'],
  models: ['@utils', '@dto', '@vo', '@middleware', '@controllers', '@routes', '@services', '@jobs'],
  // vo / dto = 出参与入参的纯转换。二者例外允许 @utils：utils 已被断言④ 保证是纯函数，
  // 而 vo 要用响应里的图片 URL 前缀（@utils/uploadUrl）、dto 要用图片类型白名单
  // （@utils/imageRefTypes）——都是纯值，不构成对上层或 I/O 的依赖
  vo: ['@models', '@dto', '@middleware', '@controllers', '@routes', '@services', '@jobs'],
  dto: ['@models', '@vo', '@middleware', '@controllers', '@routes', '@services', '@jobs'],
  // utils = 纯函数共享内核：只依赖 node 内置与 @config/@errors（纯度另由断言④ 把守）
  utils: ['@dto', '@vo', '@middleware', '@controllers', '@routes', '@models', '@services', '@jobs'],
  // services = 领域能力（碰 I/O/DB）：可依赖 models/config/errors/utils，不认识上层与 jobs
  services: ['@dto', '@vo', '@middleware', '@controllers', '@routes', '@jobs'],
  // jobs = 定时任务：可依赖 services/models/config/errors/utils，不认识控制器与入参出参
  jobs: ['@dto', '@vo', '@middleware', '@controllers', '@routes'],
  middleware: ['@models', '@dto', '@vo', '@controllers', '@routes', '@services', '@jobs']
};

// 断言③：@config/env 的合法引用方（其余文件一律走 @config/<domain>）
const ENV_MODULE_ALLOWLIST = new Set(['config/database.js', 'config/image.js', 'config/backup.js', 'config/auth.js', 'app.js', 'seed.js']);

// 断言④：utils/ 里禁止出现的依赖（纯函数才会被各层安全共用）
const UTILS_FORBIDDEN_REQUIRES = new Set([
  'fs', 'fs/promises', 'child_process', 'net', 'http', 'https', 'dgram', 'worker_threads',
  'express', 'multer', 'sharp', 'sequelize', 'mysql2', 'dotenv', 'module-alias',
  '@models', '@services', '@jobs', '@middleware', '@controllers', '@routes'
]);

// 断言⑩：dto/vo 的 @-依赖白名单（共享内核 = config / errors / utils，各层均可依赖）
const DTO_VO_ALLOWED_ALIASES = new Set(['@errors', '@utils', '@config']);

// 断言⑤：时间口径白名单（见文件头说明）。命中「取日期部件 / 本地格式化」的调用，
// getTime() / getDataValue() 之类不在其列；新代码若确实需要进程本地日历，在此登记并写明理由
const LOCAL_CALENDAR_ALLOWLIST = new Set([
  'utils/date.js',               // 北京日期唯一实现（现用 UTC 算术，登记以备内部扩展）
  'services/image/store.js',     // 上传分片目录 YYYY/MM：命名用进程本地日历（有意例外）
  'services/backup/run.js',      // dump 文件名 blog-YYYYMMDD-HHmmss：命名用进程本地日历（有意例外）
  'services/backup/export.js'    // 导出说明里的「生成时间」：展示文本（有意例外）
]);
const LOCAL_CALENDAR_RE = /\b(?:setHours|getFullYear|getMonth|getDate|getHours|getMinutes|getSeconds|toLocaleString)\s*\(/;

// 断言⑥：允许直接写 console 字符串的文件（运行期日志一律经 utils/log.js 的格式化函数；
// scripts/ 整体豁免，见文件头说明）。命中形态：首参是字面量——
//   ① 单/双引号：console.log('…') / console.error("…")
//   ② 模板字面量且**不以 ${ 开头**：console.warn(`[backup] …: ${x}`)
// 放过「以 ${ 开头」的模板：那是把格式化函数的结果与堆栈等拼接的组合行
// （middleware/errorHandler.js 的「行 + 堆栈」就是这个形态）
const LOG_WRITER_ALLOWLIST = new Set([]);
const RAW_CONSOLE_RES = [
  /console\.(?:log|warn|error)\(\s*['"]/g,
  /console\.(?:log|warn|error)\(\s*`(?!\$\{)/g
];

// 断言⑦：/uploads/ 前缀的唯一出处。要求字面量紧跟在引号/反引号之后（即真的是 URL 前缀），
// 这样 restore.sh 文案里的 /var/www/yulabu_blog/uploads/ 不会被误判；
// 提示文案里刻意不带该字面量，免得扫自己时误报
const UPLOADS_ALLOWLIST = new Set(['utils/uploadUrl.js']);
const UPLOADS_LITERAL_RE = /(?:['"`])\/uploads\//;

// 断言⑧：只对 controllers/ 生效——入参字段直读一律违规（整对象交 DTO 是合法形态）
const CONTROLLER_FIELD_READ_RE = /req\.(?:body|query)(?:\.\w|\[)/g;

// 断言⑫：只对 controllers/ 生效——sequelize.transaction(...) 一律违规（事务属 services/）。
// 只匹配调用形态；「多步写但不带事务」静态扫不出来，那类靠判据与 code review
const CONTROLLER_TRANSACTION_RE = /\.transaction\s*\(/;

// 断言⑨：口令哈希的唯一出口（提示文案同样不带 require 字面量）
const BCRYPT_ALLOWLIST = new Set(['services/auth/password.js']);
const BCRYPT_REQUIRE_RE = /require\(\s*['"]bcrypt['"]\s*\)/;

const REQUIRE_RE = /require\(\s*['"]([^'"]+)['"]\s*\)/g;

// 剥掉注释再匹配：规则只管代码。行注释只认「行首或空白之后的 //」——
// 这样 'https://…' 与 '/uploads/…' 这类字符串不会被误伤（护栏够用即可，不做真解析）。
// 本文件自己的注释与提示文案里也出现这些字样，剥注释 + 文案不带「require(…)/process.env 字面量」两条合起来，
// 才能让护栏扫自己时不误报，而不用给脚本开后门
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/[^\n]*/g, '$1');
}

function listFiles() {
  const files = [];
  for (const dir of SCAN_DIRS) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs)) {
      const rel = `${dir}/${name}`;
      const absFile = path.join(abs, name);
      if (fs.statSync(absFile).isDirectory()) {
        for (const inner of fs.readdirSync(absFile)) {
          if (inner.endsWith('.js')) files.push(`${rel}/${inner}`);
        }
      } else if (name.endsWith('.js')) {
        files.push(rel);
      }
    }
  }
  for (const name of SCAN_FILES) {
    if (fs.existsSync(path.join(ROOT, name))) files.push(name);
  }
  return files;
}

// 断言⑪：两张别名表必须同集合。运行期认 package.json 的 _moduleAliases，编辑器认
// jsconfig.json 的 paths —— 只加一处会一边失明。jsconfig 的键写成 '@config/*'，比较前去掉 '/*'
function aliasTableViolations() {
  const out = [];
  const readJson = (rel) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    } catch (err) {
      out.push(`⑪ ${rel} 读取/解析失败：${err.message}`);
      return null;
    }
  };
  const pkg = readJson('package.json');
  const jsconfig = readJson('jsconfig.json');
  if (!pkg || !jsconfig) return out;

  const normalize = (keys) => new Set([...keys].map((key) => key.replace(/\/\*$/, '')));
  const pkgAliases = normalize(Object.keys(pkg._moduleAliases || {}));
  const jsAliases = normalize(Object.keys(jsconfig.compilerOptions?.paths || {}));

  for (const key of pkgAliases) {
    if (!jsAliases.has(key)) out.push(`⑪ ${key} 只在 package.json 的 _moduleAliases 里 —— jsconfig.json 的 paths 也要加（运行期与编辑器必须同一张表）`);
  }
  for (const key of jsAliases) {
    if (!pkgAliases.has(key)) out.push(`⑪ ${key} 只在 jsconfig.json 的 paths 里 —— package.json 的 _moduleAliases 也要加`);
  }
  return out;
}

function main() {
  const violations = [];
  const files = listFiles();

  for (const rel of files) {
    const code = stripComments(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    const layer = rel.includes('/') ? rel.split('/')[0] : null;

    // 断言①：env 出口唯一
    if (/\bprocess\.env\b/.test(code) && !ENV_ALLOWLIST.has(rel)) {
      violations.push(`① ${rel} 读了环境变量 —— 只允许 config/env.js 读`);
    }

    // 断言⑤：时间口径白名单（见文件头说明）
    if (LOCAL_CALENDAR_RE.test(code) && !LOCAL_CALENDAR_ALLOWLIST.has(rel)) {
      violations.push(`⑤ ${rel} 用了进程本地日历（取日期部件 / 本地格式化） —— 业务日界一律走 @utils/date；命名/展示类确实需要就登记进 LOCAL_CALENDAR_ALLOWLIST`);
    }

    // 断言⑥：运行期日志必须经 utils/log.js 的格式化函数（scripts/ 是人看的命令行输出）
    if (layer !== 'scripts' && !LOG_WRITER_ALLOWLIST.has(rel)) {
      for (const re of RAW_CONSOLE_RES) {
        for (const _ of code.matchAll(re)) {
          violations.push(`⑥ ${rel} 直接 console 写字符串 —— 请用 @utils/log 的格式化函数拼行（行格式只有一个出处）`);
        }
      }
    }

    // 断言⑦：上传 URL 前缀不许手拼（见文件头说明）
    if (UPLOADS_LITERAL_RE.test(code) && !UPLOADS_ALLOWLIST.has(rel)) {
      violations.push(`⑦ ${rel} 手拼上传 URL 前缀 —— 拼用 toUploadUrl、剥用 storagePathFromPathname（@utils/uploadUrl）`);
    }

    // 断言⑧：controller 的入参一律经 DTO（整对象传 DTO 合法，字段直读违规）
    if (layer === 'controllers') {
      for (const _ of code.matchAll(CONTROLLER_FIELD_READ_RE)) {
        violations.push(`⑧ ${rel} 直读请求字段 —— 入参校验集中到 dto/，把整个 req.body / req.query 交给它`);
      }
    }

    // 断言⑨：口令哈希的唯一出口
    if (BCRYPT_REQUIRE_RE.test(code) && !BCRYPT_ALLOWLIST.has(rel)) {
      violations.push(`⑨ ${rel} 自己引入了口令哈希库 —— 只用 @services/auth/password 的 hash / verify`);
    }

    // 断言⑫：controller 不许自己开事务（多步写 / 无兜底的 check-then-act 一律下沉 services）
    if (layer === 'controllers' && CONTROLLER_TRANSACTION_RE.test(code)) {
      violations.push(`⑫ ${rel} 自己开了事务 —— multi-step / 无兜底的 check-then-act 一律下沉 services/ 且同事务（controller 保持 0 事务）`);
    }

    // 断言②③④：依赖方向与 utils 纯度
    for (const match of code.matchAll(REQUIRE_RE)) {
      const target = match[1];

      if (target === '@config/env' && !ENV_MODULE_ALLOWLIST.has(rel)) {
        violations.push(`③ ${rel} 直接引用 @config/env —— 请经由 @config/<domain>（或按需登记到白名单）`);
      }

      // 断言④ 先判：utils 的纯度违规不重复走 ②（同一行只报一次）
      if (layer === 'utils' && UTILS_FORBIDDEN_REQUIRES.has(target)) {
        violations.push(`④ ${rel} 依赖 ${target} —— utils/ 只放纯函数（无 I/O、无 DB、无进程引导）；碰了的属于 services/ 或 jobs/`);
        continue;
      }

      // 断言⑩ 同样先判：dto/vo 只许依赖共享内核，违规不重复走 ②
      if ((layer === 'dto' || layer === 'vo') && target.startsWith('@')) {
        const alias = target.split('/')[0];
        if (!DTO_VO_ALLOWED_ALIASES.has(alias)) {
          violations.push(`⑩ ${rel} 依赖 ${target} —— dto/vo 只允许共享内核 @errors / @utils / @config`);
          continue;
        }
      }

      if (!target.startsWith('@') || !layer) continue;
      const forbidden = LAYER_RULES[layer];
      if (!forbidden) continue;
      const alias = target.split('/')[0];
      if (forbidden.includes(alias)) {
        violations.push(`② ${rel} 依赖 ${target} —— ${layer}/ 不允许依赖上层 ${alias}/`);
      }
    }
  }

  // 断言⑪：别名表（与文件内容无关，整体比对一次）
  violations.push(...aliasTableViolations());

  const scanned = files.length;
  if (violations.length) {
    console.error(`分层护栏：${violations.length} 条违规（扫描 ${scanned} 个文件）`);
    for (const v of violations) console.error('  ✗ ' + v);
    process.exit(1);
  }
  console.log(`分层护栏通过：${scanned} 个文件，断言 12 类（env 唯一出口 / 依赖只能向下 / @config/env 白名单 / utils 纯度 / 时间口径白名单 / 日志经 utils/log / 上传前缀不手拼 / controller 入参经 DTO / 口令哈希唯一出口 / dto-vo 依赖白名单 / 别名表一致 / controller 不自己开事务）`);
}

main();
