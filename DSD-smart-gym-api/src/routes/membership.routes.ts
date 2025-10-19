import express from 'express';
import { membershipSignupHandler } from '../controllers/membershipSignup.handler';
import { requireAuth } from '../middleware/requireAuth';

const router = express.Router();

// Public signup (we will allow signup-first flow, user is created via user.routes/signup then this endpoint
// can be called to create a membership checkout session for the profile)
router.post('/signup', requireAuth, membershipSignupHandler);

export default router;
