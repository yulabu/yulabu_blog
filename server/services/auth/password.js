// 管理员口令哈希的唯一出处：轮数常量与 hash/verify 都只在这里。
//
// 为什么住 services/ 而不是 utils/：bcrypt 每次哈希都带随机盐，同一输入得不到同一输出，
// 不满足 utils 的「纯函数」判据（护栏断言④），所以它属于领域能力。
// 为什么不是 config/：轮数是内部实现常量，外部不可配（config 只收「外部能定的值」）。
//
// 改前 5 个调用点（seed 1 处 hash、adminAccountController 2 处 hash + 1 处 compare、
// authController 1 处 compare）各自 import bcrypt 并硬编码轮数 12——护栏断言⑨ 守着这条唯一出口。
const bcrypt = require('bcrypt');

// bcrypt 成本因子：12 是部署时的取舍（约 250ms/次，登录与建号各一次，可接受）
const COST = 12;

function hash(plain) {
  return bcrypt.hash(plain, COST);
}

function verify(plain, hashed) {
  return bcrypt.compare(plain, hashed);
}

module.exports = { COST, hash, verify };
