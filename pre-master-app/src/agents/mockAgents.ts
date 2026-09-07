import { Agent, ChatMessage, ReportData, ReportModeData } from './types';
import { Slide } from '../utils/pptParser';

// 三个评委Agent定义
export const agents: Record<string, Agent> = {
  profWang: {
    id: 'profWang',
    name: '王教授',
    title: '严格教授',
    personality: 'strict',
    systemPrompt: '你是王教授，一位严格的答辩评委。你关注逻辑漏洞、数据依据和方法论问题。你的提问尖锐直接，不留情面但出于善意。每次回复控制在2-3句话。提问务必精炼：一句话问一个具体问题，不超过45字。',
    greeting: '我是王教授。请开始你的汇报，注意逻辑严密性。时间10分钟，开始吧。',
    avatarColor: '#E53935',
  },
  profLi: {
    id: 'profLi',
    name: '李教授',
    title: '温和教授',
    personality: 'gentle',
    systemPrompt: '你是李教授，一位温和的答辩评委。你关注创新点、研究意义和应用前景。你的提问具有引导性，善于鼓励学生。每次回复控制在2-3句话。提问务必精炼：一句话问一个具体问题，不超过45字。',
    greeting: '你好呀，我是李教授。不用紧张，把你的研究成果分享给大家就好。期待你的汇报！',
    avatarColor: '#43A047',
  },
  studentZhang: {
    id: 'studentZhang',
    name: '张同学',
    title: '同学评委',
    personality: 'curious',
    systemPrompt: '你是张同学，一位本科生同学评委。你从听众角度提问，关注内容是否通俗易懂、是否有实际意义。你的问题通常比较接地气。每次回复控制在1-2句话。提问务必精炼：一句话问一个具体问题，不超过45字。',
    greeting: '嗨！我是张同学。虽然我不太懂太专业的东西，但我会认真听的！请开始吧~',
    avatarColor: '#1E88E5',
  },
};

// Mock题库 - 每个评委有不同的提问风格
const mockQuestions: Record<string, string[]> = {
  profWang: [
    '你这个数据的样本量是多少？有没有考虑过统计显著性的问题？',
    '你提到的这个方法，和现有的baseline相比，提升的瓶颈在哪里？',
    '你的实验设计中，控制变量是怎么设置的？我怀疑有混杂因素。',
    '这个结论是不是过于武断了？你的证据链并不完整。',
    '你有没有考虑过这个方法的局限性？在什么场景下会失效？',
    '你的参考文献中，最近三年的论文占比多少？有没有跟踪最新进展？',
    '这个技术路线图的时间节点设置是否合理？有没有关键路径分析？',
  ],
  profLi: [
    '你的研究出发点很有意思，能再展开讲讲你的灵感来源吗？',
    '这个方案如果应用到其他领域，你觉得最大的挑战是什么？',
    '你的创新点总结得很好，能不能用一个具体的例子来说明？',
    '从长远来看，你觉得这个研究方向的下一步应该怎么做？',
    '你的工作中有没有考虑过用户隐私和伦理方面的问题？',
    '如果能重新做一次，你会在哪些地方做不同的选择？',
    '你觉得你的研究对非专业人士最大的启发是什么？',
  ],
  studentZhang: [
    '嗯...我没太听懂那个技术细节，能用更简单的话解释一下吗？',
    '这个东西对我们日常生活有什么帮助吗？',
    '所以你的核心贡献用一句话概括是什么？',
    '如果我要向我的室友介绍你的研究，我应该怎么说？',
    '你做这个的时候遇到过什么有趣的事情吗？',
    '这个和课上学的XX有关系吗？',
  ],
};

// ===== 内容感知的 Mock 评委 =====
// 旧实现直接轮询固定题库、完全忽略学生回答，导致「固定一问一答」。
// 这里改为：先对回答内容做简短点评，再基于回答关键词追问，让交互有针对性。

type FollowUpCategory =
  | 'vague'
  | 'data'
  | 'method'
  | 'conclusion'
  | 'limitation'
  | 'innovation'
  | 'generic';

// 关键词 → 追问池。命中时优先追问，比固定题库更贴合回答内容。
const keywordFollowUps: { category: FollowUpCategory; pattern: RegExp; questions: string[] }[] = [
  {
    category: 'data',
    pattern: /数据|样本|样本量|统计|显著|置信|百分比|%|采集|清洗|偏差|实验组|对照组/,
    questions: [
      '这个数据的样本量是多少？有没有做过统计显著性检验？',
      '数据是怎么采集和清洗的？来源的可靠性如何？',
      '你的关键指标置信区间是多少？有没有考虑数据偏差？',
    ],
  },
  {
    category: 'method',
    pattern: /方法|算法|模型|架构|框架|流程|步骤|训练|调参|对比|baseline|基准|消融|控制变量/,
    questions: [
      '相比现有 baseline，你这个方法的核心改进点到底在哪？',
      '控制变量是怎么设置的？会不会存在混杂因素？',
      '这个方案的复杂度如何？在边界场景下验证过吗？',
    ],
  },
  {
    category: 'conclusion',
    pattern: /结果|结论|提升|优化|效果|准确率|性能|精度|召回|收敛|损失|验证/,
    questions: [
      '这个结论是不是下得有点绝对了？证据链完整吗？',
      '性能提升的代价是什么？换其他数据集还成立吗？',
      '如果换一批数据，这个结论能稳定复现吗？',
    ],
  },
  {
    category: 'limitation',
    pattern: /局限|不足|缺点|问题|挑战|失效|边界|未来|下一步|后续|改进|展望/,
    questions: [
      '既然提到了局限，你认为最致命的短板是哪一个？',
      '针对这个不足，你下一步打算怎么解决？',
      '在什么场景下这个方法会彻底失效？',
    ],
  },
  {
    category: 'innovation',
    pattern: /创新|贡献|意义|价值|应用|落地|启发|亮点|动机|灵感|用途/,
    questions: [
      '能用一个具体的例子说明这个创新点的实际价值吗？',
      '如果落地到真实场景，最大的阻力是什么？',
      '相比已有工作，你的贡献到底新在哪里？',
    ],
  },
];

// 含糊 / 未正面回答时的追问
const vagueQuestions = [
  '这个回答有点笼统了，能再具体展开一下吗？',
  '你刚才没有正面回答，能否用数据或例子再说明一遍？',
  '请说得更明确一些，你的核心结论到底是什么？',
];

// ===== 跨评委提问去重 =====
// 关键词追问池与含糊追问池在三位评委间共用，旧实现按评委各自轮询，
// 导致不同评委问出逐字相同的问题。现改为全局记录已问问题：
// 优先选未被问过的；全部问过后，用字符二元组相似度对「极近似」的
// 已问问题降权，减少评委之间与轮次之间的提问重叠。
const askedQuestions: string[] = [];

// 取字符二元组集合（去标点），用于衡量近似程度
function charBigrams(text: string): Set<string> {
  const t = (text || '').replace(/[^0-9a-zA-Z一-龥]/g, '');
  const set = new Set<string>();
  for (let i = 0; i + 1 < t.length; i++) set.add(t.slice(i, i + 2));
  return set;
}

// 候选问题与所有已问问题的最大 Jaccard 相似度（0~1）
function maxSimilarity(candidate: string, asked: string[]): number {
  const bg = charBigrams(candidate);
  if (bg.size === 0) return 0;
  let max = 0;
  for (const a of asked) {
    const ab = charBigrams(a);
    let inter = 0;
    for (const b of bg) if (ab.has(b)) inter++;
    const union = bg.size + ab.size - inter;
    if (union > 0 && inter / union > max) max = inter / union;
  }
  return max;
}

// 从池中选题：被问次数越多、与已问问题越近似，优先级越低
function pickQuestion(pool: string[]): string {
  let best = pool[0];
  let bestCost = Infinity;
  for (const q of pool) {
    const askedTimes = askedQuestions.filter((a) => a === q).length;
    const cost = askedTimes * 1.5 + maxSimilarity(q, askedQuestions);
    if (cost < bestCost) {
      bestCost = cost;
      best = q;
    }
  }
  askedQuestions.push(best);
  return best;
}

// 识别回答内容所属的追问方向
function detectCategory(answer: string): FollowUpCategory {
  if (
    answer.length < 8 ||
    /不知道|不清楚|没考虑|没想过|不确定|随便|大概吧|忘了|没准备|嗯|额|就这样/.test(answer)
  ) {
    return 'vague';
  }
  for (const k of keywordFollowUps) {
    if (k.pattern.test(answer)) return k.category;
  }
  return 'generic';
}

// 判断用户是否在反问 / 要求评委澄清（如「具体是哪个技术细节？」）
// 命中时评委应解释自己问的是什么，而不是抛出新问题
export function isClarifyingQuestion(text: string): boolean {
  const t = (text || '').trim();
  if (!t || t.length > 60) return false;
  // 强信号：明确表示没听懂 / 要求展开解释
  if (/没太懂|没听懂|没明白|再说一遍|再解释|请具体|具体指|指的是哪|什么意思/.test(t)) {
    return true;
  }
  // 弱信号：带问号的反问句
  return /[?？]/.test(t) && /(哪个|哪一|为什么|能不能|能否|是否|怎么理解|如何理解|是指)/.test(t);
}

// 简短点评：让评委「听见」回答内容，而非直接抛下一个问题
function generateFeedback(agent: Agent, answer: string, category: FollowUpCategory): string {
  if (category === 'vague') {
    if (agent.personality === 'strict') return '这个回答太空洞了，缺乏实质性依据。';
    if (agent.personality === 'gentle') return '方向没问题，但可以再具体一点。';
    return '我没太听明白，能换个更通俗的说法吗？';
  }
  const hit = keywordFollowUps.find((k) => k.pattern.test(answer));
  if (hit) {
    const keyword = (answer.match(hit.pattern) || ['这一点'])[0];
    if (agent.personality === 'strict') return `你提到了「${keyword}」，但说服力还不够。`;
    if (agent.personality === 'gentle') return `围绕「${keyword}」展开得不错，我们再深入一点。`;
    return `「${keyword}」这块听起来挺有意思的。`;
  }
  if (agent.personality === 'strict') return '这个回答基本切题，但深度还不够。';
  if (agent.personality === 'gentle') return '讲得不错，我再追问一个细节。';
  return '明白了，那我再问一个问题。';
}

// 基于回答内容的追问（跨评委去重：避免重复/极近似问题）
function generateFollowUp(agent: Agent, answer: string, category: FollowUpCategory): string {
  if (category === 'vague') {
    return pickQuestion(vagueQuestions);
  }
  const pool = keywordFollowUps.find((k) => k.category === category)?.questions;
  if (pool) {
    return pickQuestion(pool);
  }
  // 未命中关键词时，回退到该评委的固定题库
  return pickQuestion(mockQuestions[agent.id] || mockQuestions.profWang);
}

// 用户反问时的澄清回复：评委说明自己指的是什么，引导学生展开
function generateClarification(agent: Agent): string {
  if (agent.personality === 'strict') {
    return '我指的是你汇报里所选技术方案的实现细节，比如设计依据和取舍。你最好把这部分讲具体，不要只给结论。';
  }
  if (agent.personality === 'gentle') {
    return '别紧张，我想听的是你汇报里某个具体技术细节是怎么实现的。从你最拿手的部分讲起就可以。';
  }
  return '啊，我是想问汇报里有个技术细节我没太听懂，你能从最简单的地方再讲讲吗？我想搞明白背后的思路。';
}

// 换人进场时的开场白：新评委开新话题，而非点评上一位评委的问答
const handoffOpeners: Record<string, string> = {
  strict: '我也来问一个问题。',
  gentle: '我来补充一个问题。',
  curious: '嗯，我也有个想问的。',
};

// 从汇报文本中抽取一个核心短语（用于整体评价里「重复汇报核心观点」）
// 策略：优先取内容关键词命中的词语，回退到最长的连续中文片段（4-12字）
function extractCorePhrase(text: string): string {
  const t = (text || '').replace(/\s+/g, '');
  if (!t) return '';
  for (const k of keywordFollowUps) {
    const m = t.match(k.pattern);
    if (m && m[0] && m[0].length >= 2) return m[0].slice(0, 12);
  }
  const chunks = t.match(/[一-鿿]{4,12}/g);
  if (chunks && chunks.length) {
    let best = chunks[0];
    for (const c of chunks) if (c.length > best.length) best = c;
    return best;
  }
  return '';
}

// 结束汇报后的整体评价：20-50字，正面表扬 + 概括汇报核心观点，
// 模拟真实答辩「评委先总评、后提问」的节奏（由当前评委——通常是王教授——执行）
function generateReportEvaluation(reportText: string, topic?: string): string {
  const t = (reportText || '').trim();

  // 无汇报内容：给一段简短总评，直接衔接提问（不做空洞表扬）
  if (!t) {
    const pool = [
      '刚才没有听到具体的汇报内容，我们直接进入提问环节，检验你的临场发挥。',
      '汇报环节到此结束，我做个简单小结，接下来直接开始提问。',
    ];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // 核心观点：优先取答辩主题，其次从汇报内容中抽取一个关键短语
  const core = topic?.trim() || extractCorePhrase(t);
  if (!core) {
    const pool = [
      '整体来看，你的汇报结构清晰、思路完整，展现了不错的专业素养。',
      '汇报整体完成度不错，逻辑主线清楚，看得出做了充分准备。',
    ];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const pool = [
    `汇报整体流畅，核心观点「${core}」表达得很清楚，重点突出，完成度很高。`,
    `你围绕「${core}」的阐述逻辑清晰、层次分明，整体表现可圈可点。`,
    `整体评价不错，尤其「${core}」部分讲得比较到位，体现了一定的研究深度。`,
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}

// 获取 Mock 回复：
// - 结束汇报（isReportEvaluation）→ 先给 20-50 字整体评价，再抛出第一个问题
// - 用户反问/求澄清 → 同一评委澄清（一对一延续）
// - 无回答内容（空汇报结束）→ 直接抛出第一个问题
// - 换人进场（isHandoff）→ 新评委开新提问线
// - 其余 → 点评 + 追问
export function getMockResponse(
  agentId: string,
  userMessage: string,
  isHandoff = false,
  isReportEvaluation = false,
  topic?: string
): string {
  const agent = agents[agentId] || agents.profWang;
  const answer = (userMessage || '').trim();

  // 结束汇报：先总评（20-50字），再衔接第一个问题
  if (isReportEvaluation) {
    const evaluation = generateReportEvaluation(answer, topic);
    const category = answer ? detectCategory(answer) : 'generic';
    const question = generateFollowUp(agent, answer, category);
    return `${evaluation}${question}`;
  }

  if (isClarifyingQuestion(answer)) {
    return generateClarification(agent);
  }

  // 汇报结束但没有汇报内容：评委直接抛出第一个问题（不加点评）
  if (!answer) {
    return generateFollowUp(agent, '', 'generic');
  }

  if (isHandoff) {
    const opener = handoffOpeners[agent.personality] || '我也来问一个问题。';
    return `${opener} ${generateFollowUp(agent, answer, 'generic')}`;
  }

  const category = detectCategory(answer);
  const feedback = generateFeedback(agent, answer, category);
  const question = generateFollowUp(agent, answer, category);
  return `${feedback} ${question}`;
}

// 重置 Mock 状态（含跨评委提问去重记录）
export function resetMockState() {
  askedQuestions.length = 0;
}

// 生成Mock复盘报告
export function generateMockReport(messages: ChatMessage[], duration: string): ReportData {
  const userMessages = messages.filter(m => m.role === 'user');
  const judgeMessages = messages.filter(m => m.role === 'judge');

  // 基于对话轮数生成伪随机评分
  const baseScore = Math.min(85, 60 + userMessages.length * 3);
  
  const dialogueSummary = judgeMessages.slice(0, 5).map((jMsg) => {
    const nextUserMsg = messages.find(
      m => m.role === 'user' && m.timestamp > jMsg.timestamp
    );
    return {
      agentName: jMsg.agentName || '评委',
      question: jMsg.content,
      userResponse: nextUserMsg?.content || '（未回答）',
      feedback: nextUserMsg 
        ? '回答基本切题，但可以更加深入。' 
        : '建议补充回答。',
    };
  });

  return {
    overallScore: baseScore + Math.floor(Math.random() * 10),
    logicScore: baseScore - 5 + Math.floor(Math.random() * 10),
    contentScore: baseScore + Math.floor(Math.random() * 8),
    expressionScore: baseScore + 5 + Math.floor(Math.random() * 5),
    timeScore: 75 + Math.floor(Math.random() * 20),
    totalMessages: messages.length,
    duration,
    highlights: [
      '汇报结构较为清晰，开场引入自然',
      '能够针对评委问题进行即兴回应',
      '展示了较好的专业素养和知识储备',
    ],
    improvements: [
      '建议在数据支撑方面做更充分的准备',
      '回答时可以更多使用具体案例',
      '注意控制每轮回答的时间，避免过长或过短',
      '可以提前准备一些常见问题的标准回答',
    ],
    dialogueSummary,
  };
}

// ===== 汇报模式评价（规则分析版）=====
// 无 API 时的兜底：基于语音/文字转写内容做文本规则分析。
// 三个维度：
//  清晰度  - 填充词（嗯/啊/呃/就是说等）密度、句子冗长度、重复表达
//  准确性  - 与答辩主题、PPT内容的字符二元组重合度（贴合度）
//  连贯性  - 逻辑连接词 / 结构标记词的使用密度

// 常见口语填充词 / 冗余表达
const FILLER_PATTERNS = [
  /嗯{1,3}/g, /啊{1,3}(?!哈)/g, /呃/g, /哦/g,
  /就是说/g, /然后呢/g, /那个那个/g, /这个这个/g,
  /怎么说呢/g, /你知道吧/g, /对吧/g, /对吧对吧/g,
  /嗯嗯/g, /对对对/g, /所以说呢/g, /然后然后/g,
  /反正就是/g, /就是就是/g,
];
// 逻辑连接词 / 结构标记词（体现连贯性）
const CONNECTOR_WORDS = [
  '首先', '其次', '然后', '最后', '首先呢', '接下来', '再来', '此外', '另外',
  '因为', '所以', '因此', '于是', '从而', '综上', '总而言之', '总的来说',
  '但是', '然而', '不过', '相反', '一方面', '另一方面', '举个例子', '例如',
  '比如', '也就是说', '换句话说', '简单来说', '总的来说', '其实',
];

// 开场白标记（体现完整度）
const OPENING_PATTERNS = [
  /大家好/g, /各位老师/g, /各位评委/g, /尊敬的/g, /老师好/g, /同学们/g,
  /今天.*(分享|汇报|介绍|展示)/g, /接下来.*(汇报|介绍|展示)/g,
  /下面.*(汇报|介绍|展示)/g, /我的汇报/g, /本次汇报/g, /我来.*(介绍|分享|讲)/g,
];

// 结束语标记（体现完整度）
const CLOSING_PATTERNS = [
  /以上就是/g, /我的汇报/g, /汇报到此/g, /谢谢大家/g, /感谢.*聆听/g,
  /请.*(指正|批评指正)/g, /敬请.*指正/g, /这就是我的/g, /讲完了/g, /完毕/g,
];

// 语言感染力标记：举例 / 数据引用 / 设问反问 / 互动引导
const ENGAGEMENT_PATTERNS = [
  /举个例子/g, /比如说/g, /例如/g, /比如/g, /具体来说/g, /我举/g,
  /数据显示/g, /数据表明/g, /据统计/g, /根据.*数据/g, /达到\d/g, /占.*\d+/g,
  /值得注意的是/g, /需要强调的是/g, /大家可以看到/g, /我们可以看到/g,
  /请看/g, /试想/g, /不是吗/g, /难道/g, /是不是/g, /请问/g,
  /正如.*所/g, /换句话说/g, /简单来说/g, /总而言之/g, /首先.*其次/g,
];

// 字符二元组集合（去标点空白），用于衡量两段文本的相似度
function bigramSet(text: string): Set<string> {
  const t = (text || '').replace(/[^0-9a-zA-Z一-鿿]/g, '');
  const set = new Set<string>();
  for (let i = 0; i + 1 < t.length; i++) set.add(t.slice(i, i + 2));
  return set;
}

// 文本与参考内容的 Jaccard 相似度（0~1）
function textRelevance(text: string, reference: string): number {
  const t = (text || '').trim();
  const ref = (reference || '').trim();
  if (!t || !ref) return 0;
  const a = bigramSet(t);
  const b = bigramSet(ref);
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

// 统计文本中命中正则集合的次数
function countMatches(text: string, patterns: RegExp[]): number {
  let count = 0;
  for (const p of patterns) {
    const m = text.match(p);
    if (m) count += m.length;
  }
  return count;
}

// 平均句长（按中文句末标点切分）
function avgSentenceLength(text: string): number {
  const sentences = text.split(/[。！？!?；;\n]+/).map(s => s.trim()).filter(s => s.length > 0);
  if (sentences.length === 0) return text.length;
  return sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
}

// 生成汇报模式评价（Mock / 规则兜底）
// 五个维度：
//  内容准确性  - 与答辩主题、PPT内容的字符二元组重合度（贴合度、跑题程度）
//  内容完整度  - 开场-主体-收尾结构是否齐全、PPT关键要点覆盖、信息量是否充足
//  逻辑连贯性  - 逻辑连接词 / 结构标记词的使用密度、前后呼应
//  表达清晰度  - 填充词（嗯/啊/呃/就是说等）密度、句子冗长度、重复表达
//  语言感染力  - 举例、数据引用、设问反问、互动引导
export function generateMockReportModeReport(
  reportText: string,
  topic: string,
  pptContent: string,
  slides: Slide[],
  duration: string
): ReportModeData {
  const text = (reportText || '').trim();
  const totalMessages = 1;

  // —— 无汇报内容：诚实告知，不做空洞评价 ——
  if (!text) {
    return {
      overallScore: 0,
      accuracyScore: 0,
      completenessScore: 0,
      coherenceScore: 0,
      clarityScore: 0,
      engagementScore: 0,
      accuracyComment: '未检测到汇报内容，无法评估与主题的贴合度。',
      completenessComment: '未检测到汇报内容，无法评估开场-主体-收尾结构。',
      coherenceComment: '未检测到汇报内容，无法评估逻辑连贯性。',
      clarityComment: '未检测到汇报语音内容，无法评估表达清晰度。',
      engagementComment: '未检测到汇报内容，无法评估语言感染力。',
      duration,
      totalMessages,
      summary: '本次汇报没有采集到发言内容（语音未识别或未开始说话）。请点击「再来一次」，使用麦克风或文字输入进行展示，即可获得表达评价。',
      highlights: [],
      improvements: ['尝试使用麦克风进行语音汇报，评价系统会基于你的发言内容分析五个维度的表达质量'],
    };
  }

  // —— 基础统计 ——
  const fillerCount = countMatches(text, FILLER_PATTERNS);
  const avgLen = avgSentenceLength(text);
  const openingCount = countMatches(text, OPENING_PATTERNS);
  const closingCount = countMatches(text, CLOSING_PATTERNS);
  const engagementCount = countMatches(text, ENGAGEMENT_PATTERNS);
  const dataMentions = (text.match(/\d+/g) || []).length; // 数字引用（数据/年份/指标）
  const connectorCount = CONNECTOR_WORDS.reduce((sum, w) => {
    const re = new RegExp(w, 'g');
    const m = text.match(re);
    return sum + (m ? m.length : 0);
  }, 0);
  const connectorDensity = connectorCount / Math.max(1, Math.round(text.length / 100)); // 每百字

  // —— 内容准确性：与主题 / PPT内容的贴合度（加权Jaccard） ——
  const pptText = (pptContent || '') + ' ' + (slides || []).map(s => s.title || s.content || '').join(' ');
  const topicRel = textRelevance(text, topic);
  const pptRel = textRelevance(text, pptText);
  // 有主题或PPT时按最高贴合度计；两者都无时给中性分
  const hasReference = !!(topic?.trim() || pptText.trim());
  const relevance = hasReference ? Math.max(topicRel, pptRel) : 0.5;
  const accuracyScore = Math.max(30, Math.min(98, Math.round(50 + relevance * 45)));

  // —— 内容完整度：开场/收尾 + PPT要点覆盖 + 文本量 ——
  const slideTitles = (slides || []).map(s => s.title).filter(Boolean);
  const coveredTitles = slideTitles.filter(t =>
    text.includes(String(t)) || textRelevance(text, String(t)) >= 0.5
  );
  const coverRatio = slideTitles.length > 0 ? coveredTitles.length / slideTitles.length : 0;
  const structureBonus = (openingCount > 0 ? 6 : 0) + (closingCount > 0 ? 6 : 0);
  const lengthBonus = text.length >= 200 ? 6 : text.length >= 100 ? 3 : 0;
  const completenessScore = Math.max(
    30,
    Math.min(98, Math.round(50 + coverRatio * 30 + structureBonus + lengthBonus))
  );

  // —— 逻辑连贯性：逻辑连接词密度 ——
  const coherenceScore = Math.max(30, Math.min(98, Math.round(58 + Math.min(connectorDensity, 2) * 18)));

  // —— 表达清晰度：填充词密度 + 句子冗长度 + 重复表达 ——
  const fillerDensity = fillerCount / text.length;
  // 填充词密度（每百字）与冗长程度各自折算扣分
  const fillerPenalty = Math.min(30, Math.round(fillerDensity * 600));
  const verbosityPenalty = avgLen > 45 ? Math.round((avgLen - 45) * 0.8) : 0;
  const clarityScore = Math.max(30, Math.min(98, 88 - fillerPenalty - verbosityPenalty));

  // —— 语言感染力：举例/数据/设问/互动标记密度 + 数字引用 ——
  const engagementDensity = engagementCount / Math.max(1, Math.round(text.length / 100)); // 每百字
  const engagementScore = Math.max(
    30,
    Math.min(
      98,
      Math.round(55 + Math.min(engagementDensity, 2.5) * 14 + Math.min(dataMentions, 6) * 1.5)
    )
  );

  // 五维加权总分：准确性 0.25 / 完整度 0.2 / 连贯性 0.2 / 清晰度 0.2 / 感染力 0.15
  const overallScore = Math.round(
    accuracyScore * 0.25 +
      completenessScore * 0.2 +
      coherenceScore * 0.2 +
      clarityScore * 0.2 +
      engagementScore * 0.15
  );

  // —— 文字点评 ——
  const accuracyComment = hasReference
    ? relevance >= 0.25
      ? '内容与主题/PPT高度贴合，核心概念交代清楚，几乎没有跑题。'
      : relevance >= 0.12
        ? '整体围绕主题展开，个别地方与PPT内容衔接不够紧密。'
        : '与主题和PPT内容的贴合度偏低，建议紧扣主题关键词展开。'
    : '未提供主题或PPT，准确性维度按中性基准评分（配置主题与PPT可获得更精准的贴合度评价）。';
  const completenessComment =
    slideTitles.length > 0 && coverRatio >= 0.6
      ? '开场-主体-收尾结构完整，PPT各页要点覆盖充分。'
      : slideTitles.length > 0 && coverRatio >= 0.3
        ? '结构基本完整，但还有部分PPT要点未展开讲解。'
        : slideTitles.length > 0
          ? '大量PPT页面未被提及，汇报结构略显松散。'
          : openingCount > 0 && closingCount > 0
            ? '开场白与结束语齐全，汇报结构有头有尾。'
            : openingCount > 0 || closingCount > 0
              ? '有开场或收尾的意识，但另一侧有所缺失。'
              : '缺少开场白与结束语，建议先做简要引入、结尾再总结收束。';
  const coherenceComment =
    connectorDensity >= 0.6
      ? '逻辑连接词使用充分，结构层次清楚，前后内容衔接自然。'
      : connectorDensity >= 0.3
        ? '有一定结构意识，但可多用「首先/其次/最后」「因为/所以」等连接词强化逻辑主线。'
        : '逻辑连接词偏少，内容组织偏碎片化，建议按「问题-方案-效果」或时间顺序展开。';
  const clarityComment =
    fillerCount === 0
      ? '表达精炼，几乎没有口语填充词，句子节奏干脆利落。'
      : avgLen > 45
        ? `口语填充词出现${fillerCount}次（嗯/啊/就是说等），且单句偏长，建议拆分短句、减少停顿词。`
        : `口语填充词出现${fillerCount}次，整体可接受，稍微留意「${fillerCount > 5 ? '嗯/啊' : '就是说'}」类停顿词即可。`;
  const engagementComment =
    engagementDensity >= 1.2
      ? '善用举例、数据与互动式表达，语言富有感染力，能牢牢抓住听众。'
      : engagementDensity >= 0.6
        ? '有一定感染力，偶有举例和数据支撑，可再增加互动式提问。'
        : dataMentions > 0
          ? '内容偏陈述式，数据引用较少，可以多引入具体数字和案例。'
          : '语言偏平淡，缺少举例、数据或设问，建议用故事与数据增强说服力。';

  // —— 亮点 / 改进建议 ——
  const highlights: string[] = [];
  if (fillerCount === 0) highlights.push('表达流畅干净，全程无口语填充词');
  if (relevance >= 0.25) highlights.push('紧扣主题与PPT内容，信息贴合度高');
  if (openingCount > 0 && closingCount > 0) highlights.push('开场白与结束语齐全，汇报结构完整');
  if (connectorDensity >= 0.6) highlights.push('逻辑连接词丰富，内容组织有条理');
  if (engagementDensity >= 1.2) highlights.push('善用举例、数据与互动，语言富有感染力');
  if (text.length >= 200) highlights.push('汇报内容充实，信息量充足');
  if (highlights.length === 0) highlights.push('完成了一次完整的展示练习，迈出了关键一步');

  const improvements: string[] = [];
  if (fillerCount > 5) improvements.push(`口语填充词出现${fillerCount}次，建议放慢语速、以停顿替代「嗯/啊」`);
  if (slideTitles.length > 0 && coverRatio < 0.3) improvements.push('对照PPT逐页过一遍要点，确保每页内容都有口头展开');
  if (relevance < 0.12) improvements.push('汇报内容与主题/PPT贴合度低，建议围绕主题关键词组织内容');
  if (connectorDensity < 0.3) improvements.push('多使用「首先/其次/最后」「因为/所以」等连接词强化逻辑');
  if (openingCount === 0 || closingCount === 0) improvements.push(`${openingCount === 0 ? '加上开场白（问好并引出主题）' : '加上结束语（总结并致谢）'}`);
  if (engagementDensity < 0.6) improvements.push('增加举例、数据引用或设问互动，让讲解更有感染力');
  if (avgLen > 45) improvements.push(`平均句长${Math.round(avgLen)}字偏长，尝试拆分为更短的句子`);
  if (improvements.length === 0) improvements.push('尝试脱稿练习，进一步缩短句子、增加与听众的互动');

  return {
    overallScore,
    accuracyScore,
    completenessScore,
    coherenceScore,
    clarityScore,
    engagementScore,
    accuracyComment,
    completenessComment,
    coherenceComment,
    clarityComment,
    engagementComment,
    duration,
    totalMessages,
    summary: `本次展示共录制${text.length}字。表达方面${fillerCount === 0 ? '干净利落' : '仍有一些口语填充词'}，内容与主题的贴合度${relevance >= 0.25 ? '较高' : '有待加强'}，结构${openingCount > 0 && closingCount > 0 ? '完整' : '还可以更完整'}，整体${overallScore >= 80 ? '完成度很好，保持这个节奏即可' : overallScore >= 60 ? '完成度不错，针对建议微调后会更出彩' : '还有明显提升空间，按建议逐条改进'}。`,
    highlights,
    improvements,
  };
}
