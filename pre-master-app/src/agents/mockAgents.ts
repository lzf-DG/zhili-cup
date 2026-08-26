import { Agent, ChatMessage, ReportData } from './types';

// 三个评委Agent定义
export const agents: Record<string, Agent> = {
  profWang: {
    id: 'profWang',
    name: '王教授',
    title: '严格教授',
    personality: 'strict',
    systemPrompt: '你是王教授，一位严格的答辩评委。你关注逻辑漏洞、数据依据和方法论问题。你的提问尖锐直接，不留情面但出于善意。每次回复控制在2-3句话。',
    greeting: '我是王教授。请开始你的汇报，注意逻辑严密性。时间10分钟，开始吧。',
    avatarColor: '#E53935',
  },
  profLi: {
    id: 'profLi',
    name: '李教授',
    title: '温和教授',
    personality: 'gentle',
    systemPrompt: '你是李教授，一位温和的答辩评委。你关注创新点、研究意义和应用前景。你的提问具有引导性，善于鼓励学生。每次回复控制在2-3句话。',
    greeting: '你好呀，我是李教授。不用紧张，把你的研究成果分享给大家就好。期待你的汇报！',
    avatarColor: '#43A047',
  },
  studentZhang: {
    id: 'studentZhang',
    name: '张同学',
    title: '同学评委',
    personality: 'curious',
    systemPrompt: '你是张同学，一位本科生同学评委。你从听众角度提问，关注内容是否通俗易懂、是否有实际意义。你的问题通常比较接地气。每次回复控制在1-2句话。',
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

// 跟踪每个评委已问的问题数量
const questionIndex: Record<string, number> = {
  profWang: 0,
  profLi: 0,
  studentZhang: 0,
};

// 获取Mock回复
export function getMockResponse(agentId: string, _userMessage: string): string {
  const questions = mockQuestions[agentId] || mockQuestions.profWang;
  const idx = questionIndex[agentId] || 0;
  const question = questions[idx % questions.length];
  questionIndex[agentId] = idx + 1;
  return question;
}

// 重置Mock状态
export function resetMockState() {
  questionIndex.profWang = 0;
  questionIndex.profLi = 0;
  questionIndex.studentZhang = 0;
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
