function tagDetail(tag) {
  return {
    id: tag.tag_id,
    name: tag.tag_name,
    count: Number(tag.count || 0),
  };
}

function tagList(tags) {
  return tags.map(tag => tagDetail(tag));
}

module.exports = { tagDetail, tagList };