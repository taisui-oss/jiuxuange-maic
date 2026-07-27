# ADR 0002：花名、企业微信认证与数据库 Session

日期：2026-07-27

状态：Accepted with implementation spike

适用版本：Jiuxuange MAIC V6

## 1. 决策

[DECIDED, HIGH] 身份职责拆为三层：

```text
企业微信
→ 证明“当前登录者是谁”

花名系统
→ 证明“此人是否属于本学年、班级和可用人员范围”

九轩阁内部 user_id
→ 承载课程、项目、讨论、测试和审计
```

[DECIDED, HIGH] 使用 Better Auth 的稳定版作为会话与 OAuth 安全框架候选，配合 Drizzle 数据库 Adapter 和 Generic OAuth 插件；业务域只能依赖九轩阁 `IdentityService`，不得直接依赖 Better Auth 类型。

Better Auth 官方 Generic OAuth 支持自定义 OAuth 端点、非标准 token exchange 和 user-info 映射，适合在获得真实企业微信合同后实现 Provider：[Generic OAuth](https://better-auth.com/docs/plugins/generic-oauth)。其安全默认包含 OAuth state、PKCE、Origin/CSRF 检查和安全 Cookie：[Security](https://better-auth.com/docs/reference/security)。

该选择必须先通过兼容性刺探，不允许直接进入完整实现。

[KNOWN, HIGH] 当前没有企业微信官方接口文档和测试应用，不能假定实际企业微信流程支持 PKCE 或标准 token endpoint。Fake Provider 用于验证框架能力；真实 Provider 是否启用 PKCE 必须以届时提供的官方合同为准，OAuth `state` 和一次性回调校验仍为硬门槛。

## 2. 兼容性刺探

Gate 1 第一个代码任务只验证：

1. 当前 Next.js 16 和 Node 22+ 可运行 Better Auth；
2. Drizzle/PostgreSQL Adapter 可使用自定义表名或隔离 schema；
3. Generic OAuth 可接入 Fake WeCom Provider；
4. 首次登录可以禁止隐式注册；
5. 只有预置花名人员和确定性绑定才能建立 Session；
6. 退出、过期和管理员吊销后 Session 立即失效；
7. Server Component、Route Handler 和页面跳转都能读取同一 Actor。

若任一关键条件不能稳定满足：

```text
停止 Gate 1
→ 记录失败证据
→ 重新评审 Auth.js 或受审计的一方 Session 实现
```

不得通过在 Cookie 中直接写 `user_id` 绕过。

## 3. 登录状态机

正式登录：

```text
匿名访问
→ 创建短时 OAuth state / PKCE
→ 跳转企业微信
→ 企业微信回调
→ 服务端交换并验证身份
→ 得到 provider_tenant_id + provider_subject_id
→ 查找有效 IdentityBinding
→ 查找有效 RosterPerson
→ 查找/创建已批准内部 User
→ 建立数据库 Session
→ 写 auth.login_succeeded 审计
→ 进入课程工作台
```

未匹配：

```text
企业微信身份验证成功
→ 无确定性花名映射
→ 不创建业务账户
→ 不建立 Session
→ 写 auth.roster_match_failed 审计
→ 显示联系教务的非敏感错误
```

禁止自动使用以下字段模糊匹配：

```text
姓名
花名
头像
邮箱前缀
手机号后四位
部门名称
```

允许的匹配方式只能是：

1. 花名系统直接提供企业微信稳定成员 ID；
2. 经管理员审核的显式绑定表；
3. 业务负责人批准的其他稳定唯一键。

## 4. Adapter 合同

外部接口尚未提供，因此只冻结内部合同。

```ts
export interface WeComIdentity {
  tenantId: string;
  subjectId: string;
  displayName?: string;
}

export interface WeComIdentityProvider {
  createAuthorizationUrl(input: {
    state: string;
    codeChallenge?: string;
    redirectUri: string;
  }): Promise<URL>;

  exchangeCallback(input: {
    code: string;
    state: string;
    codeVerifier?: string;
    redirectUri: string;
  }): Promise<WeComIdentity>;
}

export interface RosterPersonRecord {
  rosterPersonId: string;
  status: 'active' | 'inactive';
  displayName: string;
  cohortCode?: string;
  classCode?: string;
  externalIdentityKeys: Array<{
    provider: 'wecom';
    tenantId: string;
    subjectId: string;
  }>;
  sourceVersion: string;
  effectiveAt: string;
}

export interface RosterDirectory {
  importSnapshot(input: {
    sourceVersion: string;
    records: RosterPersonRecord[];
  }): Promise<{
    accepted: number;
    rejected: number;
    reconciliationId: string;
  }>;

  findActivePersonByExternalIdentity(input: {
    provider: 'wecom';
    tenantId: string;
    subjectId: string;
  }): Promise<RosterPersonRecord | null>;
}
```

上面是九轩阁内部合同，不声称等同于花名系统或企业微信实际字段。

## 5. Session 策略

[DECIDED, HIGH] 使用数据库 Session，不使用长期 JWT 承载授权关系。

原因：

- 成员退组后要即时失效；
- 教务需要撤销全部设备；
- 班级、小组和项目关系会变化；
- 不应把敏感角色和关系长期固化在浏览器 Token 中。

Cookie：

```text
HttpOnly
Secure（生产）
SameSite=Lax
Path=/
不写 user profile、role 或 membership
```

会话内容只指向数据库 Session。Better Auth 官方安全文档说明生产 HTTPS 下使用安全 Cookie，并默认采用 `SameSite=Lax`：[Cookies](https://better-auth.com/docs/concepts/cookies)。

初始时效候选：

```text
absolute lifetime: 12 hours
refresh window: 1 hour
```

[ASSUMPTION, MEDIUM] 上述时效适合单日课程，但仍需教务和安全负责人在 Gate 1 实施前确认。它不得写死在业务代码中。

授权关系不缓存进 Session。每个敏感请求按当前数据库关系生成 `ActorContext`：

```ts
export interface ActorContext {
  userId: string;
  sessionId: string;
  globalRoles: string[];
  authenticatedAt: string;
  traceId: string;
}
```

具体班级、小组、项目和教练关系由授权服务在资源请求时读取。

## 6. CSRF 与重定向

认证框架负责自身 OAuth state、PKCE、Callback URL 和登录 CSRF。

九轩阁业务写 API 额外要求：

- 只接受可信 Origin；
- 检查 `Sec-Fetch-Site`；
- 使用 SameSite Cookie；
- 对浏览器 unsafe method 使用 Session 绑定 CSRF Token；
- 拒绝任意外部 `redirectTo`；
- 所有登录回调地址由服务端白名单生成。

生产不得配置：

```text
disableCSRFCheck=true
disableOriginCheck=true
任意通配 callback domain
```

## 7. 账户状态

`users.status`：

```text
pending
active
suspended
archived
```

登录只允许：

```text
user.status = active
AND roster_person.status = active
AND identity_binding.revoked_at IS NULL
```

以下变化立即撤销 Session：

- 人员被停用；
- 身份绑定被撤销；
- 账号被冻结；
- 安全管理员执行全部退出；
- 发现身份绑定冲突。

换班和换组不要求重新登录，但下一次资源授权必须按新关系生效。

## 8. 失败与审计

审计事件：

```text
auth.login_started
auth.login_succeeded
auth.login_failed
auth.roster_match_failed
auth.identity_conflict
auth.session_revoked
auth.logout
roster.import_started
roster.import_completed
roster.import_rejected
```

审计载荷只保存不透明 ID、结果码和 trace，不保存：

```text
企业微信 secret
OAuth code
access token
Session token
手机号明文
完整个人资料
```

## 9. 权衡

### 优势

- 使用成熟框架处理 OAuth state、PKCE、Cookie 和 Session；
- 支持企业微信非标准 OAuth 端点的 Adapter；
- 数据库 Session 可即时吊销；
- 业务域与认证框架隔离。

### 风险

- 企业微信实际接口合同尚未提供；
- Better Auth 是新依赖，必须验证 Next.js 16 兼容；
- 自动用户创建行为必须严格关闭或拦截；
- 花名与企微的稳定匹配键仍未确认。

## 10. Gate 1 外部输入

实现真实 Provider 前必须获得：

```text
企业微信主体模式：单主体 / 多主体
自建应用或其他接入模式
企业 ID 与应用配置
回调域名
测试账号
授权范围
官方接口文档版本
花名系统稳定人员 ID
花名与企微的精确匹配键
停用、换班、换组数据样例
```

没有上述输入时，只能实现 Fake Adapter 和契约测试，不能声明“企业微信登录完成”。

## 11. 发布测试

- 登录 state 被篡改必须失败；
- callback 重放必须失败；
- 未在花名中的企微成员不得建立 Session；
- 同名两人不能被自动合并；
- 停用人员的现有 Session 被撤销；
- Session Cookie 不可被前端 JavaScript 读取；
- 未登录 API 返回 401；
- 已登录但无关系的资源返回 404 或 403，按泄露策略冻结；
- redirect 参数不能跳到外部域名；
- 生产环境启用演示身份时应用启动失败。

[RULES I BROKE]: 无
