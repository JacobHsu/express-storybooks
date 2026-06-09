const express = require('express')
const passport = require('passport')
const router = express.Router()
const User = require('../models/User')

// @desc    Dev-only quick login (TEMPORARY - bypasses Google OAuth)
// @route   GET /auth/dev
// Enabled only when ALLOW_DEV_LOGIN=true is set in .env
if (process.env.ALLOW_DEV_LOGIN === 'true') {
  router.get('/dev', async (req, res, next) => {
    try {
      let user = await User.findOne({ googleId: 'dev-user' })
      if (!user) {
        user = await User.create({
          googleId: 'dev-user',
          displayName: 'Dev User',
          firstName: 'Dev',
          lastName: 'User',
          image: 'https://www.gravatar.com/avatar/?d=mp',
        })
      }
      req.login(user, (err) => {
        if (err) {
          return next(err)
        }
        res.redirect('/dashboard')
      })
    } catch (err) {
      next(err)
    }
  })
}

// @desc    Auth with Google
// @route   GET /auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile'] }))

// @desc    Google auth callback
// @route   GET /auth/google/callback
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/dashboard')
  }
)

// @desc    Logout user
// @route   /auth/logout
router.get('/logout', (req, res, next) => {
  req.logout((error) => {
      if (error) {return next(error)}
      res.redirect('/')
  })
})

module.exports = router
