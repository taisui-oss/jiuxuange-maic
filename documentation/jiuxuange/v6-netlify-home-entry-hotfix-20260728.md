# V6 Netlify 首页课程入口修复

日期：2026-07-28

## 问题

Netlify 正式构建可以直接访问 `/courses/business-model`，但首页没有显示“商业模式大课”入口。

## 根因

首页课程门户受以下构建期开关共同控制：

```text
NEXT_PUBLIC_C_CUBIC_BUSINESS_MODEL_MODE
NEXT_PUBLIC_C_CUBIC_UNIFIED_LEARNING
NEXT_PUBLIC_JIUXUANGE_DUAL_ENTRY_V1
```

Netlify 构建没有设置这些公开开关，因此课程中心虽然已经部署，但首页不会渲染课程门户。

## 修复

在 `netlify.toml` 中版本化九轩阁正式站所需的非敏感构建环境：

```text
NEXT_PUBLIC_C_CUBIC_BUSINESS_MODEL_MODE=true
NEXT_PUBLIC_C_CUBIC_UNIFIED_LEARNING=true
NEXT_PUBLIC_JIUXUANGE_DUAL_ENTRY_V1=true
NEXT_PUBLIC_JIUXUANGE_COURSE_HUB_V1=true
```

首页恢复以下顺序：

```text
九轩阁 MAIC
→ 我的课程
→ 商业模式大课
→ 进入课程
→ 自由学习
```

## 边界

- 不修改商业模式案例内容、案例顺序或完成规则。
- 不启用旧 V5 固定节点补救机制。
- 个人项目测评仍要求可信学员身份。
- Agent 对话仍要求服务端模型供应商配置。

## 回退

将 `NEXT_PUBLIC_JIUXUANGE_DUAL_ENTRY_V1` 设置为 `false` 并重新构建，可隐藏双入口门户而不删除课程、项目卡或测评数据。
