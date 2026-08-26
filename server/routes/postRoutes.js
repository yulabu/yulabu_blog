const express = require('express');
const router = express.Router();
const postController = require('@controllers/postController');
const auth = require('@middleware/auth');

router.get('/', postController.getPosts);
router.get('/archive', postController.getArchive);
router.get('/:id/prev', postController.getPrevPost);
router.get('/:id/next', postController.getNextPost);
router.get('/:id', postController.getPostById);
router.post('/', auth, postController.createPost);
router.put('/:id', auth, postController.updatePost);
router.put('/:id/unbind-images', auth, postController.unbindImages);
router.delete('/:id', auth, postController.deletePost);

module.exports = router;