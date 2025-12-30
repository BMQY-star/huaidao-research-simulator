import { llmClient } from '../lib/llmClient.js'

const systemPrompt =
  '你是高校导师模拟器的“校务通知/团队事件”生成助手。只输出严格 JSON，不要输出任何额外解释、Markdown 或代码块。'

const extractJson = (text) => {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch (error) {
    console.warn('[QuarterEvent] Failed to parse JSON payload.', error)
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

const normalizeOptions = (options, category) => {
  if (!Array.isArray(options)) return null
  const normalized = []
  for (const item of options.slice(0, 3)) {
    const id = String(item?.id ?? '').trim()
    const label = String(item?.label ?? '').trim()
    const outcome = String(item?.outcome ?? '').trim()
    if (!id || !label || !outcome) continue

    const hint = typeof item?.hint === 'string' ? item.hint.trim() : undefined
    const meta = item?.meta && typeof item.meta === 'object' ? item.meta : undefined
    const studentAction =
      category === 'runaway' &&
      typeof meta?.studentAction === 'string' &&
      (meta.studentAction === 'leave' || meta.studentAction === 'stay')
        ? meta.studentAction
        : undefined

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
      contribution: { min: -35, max: 35 },
      diligence: { min: -6, max: 6 },
      talent: { min: -6, max: 6 },
      luck: { min: -6, max: 6 },
    })

    normalized.push({
      id,
      label,
      hint,
      outcome,
      effects: stats || student ? { ...(stats ? { stats } : {}), ...(student ? { student } : {}) } : undefined,
      meta: studentAction ? { studentAction } : undefined,
    })
  }
  return normalized.length >= 2 ? normalized : null
}

const buildUserPrompt = ({ category, mentor, stats, team, year, quarter, targetStudent }) => {
  const safeMentor = mentor || {}
  const safeStats = stats || {}
  const safeTeam = team || {}
  const dept = safeMentor.department || safeMentor.selectedDepartment || '学院'
  const disc = safeMentor.discipline || safeMentor.selectedDiscipline || '学科'
  const focus = safeMentor.researchFocus || '交叉研究'

  const targetName = targetStudent?.name || '某学生'
  const targetStage = targetStudent?.stage || ''
  const targetTraits = Array.isArray(targetStudent?.traits) ? targetStudent.traits.slice(0, 4).join('、') : ''
  const targetPaper = `在投${targetStudent?.pendingPapers ?? 0} / 发表${targetStudent?.totalPapers ?? 0}`

  const topicHint =
    category === 'industryOffer'
      ? '学生收到实习/转正/offer 相关消息（不要写成“去面试跑路”，重点是压力与安排）'
      : category === 'schoolNotice'
        ? '校务通知、制度流程、会议/检查/填表、资源分配'
        : category === 'resource'
          ? '仪器资源/机时/经费使用、共享平台排期、数据权限'
          : category === 'conference'
            ? '会议投稿、口头/海报邀请、差旅安排、截稿冲刺'
            : category === 'collaboration'
              ? '合作邀约、跨院系项目、署名排序、数据共享'
              : category === 'policy'
                ? '政策/合规/审计、材料抽查、伦理/数据合规'
                : category === 'runaway'
                  ? '学生突然提出离队/转行/长期实习导致退组（稀有事件）'
                  : '学术节奏、组会/投稿安排、团队沟通'

  return `背景：你正在生成一条“校务通知/团队事件”随机事件，用于网页选择题弹窗。请写得像真实学校系统消息+导师决策，语气自然，带一点幽默但不要网文。
时间：第 ${year} 年 Q${quarter}（季度结束结算后生成）。
导师：${disc}-${dept}，研究方向：${focus}。
导师状态：心态${safeStats.morale ?? safeStats.moraleValue ?? ''}，学术${safeStats.academia ?? ''}，行政${safeStats.admin ?? ''}，学术不端嫌疑${safeStats.integrity ?? ''}，经费${safeStats.funding ?? ''}，声望${safeStats.reputation ?? ''}。
团队规模：${Array.isArray(safeTeam.members) ? safeTeam.members.length : 0}。
本事件建议围绕：${topicHint}。

若事件涉及学生个人节奏，主角固定为：${targetName}${targetStage ? `（${targetStage}）` : ''}。${targetTraits ? `特质：${targetTraits}。` : ''}${targetPaper ? `论文：${targetPaper}。` : ''}

请输出严格 JSON，结构如下（字段必须存在；options 必须是 3 个选项）：
{
  "title": "校务通知/Notification：标题（8-16字）",
  "prompt": "题干（2-4句，信息量足，有具体情境与压力/收益）",
  "options": [
    {
      "id": "A",
      "label": "选项A（短）",
      "hint": "代价/收益提示（可选）",
      "outcome": "选择后的结果描述（1-2句）",
      "effects": {
        "stats": { "funding": -3000, "reputation": 1, "morale": -1, "admin": 1 },
        "student": { "stress": 3, "mentalState": -2, "contribution": 8 }        
      },
      "meta": { "studentAction": "leave | stay（仅当事件类型是 runaway 时可填）" }
    }
  ]
}

约束：
1) effects 的数值必须是整数，幅度要“明显但不离谱”；stats funding 在 [-40000, 60000]，reputation 在 [-5, 6]，morale 在 [-12, 12]；student 影响幅度更小但仍可明显；
2) 不要写“学生去面试然后跑路”。如果是实习/offer，只能体现压力、心态、团队排期，不要让学生离队；
3) 只有当事件类型是“runaway”（学生离队/转行）时，才允许出现 meta.studentAction；若出现，三选项至少一个带 meta.studentAction="leave"，至少一个带 "stay"；
4) 不要编造具体学校/公司名称，用“某互联网大厂/合作方/校务系统”等泛称；
5) 只输出 JSON，不要输出其他任何文本。`
}

const fallbackEvent = ({ category, targetStudent }) => {
  const name = targetStudent?.name || '某学生'
  if (category === 'industryOffer') {
    return {
      title: '校务通知/Notification：来自大厂的橄榄枝？',
      prompt: `${name} 收到了一份“某互联网大厂”的 offer。对方希望尽快给答复，同时也愿意给出更好的条件。你需要决定怎么处理这件事：是挽留、祝福，还是把它变成团队的机会？`,
      options: [
        {
          id: 'A',
          label: '晚之以理，动之以情',
          hint: '稳人心 · 需要投入',
          outcome: `你和 ${name} 深聊了一次，表达了团队的规划与支持。TA 的心态稳了一些，但你也更累了。`,
          effects: { stats: { morale: -1 }, student: { mentalState: 3, stress: -2 } },
        },
        {
          id: 'B',
          label: '请TA把实习节奏公开排期',
          hint: '更现实 · 压力会上来',
          outcome: `你把实习与组内任务写进排期表，短期压力上升，但团队预期更清晰。`,
          effects: { stats: { admin: -1 }, student: { stress: 5, mentalState: -2 } },
        },
        {
          id: 'C',
          label: '让TA把offer当数据集：做个预测模型',
          hint: '整活 · 有小收益',
          outcome: `你把它变成一个小项目，团队气氛轻松了一点，也留下了点可写的素材。`,
          effects: { stats: { academia: 1, morale: 1 }, student: { contribution: 6, stress: 2 } },
        },
      ],
    }
  }

  if (category === 'runaway') {
    return {
      title: '校务通知/Notification：学生去留风波',
      prompt: `${name} 表示自己被长期实习/家庭安排/职业转向拖住，想暂时或永久退出课题组。你需要给出态度：挽留、放手，还是给一个缓冲期。`,
      options: [
        {
          id: 'A',
          label: '给缓冲期：先请假一季度',
          hint: '稳住关系 · 进度受影响',
          outcome: `你给了对方一个缓冲期，团队情绪更稳定，但短期产出会受影响。`,
          effects: { stats: { morale: 1 }, student: { stress: -2, mentalState: 2 } },
          meta: { studentAction: 'stay' },
        },
        {
          id: 'B',
          label: '严肃沟通：明确底线与任务',
          hint: '可能挽回 · 压力更大',
          outcome: `你把底线说清楚，对方暂时留下，但压力明显增加。`,
          effects: { stats: { admin: -1 }, student: { stress: 6, mentalState: -3 } },
          meta: { studentAction: 'stay' },
        },
        {
          id: 'C',
          label: '体面送别：祝TA前程似锦',
          hint: '短痛 · 声望小涨',
          outcome: `你选择成全，团队口碑上升，但需要重新分配工作。`,
          effects: { stats: { reputation: 1, morale: -1 }, student: { mentalState: 6, stress: -4 } },
          meta: { studentAction: 'leave' },
        },
      ],
    }
  }

  if (category === 'resource') {
    return {
      title: '校务通知/Notification：平台机时紧张',
      prompt:
        '校级共享平台发来通知：本季度 GPU/仪器机时异常紧张，需要各课题组提交优先级说明。你可以选择争取资源、按流程提交，或干脆换路线。',
      options: [
        {
          id: 'A',
          label: '强势争取优先级',
          hint: '收益大 · 消耗行政/心态',
          outcome: '你多方沟通争取到更好的排期，但也把自己消耗了一截。',
          effects: { stats: { admin: -2, morale: -1, academia: 1 } },
        },
        {
          id: 'B',
          label: '按流程提交材料',
          hint: '稳妥 · 进展一般',
          outcome: '材料顺利通过，资源够用但不宽裕。',
          effects: { stats: { admin: -1 } },
        },
        {
          id: 'C',
          label: '调整路线，先做轻量方案',
          hint: '保心态 · 牺牲一点效率',
          outcome: '你把节奏稳住，换取更可控的推进。',
          effects: { stats: { morale: 2 } },
        },
      ],
    }
  }

  return {
    title: '校务通知/Notification：季度例会安排',
    prompt: '学院下发季度例会与材料检查安排。你可以选择提前准备、临时抱佛脚，或把压力转移给流程工具。',
    options: [
      {
        id: 'A',
        label: '提前准备，材料一次过',
        hint: '省后患 · 当下更累',
        outcome: '你把材料一次性整理好，后续省了不少麻烦。',
        effects: { stats: { admin: -1, morale: -1, integrity: 1 } },
      },
      {
        id: 'B',
        label: '临时补齐，先过关再说',
        hint: '快 · 风险更高',
        outcome: '你赶在截止前提交了材料，但后续可能需要返工。',
        effects: { stats: { morale: -1 } },
      },
      {
        id: 'C',
        label: '上工具：模板+清单+自动化',
        hint: '稳节奏 · 小成本',
        outcome: '你用模板把流程固化，减少了很多重复劳动。',
        effects: { stats: { admin: 1, morale: 1, funding: -800 } },
      },
    ],
  }
}

export async function generateQuarterEvent({ category, mentor, stats, team, year, quarter, targetStudent }) {
  try {
    const response = await llmClient.generateText({
      systemPrompt,
      userPrompt: buildUserPrompt({ category, mentor, stats, team, year, quarter, targetStudent }),
    })
    const parsed = extractJson(response)
    const title = String(parsed?.title ?? '').trim()
    const prompt = String(parsed?.prompt ?? '').trim()
    const options = normalizeOptions(parsed?.options, category)
    if (!title || !prompt || !options) return fallbackEvent({ category, targetStudent })
    return { title, prompt, options }
  } catch (error) {
    console.warn('[QuarterEvent] generation failed, fallback.', error)
    return fallbackEvent({ category, targetStudent })
  }
}
