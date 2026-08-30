import { Agent, ChatMessage, ReportData } from './types';

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
    const agent = Object.values(agents).find(a => a.id === jMsg.agentId);
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
