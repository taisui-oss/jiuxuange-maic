import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CLASSROOM_DIRECTORY = resolve(ROOT, 'content', 'jiuxuange', 'classrooms');
const COACH_DIRECTORY = resolve(ROOT, 'documentation', 'jiuxuange', 'case-only-v1', 'coach');
const CREATED_AT = 1786579200000;
const UPDATED_AT = '2026-08-13T00:00:00.000Z';

const theme = {
  backgroundColor: '#f8fafc',
  themeColors: ['#0f766e', '#0e7490', '#4f46e5', '#d97706', '#0f172a'],
  fontColor: '#172033',
  fontName: 'Microsoft YaHei',
  outline: { color: '#0f766e', width: 2, style: 'solid' },
  shadow: { h: 0, v: 4, blur: 12, color: '#0f172a22' },
};

const sourceManifest = [
  {
    caseId: 'breakfast-chain-six-elements-foundation',
    classroomId: 'jxg-bm-case-breakfast-chain-six-elements-v1',
    title: '社区早餐连锁',
    source: '原创教学情境，不对应具体企业',
    sha256: 'not-applicable',
    pages: '不适用',
    sourceBoundary: '所有企业、门店、交易与经营数字均为教学设定。',
  },
  {
    caseId: 'convenience-bee',
    classroomId: 'jxg-bm-case-convenience-bee-v1',
    title: '便利蜂',
    source: '便利蜂商业模式.pdf',
    sha256: 'b5162cb5d933e7160d8910b4bce66f9d09de0be8f59c82e4b4f18161eee854e3',
    pages: '2-9',
    sourceBoundary: '按课程材料中的历史案例口径讲授，不代表企业当前实时经营状态。',
  },
  {
    caseId: 'fresh-grocery-comparison',
    classroomId: 'jxg-bm-case-fresh-grocery-comparison-v1',
    title: '生鲜零售',
    source: '生鲜零售行业商业模式对比.pdf',
    sha256: '143d8f315ed246ca3224cc2b11f067476a519d3b12bbf3322d534298265a3a36',
    pages: '4-27，重点 7-10、17-24',
    sourceBoundary: '比较钱大妈、叮咚买菜与美团优选的课程历史样本，不外推为当前行业排名。',
  },
  {
    caseId: 'shein-system-capabilities',
    classroomId: 'jxg-bm-case-shein-system-capabilities-v1',
    title: 'SHEIN',
    source: 'Shein的业务系统与关键资源能力.pdf',
    sha256: '09512ebf61fdf910080f458404251b905ebdc4eeedcde643f3c8c22cc60dc05f',
    pages: '5-16，重点 5-11',
    sourceBoundary: '按课程材料中的历史案例机制讲授；不使用 OCR 不稳定的精确成本百分比。',
  },
  {
    caseId: 'florasis-business-model',
    classroomId: 'jxg-bm-case-florasis-business-model-v1',
    title: '花西子',
    source: '花西子商业模式研究.pdf',
    sha256: 'e0135dcfaba0b33e2a0e55816ca59203dfca2383c996224131d17ba79e89a046',
    pages: '2-8',
    sourceBoundary: '按课程材料中的历史案例口径讲授；GMV、SKU 等数字不作为当前实时事实。',
  },
];

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function text(id, left, top, width, height, content, color = '#172033') {
  return {
    id,
    type: 'text',
    left,
    top,
    width,
    height,
    content,
    defaultFontName: 'Microsoft YaHei',
    defaultColor: color,
    rotate: 0,
  };
}

function shape(id, left, top, width, height, fill) {
  return {
    id,
    type: 'shape',
    left,
    top,
    width,
    height,
    path: 'M 0 0 L 1 0 L 1 1 L 0 1 Z',
    viewBox: [1, 1],
    fill,
    fixedRatio: false,
    rotate: 0,
  };
}

function slideScene(classroomId, prefix, spec) {
  if (spec.observations.length !== 3 || spec.speeches.length !== 3) {
    throw new Error(`${spec.id} must have exactly three observations and three speeches`);
  }
  const elements = [
    shape(`${spec.id}-accent`, 0, 0, 1000, 7, '#0f766e'),
    text(
      `${spec.id}-eyebrow`,
      64,
      38,
      872,
      30,
      `<p style="font-size:14px;font-weight:700;color:#0f766e;">${escapeHtml(spec.eyebrow)}</p>`,
      '#0f766e',
    ),
    text(
      `${spec.id}-title`,
      64,
      76,
      872,
      58,
      `<p style="font-size:30px;font-weight:700;color:#172033;">${escapeHtml(spec.title)}</p>`,
    ),
    shape(`${spec.id}-question-bg`, 64, 146, 872, 76, '#e6f4f1'),
    text(
      `${spec.id}-question`,
      88,
      162,
      824,
      48,
      `<p style="font-size:18px;font-weight:700;color:#115e59;">${escapeHtml(spec.question)}</p>`,
      '#115e59',
    ),
  ];

  spec.observations.forEach((observation, index) => {
    const left = 64 + index * 292;
    elements.push(
      shape(`${spec.id}-observation-${index}-bg`, left, 252, 268, 174, '#ffffff'),
      text(
        `${spec.id}-observation-${index}-number`,
        left + 18,
        270,
        38,
        36,
        `<p style="font-size:18px;font-weight:700;color:#0e7490;">0${index + 1}</p>`,
        '#0e7490',
      ),
      text(
        `${spec.id}-observation-${index}-title`,
        left + 58,
        270,
        190,
        42,
        `<p style="font-size:17px;font-weight:700;color:#172033;">${escapeHtml(observation.title)}</p>`,
      ),
      text(
        `${spec.id}-observation-${index}-body`,
        left + 18,
        320,
        230,
        90,
        `<p style="font-size:14px;line-height:1.65;color:#475569;">${escapeHtml(observation.body)}</p>`,
        '#475569',
      ),
    );
  });

  elements.push(
    shape(`${spec.id}-takeaway-bg`, 64, 456, 872, 66, '#172033'),
    text(
      `${spec.id}-takeaway`,
      88,
      471,
      824,
      40,
      `<p style="font-size:16px;font-weight:700;color:#ffffff;">${escapeHtml(spec.takeaway)}</p>`,
      '#ffffff',
    ),
  );

  return {
    id: spec.id,
    stageId: classroomId,
    type: 'slide',
    title: spec.title,
    order: spec.order,
    content: {
      type: 'slide',
      canvas: {
        id: `${spec.id}-canvas`,
        viewportSize: 1000,
        viewportRatio: 0.5625,
        theme,
        elements,
        background: { type: 'solid', color: '#f8fafc' },
      },
      schemaVersion: 1,
    },
    actions: [
      { id: `${spec.id}-speech-1`, type: 'speech', text: spec.speeches[0] },
      { id: `${spec.id}-spotlight-question`, type: 'spotlight', elementId: `${spec.id}-question` },
      { id: `${spec.id}-speech-2`, type: 'speech', text: spec.speeches[1] },
      { id: `${spec.id}-spotlight-takeaway`, type: 'spotlight', elementId: `${spec.id}-takeaway` },
      { id: `${spec.id}-speech-3`, type: 'speech', text: spec.speeches[2] },
    ],
    createdAt: CREATED_AT + prefix * 100 + spec.order,
    updatedAt: CREATED_AT + prefix * 100 + spec.order,
    outlineId: `scene_${spec.order}`,
  };
}

function question(id, prompt, optionLabels, answer, analysis) {
  const values = ['A', 'B', 'C', 'D'];
  return {
    id,
    type: 'single',
    question: prompt,
    options: optionLabels.map((label, index) => ({ value: values[index], label })),
    answer: [answer],
    analysis,
    points: 20,
    hasAnswer: true,
  };
}

function quizScene(classroomId, prefix, spec) {
  return {
    id: spec.id,
    stageId: classroomId,
    type: 'quiz',
    title: spec.title,
    order: spec.order,
    content: { type: 'quiz', questions: spec.questions },
    actions: [
      {
        id: `${spec.id}-speech`,
        type: 'speech',
        text: '请完成本轮原生互动。客观题全部答对后才能继续，答错可查看解释并重新作答。',
      },
    ],
    createdAt: CREATED_AT + prefix * 100 + spec.order,
    updatedAt: CREATED_AT + prefix * 100 + spec.order,
    outlineId: `scene_${spec.order}`,
  };
}

const caseDefinitions = [
  {
    prefix: 3,
    classroomId: 'jxg-bm-case-fresh-grocery-comparison-v1',
    stageName: '生鲜零售：模式比较与迁移',
    description: '比较钱大妈、叮咚买菜与美团优选的六要素关系',
    scenes: [
      {
        type: 'slide',
        id: 'fresh-intro',
        order: 1,
        eyebrow: '课程历史案例 · 三种模式比较',
        title: '生鲜零售：同一品类为什么会长出不同模式',
        question: '卖的都是生鲜，为什么门店自提、前置仓到家和社区团购不能用同一套经营逻辑？',
        observations: [
          { title: '钱大妈', body: '社区门店、到店自提与日清机制，强调离消费者近和门店周转。' },
          { title: '叮咚买菜', body: '前置仓、自营供应与骑手到家，强调即时便利与履约体验。' },
          { title: '美团优选', body: '预售、中心仓与团长自提，强调价格、计划性和更轻的末端履约。' },
        ],
        takeaway: '模式差异不是页面形式，而是客户场景、履约责任、库存风险和资金结构的组合。',
        speeches: [
          '本案例使用课程材料中的历史样本，不代表企业当前实时经营状态。我们比较钱大妈、叮咚买菜和美团优选三种模式。',
          '请不要先问哪一种模式最好。先观察它们分别服务谁、如何履约、谁承担库存与最后一公里。',
          '同一品类之所以出现不同模式，是因为定位和交易结构不同，后面的能力、盈利和现金流也会随之改变。',
        ],
      },
      {
        type: 'slide',
        id: 'fresh-transaction-map',
        order: 2,
        eyebrow: '第 1 步 · 交易地图',
        title: '谁和谁交易',
        question: '消费者、供应商、门店或前置仓、骑手与团长分别交换什么？',
        observations: [
          { title: '门店模式', body: '消费者到店购买；门店连接供应、陈列、销售与损耗管理。' },
          { title: '到家模式', body: '消费者线上下单；平台、前置仓和骑手共同承担拣货与即时交付。' },
          { title: '团购模式', body: '消费者预先下单；平台汇总需求，仓配与团长完成次日自提。' },
        ],
        takeaway: '先画清商品、订单、责任与资金流，才能判断模式真正把风险留给了谁。',
        speeches: [
          '三种模式都连接消费者和供应商，但中间承担交易责任的主体不同。',
          '门店模式把库存和交付聚在门店；前置仓增加即时配送；社区团购通过预售与自提降低末端不确定性。',
          '交易地图的重点不是列主体，而是标出谁接单、谁备货、谁承担损耗、谁完成最后交付。',
        ],
      },
      {
        type: 'slide',
        id: 'fresh-positioning',
        order: 3,
        eyebrow: '第 2 步 · 定位',
        title: '服务谁、解决什么问题',
        question: '便利、鲜度和价格三种需求，分别会推导出什么交付承诺？',
        observations: [
          { title: '社区鲜度', body: '钱大妈以社区客群和日清机制回应高频、就近与新鲜感知。' },
          { title: '即时便利', body: '叮咚买菜以线上下单和快速到家回应高线城市的时间成本。' },
          { title: '计划性价比', body: '美团优选以预售与次日自提回应更强价格敏感和计划性采购。' },
        ],
        takeaway: '定位一旦不同，客单、配送时效、库存和服务成本就不能用同一标准比较。',
        speeches: [
          '课程材料把三种模式放在不同需求场景中比较：社区鲜度、即时便利和计划性价比。',
          '定位不是宣传语，而是交付承诺。即时到家意味着更高履约成本，次日自提则用时间换取更低不确定性。',
          '只有先固定客户和场景，后面的业务系统与单位经济才有可比性。',
        ],
      },
      {
        type: 'slide',
        id: 'fresh-business-system',
        order: 4,
        eyebrow: '第 3 步 · 业务系统',
        title: '各主体如何协作',
        question: '谁拥有库存、谁负责最后一公里，是三种模式最关键的系统差异。',
        observations: [
          { title: '钱大妈', body: '供应链、门店或加盟商与 ERP 协同，门店完成销售和顾客自提。' },
          { title: '叮咚买菜', body: '自营供应链、前置仓、拣货与骑手形成完整即时履约链。' },
          { title: '美团优选', body: '平台预售聚单，中心仓组织履约，团长承担社区交付节点。' },
        ],
        takeaway: '系统边界决定企业要建设哪些资产，也决定库存、履约和服务风险由谁承担。',
        speeches: [
          '业务系统关注利益相关者及其交易结构，不只是企业内部流程。',
          '叮咚把更多链条纳入自营，因此控制力更强、资产与履约压力也更高；团购则通过预售和团长减少即时配送。',
          '比较模式时，先问库存所有权和最后一公里责任，而不是只看前端页面。',
        ],
      },
      {
        type: 'quiz',
        id: 'fresh-check-1',
        order: 5,
        title: '第一轮互动：定位与系统',
        questions: [
          question(
            'fresh-q1',
            '哪一种模式最符合“预售聚单、次日到团、社区自提”？',
            ['钱大妈社区门店', '叮咚买菜前置仓', '美团优选社区团购', '传统菜市场'],
            'C',
            '课程材料中的美团优选采用预售聚单和团长自提，以计划性换取更低履约不确定性。',
          ),
          question(
            'fresh-q2',
            '哪一种模式最依赖较高客单价来摊薄骑手即时配送成本？',
            ['叮咚买菜前置仓到家', '美团优选次日自提', '钱大妈到店自提', '农贸市场摊位'],
            'A',
            '前置仓即时到家需要仓内拣货和骑手配送，客单价与订单密度直接影响履约成本占比。',
          ),
          question(
            'fresh-q3',
            '比较三种生鲜模式的业务系统时，最应优先核对哪组问题？',
            [
              '页面颜色与品牌口号',
              '库存由谁持有、最后一公里由谁完成',
              '创始人采访数量',
              '门店面积是否完全一致',
            ],
            'B',
            '库存与履约责任决定资产、损耗、服务和现金压力，是业务系统比较的关键。',
          ),
        ],
      },
      {
        type: 'slide',
        id: 'fresh-capabilities',
        order: 6,
        eyebrow: '第 4 步 · 关键资源能力',
        title: '企业必须擅长什么',
        question: '同样采购蔬果，三种模式真正需要沉淀的能力为什么不同？',
        observations: [
          { title: '门店周转', body: '钱大妈需要采购、日清、加盟协同与门店数字化管理能力。' },
          { title: '即时履约', body: '叮咚需要供应链、前置仓运营、需求预测与骑手调度能力。' },
          { title: '平台聚单', body: '美团优选需要需求聚合、仓配网络、团长运营与平台流量能力。' },
        ],
        takeaway: '关键能力必须与定位和系统相配；复制别人的动作，不等于复制别人的能力。',
        speeches: [
          '关键资源能力不是企业拥有的一切，而是让特定交易结构持续成立的少数能力。',
          '门店、前置仓和团购分别要求门店周转、即时履约和平台聚单，能力组合并不相同。',
          '因此，看到别人增长就照搬前置仓或团长体系，往往会忽略自己是否具备对应能力。',
        ],
      },
      {
        type: 'slide',
        id: 'fresh-profit-model',
        order: 7,
        eyebrow: '第 5 步 · 盈利模式',
        title: '谁向谁付钱',
        question: '收入都来自卖菜，但利润逻辑为什么仍然不同？',
        observations: [
          {
            title: '门店利润',
            body: '商品毛利需覆盖门店租金、人员、损耗，并处理直营网点与加盟关系。',
          },
          { title: '到家利润', body: '商品毛利需进一步覆盖前置仓、拣货和即时配送成本。' },
          {
            title: '团购利润',
            body: '预售与自提降低部分履约成本，但仍需覆盖仓配、团长与平台运营。',
          },
        ],
        takeaway: '盈利模式要把收入、成本和利益分配放在同一笔订单中核算。',
        speeches: [
          '三种模式都可以获得商品销售收入，但它们承担的成本和分配对象不同。',
          '前置仓增加即时履约成本，社区团购需要分配团长和仓配收益，门店模式则承担固定门店成本和损耗。',
          '只比较毛利率会漏掉履约和利益分配，必须回到每笔订单的完整单位经济。',
        ],
      },
      {
        type: 'slide',
        id: 'fresh-cash-flow',
        order: 8,
        eyebrow: '第 6 步 · 现金流结构',
        title: '钱在什么时候流入和占用',
        question: '预售、自营库存与即时配送如何改变资金占用？',
        observations: [
          {
            title: '历史客单样本',
            body: '课程材料样本约为团购 15 元、门店 22 元、前置仓 61.7 元，仅用于机制比较。',
          },
          {
            title: '履约成本样本',
            body: '材料估算社区团购约 15%—20%，前置仓约 30%—40%，不是当前经营数据。',
          },
          {
            title: '现金压力',
            body: '自营库存、仓网和骑手会先占用资金；预售可降低部分需求与库存不确定性。',
          },
        ],
        takeaway: '高收入不等于好现金流；客单、周转、履约成本与扩张投入必须一起看。',
        speeches: [
          '课程材料提供了历史样本用于说明：前置仓往往需要更高客单来摊薄更高履约成本。',
          '这些数字不是企业当前事实，但能帮助我们理解为什么自营即时到家对订单密度和周转要求更高。',
          '现金流比较要同时看顾客付款时间、库存占用、仓网投入和末端履约，而不是只看 GMV。',
        ],
      },
      {
        type: 'slide',
        id: 'fresh-value-map',
        order: 9,
        eyebrow: '第 7—8 步 · 企业价值与因果图',
        title: '没有万能模式，只有成立条件',
        question: '什么因果链能把定位、履约、单位经济和长期价值连起来？',
        observations: [
          {
            title: '即时便利链',
            body: '时间敏感需求 → 前置仓到家 → 高密度履约 → 单位经济与现金成立。',
          },
          {
            title: '计划性价比链',
            body: '价格敏感需求 → 预售自提 → 降低不确定性 → 更轻履约与复制。',
          },
          { title: '社区鲜度链', body: '高频邻里需求 → 门店日清 → 周转与信任 → 稳定单店现金。' },
        ],
        takeaway: '长期价值来自模式在特定场景下持续成立，而不是某一种前端形态天然更先进。',
        speeches: [
          '企业价值不能从门店数或订单数直接推出，必须验证定位到现金流的完整因果链。',
          '即时便利需要密度，计划性价比需要稳定聚单，社区鲜度需要周转和信任。每条链的成立条件不同。',
          '因此最重要的迁移不是选择一个赢家，而是判断自己的客户场景与能力是否支持相应模式。',
        ],
      },
      {
        type: 'quiz',
        id: 'fresh-check-2',
        order: 10,
        title: '第二轮互动：现金与价值',
        questions: [
          question(
            'fresh-q4',
            '相比前置仓即时到家，预售加社区自提最直接改变了什么？',
            [
              '把所有库存风险都消除',
              '降低需求不确定性和最后一公里即时配送压力',
              '保证每个订单都盈利',
              '不再需要仓配系统',
            ],
            'B',
            '预售和自提可以降低部分需求与末端履约压力，但不会消除库存、仓配或盈利风险。',
          ),
          question(
            'fresh-q5',
            '哪条因果链最符合本案例的六要素逻辑？',
            [
              '订单越多 → 企业价值必然越高',
              '客户场景 → 履约系统 → 专属能力 → 单位经济与现金 → 可复制价值',
              '补贴越多 → 现金流越稳定',
              '仓库越多 → 定位越准确',
            ],
            'B',
            '正确链条从客户场景出发，经过业务系统和能力，再落到单位经济、现金与可复制价值。',
          ),
        ],
      },
    ],
  },
  {
    prefix: 4,
    classroomId: 'jxg-bm-case-shein-system-capabilities-v1',
    stageName: 'SHEIN：业务系统与关键资源能力',
    description: '从小单快反拆解 SHEIN 的交易、系统、能力与现金逻辑',
    scenes: [
      {
        type: 'slide',
        id: 'shein-intro',
        order: 1,
        eyebrow: '课程历史案例 · 机制学习',
        title: 'SHEIN：快时尚增长不是“上新快”一个动作',
        question: '低价、多款与快速变化如何在同一套业务系统中同时成立？',
        observations: [
          { title: '目标场景', body: '课程材料聚焦海外年轻、价格敏感且追逐趋势的女性消费者。' },
          { title: '商品承诺', body: '更多款式、更快上新与可负担价格共同构成消费选择。' },
          { title: '核心难题', body: '款式越多越容易形成库存，速度越快越考验供应链与数据协同。' },
        ],
        takeaway: '真正的问题不是如何多上新，而是如何用更小试错成本持续识别需求。',
        speeches: [
          '本案例按课程材料中的历史机制讲授，不把其中数字当成企业当前实时经营状态。',
          '低价、多款和快速变化看似互相冲突，因为传统大批量生产容易带来库存风险。',
          '我们要追踪的是 SHEIN 如何把需求数据、设计、供应商和履约连接成小单快反系统。',
        ],
      },
      {
        type: 'slide',
        id: 'shein-transaction-map',
        order: 2,
        eyebrow: '第 1 步 · 交易地图',
        title: '谁和谁交易',
        question: '消费者、平台、设计与供应商之间除了商品和资金，还交换哪些信息？',
        observations: [
          {
            title: '消费者 ↔ 平台',
            body: '消费者购买商品并留下浏览、点击、购买与反馈等需求信号。',
          },
          { title: '平台 ↔ 设计', body: '趋势和用户数据转化为选款、设计、测试与上新决策。' },
          {
            title: '平台 ↔ 供应商',
            body: '平台分配小批量订单和数字化指令，供应商完成打样、生产与补单。',
          },
        ],
        takeaway: '数据不是附属记录，而是连接消费需求与生产决策的关键交换物。',
        speeches: [
          'SHEIN 的交易地图不仅包含消费者和供应商，还包括平台、设计与数字系统。',
          '消费者行为形成需求信号，设计和选款把信号转成商品实验，供应商再根据订单快速生产。',
          '如果只看到商品流，就会忽略这套模式真正依赖的信息流和决策流。',
        ],
      },
      {
        type: 'slide',
        id: 'shein-positioning',
        order: 3,
        eyebrow: '第 2 步 · 定位',
        title: '服务谁、解决什么问题',
        question: '消费者购买的不只是低价服装，而是低成本跟上快速变化的趋势。',
        observations: [
          { title: '目标客户', body: '年轻、价格敏感并高度使用线上渠道的海外消费者。' },
          { title: '核心需求', body: '希望持续获得新款与趋势选择，同时降低单次购买门槛。' },
          { title: '价值主张', body: '用多款、快上新和可负担价格提高选择频率与新鲜感。' },
        ],
        takeaway: '定位决定了企业必须同时解决趋势识别、试错速度和成本控制。',
        speeches: [
          '把定位只写成低价会漏掉多款和趋势速度，而只写成时尚又会漏掉价格门槛。',
          '这三个要求共同迫使企业缩短从需求信号到商品上架的周期。',
          '定位因此直接约束后面的业务系统：必须小批量测试，并能对有效款快速补单。',
        ],
      },
      {
        type: 'slide',
        id: 'shein-business-system',
        order: 4,
        eyebrow: '第 3 步 · 业务系统',
        title: '各主体如何协作',
        question: '小单快反不是压缩工厂交期，而是一套需求测试与订单分配系统。',
        observations: [
          { title: '小批量首单', body: '课程材料描述首批约百件，用较小投入测试真实需求。' },
          { title: '数据反馈', body: '上架后的浏览、销售与反馈决定是否追单、调整或停止。' },
          { title: '供应商协同', body: '数字工具、准时结算和订单分配把多个供应商接入同一节奏。' },
        ],
        takeaway: '系统的核心是“先小单验证，再快速追单”，而不是一次猜中大单。',
        speeches: [
          '课程材料中的百件首单是机制线索：先用小样本获得真实市场反馈。',
          '畅销款快速补单，弱款停止追加，从而把一次性预测改造成连续实验。',
          '这要求平台与供应商共享数字化流程，并通过结算和订单机制维持合作意愿。',
        ],
      },
      {
        type: 'quiz',
        id: 'shein-check-1',
        order: 5,
        title: '第一轮互动：定位与系统',
        questions: [
          question(
            'shein-q1',
            '课程材料中的小批量首单，首要目的是什么？',
            [
              '一次性获得最低采购价',
              '用较小库存测试真实需求并决定是否追单',
              '把所有风险转给供应商',
              '减少商品款式',
            ],
            'B',
            '小批量首单的核心是低成本验证需求，再依据真实反馈追加，而不是保证最低价格或转移全部风险。',
          ),
          question(
            'shein-q2',
            '哪一项最能描述平台与供应商之间的系统关系？',
            [
              '只靠临时口头催单',
              '数字化订单分配、流程协同与稳定结算共同支撑快反',
              '供应商自行决定所有款式',
              '平台不参与需求判断',
            ],
            'B',
            '快反需要数字化订单和流程协同，也需要结算与激励维持供应商长期合作。',
          ),
          question(
            'shein-q3',
            '“多款、快上新、可负担价格”最直接要求什么业务系统？',
            [
              '每款一次性大批量生产',
              '小单测试、数据反馈和快速追单',
              '只增加广告预算',
              '只减少供应商数量',
            ],
            'B',
            '多款与低价并存会放大库存风险，因此需要小单测试、反馈和追单来控制试错成本。',
          ),
        ],
      },
      {
        type: 'slide',
        id: 'shein-capabilities',
        order: 6,
        eyebrow: '第 4 步 · 关键资源能力',
        title: '企业必须擅长什么',
        question: '数据很多并不等于能力形成，关键是能否把数据变成跨主体动作。',
        observations: [
          { title: '趋势与选款', body: '持续识别趋势、形成设计并管理大量商品实验。' },
          { title: '供应链整合', body: '让多个供应商按小批量、短周期和统一数字流程协作。' },
          { title: '用户与推荐', body: '把流量、行为与推荐连接到转化、复购和商品决策。' },
        ],
        takeaway: '关键能力是数据驱动的跨链条决策，不是单独拥有某个软件或工厂。',
        speeches: [
          '课程材料归纳了趋势与设计、柔性供应链、用户获取与推荐、全链路数字化等能力。',
          '这些能力必须连起来：趋势识别产生商品实验，供应链完成快反，用户反馈又进入下一轮决策。',
          '如果各环节数据无法共同驱动动作，拥有系统也不等于形成关键能力。',
        ],
      },
      {
        type: 'slide',
        id: 'shein-profit-model',
        order: 7,
        eyebrow: '第 5 步 · 盈利模式',
        title: '谁向谁付钱',
        question: '商品销售收入如何覆盖获客、设计、生产、物流和退货成本？',
        observations: [
          {
            title: '收入来源',
            body: '消费者在线购买自有品牌商品，收入由款式、转化、客单和复购共同决定。',
          },
          {
            title: '主要成本',
            body: '商品开发与生产、流量获取、平台技术、跨境物流和退货共同消耗毛利。',
          },
          {
            title: '效率来源',
            body: '小单降低弱款初始损失，快速追单放大有效款，推荐提高需求匹配。',
          },
        ],
        takeaway: '盈利不是“低价加销量”自动成立，而是试错、转化与履约效率共同成立。',
        speeches: [
          '商品销售是主要收入，但收入增长不能掩盖获客、退货、物流和库存成本。',
          '小单快反的经济价值，在于减少弱款的初始库存并更快放大强款。',
          '因此要验证的不是上新数量，而是测试命中率、售罄、追单速度、复购和完整履约成本。',
        ],
      },
      {
        type: 'slide',
        id: 'shein-cash-flow',
        order: 8,
        eyebrow: '第 6 步 · 现金流结构',
        title: '钱在什么时候流入和占用',
        question: '小单能降低初始库存，却不等于增长不占用现金。',
        observations: [
          { title: '降低首单占用', body: '每款先小批量测试，减少错误预测带来的初始库存现金。' },
          { title: '追单仍需现金', body: '畅销款放量会形成生产、物流、在途库存与退货准备。' },
          { title: '合作边界', body: '课程材料强调准时结算，模式不能建立在无限占用供应商资金上。' },
        ],
        takeaway: '现金优势来自更快验证和周转，而不是把所有库存与账期风险转嫁给伙伴。',
        speeches: [
          '小单快反可以降低首次押注，但增长后的追单、跨境物流和退货仍会占用现金。',
          '课程材料还强调对供应商准时付款，这说明供应链合作不能只靠压账期。',
          '真正需要跟踪的是从首单、追单、入仓、销售到退货的完整现金转换周期。',
        ],
      },
      {
        type: 'slide',
        id: 'shein-value-map',
        order: 9,
        eyebrow: '第 7—8 步 · 企业价值与因果图',
        title: '可复制价值来自更快、更准、更低成本地学习',
        question: '如何把消费者需求、供应链动作和自由现金流连成因果链？',
        observations: [
          { title: '需求链', body: '趋势与用户数据 → 设计选款 → 小批量真实测试。' },
          { title: '履约链', body: '销售反馈 → 数字化追单 → 柔性供应与更快上新。' },
          { title: '价值链', body: '更低试错损失 + 更快周转 + 稳定复购 → 可复制现金与企业价值。' },
        ],
        takeaway: 'SHEIN 的长期价值假设必须由命中率、周转、复购、退货和现金结果共同验证。',
        speeches: [
          '企业价值不是因为使用了算法，而是系统是否持续提高需求判断和周转效率。',
          '正确因果链从用户需求信号开始，经由小单测试和供应链追单，最后落到库存、复购与现金。',
          '任何一个环节失效，例如获客过贵、退货过高或供应商不稳定，都会削弱长期价值。',
        ],
      },
      {
        type: 'quiz',
        id: 'shein-check-2',
        order: 10,
        title: '第二轮互动：现金与价值',
        questions: [
          question(
            'shein-q4',
            '仅知道“首单批量小”，还不能证明现金流更好。最需要继续核对什么？',
            [
              '办公地点数量',
              '售罄、追单周期、退货、物流和供应商付款',
              '品牌字体',
              '创始人公开演讲次数',
            ],
            'B',
            '小首单只覆盖初始试错，完整现金结构还取决于售罄、追单、退货、物流与付款周期。',
          ),
          question(
            'shein-q5',
            '哪条因果链最符合本案例？',
            [
              '上新越多 → 利润必然越高',
              '需求数据 → 小单测试 → 快速追单 → 周转和复购 → 可复制现金价值',
              '供应商越多 → 库存一定越少',
              '广告越多 → 退货率一定越低',
            ],
            'B',
            '案例的核心是用数据和小单快反提高学习与周转效率，最终仍需由复购和现金结果验证。',
          ),
        ],
      },
    ],
  },
  {
    prefix: 5,
    classroomId: 'jxg-bm-case-florasis-business-model-v1',
    stageName: '花西子：定位与盈利模式',
    description: '从东方彩妆定位拆解花西子的业务系统、能力、盈利与现金证据',
    scenes: [
      {
        type: 'slide',
        id: 'florasis-intro',
        order: 1,
        eyebrow: '课程历史案例 · 品牌机制学习',
        title: '花西子：品牌定位如何进入完整交易系统',
        question: '“东方彩妆”为什么不能只停留在一句传播口号？',
        observations: [
          { title: '历史样本', body: '课程材料记录品牌 2017 年创立，并聚焦国风彩妆与大众价格带。' },
          { title: '产品表达', body: '产品、包装、命名、设计与传播共同表达东方美学。' },
          { title: '经营问题', body: '强传播能带来销售，但长期价值仍需产品、复购和现金结果支持。' },
        ],
        takeaway: '定位只有进入产品、伙伴、渠道和经营结果，才成为商业模式的一部分。',
        speeches: [
          '本案例按课程材料中的历史阶段讲授，不把 GMV、SKU 等数字当成当前实时事实。',
          '花西子最容易被看到的是东方美学传播，但我们要继续追踪产品、设计、代工、内容平台和消费者之间的关系。',
          '分析目标不是评价营销好坏，而是判断定位如何通过系统、能力、盈利与现金形成闭环。',
        ],
      },
      {
        type: 'slide',
        id: 'florasis-transaction-map',
        order: 2,
        eyebrow: '第 1 步 · 交易地图',
        title: '谁和谁交易',
        question: '品牌、消费者、代工厂、设计伙伴、内容平台与物流分别承担什么？',
        observations: [
          {
            title: '消费者 ↔ 品牌',
            body: '消费者支付货款并提供使用与反馈数据；品牌交付产品与文化体验。',
          },
          { title: '品牌 ↔ 伙伴', body: 'OEM/ODM、外部设计与文化资源共同参与研发、生产和表达。' },
          {
            title: '品牌 ↔ 平台',
            body: '内容与电商平台提供触达和交易场景，品牌投入内容、运营与平台成本。',
          },
        ],
        takeaway: '品牌不是独自完成价值，而是组织多个伙伴共同兑现同一定位承诺。',
        speeches: [
          '花西子的产品、内容和交易由多个主体协同完成，品牌本身承担组织与一致性责任。',
          '代工和设计伙伴提供专业能力，内容平台连接消费者，电商和物流完成交易与交付。',
          '交易地图需要同时标出产品、内容、数据和资金，避免把品牌模式简化为投放。',
        ],
      },
      {
        type: 'slide',
        id: 'florasis-positioning',
        order: 3,
        eyebrow: '第 2 步 · 定位',
        title: '服务谁、解决什么问题',
        question: '“东方彩妆，以花养妆”如何约束产品与体验选择？',
        observations: [
          {
            title: '目标客户',
            body: '希望获得东方审美表达，同时关注可负担价格与产品体验的彩妆消费者。',
          },
          { title: '价值主张', body: '把东方文化、美学设计与彩妆产品体验组合成可识别的品牌选择。' },
          {
            title: '一致性要求',
            body: '包装、产品、内容、合作角色与渠道表达需要共同支持同一认知。',
          },
        ],
        takeaway: '定位不是一句话，而是一组必须彼此一致的经营选择。',
        speeches: [
          '课程材料用东方彩妆和以花养妆描述品牌定位，并展示产品、包装与传播的协同。',
          '如果产品体验、价格或合作内容与定位不一致，短期曝光不能自动形成稳定认知。',
          '因此，定位需要被翻译为后续系统中可以执行和检验的具体选择。',
        ],
      },
      {
        type: 'slide',
        id: 'florasis-business-system',
        order: 4,
        eyebrow: '第 3 步 · 业务系统',
        title: '各主体如何协作',
        question: '外部代工、设计资源与内容平台如何被品牌组织成同一套反馈闭环？',
        observations: [
          { title: '产品形成', body: '品牌联合 OEM/ODM、设计与文化资源完成开发、打样和生产。' },
          {
            title: '小规模测试',
            body: '课程材料描述先小范围测试，再依据市场反馈快速迭代和集中爆款。',
          },
          { title: '直接反馈', body: '线上直营与内容平台把消费者行为反馈带回产品与运营决策。' },
        ],
        takeaway: '业务系统的价值在于把外部资源和消费者反馈变成可重复的产品迭代。',
        speeches: [
          '外部代工不等于企业没有能力，关键是品牌能否定义产品、组织伙伴并控制质量与节奏。',
          '课程材料展示了小范围测试、快速迭代和爆款集中的路径。',
          '线上交易和内容平台形成更直接的反馈，但品牌仍要判断哪些信号值得进入产品决策。',
        ],
      },
      {
        type: 'quiz',
        id: 'florasis-check-1',
        order: 5,
        title: '第一轮互动：定位与系统',
        questions: [
          question(
            'florasis-q1',
            '什么最能证明“东方彩妆”已经进入经营定位，而不只是口号？',
            [
              '只在广告中出现一次',
              '产品、包装、设计、内容和渠道表达保持一致',
              '所有产品都提高价格',
              '停止使用外部伙伴',
            ],
            'B',
            '定位需要进入产品与交易系统，由多个触点共同兑现，而不是只在传播中出现。',
          ),
          question(
            'florasis-q2',
            '哪一项最符合花西子课程案例中的业务系统？',
            [
              '品牌独立完成所有生产与传播',
              '品牌组织代工、设计、内容平台和消费者反馈共同迭代',
              '只依赖线下经销商反馈',
              '供应商决定全部定位',
            ],
            'B',
            '课程材料显示品牌通过外部生产和设计资源、内容平台与线上反馈形成协同系统。',
          ),
          question(
            'florasis-q3',
            '课程材料记录 SKU 较多且头部产品贡献集中，这更支持哪一判断？',
            [
              '所有产品平均贡献收入',
              '企业通过测试迭代并把资源集中到有效产品',
              'SKU 越多现金流必然越好',
              '品牌不需要产品能力',
            ],
            'B',
            'SKU 和头部集中更适合用来观察测试、筛选与资源集中，不能推出每个产品都成功或现金必然更好。',
          ),
        ],
      },
      {
        type: 'slide',
        id: 'florasis-capabilities',
        order: 6,
        eyebrow: '第 4 步 · 关键资源能力',
        title: '企业必须擅长什么',
        question: '当生产和设计部分外部化时，品牌内部最不可替代的能力是什么？',
        observations: [
          {
            title: '品牌与文化设计',
            body: '把东方文化转化为产品定义、视觉与连续内容，而不是一次性符号。',
          },
          {
            title: '资源整合',
            body: '选择并协调代工、设计、文化和平台伙伴，控制质量、成本与节奏。',
          },
          { title: '精细化运营', body: '连接内容、流量、转化、产品反馈和多平台经营数据。' },
        ],
        takeaway: '外部资源越多，企业越需要清晰的产品定义、伙伴治理和数据反馈能力。',
        speeches: [
          '课程材料归纳了营销运营、设计与文化创意、资源整合和多平台转化能力。',
          '这些能力的共同点，是把分散在外部伙伴和平台中的资源组织成一致体验。',
          '如果品牌只能购买流量，却不能定义产品和吸收反馈，能力就没有沉淀。',
        ],
      },
      {
        type: 'slide',
        id: 'florasis-profit-model',
        order: 7,
        eyebrow: '第 5 步 · 盈利模式',
        title: '谁向谁付钱',
        question: '产品销售收入需要覆盖哪些被“品牌故事”遮住的经营成本？',
        observations: [
          {
            title: '收入来源',
            body: '消费者购买彩妆产品，收入由产品组合、价格、转化和复购共同决定。',
          },
          {
            title: '成本结构',
            body: '研发与代工、设计、内容与达人、平台、物流及退货共同消耗毛利。',
          },
          {
            title: '集中效应',
            body: '头部产品可放大供应与传播效率，也会形成对少数爆款的依赖风险。',
          },
        ],
        takeaway: '品牌溢价只有覆盖完整成本并带来持续复购，才转化为盈利模式。',
        speeches: [
          'GMV 只是交易规模，不能直接说明利润。需要扣除产品、内容、平台、物流和退货等完整成本。',
          '爆款集中可以提高资源效率，但也可能让收入依赖少数产品和流量节点。',
          '因此评价盈利模式时，要同时看单品贡献、获客回收、复购与利益分配。',
        ],
      },
      {
        type: 'slide',
        id: 'florasis-cash-flow',
        order: 8,
        eyebrow: '第 6 步 · 现金流结构',
        title: '证据不足时，不替企业编现金流故事',
        question: '课程材料没有完整结算数据，哪些信息必须由案主或财务继续补充？',
        observations: [
          { title: '库存与代工', body: '核对最小起订量、生产付款、备货周期、滞销与库存归属。' },
          { title: '平台与内容', body: '核对平台结算、达人与内容付款时间、投放回收周期和退款。' },
          { title: '销售与退货', body: '核对销售回款、退货率、复购与爆款追单对资金的实际影响。' },
        ],
        takeaway: '没有付款、库存、结算和退货证据，就不能从 GMV 推断自由现金流。',
        speeches: [
          '课程材料足以分析定位、系统和能力，但没有提供完整的现金结算与库存数据。',
          '此时正确做法不是补一个漂亮结论，而是列出必须核对的证据：代工付款、库存、平台结算、内容投入和退货。',
          '这也是项目学习的重要能力：知道何时可以判断，以及何时必须继续取证。',
        ],
      },
      {
        type: 'slide',
        id: 'florasis-value-map',
        order: 9,
        eyebrow: '第 7—8 步 · 企业价值与因果图',
        title: '从文化认知到可持续企业价值',
        question: '什么链条能把东方彩妆认知转化为长期现金结果？',
        observations: [
          { title: '认知链', body: '东方彩妆定位 → 产品与内容一致 → 清晰品牌认知与首次购买。' },
          { title: '经营链', body: '消费者反馈 → 小规模测试与迭代 → 有效产品与更高转化。' },
          { title: '价值链', body: '产品体验与复购 → 获客回收和稳定现金 → 可持续品牌价值。' },
        ],
        takeaway: '企业价值必须由产品复购和现金验证，不能只由内容声量或历史 GMV 证明。',
        speeches: [
          '花西子的案例因果链从东方彩妆定位开始，但不会停在传播声量。',
          '定位要进入产品与内容，通过反馈和迭代提升转化，最终仍需由复购、获客回收和现金验证。',
          '如果产品体验、平台成本或爆款依赖使现金不稳定，品牌认知也不能自动等于长期企业价值。',
        ],
      },
      {
        type: 'quiz',
        id: 'florasis-check-2',
        order: 10,
        title: '第二轮互动：现金与价值',
        questions: [
          question(
            'florasis-q4',
            '为什么不能从课程材料中的历史 GMV 直接判断自由现金流？',
            [
              'GMV 与交易无关',
              '还缺库存、代工付款、平台结算、内容投入和退货证据',
              '品牌企业都没有现金流',
              '只有线下销售才产生现金',
            ],
            'B',
            'GMV 是交易规模，现金结果还取决于成本、付款与结算时点、库存和退货。',
          ),
          question(
            'florasis-q5',
            '哪条因果链最符合本案例？',
            [
              '内容声量 → 企业价值必然提高',
              '定位一致 → 产品与内容协同 → 反馈迭代 → 复购与现金 → 品牌价值',
              'SKU 越多 → 现金越稳定',
              '达人越多 → 退货越少',
            ],
            'B',
            '长期价值需要定位通过系统和能力进入产品结果，并最终由复购和现金验证。',
          ),
        ],
      },
    ],
  },
];

function buildClassroom(definition) {
  const scenes = definition.scenes.map((scene) =>
    scene.type === 'quiz'
      ? quizScene(definition.classroomId, definition.prefix, scene)
      : slideScene(definition.classroomId, definition.prefix, scene),
  );
  if (scenes.length !== 10 || scenes.some((scene, index) => scene.order !== index + 1)) {
    throw new Error(`${definition.classroomId} must contain ordered scenes 1-10`);
  }
  const questionCount = scenes
    .filter((scene) => scene.type === 'quiz')
    .flatMap((scene) => scene.content.questions).length;
  if (questionCount !== 5) throw new Error(`${definition.classroomId} must contain five questions`);

  return {
    id: definition.classroomId,
    generationComplete: true,
    stage: {
      id: definition.classroomId,
      name: definition.stageName,
      description: definition.description,
      createdAt: CREATED_AT + definition.prefix * 100,
      updatedAt: UPDATED_AT,
      languageDirective:
        '全程使用中文。采用魏朱商业模式六要素模型，沿交易地图、定位、业务系统、关键资源能力、盈利模式、现金流结构和企业价值形成可检验的因果链。明确区分课程材料事实、分析判断和待验证假设，不把历史案例数字表述为企业当前实时事实。',
      style: 'professional',
      currentSceneId: scenes[0].id,
      agentIds: ['default-1', 'default-2', 'default-3', 'default-4'],
      videoManifest: {},
      interactiveMode: false,
      taskEngineMode: false,
    },
    scenes,
  };
}

async function writeJson(pathname, value) {
  const serialized = await format(JSON.stringify(value), { parser: 'json', printWidth: 100 });
  await writeFile(pathname, serialized, 'utf8');
}

async function writeCoachGuide() {
  const lines = [
    '# 九轩阁商业模式案例闯关教练答案 V1',
    '',
    '> 内部教练资料。不得复制到学员页面、学员 API、公开预览或课堂 JSON 的客户端载荷。',
    '',
    '## 使用边界',
    '',
    '- 本答案用于教练备课、题目复核和现场解释，不替代具名教研审核。',
    '- 所有真实企业案例均为课程材料中的历史样本，不代表企业当前实时经营状态。',
    '- 学员闯关由服务端按课堂包中的客观答案判定；开放题仅要求提交，教练按参考要点讨论。',
    '- 当前审核状态：`pending_named_sme_review`。',
    '',
  ];

  for (const source of sourceManifest) {
    const raw = await readFile(resolve(CLASSROOM_DIRECTORY, `${source.classroomId}.json`), 'utf8');
    const classroom = JSON.parse(raw);
    const quizScenes = classroom.scenes.filter(
      (scene) => scene.type === 'quiz' && scene.content.type === 'quiz',
    );
    lines.push(
      `## ${source.title}`,
      '',
      `- 来源：${source.source}`,
      `- SHA-256：\`${source.sha256}\``,
      `- 页码：${source.pages}`,
      `- 证据边界：${source.sourceBoundary}`,
      '',
      '### 六要素参考因果链',
      '',
      source.caseId === 'breakfast-chain-six-elements-foundation'
        ? '通勤者的速度与稳定需求 → 中央厨房与轻门店 → 预测和标准化 → 单店利润与现金 → 可复制价值。'
        : source.caseId === 'convenience-bee'
          ? '社区即时需求 → 中央大脑与门店执行 → 数据决策能力 → 周转与运营效率 → 可复制门店价值。'
          : source.caseId === 'fresh-grocery-comparison'
            ? '客户场景 → 履约系统 → 专属能力 → 单位经济与现金 → 在特定条件下可复制的价值。'
            : source.caseId === 'shein-system-capabilities'
              ? '需求数据 → 小单测试 → 数字化追单与柔性供应 → 周转和复购 → 可复制现金价值。'
              : '东方彩妆定位 → 产品与内容一致 → 反馈迭代 → 复购与获客回收 → 可持续品牌价值。',
      '',
    );

    for (const quizSceneItem of quizScenes) {
      lines.push(`### ${quizSceneItem.title}`, '');
      quizSceneItem.content.questions.forEach((quizQuestion, index) => {
        const answer =
          Array.isArray(quizQuestion.answer) && quizQuestion.answer.length > 0
            ? quizQuestion.answer
                .map((value) => {
                  const option = quizQuestion.options?.find((item) => item.value === value);
                  const label = option?.label.replace(/^[A-D][.、]\s*/, '');
                  return label ? `${value}. ${label}` : value;
                })
                .join('；')
            : '开放题：提交即完成；按下方参考要点讨论';
        lines.push(
          `${index + 1}. **${quizQuestion.question}**`,
          `   - 参考答案：${answer}`,
          `   - 解释：${quizQuestion.analysis ?? '课堂包未提供解释。'}`,
          '',
        );
      });
    }
  }

  lines.push(
    '## 教研签署',
    '',
    '- 课程负责人：待填写',
    '- 审核人：待填写',
    '- 审核日期：待填写',
    '- 审核结论：待审核',
    '- 修改记录：待填写',
    '',
  );
  await writeFile(resolve(COACH_DIRECTORY, 'CASE_ANSWER_KEY.md'), lines.join('\n'), 'utf8');
}

async function writeSourceManifest() {
  const lines = [
    '# Case-only V1 案例来源清单',
    '',
    '| 顺序 | 案例 | 来源 | 页码 | SHA-256 | 审核状态 |',
    '|---:|---|---|---|---|---|',
    ...sourceManifest.map(
      (source, index) =>
        `| ${index + 1} | ${source.title} | ${source.source} | ${source.pages} | \`${source.sha256}\` | pending_named_sme_review |`,
    ),
    '',
    '## 统一边界',
    '',
    '- 源文件不随本候选仓库分发；以文件名、页码和 SHA-256 追溯。',
    '- 课程材料中的企业数字属于材料编制时的历史案例口径，不得表述为当前实时事实。',
    '- OCR 不稳定的 SHEIN 精确成本百分比未进入课堂内容。',
    '- 资料未提供完整现金流证据时，课堂明确列为信息缺口，不补造结论。',
    '- 生成完成不等于教研批准；正式投放前须由具名课程负责人签署。',
    '',
  ];
  await writeFile(resolve(COACH_DIRECTORY, 'CASE_SOURCE_MANIFEST.md'), lines.join('\n'), 'utf8');
}

await mkdir(CLASSROOM_DIRECTORY, { recursive: true });
await mkdir(COACH_DIRECTORY, { recursive: true });

for (const definition of caseDefinitions) {
  const outputPath = resolve(CLASSROOM_DIRECTORY, `${definition.classroomId}.json`);
  await writeJson(outputPath, buildClassroom(definition));
  process.stdout.write(`Wrote ${outputPath}\n`);
}

await writeCoachGuide();
await writeSourceManifest();
process.stdout.write(`Wrote ${resolve(COACH_DIRECTORY, 'CASE_ANSWER_KEY.md')}\n`);
process.stdout.write(`Wrote ${resolve(COACH_DIRECTORY, 'CASE_SOURCE_MANIFEST.md')}\n`);
