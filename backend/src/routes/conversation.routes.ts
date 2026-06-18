import { Router } from 'express'
import * as conversationController from '../controllers/conversation.controller.js'
import { authenticate } from '../middlewares/authenticate.js'

const router = Router()

router.use(authenticate)  

router.post('/', conversationController.createConversation)
router.get('/', conversationController.getConversations)
router.post('/:id/messages', conversationController.sendMessage)
router.get('/:id/messages', conversationController.getMessages)
router.delete('/:id/messages/:messageId', conversationController.deleteMessage)

export default router