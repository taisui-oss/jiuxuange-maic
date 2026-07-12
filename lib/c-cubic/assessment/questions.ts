export const ASSESSMENT_VERSION = 'jiuxuange-six-elements-assessment.v1';

export type AssessmentQuestionFocus =
  | 'fact-identification'
  | 'concept-boundary'
  | 'six-elements-linkage'
  | 'causal-judgment'
  | 'counterevidence-condition'
  | 'project-transfer';

export interface AssessmentQuestion {
  id: string;
  version: 'v1';
  focus: AssessmentQuestionFocus;
  prompt: string;
}

export const FIXED_ASSESSMENT_QUESTIONS: readonly AssessmentQuestion[] = [
  {
    id: 'fact-identification',
    version: 'v1',
    focus: 'fact-identification',
    prompt: '从便利蜂或生鲜案例中，你能写出哪条可定位的事实并说明它来自何处？',
  },
  {
    id: 'concept-boundary',
    version: 'v1',
    focus: 'concept-boundary',
    prompt: '结合一个案例，你会怎样说明商业模式与产品功能或单一收入方式的边界？',
  },
  {
    id: 'six-elements-linkage',
    version: 'v1',
    focus: 'six-elements-linkage',
    prompt: '选择便利蜂或生鲜案例，至少两个商业模式六要素是如何相互影响的？',
  },
  {
    id: 'causal-judgment',
    version: 'v1',
    focus: 'causal-judgment',
    prompt: '基于案例事实，你会形成怎样的商业模式判断并连接事实、原因与结果？',
  },
  {
    id: 'counterevidence-condition',
    version: 'v1',
    focus: 'counterevidence-condition',
    prompt: '什么新的事实会削弱或推翻你的判断？说明这个判断成立需要满足的条件。',
  },
  {
    id: 'project-transfer',
    version: 'v1',
    focus: 'project-transfer',
    prompt: '把这套判断迁移到你的项目：你会先核对哪条事实，并据此调整哪个商业模式要素？',
  },
];

export function getAssessmentQuestion(questionId: string): AssessmentQuestion | undefined {
  return FIXED_ASSESSMENT_QUESTIONS.find((question) => question.id === questionId);
}
