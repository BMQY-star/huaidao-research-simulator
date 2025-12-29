import { randomUUID } from 'node:crypto'
import { llmClient } from '../lib/llmClient.js'

const traitCatalog = [
  { id: 'koi', name: '锦鲤', category: 'main' },
  { id: 'ouhuang', name: '欧皇', category: 'main' },
  { id: 'workaholic', name: '卷王', category: 'main' },
  { id: 'genius', name: '学霸', category: 'main' },
  { id: 'steady', name: '稳健派', category: 'main' },
  { id: 'social', name: '社交达人', category: 'main' },
  { id: 'coachable', name: '好带', category: 'main' },
  { id: 'creative', name: '灵感型', category: 'main' },
  { id: 'pragmatic', name: '务实派', category: 'main' },
  { id: 'rebel', name: '特立独行', category: 'main' },
  { id: 'average', name: '资质平平', category: 'main' },
  { id: 'jinx', name: '倒霉蛋', category: 'main' },
  { id: 'volatile', name: '心态不稳', category: 'main' },
  { id: 'stubborn', name: '固执己见', category: 'main' },
  { id: 'slacker', name: '摸鱼', category: 'main' },
  { id: 'perpetual', name: '内卷永动机', category: 'sub' },
  { id: 'nightcoder', name: '深夜修复侠', category: 'sub' },
  { id: 'pptmaster', name: '幻灯片大师', category: 'sub' },
  { id: 'coffee', name: '啡续命', category: 'sub' },
  { id: 'luckycat', name: '玄学转运家', category: 'sub' },
  { id: 'bughunter', name: 'Bug召唤者', category: 'sub' },
  { id: 'deadline', name: '死线战神', category: 'sub' },
  { id: 'overthink', name: '脑内风暴', category: 'sub' },
  { id: 'toughsoft', name: '嘴硬心软', category: 'sub' },
  { id: 'tidy', name: '桌面洁癖', category: 'sub' },
]

const traitMap = new Map(traitCatalog.map((trait) => [trait.id, trait]))
const traitNameMap = new Map(traitCatalog.map((trait) => [trait.name, trait.id]))
const mainTraitIds = traitCatalog.filter((trait) => trait.category === 'main').map((trait) => trait.id)
const subTraitIds = traitCatalog.filter((trait) => trait.category === 'sub').map((trait) => trait.id)

const sampleStudents = [
  {
    id: 'seed-master-1',
    name: '王书晴',
    studentType: 'MASTER',
    year: 1,
    diligence: 72,
    stress: 18,
    talent: 66,
    luck: 58,
    hiddenLuck: 82,
    contribution: 12,
    pendingPapers: 0,
    totalPapers: 0,
    isLoadingPersona: false,
    mentalState: 96,
    isBeingMentored: false,
    isGenius: false,
    recruitedYear: 1,
    isYoungTeacher: false,
    personality: '牛马',
    bio:
      '王书晴，某C9联盟计算机科学与技术学院硕士生，偏好把实验流程写成检查清单。不算天才但非常稳定，能在冗长任务里保持节奏。日常状态是抱着咖啡守着服务器，口头禅是先跑起来再优化。',
    traits: ['卷王', '内卷永动机', '嘴硬心软'],
    whipReactions: {
      success: ['收到！今晚把实验跑完，争取明早给您一版结果。'],
      fail: ['老师，我的CPU已经冒烟了，我再试试补救方案。'],
    },
    comfortReactions: {
      success: ['谢谢老师，我会把进度再往前推一点。'],
      fail: ['我先缓一口气，等脑子转过来再继续。'],
    },
    department: '计算机科学与技术学院',
    hasWhippedThisQuarter: false,
    hasComfortedThisQuarter: false,
  },
]

const fallbackFamilyNames = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '吴', '周', '徐', '孙']
const fallbackGivenNameChars = ['子', '文', '浩', '琪', '轩', '瑶', '宁', '辰', '雨', '航', '思', '睿', '一', '然']

const generateFallbackName = () => {
  const family = fallbackFamilyNames[Math.floor(Math.random() * fallbackFamilyNames.length)]
  const given = fallbackGivenNameChars[Math.floor(Math.random() * fallbackGivenNameChars.length)]
  const given2 =
    Math.random() < 0.45 ? fallbackGivenNameChars[Math.floor(Math.random() * fallbackGivenNameChars.length)] : ''
  return `${family}${given}${given2}`
}

const pickOne = (items) => items[Math.floor(Math.random() * items.length)]
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pickMany = (items, count) => {
  const pool = [...items]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

const buildFallbackTraits = () => {
  const main = pickOne(mainTraitIds) || 'average'
  const subs = pickMany(subTraitIds, randomInt(2, 3))
  return [main, ...subs]
}

const buildStudentId = () => `student-${randomUUID()}`

const studentSystemPrompt =
  'You are a narrative generator for a tenure-track faculty simulator. Respond ONLY with strict JSON.'

const buildStudentPrompt = ({ mentor, department, researchFocus, count }) => {
  const safeMentor = mentor || '导师'
  const safeDept = department || '学院'
  const focus = researchFocus || '交叉科研方向'
  return `为导师“${safeMentor}”（所属${safeDept}，研究方向${focus}）生成 ${count} 名研究团队成员。
严格按照以下 JSON 结构输出数组：[
  {
    "name": "中文姓名",
    "studentType": "MASTER",
    "year": 1,
    "diligence": 0-100,
    "stress": 0-100,
    "talent": 0-100,
    "luck": 0-100,
    "hiddenLuck": 0-100,
    "contribution": 0,
    "pendingPapers": 0,
    "totalPapers": 0,
    "isLoadingPersona": false,
    "mentalState": 80-100,
    "isBeingMentored": false,
    "isGenius": boolean,
    "recruitedYear": 1-6,
    "isYoungTeacher": false,
    "personality": "2-4字口吻标签（例如：牛马、实干派）",
    "bio": "150-240字生动简介，强调科研状态与个人风格，语气真实带一点幽默",
    "traits": ["主特质1个（人格型）", "副特质2-3个（诙谐型）"],
    "whipReactions": {
      "success": ["被鞭策后积极反应 1-2 条"],
      "fail": ["被鞭策后抱怨反应 1-2 条"]
    },
    "comfortReactions": {
      "success": ["被安抚后回暖反应 1-2 条"],
      "fail": ["被安抚后无效反应 1-2 条"]
    },
    "department": "${safeDept}",
    "hasWhippedThisQuarter": false,
    "hasComfortedThisQuarter": false
  }
]

要求：
1. 只返回 JSON 数组，不要 Markdown。
2. 学生均为研一（studentType 固定 MASTER，year 固定 1）。
3. traits 使用人格型主特质 + 诙谐副特质组合，主特质只 1 个，副特质 2-3 个。
4. 主特质可从：锦鲤、欧皇、卷王、学霸、稳健派、社交达人、好带、灵感型、务实派、特立独行、资质平平、倒霉蛋、心态不稳、固执己见、摸鱼 中选。
5. 副特质可从：内卷永动机、深夜修复侠、幻灯片大师、啡续命、玄学转运家、Bug召唤者、死线战神、脑内风暴、嘴硬心软、桌面洁癖 中选。`
}

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Number(value) || 0))

const normalizeTraits = (input) => {
  if (!input) return []
  if (Array.isArray(input)) return input
  if (typeof input === 'object') {
    const main = input.main ? [input.main] : []
    const sub = Array.isArray(input.sub) ? input.sub : []
    return [...main, ...sub]
  }
  return []
}

const normalizeStudent = (student, index, defaults) => {
  const fallback = sampleStudents[index % sampleStudents.length]
  const rawTraits = normalizeTraits(student.traits)
  const mappedTraits = rawTraits
    .map((trait) => {
      if (traitMap.has(trait)) return trait
      return traitNameMap.get(trait)
    })
    .filter(Boolean)
  const fallbackTraits = normalizeTraits(fallback.traits)
    .map((trait) => {
      if (traitMap.has(trait)) return trait
      return traitNameMap.get(trait)
    })
    .filter(Boolean)
  return {
    id: buildStudentId(),
    name: student.name || fallback.name,
    studentType: student.studentType || fallback.studentType,
    year: student.year || fallback.year,
    diligence: clamp(student.diligence ?? fallback.diligence),
    stress: clamp(student.stress ?? fallback.stress),
    talent: clamp(student.talent ?? fallback.talent),
    luck: clamp(student.luck ?? fallback.luck),
    hiddenLuck: clamp(student.hiddenLuck ?? fallback.hiddenLuck),
    contribution: clamp(student.contribution ?? fallback.contribution),
    pendingPapers: clamp(student.pendingPapers ?? fallback.pendingPapers),
    totalPapers: clamp(student.totalPapers ?? fallback.totalPapers),
    isLoadingPersona: Boolean(student.isLoadingPersona ?? fallback.isLoadingPersona ?? false),
    mentalState: clamp(student.mentalState ?? fallback.mentalState),
    isBeingMentored: typeof student.isBeingMentored === 'boolean' ? student.isBeingMentored : fallback.isBeingMentored,
    isGenius: typeof student.isGenius === 'boolean' ? student.isGenius : fallback.isGenius,
    recruitedYear: student.recruitedYear || fallback.recruitedYear,
    isYoungTeacher: typeof student.isYoungTeacher === 'boolean' ? student.isYoungTeacher : fallback.isYoungTeacher,
    personality: student.personality || fallback.personality,
    bio: student.bio || fallback.bio,
    traits: mappedTraits.length ? mappedTraits.slice(0, 4) : fallbackTraits,
    whipReactions: {
      success: student.whipReactions?.success?.length ? student.whipReactions.success.slice(0, 2) : fallback.whipReactions.success,
      fail: student.whipReactions?.fail?.length ? student.whipReactions.fail.slice(0, 2) : fallback.whipReactions.fail,
    },
    comfortReactions: {
      success: student.comfortReactions?.success?.length
        ? student.comfortReactions.success.slice(0, 2)
        : fallback.comfortReactions.success,
      fail: student.comfortReactions?.fail?.length
        ? student.comfortReactions.fail.slice(0, 2)
        : fallback.comfortReactions.fail,
    },
    department: student.department || defaults.department || fallback.department,
    hasWhippedThisQuarter: Boolean(student.hasWhippedThisQuarter ?? fallback.hasWhippedThisQuarter ?? false),
    hasComfortedThisQuarter: Boolean(student.hasComfortedThisQuarter ?? fallback.hasComfortedThisQuarter ?? false),
  }
}

const fallbackStudents = (count, defaults) =>
  Array.from({ length: count }).map((_, index) => {
    const name = generateFallbackName()
    const personalityPool = ['稳扎稳打', '社交达人', '点子王', '夜猫子', '务实派', '嘴硬心软', '卷王']
    return normalizeStudent(
      {
        name,
        studentType: 'MASTER',
        year: 1,
        diligence: randomInt(55, 92),
        stress: randomInt(10, 34),
        talent: randomInt(55, 92),
        luck: randomInt(38, 90),
        hiddenLuck: randomInt(40, 96),
        contribution: 0,
        pendingPapers: 0,
        totalPapers: 0,
        isLoadingPersona: false,
        mentalState: randomInt(82, 100),
        isBeingMentored: false,
        isGenius: Math.random() < 0.12,
        recruitedYear: 1,
        isYoungTeacher: false,
        personality: pickOne(personalityPool),
        bio: `${name}，${defaults.department || '某学院'}研一学生。习惯把任务拆分成清单推进，对细节敏感，偶尔会在截止日期前突然爆发。`,
        traits: buildFallbackTraits(),
        whipReactions: {
          success: ['收到！我会把进度拆成小目标，今晚先交一版结果。', '明白，马上安排实验并同步记录。'],
          fail: ['我会先把问题定位清楚再继续推进，稍后给您一个可行方案。', '我有点卡住了，想先整理思路再加速。'],
        },
        comfortReactions: {
          success: ['谢谢老师，我缓过来了，继续推进。', '收到关照，我会把节奏稳住。'],
          fail: ['我先缓一缓，调整下状态再继续。', '我会尽量恢复专注，别担心。'],
        },
        department: defaults.department,
        hasWhippedThisQuarter: false,
        hasComfortedThisQuarter: false,
      },
      index,
      defaults,
    )
  })

const extractJsonArray = (text) => {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1))
    } catch (error) {
      console.warn('[StudentGenerator] Failed to parse JSON array payload.', error)
    }
  }
  const objStart = text.indexOf('{')
  const objEnd = text.lastIndexOf('}')
  if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
    try {
      const parsed = JSON.parse(text.slice(objStart, objEnd + 1))
      return Array.isArray(parsed) ? parsed : [parsed]
    } catch (error) {
      console.warn('[StudentGenerator] Failed to parse JSON object payload.', error)
    }
  }
  return null
}

export async function generateStudentPersonas({ mentor, department, researchFocus, count = 3 }) {
  const normalizedCount = Number.isFinite(count) && count > 0 ? Math.min(6, Math.max(1, Math.round(count))) : 3
  try {
    const response = await llmClient.generateText({
      systemPrompt: studentSystemPrompt,
      userPrompt: buildStudentPrompt({ mentor, department, researchFocus, count: normalizedCount }),
    })
    const parsed = extractJsonArray(response)
    if (!parsed?.length) {
      console.warn('[StudentGenerator] Empty response, fallback to samples.')
      return fallbackStudents(normalizedCount, { department })
    }
    return parsed.slice(0, normalizedCount).map((entry, index) => normalizeStudent(entry, index, { department }))
  } catch (error) {
    console.warn('[StudentGenerator] generation failed, fallback to samples.', error)
    return fallbackStudents(normalizedCount, { department })
  }
}
