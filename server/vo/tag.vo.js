function tagDetail(tag) {
  return {
    id: tag.tag_id,
    name: tag.tag_name,
    color: tag.tag_color,
  };
}

function taglist(tags) {
  return tags.map(tag => tagDetail(tag));
}

module.exports = { tagDetail, taglist };