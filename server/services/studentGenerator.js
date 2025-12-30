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
  { id: 'selfdriven', name: '自驱型', category: 'main' },
  { id: 'jinx', name: '倒霉蛋', category: 'main' },
  { id: 'slacker', name: '摸鱼', category: 'main' },
  { id: 'perpetual', name: '内卷永动机', category: 'sub' },
  { id: 'nightcoder', name: '深夜修复侠', category: 'sub' },
  { id: 'pptmaster', name: '幻灯片大师', category: 'sub' },
  { id: 'coffee', name: '咖咖续命', category: 'sub' },
  { id: 'luckycat', name: '玄学转运家', category: 'sub' },
  { id: 'bughunter', name: 'Bug召唤者', category: 'sub' },
  { id: 'deadline', name: '死线战神', category: 'sub' },
  { id: 'overthink', name: '脑内风暴', category: 'sub' },
  { id: 'toughsoft', name: '嘴硬心软', category: 'sub' },
  { id: 'tidy', name: '桌面洁癖', category: 'sub' },
  { id: 'paperpolisher', name: '论文抛光师', category: 'sub' },
  { id: 'citationcleaner', name: '引用洁癖', category: 'sub' },
  { id: 'bibhunter', name: '参考文献猎人', category: 'sub' },
  { id: 'keywordsniper', name: '关键词狙击手', category: 'sub' },
  { id: 'abstractsmith', name: '摘要锻造师', category: 'sub' },
  { id: 'titlealchemy', name: '标题炼金术', category: 'sub' },
  { id: 'introexploder', name: '引言爆破手', category: 'sub' },
  { id: 'methodguardian', name: '方法守门员', category: 'sub' },
  { id: 'controlmaster', name: '控制变量大师', category: 'sub' },
  { id: 'ablationfan', name: '消融爱好者', category: 'sub' },
  { id: 'figureartist', name: '图表美术生', category: 'sub' },
  { id: 'chartwhisperer', name: '可视化低语者', category: 'sub' },
  { id: 'colortrouble', name: '配色灾难家', category: 'sub' },
  { id: 'latexknight', name: 'LaTeX骑士', category: 'sub' },
  { id: 'formulafixer', name: '公式排版狂', category: 'sub' },
  { id: 'reviewertranslator', name: '审稿翻译机', category: 'sub' },
  { id: 'revisionmonk', name: '返修苦行僧', category: 'sub' },
  { id: 'calmreviser', name: '冷静返修派', category: 'sub' },
  { id: 'rejectionresistant', name: '退稿抗性体', category: 'sub' },
  { id: 'scopecreep', name: '需求膨胀体', category: 'sub' },
  { id: 'schedulepriest', name: '日程祭司', category: 'sub' },
  { id: 'checklistaddict', name: '清单成瘾', category: 'sub' },
  { id: 'notetaker', name: '会议速记员', category: 'sub' },
  { id: 'stickywizard', name: '便签法师', category: 'sub' },
  { id: 'backupkeeper', name: '备份守护者', category: 'sub' },
  { id: 'cloudnomad', name: '云盘游牧民', category: 'sub' },
  { id: 'usbghost', name: 'U盘失踪术', category: 'sub' },
  { id: 'namingchaos', name: '命名灾难家', category: 'sub' },
  { id: 'folderarchitect', name: '目录规划师', category: 'sub' },
  { id: 'gitwanderer', name: 'Git迷路侠', category: 'sub' },
  { id: 'branchgardener', name: '分支园丁', category: 'sub' },
  { id: 'readmeevader', name: 'README逃避症', category: 'sub' },
  { id: 'logkeeper', name: '记录强迫症', category: 'sub' },
  { id: 'reproducibilitycop', name: '复现警察', category: 'sub' },
  { id: 'seedkeeper', name: '随机种子守护者', category: 'sub' },
  { id: 'envtamer', name: '环境驯兽师', category: 'sub' },
  { id: 'dependencydiver', name: '依赖深潜者', category: 'sub' },
  { id: 'versionhell', name: '版本地狱客', category: 'sub' },
  { id: 'compilewhisperer', name: '编译器低语者', category: 'sub' },
  { id: 'regexmage', name: '正则魔法师', category: 'sub' },
  { id: 'scriptkid', name: '脚本小能手', category: 'sub' },
  { id: 'pipelinebuilder', name: '流水线搭建者', category: 'sub' },
  { id: 'datacleaner', name: '数据清洗狂', category: 'sub' },
  { id: 'missingvaluedetective', name: '缺失值侦探', category: 'sub' },
  { id: 'outlierwrangler', name: '离群点驯服者', category: 'sub' },
  { id: 'samplingnerd', name: '抽样洁癖', category: 'sub' },
  { id: 'smallsamplewarrior', name: '小样本勇士', category: 'sub' },
  { id: 'largedatabeliever', name: '大样本信徒', category: 'sub' },
  { id: 'pvalueaddict', name: '显著性执念', category: 'sub' },
  { id: 'statsstoryteller', name: '统计讲故事', category: 'sub' },
  { id: 'overfitprone', name: '过拟合体质', category: 'sub' },
  { id: 'regularizationfan', name: '正则化信徒', category: 'sub' },
  { id: 'abtestfan', name: 'A/B试验控', category: 'sub' },
  { id: 'baselinerguard', name: 'Baseline守门员', category: 'sub' },
  { id: 'hyperparamshaman', name: '超参玄学家', category: 'sub' },
  { id: 'tuningmaniac', name: '调参狂魔', category: 'sub' },
  { id: 'gpuwarden', name: 'GPU守夜人', category: 'sub' },
  { id: 'clusterwhisperer', name: '集群低语者', category: 'sub' },
  { id: 'queuefighter', name: '队列斗士', category: 'sub' },
  { id: 'memoryleakprone', name: '内存泄漏体', category: 'sub' },
  { id: 'segfaultmagnet', name: '段错误亲和体', category: 'sub' },
  { id: 'quickfixer', name: '临时补丁派', category: 'sub' },
  { id: 'refactoraddict', name: '重构洁癖', category: 'sub' },
  { id: 'codepoet', name: '注释诗人', category: 'sub' },
  { id: 'testskeptic', name: '测试不信者', category: 'sub' },
  { id: 'unittestlover', name: '单测拥护者', category: 'sub' },
  { id: 'docwriter', name: '文档写手', category: 'sub' },
  { id: 'meetinghost', name: '组会主持人', category: 'sub' },
  { id: 'pitchstar', name: '路演天赋', category: 'sub' },
  { id: 'posterdesigner', name: '海报设计师', category: 'sub' },
  { id: 'animationaddict', name: '动画上头', category: 'sub' },
  { id: 'timekeeper', name: '掐点提交', category: 'sub' },
  { id: 'deadlinepanic', name: '截止恐惧', category: 'sub' },
  { id: 'procrastinator', name: '拖延症晚期', category: 'sub' },
  { id: 'burstworker', name: '三天爆肝', category: 'sub' },
  { id: 'inconsistent', name: '三分钟热度', category: 'sub' },
  { id: 'earlybird', name: '早八战士', category: 'sub' },
  { id: 'nightowl', name: '夜猫子', category: 'sub' },
  { id: 'coffeeaddict', name: '咖啡过量', category: 'sub' },
  { id: 'teadrinker', name: '茶水续航', category: 'sub' },
  { id: 'snackoptimizer', name: '零食优化师', category: 'sub' },
  { id: 'moodbuffer', name: '情绪缓冲垫', category: 'sub' },
  { id: 'praiseengine', name: '夸夸发动机', category: 'sub' },
  { id: 'conflictresolver', name: '冲突协调员', category: 'sub' },
  { id: 'collaborationking', name: '横向合作王', category: 'sub' },
  { id: 'crosscampusrunner', name: '跨院系穿梭者', category: 'sub' },
  { id: 'resourcehunter', name: '资源猎手', category: 'sub' },
  { id: 'grantwriter', name: '本子写作机', category: 'sub' },
  { id: 'budgethawk', name: '经费小算盘', category: 'sub' },
  { id: 'printerkiller', name: '打印机克星', category: 'sub' },
]

const traitMap = new Map(traitCatalog.map((trait) => [trait.id, trait]))
const traitNameMap = new Map(traitCatalog.map((trait) => [trait.name, trait.id]))
traitNameMap.set('啡续命', 'coffee')
const mainTraitIds = traitCatalog.filter((trait) => trait.category === 'main').map((trait) => trait.id)
const subTraitIds = traitCatalog.filter((trait) => trait.category === 'sub').map((trait) => trait.id)

const chunkBy = (items, size) => {
  const chunks = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

const formatTraitNameList = (names, chunkSize) =>
  chunkBy(names, chunkSize)
    .map((chunk) => chunk.join('、'))
    .join('、\n')

const mainTraitNameList = formatTraitNameList(
  traitCatalog.filter((trait) => trait.category === 'main').map((trait) => trait.name),
  12,
)
const subTraitNameList = formatTraitNameList(
  traitCatalog.filter((trait) => trait.category === 'sub').map((trait) => trait.name),
  16,
)

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
  const main = pickOne(mainTraitIds) || 'steady'
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
4. 主特质可从：${mainTraitNameList} 中选。
5. 副特质可从：${subTraitNameList} 中选。`
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
