const express = require('express')
const router = express.Router()
const { ensureAuth } = require('../middleware/auth')

const Story = require('../models/Story')

// @desc    Show add page
// @route   GET /stories/add
router.get('/add', ensureAuth, (req, res) => {
  res.render('stories/add')
})

// @desc    Generate story draft via NVIDIA NIM (Llama 3.3 70B)
// @route   POST /stories/generate
router.post('/generate', ensureAuth, async (req, res) => {
  try {
    const apiKey = process.env.NVIDIA_API_KEY
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'NVIDIA_API_KEY 未設定' })
    }

    const themes = [
      '森林裡迷路的小狐狸', '海邊撿到神秘瓶中信的孩子', '會說話的老時鐘',
      '雨夜出現的流浪貓', '舊書店裡的魔法書', '搬家後發現的閣樓秘密',
      '夢中重複出現的陌生街道', '退休魔術師的最後一場表演',
      '太空站值班的孤獨工程師', '深山溫泉旅館的奇怪房客',
      '會自動寫字的鋼筆', '消失的童年玩伴突然回來',
    ]
    const tones = ['溫馨療癒', '懸疑神秘', '幽默逗趣', '奇幻冒險', '淡淡憂傷', '勵志感人']
    const theme = themes[Math.floor(Math.random() * themes.length)]
    const tone = tones[Math.floor(Math.random() * tones.length)]
    const seed = Math.random().toString(36).slice(2, 8)

    const prompt = `請用繁體中文創作一則短篇故事草稿。
主題：${theme}
風格：${tone}
隨機種子（請忽略但確保每次內容不同）：${seed}

請只回傳 JSON，格式：{"title": "標題（10字以內）", "body": "故事內容（200~300字，使用 <p> 段落標籤包起來，可分 2~3 段）"}
不要加 markdown 標記、不要解釋，只輸出純 JSON。`

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta/llama-3.3-70b-instruct',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.95,
        top_p: 0.9,
        max_tokens: 800,
        stream: false,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('NVIDIA API error:', response.status, text)
      return res.status(502).json({ success: false, error: 'AI 生成失敗' })
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content?.trim() || ''

    let parsed
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content)
    } catch (e) {
      return res.status(502).json({ success: false, error: 'AI 回傳格式異常', raw: content })
    }

    res.json({ success: true, data: { title: parsed.title || '', body: parsed.body || '' } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: '伺服器錯誤' })
  }
})

// @desc    Process add form
// @route   POST /stories
router.post('/', ensureAuth, async (req, res) => {
  try {
    req.body.user = req.user.id
    await Story.create(req.body)
    res.redirect('/dashboard')
  } catch (err) {
    console.error(err)
    res.render('error/500')
  }
})

// @desc    Show all stories
// @route   GET /stories
router.get('/', ensureAuth, async (req, res) => {
  try {
    const stories = await Story.find({ status: 'public' })
      .populate('user')
      .sort({ createdAt: 'desc' })
      .lean()

    res.render('stories/index', {
      stories,
    })
  } catch (err) {
    console.error(err)
    res.render('error/500')
  }
})

// @desc    Show single story
// @route   GET /stories/:id
router.get('/:id', ensureAuth, async (req, res) => {
  try {
    let story = await Story.findById(req.params.id).populate('user').lean()

    if (!story) {
      return res.render('error/404')
    }

    if (story.user._id != req.user.id && story.status == 'private') {
      res.render('error/404')
    } else {
      res.render('stories/show', {
        story,
      })
    }
  } catch (err) {
    console.error(err)
    res.render('error/404')
  }
})

// @desc    Show edit page
// @route   GET /stories/edit/:id
router.get('/edit/:id', ensureAuth, async (req, res) => {
  try {
    const story = await Story.findOne({
      _id: req.params.id,
    }).lean()

    if (!story) {
      return res.render('error/404')
    }

    if (story.user != req.user.id) {
      res.redirect('/stories')
    } else {
      res.render('stories/edit', {
        story,
      })
    }
  } catch (err) {
    console.error(err)
    return res.render('error/500')
  }
})

// @desc    Update story
// @route   PUT /stories/:id
router.put('/:id', ensureAuth, async (req, res) => {
  try {
    let story = await Story.findById(req.params.id).lean()

    if (!story) {
      return res.render('error/404')
    }

    if (story.user != req.user.id) {
      res.redirect('/stories')
    } else {
      story = await Story.findOneAndUpdate({ _id: req.params.id }, req.body, {
        new: true,
        runValidators: true,
      })

      res.redirect('/dashboard')
    }
  } catch (err) {
    console.error(err)
    return res.render('error/500')
  }
})

// @desc    Delete story
// @route   DELETE /stories/:id
router.delete('/:id', ensureAuth, async (req, res) => {
  try {
    let story = await Story.findById(req.params.id).lean()

    if (!story) {
      return res.render('error/404')
    }

    if (story.user != req.user.id) {
      res.redirect('/stories')
    } else {
      await Story.deleteOne({ _id: req.params.id })
      res.redirect('/dashboard')
    }
  } catch (err) {
    console.error(err)
    return res.render('error/500')
  }
})

// @desc    User stories
// @route   GET /stories/user/:userId
router.get('/user/:userId', ensureAuth, async (req, res) => {
  try {
    const stories = await Story.find({
      user: req.params.userId,
      status: 'public',
    })
      .populate('user')
      .lean()

    res.render('stories/index', {
      stories,
    })
  } catch (err) {
    console.error(err)
    res.render('error/500')
  }
})

//@desc Search stories by title
//@route GET /stories/search/:query
router.get('/search/:query', ensureAuth, async (req, res) => {
  try{
      const stories = await Story.find({title: new RegExp(req.query.query,'i'), status: 'public'})
      .populate('user')
      .sort({ createdAt: 'desc'})
      .lean()
     res.render('stories/index', { stories })
  } catch(err){
      console.log(err)
      res.render('error/404')
  }
})


module.exports = router
