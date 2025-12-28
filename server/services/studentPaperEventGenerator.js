import { llmClient } from '../lib/llmClient.js'

const systemPrompt =
  '你是高校科研模拟器的随机事件生成助手。只输出严格 JSON，不要输出任何额外解释、Markdown 或代码块。'

const extractJson = (text) => {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch (error) {
    console.warn('[StudentPaperEvent] Failed to parse JSON payload.', error)
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

const normalizeOptions = (options) => {
  if (!Array.isArray(options)) return null
  const normalized = []
  for (const item of options.slice(0, 3)) {
    const id = String(item?.id ?? '').trim()
    const label = String(item?.label ?? '').trim()
    const outcome = String(item?.outcome ?? '').trim()
    if (!id || !label || !outcome) continue

    const hint = typeof item?.hint === 'string' ? item.hint.trim() : undefined
    const stats = normalizeDelta(item?.effects?.stats, {
      funding: { min: -15000, max: 25000 },
      reputation: { min: -2, max: 3 },
      morale: { min: -6, max: 6 },
      academia: { min: -4, max: 6 },
      admin: { min: -4, max: 6 },
      integrity: { min: -4, max: 6 },
    })
    const student = normalizeDelta(item?.effects?.student, {
      stress: { min: -10, max: 12 },
      mentalState: { min: -12, max: 12 },
      pendingPapers: { min: -1, max: 1 },
      totalPapers: { min: 0, max: 1 },
      contribution: { min: -60, max: 30 },
      diligence: { min: -4, max: 4 },
      talent: { min: -4, max: 4 },
      luck: { min: -4, max: 4 },
    })

    normalized.push({
      id,
      label,
      hint,
      outcome,
      effects: stats || student ? { ...(stats ? { stats } : {}), ...(student ? { student } : {}) } : undefined,
    })
  }

  return normalized.length >= 2 ? normalized : null
}

const buildUserPrompt = ({ student, mentor, year, quarter }) => {
  const safeStudent = student || {}
  const safeMentor = mentor || {}
  const name = safeStudent.name || '学生'
  const type = safeStudent.studentType || 'MASTER'
  const stage = typeof safeStudent.year === 'number' ? safeStudent.year : 1
  const pending = typeof safeStudent.pendingPapers === 'number' ? safeStudent.pendingPapers : 0
  const focus = safeMentor.researchFocus || '交叉研究'
  const dept = safeMentor.department || safeMentor.selectedDepartment || '学院'
  const disc = safeMentor.discipline || safeMentor.selectedDiscipline || '学科'

  return `背景：你正在生成一条“学生论文投稿/返修”随机事件，用于网页选择题。
时间：第 ${year} 年 Q${quarter}。
导师方向：${disc}-${dept}，研究方向：${focus}。
学生：${name}（类型：${type}，年级：${stage}），当前在投论文数：${pending}。

请输出严格 JSON，结构如下（字段必须存在；options 必须是 3 个选项）：
{
  "title": "事件标题（8-14字）",
  "prompt": "题干（1-2句，点出投稿等级/会议期刊/返修抉择）",
  "options": [
    {
      "id": "A",
      "label": "选项A（短）",
      "hint": "风险/成本提示（可选）",
      "outcome": "选择后的结果描述（1句）",
      "effects": {
        "stats": { "funding": -2000, "reputation": 1, "morale": -1 },
        "student": { "stress": 3, "mentalState": -2, "pendingPapers": 0, "totalPapers": 0 }
      }
    }
  ]
}

约束：
1) 事件要围绕“选择期刊/会议等级”与/或“收到外审返修如何处理”，贴近科研现实但不需要写具体刊会名称；
2) effects 的数值必须是整数，幅度要小：funding 在 [-15000, 25000]，reputation 在 [-2, 3]，morale 在 [-6, 6]；student.stress/mentalState 在 [-12, 12]；
3) 至少一个选项会让 pendingPapers 发生变化（-1 表示拒稿/撤稿/接收结案；0 表示继续在投；+1 表示新增一篇在投）；
4) 至少一个选项可能带来 totalPapers +1（代表接收发表），且通常伴随 reputation 上升；
5) 只输出 JSON，不要输出其他任何文本。`
}

const fallbackEvent = ({ student }) => {
  const name = student?.name || '学生'
  return {
    title: '论文投稿关键抉择',
    prompt: `${name} 有一篇论文到了关键节点：要冲顶会/期刊，还是选择更稳的刊会？`,
    options: [
      {
        id: 'A',
        label: '冲 A 档刊会',
        hint: '风险高 · 潜在收益大',
        outcome: '稿件进入激烈竞争，团队压力陡增。',
        effects: { student: { stress: 6, mentalState: -3, pendingPapers: 0 }, stats: { funding: -3000, morale: -1 } },
      },
      {
        id: 'B',
        label: '投 B 档期刊',
        hint: '稳中求进 · 周期更长',
        outcome: '稿件按部就班推进，换取更稳的外审节奏。',
        effects: { student: { stress: 2, mentalState: -1, pendingPapers: 0 }, stats: { funding: -1800 } },
      },
      {
        id: 'C',
        label: '转投 C 档稳妥刊会',
        hint: '成功率更高 · 收益较低',
        outcome: '稿件更快落地，士气略有回升。',
        effects: { student: { stress: -2, mentalState: 2, pendingPapers: -1, totalPapers: 1 }, stats: { reputation: 1, morale: 1 } },
      },
    ],
  }
}

export async function generateStudentPaperEvent({ student, mentor, year, quarter }) {
  try {
    const response = await llmClient.generateText({
      systemPrompt,
      userPrompt: buildUserPrompt({ student, mentor, year, quarter }),
    })
    const parsed = extractJson(response)
    const title = String(parsed?.title ?? '').trim()
    const prompt = String(parsed?.prompt ?? '').trim()
    const options = normalizeOptions(parsed?.options)
    if (!title || !prompt || !options) return fallbackEvent({ student })
    return { title, prompt, options }
  } catch (error) {
    console.warn('[StudentPaperEvent] generation failed, fallback.', error)
    return fallbackEvent({ student })
  }
}

