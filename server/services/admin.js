// 管理员账号域的服务层：目前只有「删除」这一条需要原子性的守卫（判据①第 1 条）。
//
// 为什么下沉：改前这道守卫在 adminAccountController.deleteAdmin 里，计数与删除是两条独立语句，
// 而且「至少保留一个管理员」不像名字唯一性那样有 DB 唯一约束兜底——两个管理员同时删对方时，
// 两边都读到 2，可能把管理员删空（后台再也登不进去，只能跑 seed 恢复）。
// 按判据：**没有兜底的 check-then-act 一律进 services 且同事务**；controller 保持 0 事务。
//
// 留在 controller 的是「只能修改自己的密码」（adminAccountController 的 403）——它依据的是
// 请求身份（req.admin），services 不认识 req；本模块收的是「依据数据关系」的那类守卫。
const AppError = require('@errors/AppError');
const { sequelize, Admin } = require('@models');

// 判定顺序与文案与改前逐字一致：404 不存在 → 403 不能删自己 → 403 至少留一个 → 删除。
//
// 计数必须用**锁读**（FOR UPDATE）：普通 count 在 REPEATABLE READ 下读的是事务快照，
// 两个管理员同时删对方会双双拿到 2、双双通过检查（只包事务挡不住）；锁读会串行化这两个事务，
// 后到的那个读到的是已提交的最新行数，于是被 403 拦下。
async function deleteAdminWithGuard(adminId, requesterId) {
  return sequelize.transaction(async (t) => {
    const admin = await Admin.findByPk(adminId, { transaction: t });
    if (!admin) throw new AppError(404, '管理员不存在');

    if (adminId === requesterId) {
      throw new AppError(403, '不能删除自己');
    }

    const rows = await Admin.findAll({
      attributes: ['admin_id'],
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (rows.length <= 1) {
      throw new AppError(403, '至少保留一个管理员账号');
    }

    await admin.destroy({ transaction: t });
    return admin;
  });
}

module.exports = { deleteAdminWithGuard };
