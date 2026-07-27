# ADR 0004：对象存储、材料访问与模型披露

日期：2026-07-27

状态：Accepted; Provider pending

适用版本：Jiuxuange MAIC V6

## 1. 决策

[DECIDED, HIGH] V6 使用私有 S3 兼容对象存储，应用通过 AWS SDK for JavaScript v3 访问。

Provider 可以是：

- AWS S3；
- 支持所需 S3 API 的国内或云厂商对象存储；
- 通过兼容性测试的自建 S3 服务。

业务域只依赖：

```ts
export interface ObjectStorage {
  createUpload(input: CreateUploadInput): Promise<PresignedUpload>;
  createDownload(input: CreateDownloadInput): Promise<PresignedDownload>;
  headObject(storageKey: string): Promise<StoredObjectMetadata | null>;
  deleteObject(storageKey: string): Promise<void>;
}
```

不得在业务代码中直接拼厂商 URL、Bucket 或访问密钥。

## 2. 私有存储原则

所有 Bucket 默认：

```text
private
禁止匿名读取
禁止目录列表
启用服务端加密
启用版本或等价恢复能力
配置生命周期
限制 CORS
记录访问日志
```

企业材料不经过 Next.js 内存完整转发。上传流程：

```text
已认证用户请求上传
→ 授权服务检查项目关系
→ 服务端生成受限上传凭证
→ 浏览器直接上传对象存储
→ 服务端校验 checksum、大小和类型
→ 创建 ProjectAsset
→ 异步安全扫描/解析
→ 通过后变为 available
```

下载流程：

```text
已认证用户请求材料
→ 授权服务检查资源关系和披露级别
→ 写访问审计
→ 生成短时下载 URL
→ 浏览器下载
```

AWS SDK v3 提供 SigV4 预签名 URL；默认有效期为 900 秒，但 V6 必须显式设置更短的业务有效期：[S3 request presigner](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-s3-request-presigner/)。

初始候选：

```text
upload URL: 10 minutes
download URL: 5 minutes
```

[ASSUMPTION, MEDIUM] 最终时效由部署网络和材料大小测试确定。

## 3. 元数据

PostgreSQL 保存：

```text
asset_id
project_id
project_card_version_id
storage_key
original_filename
mime_type
byte_size
sha256
status
visibility
model_policy
retention_policy
created_by
created_at
verified_at
deleted_at
```

对象 Key 只使用服务端生成的不透明路径：

```text
jiuxuange/{environment}/{project_id}/{asset_id}/{version}
```

不得包含：

```text
真实企业名
学员姓名
手机号
课程标题
原始文件名
```

## 4. 文件状态

```text
pending_upload
uploaded
scanning
available
quarantined
deleted
```

只有 `available` 文件可被授权用户读取或进入模型处理。

`uploaded` 不等于可信内容。Gate 3 前必须确定：

- 病毒/恶意文件扫描；
- MIME 与扩展名不一致处理；
- 最大文件大小；
- PDF、DOCX、PPTX、图片支持边界；
- OCR 和解析 Provider；
- 解析失败处理；
- 压缩包、可执行文件和宏文档策略。

## 5. 可见性和模型策略

资源可见性：

```text
owner_only
project_members
assigned_coaches
project_owner_and_admin
```

模型策略：

```text
allow
mask
block
```

两者独立：

```text
一个人可以有权阅读材料
不代表材料可以发送给外部模型
```

模型上下文生成：

```text
读取项目卡版本和已授权材料
→ 逐字段/材料执行 allow/mask/block
→ 生成去标识化上下文
→ 运行 canary 检查
→ 记录输入 hash 和引用 ID
→ 调用 AI Gateway
```

禁止：

```text
先把完整材料发给模型
→ 再通过 Prompt 要求模型忽略敏感信息
```

## 6. 删除与保留

删除分两步：

```text
业务撤回
→ 立即失去访问和模型使用资格

物理删除
→ 按保留政策删除对象和派生内容
```

事件和审计只保留对象 ID、删除动作和必要结果，不保留已删除的敏感正文。

正式保留期限、个人信息删除、项目归档和法律保留策略尚未确定，阻塞 Gate 5。

## 7. 派生文件

解析文本、OCR、缩略图和 AI 摘要必须保存来源：

```text
source_asset_id
source_sha256
pipeline_version
generated_at
model_run_id
```

源文件更新后，不静默覆盖旧派生文件；创建新版本并使新会话绑定新项目卡版本。

## 8. Provider 兼容性测试

正式 Provider 必须通过：

- 私有 Bucket；
- 预签名 PUT/POST；
- 预签名 GET；
- Content-Type 和大小限制；
- checksum 校验；
- 范围请求；
- 多段上传；
- 服务端加密；
- 版本或恢复；
- 生命周期；
- CORS；
- 访问日志；
- 删除与权限撤销；
- 中国大陆实际网络延迟。

AWS 官方文档说明 JavaScript v3 的流式响应需要被消费或释放，正式实现必须避免连接池耗尽：[S3 JavaScript v3 considerations](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-s3.html)。

## 9. 权衡

### 优势

- 企业材料不挤占 PostgreSQL；
- Provider 可替换；
- 可在授权后发放短时访问；
- 版本、校验和和派生链可审计。

### 风险

- S3 兼容不代表所有安全和版本功能完全一致；
- 预签名 URL 在有效期内可被持有者使用；
- 上传后仍需安全扫描；
- 正式 Provider 和存储区域尚未确定。

## 10. Gate 3 与 Gate 5 门禁

Gate 3：

- Fake/测试 S3 Provider 完成上传、下载和权限测试；
- `block` canary 在模型输入、日志和导出中零命中；
- 退出成员不能生成新下载 URL；
- 项目卡 V2 不改变 V1 的材料引用。

Gate 5：

- 正式 Provider、区域、加密和备份政策确认；
- 数据保留和删除政策确认；
- 恢复演练通过；
- 真实网络环境性能通过；
- 密钥轮换和最小权限通过；
- 对象访问审计可查。

[RULES I BROKE]: 无
