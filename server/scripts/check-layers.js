// 分层护栏：node scripts/check-layers.js
//
// 为什么需要它：config 重构把「环境变量只有一个出口」与「依赖只能向下」定成了规则，而规则没有护栏
// 就会在几次迭代后悄悄失效（utils/ 就是这么变成杂物抽屉的）。本脚本静态扫描 require 字符串，
// **不 require 被测文件**——config/*.js 在 require 期会求值 env 并可能抛错，扫文本才是零副作用。
//
// 三条断言：
//  ① process.env 只允许出现在 config/env.js（全项目唯一 env 出口）
//     —— 例外 scripts/check-errors.js：它必须在 require 业务模块之前注入占位值（见该文件注释）
//  ② 依赖只能向下：每层禁止依赖上层的表见 LAYER_RULES（config 是共享内核，不依赖任何项目模块）
//  ③ @config/env 只允许 config/ 内部与 app.js / seed.js 引用：消费者一律走 @config/<domain>
//
// 特性：零依赖、不连库、不占端口；退出码非 0 = 有违规。
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// 扫描范围：显式列出（不递归整个仓库，避开 frontend/ 与产物目录）
const SCAN_DIRS = ['config', 'controllers', 'dto', 'errors', 'middleware', 'models', 'routes', 'utils', 'vo', 'scripts'];
const SCAN_FILES = ['app.js', 'seed.js'];

// 断言①：允许出现 process.env 的文件（仓库相对路径）
const ENV_ALLOWLIST = new Set(['config/env.js', 'scripts/check-errors.js']);

// 断言②：每层禁止依赖的别名前缀。没列出的层（routes / controllers / scripts / 顶层入口）不设限
const LAYER_RULES = {
  // config = 共享内核：不依赖任何项目模块（只用 node 内置、第三方包、config/ 内部相对引用）
  config: ['@errors', '@utils', '@models', '@dto', '@vo', '@middleware', '@controllers', '@routes'],
  // errors = 共享内核（唯一允许的例外是 @config：errors/translate/multer.js 用上传限额拼错误文案）
  errors: ['@utils', '@models', '@dto', '@vo', '@middleware', '@controllers', '@routes'],
  models: ['@utils', '@dto', '@vo', '@middleware', '@controllers', '@routes'],
  vo: ['@utils', '@models', '@dto', '@middleware', '@controllers', '@routes'],
  dto: ['@utils', '@models', '@vo', '@middleware', '@controllers', '@routes'],
  utils: ['@dto', '@vo', '@middleware', '@controllers', '@routes'],
  middleware: ['@models', '@dto', '@vo', '@controllers', '@routes']
};

// 断言③：@config/env 的合法引用方（其余文件一律走 @config/<domain>）
const ENV_MODULE_ALLOWLIST = new Set(['config/database.js', 'config/image.js', 'config/backup.js', 'config/auth.js', 'app.js', 'seed.js']);

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

    // 断言②③：依赖方向
    for (const match of code.matchAll(REQUIRE_RE)) {
      const target = match[1];

      if (target === '@config/env' && !ENV_MODULE_ALLOWLIST.has(rel)) {
        violations.push(`③ ${rel} 直接引用 @config/env —— 请经由 @config/<domain>（或按需登记到白名单）`);
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

  const scanned = files.length;
  if (violations.length) {
    console.error(`分层护栏：${violations.length} 条违规（扫描 ${scanned} 个文件）`);
    for (const v of violations) console.error('  ✗ ' + v);
    process.exit(1);
  }
  console.log(`分层护栏通过：${scanned} 个文件，断言 3 类（env 唯一出口 / 依赖只能向下 / @config/env 白名单）`);
}

main();
