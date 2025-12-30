import { llmClient } from '../lib/llmClient.js'

const systemPrompt =
  '你是高校导师模拟器的“国自然/国社科申报课题事件”生成助手。只输出严格 JSON，不要输出任何额外解释、Markdown 或代码块。'

const extractJson = (text) => {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch (error) {
    console.warn('[GrantEvent] Failed to parse JSON payload.', error)
    return null
  }
}

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value))

const asInt = (value, min, max) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.round(clampNumber(value, min, max))
}

const normalizeDelta = (raw, spec) => {
  if (!raw || typeof raw !== 'object') return undefined
  const next = {}
  for (const [key, { min, max }] of Object.entries(spec)) {
    const value = asInt(raw[key], min, max)
    if (value !== undefined && value !== 0) next[key] = value
  }
  return Object.keys(next).length ? next : undefined
}

const normalizeGrantMeta = (raw, stage) => {
  if (!raw || typeof raw !== 'object') return undefined
  const meta = raw
  if (stage === 'execution') {
    const progressDelta = asInt(meta.progressDelta, -20, 35)
    return progressDelta !== undefined ? { progressDelta } : undefined
  }

  const scoreDelta = asInt(meta.scoreDelta, -18, 18)
  const luckDelta = asInt(meta.luckDelta, -12, 12)
  const next = {}
  if (scoreDelta !== undefined && scoreDelta !== 0) next.scoreDelta = scoreDelta
  if (luckDelta !== undefined && luckDelta !== 0) next.luckDelta = luckDelta
  return Object.keys(next).length ? next : undefined
}

const normalizeOptions = (options, stage) => {
  if (!Array.isArray(options)) return null
  const normalized = []
  for (const item of options.slice(0, 3)) {
    const id = String(item?.id ?? '').trim()
    const label = String(item?.label ?? '').trim()
    const outcome = String(item?.outcome ?? '').trim()
    if (!id || !label || !outcome) continue

    const hint = typeof item?.hint === 'string' ? item.hint.trim() : undefined
    const meta = normalizeGrantMeta(item?.meta, stage)

    const stats = normalizeDelta(item?.effects?.stats, {
      funding: { min: -40000, max: 60000 },
      reputation: { min: -5, max: 6 },
      morale: { min: -12, max: 12 },
      academia: { min: -8, max: 10 },
      admin: { min: -8, max: 10 },
      integrity: { min: -8, max: 12 },
    })
    const student = normalizeDelta(item?.effects?.student, {
      stress: { min: -15, max: 18 },
      mentalState: { min: -15, max: 15 },
      contribution: { min: -30, max: 30 },
      diligence: { min: -6, max: 6 },
      talent: { min: -6, max: 6 },
      luck: { min: -6, max: 6 },
      pendingPapers: { min: -1, max: 1 },
      totalPapers: { min: -1, max: 1 },
    })

    normalized.push({
      id,
      label,
      hint,
      outcome,
      effects: stats || student ? { ...(stats ? { stats } : {}), ...(student ? { student } : {}) } : undefined,
      meta,
    })
  }
  return normalized.length >= 2 ? normalized : null
}

const buildUserPrompt = ({ stage, mode, mentor, stats, team, year, quarter, grant }) => {
  const safeMentor = mentor || {}
  const safeStats = stats || {}
  const safeTeam = team || {}
  const safeGrant = grant || {}

  const dept = safeMentor.department || safeMentor.selectedDepartment || '学院'
  const disc = safeMentor.discipline || safeMentor.selectedDiscipline || '学科'
  const focus = safeMentor.researchFocus || '交叉研究'

  const grantType = safeGrant.type || '课题'
  const grantTitle = safeGrant.title || '某申报项目'
  const tier = safeGrant.tier || ''

  const stageHint =
    stage === 'review'
      ? mode === 'submission'
        ? '申报当季：材料/背书/论证补强事件（会影响评分）'
        : '评审期间：季度随机事件（会影响评分与运气）'
      : '执行期间：推进写作进度/团队状态的事件（会影响进度）'

  const effectsHint =
    stage === 'execution'
      ? 'meta 需要给 progressDelta（整数，[-20,35]），表示本次对“写作进度/产出进度”的推进或拖慢。'
      : 'meta 需要给 scoreDelta（整数，[-18,18]）与可选 luckDelta（整数，[-12,12]），表示本次对“最终评分/运气”的提升或下降。'

  return `背景：你正在生成一条“申报课题事件”（选择题弹窗），用于高校导师模拟器。
时间：第 ${year} 年 Q${quarter}（季度结算后生成）。
导师：${disc}-${dept}，研究方向：${focus}。
导师状态：心态${safeStats.morale ?? ''}，学术${safeStats.academia ?? ''}，行政${safeStats.admin ?? ''}，学术不端嫌疑${safeStats.integrity ?? ''}，经费${safeStats.funding ?? ''}，声望${safeStats.reputation ?? ''}。
团队规模：${Array.isArray(safeTeam.members) ? safeTeam.members.length : 0}。

课题：${grantType}「${grantTitle}」${tier ? `（档位 ${tier}）` : ''}。
阶段：${stageHint}。

请输出严格 JSON，结构如下（字段必须存在；options 必须是 3 个选项；语气像“系统来信/评审通知/执行提醒”，信息量足，2-4 句题干）：
{
  "title": "标题（8-18字）",
  "prompt": "题干（2-4句，具体情境+压力/收益）",
  "options": [
    {
      "id": "A",
      "label": "选项A（短）",
      "hint": "代价/收益提示（可选）",
      "outcome": "选择后的结果描述（1-2句）",
      "effects": {
        "stats": { "funding": -3000, "reputation": 1, "morale": -1, "admin": 1 },
        "student": { "stress": 2, "mentalState": -1 }
      },
      "meta": {}
    }
  ]
}

约束：
1) 只输出 JSON，不要输出其他任何文本；
2) options 要给 A/B/C 三个选项；
3) effects 的数值必须为整数，幅度要小（不要一次加爆经费/声望/心态）；student 影响更小；
4) ${effectsHint}
5) 不要编造具体机构/专家/学校名称，用“评审系统/科研处/合作方/匿名外审”等泛称。`
}

const fallbackEvent = ({ stage, mode, grant }) => {
  const grantType = grant?.type || '课题'
  const grantTitle = grant?.title || '某申报项目'
  if (stage === 'execution') {
    return {
      title: `${grantType}执行：里程碑推进`,
      prompt: `科研处提醒：「${grantTitle}」本季度需要更新进展与阶段成果。你可以选择强推进度、稳住团队，或用资源换速度。`,
      options: [
        {
          id: 'A',
          label: '强推里程碑，按期交付',
          hint: '进度快 · 压力上升',
          outcome: '你明确里程碑并压实任务，进度明显加快，但团队压力也上来了。',
          effects: { stats: { morale: -1 }, student: { stress: 3 } },
          meta: { progressDelta: 12 },
        },
        {
          id: 'B',
          label: '稳住节奏，先保团队状态',
          hint: '更稳 · 进度一般',
          outcome: '你把节奏拉稳，团队更能持续输出，但本季度进度提升有限。',
          effects: { stats: { morale: 1 } },
          meta: { progressDelta: 6 },
        },
        {
          id: 'C',
          label: '买服务/外包部分工作',
          hint: '花钱换时间',
          outcome: '你用经费换效率，阶段成果推进更顺，但预算也被消耗了一些。',
          effects: { stats: { funding: -8000 } },
          meta: { progressDelta: 16 },
        },
      ],
    }
  }

  const isSubmission = mode === 'submission'
  return {
    title: `${grantType}${isSubmission ? '申报' : '评审'}：材料来信`,
    prompt: `评审系统提示：「${grantTitle}」需要你补充一项说明/材料。你可以选择加班补强、找科研秘书把关，或先按原样提交。`,
    options: [
      {
        id: 'A',
        label: '连夜补强材料',
        hint: '成功率提升 · 更累',
        outcome: '你把材料补到更扎实，评审更容易抓住亮点。',
        effects: { stats: { morale: -1, admin: -1 } },
        meta: { scoreDelta: 5, luckDelta: 1 },
      },
      {
        id: 'B',
        label: '请科研秘书核对流程',
        hint: '更稳 · 提升有限',
        outcome: '你把流程卡得更严谨，风险降低但提升也不算大。',
        effects: { stats: { admin: -1 } },
        meta: { scoreDelta: 3 },
      },
      {
        id: 'C',
        label: '先按原样提交',
        hint: '省事 · 风险更高',
        outcome: '你决定先不折腾，把赌注交给运气。',
        effects: { stats: { morale: 1 } },
        meta: { scoreDelta: -3, luckDelta: -1 },
      },
    ],
  }
}

export async function generateGrantEvent({ stage, mode, mentor, stats, team, year, quarter, grant }) {
  try {
    const response = await llmClient.generateText({
      systemPrompt,
      userPrompt: buildUserPrompt({ stage, mode, mentor, stats, team, year, quarter, grant }),
    })
    const parsed = extractJson(response)
    const title = String(parsed?.title ?? '').trim()
    const prompt = String(parsed?.prompt ?? '').trim()
    const options = normalizeOptions(parsed?.options, stage)
    if (title && prompt && options) {
      return { title, prompt, options }
    }
  } catch (error) {
    console.warn('[GrantEvent] LLM generation failed, using fallback.', error)
  }

  return fallbackEvent({ stage, mode, grant })
}
