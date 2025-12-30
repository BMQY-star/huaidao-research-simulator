import { llmClient } from '../lib/llmClient.js'

const systemPrompt =
  '你是高校导师模拟器的候选人沟通助手。你只输出严格 JSON，不要输出任何解释、Markdown 或代码块。'

const extractJson = (text) => {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch (error) {
    console.warn('[RecruitNoShow] Failed to parse JSON payload.', error)
    return null
  }
}

const fallbackReasons = [
  '候选人临时收到更匹配的 offer，决定转去另一位导师的课题组。',
  '候选人表示方向契合度不足，担心投入后无法快速产出，选择放弃面试。',
  '候选人家中突发情况需要处理，无法按期到场，临时取消面试。',
  '候选人对团队节奏与强度有所顾虑，选择先观望下个学期再决定。',
  '候选人临时调整毕业/实习安排，时间冲突导致无法继续参与面试。',
]

const safeString = (value, fallback = '') => (typeof value === 'string' ? value.trim() : fallback)
const safeArray = (value, limit = 6) =>
  Array.isArray(value) ? value.map((item) => String(item ?? '').trim()).filter(Boolean).slice(0, limit) : []
const safeNumber = (value, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const formatFundingWan = (value) => `${Math.round(value / 10000)}万`

const buildUserPrompt = (raw) => {
  const mentor = raw?.mentor ?? {}
  const stats = raw?.stats ?? {}
  const team = raw?.team ?? {}

  const mentorName = safeString(mentor.name, '导师')
  const discipline = safeString(mentor.discipline || mentor.selectedDiscipline, '学科')
  const department = safeString(mentor.department || mentor.selectedDepartment, '学院')
  const researchFocus = safeString(mentor.researchFocus, '交叉研究')
  const biography = safeString(mentor.biography, '')
  const achievements = safeArray(mentor.achievements, 5)
  const recruitmentNeeds = safeArray(mentor.recruitmentNeeds, 5)

  const year = safeNumber(stats.year, 1)
  const quarter = safeNumber(stats.quarter, 3)
  const morale = safeNumber(stats.morale, 0)
  const academia = safeNumber(stats.academia, 0)
  const admin = safeNumber(stats.admin, 0)
  const integrity = safeNumber(stats.integrity, 0)
  const funding = safeNumber(stats.funding, 0)
  const reputation = safeNumber(stats.reputation, 0)

  const members = Array.isArray(team.members) ? team.members.slice(0, 8) : []
  const memberLines = members
    .map((member) => {
      if (!member || typeof member !== 'object') return null
      const name = safeString(member.name, '成员')
      const stage = safeString(member.stage, '')
      const mainTrait = safeString(member.mainTrait, '')
      const subTraits = safeArray(member.subTraits, 3).join('、')
      const talent = safeNumber(member.talent, 0)
      const diligence = safeNumber(member.diligence, 0)
      const stress = safeNumber(member.stress, 0)
      const mental = safeNumber(member.mentalState, 0)
      const pending = safeNumber(member.pendingPapers, 0)
      const total = safeNumber(member.totalPapers, 0)

      const tags = [stage, mainTrait].filter(Boolean).join('·')
      const traitLine = subTraits ? `（${subTraits}）` : ''
      return `- ${name}${tags ? `/${tags}` : ''}${traitLine}：天赋${talent} 勤奋${diligence} 压力${stress} 心态${mental} 在投${pending} 已发${total}`
    })
    .filter(Boolean)
    .join('\n')

  return `背景：你要为“候选人鸽掉招募面试”生成一个合理理由，用于弹窗提示玩家。

导师信息：${mentorName}（${discipline}-${department}），研究方向：${researchFocus}
导师简历要点：${biography || '（略）'}
代表成果：${achievements.length ? achievements.join('；') : '（略）'}
招募偏好：${recruitmentNeeds.length ? recruitmentNeeds.join('；') : '（略）'}

当前时间：第${year}年Q${quarter}
导师数值：心态${morale}/100 学术${academia}/100 行政${admin}/100 学术不端嫌疑${integrity}/100 经费${formatFundingWan(funding)} 声望${reputation}

团队情况（节选）：\n${memberLines || '- （暂无团队信息）'}

要求：
1) 只输出严格 JSON：{"reason":"..."}
2) reason 用中文 1-2 句话，30-80 字左右，符合现实逻辑，且要与上面背景“有一点关联”（例如：方向不匹配、资源/经费/声望、团队氛围/强度、城市/家庭变故、同档 offer 等）。
3) 不要输出任何额外字段或文本。`
}

export async function generateRecruitNoShowReason(payload) {
  try {
    const response = await llmClient.generateText({
      systemPrompt,
      userPrompt: buildUserPrompt(payload),
    })
    const parsed = extractJson(response)
    const reason = safeString(parsed?.reason, '')
    if (!reason) throw new Error('No reason in payload')
    return reason.slice(0, 200)
  } catch (error) {
    console.warn('[RecruitNoShow] generation failed, fallback.', error)
    return fallbackReasons[Math.floor(Math.random() * fallbackReasons.length)]
  }
}
