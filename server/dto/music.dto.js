const { parseId } = require('./common.dto');

// 曲目 id（网易云 song id，正整数）。校验走全站唯一的 parseId（dto/common.dto.js），
// 与 :postId / :post_id 那些一样只做形状校验，不查库
function trackIdDTO(params) {
  return parseId(params, '曲目');
}

module.exports = { trackIdDTO };
