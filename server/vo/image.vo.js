function imageVO(image) {
  return {
    id: image.image_id,
    url: `/uploads/${image.storage_path}`,
    thumb_url: image.thumb_path ? `/uploads/${image.thumb_path}` : null,
    file_size: image.file_size,
    reference_type: image.reference_type,
    reference_id: image.reference_id,
    reference_title: image.reference_title || null,
    bound: image.reference_id !== null,
    created_at: image.created_at
  };
}

module.exports = { imageVO };