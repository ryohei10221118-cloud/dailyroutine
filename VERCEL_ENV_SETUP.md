# 🔧 Vercel 环境变量配置指南

## 📝 需要配置的环境变量

请在 Vercel 项目设置中添加以下环境变量：

### 1. VAPID 密钥（推送通知必需）

```
VAPID_PUBLIC_KEY=MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE_R009GZ-IwQUptJnLb43uHCAd_NtpdBD-l6YP9fRghoXtm3ZpqFMX-p4cAOL5y0Y0OhbkFjaDI39vOETySDA_w

VAPID_PRIVATE_KEY=MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgvvWzeEZ9E8F39ohCiX-52MV0JpiUVsKOPGIwIikSlY-hRANCAAT9HTT0Zn4jBBSm0mctvje4cIB3822l0EP6Xpg_19GCGhe2bdmmoUxf6nhwA4vnLRjQ6FuQWNoMjf284RPJIMD_

VAPID_SUBJECT=mailto:your-email@example.com
```

⚠️ **重要提示**：
- `VAPID_SUBJECT` 请替换为你的实际邮箱地址
- 这些密钥已经与客户端代码同步，请勿修改公钥

### 2. Redis 配置（如果使用 Vercel KV）

如果你使用 Vercel KV 作为数据存储，Vercel 会自动注入这些环境变量：
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

## 🚀 配置步骤

### 方法 1：通过 Vercel Dashboard

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目
3. 进入 **Settings** → **Environment Variables**
4. 添加上述三个 VAPID 变量：
   - 点击 **Add** 按钮
   - Name: `VAPID_PUBLIC_KEY`
   - Value: 复制上面的公钥值
   - Environment: 选择 **Production**, **Preview**, 和 **Development**（全选）
   - 点击 **Save**
5. 重复步骤 4，添加 `VAPID_PRIVATE_KEY` 和 `VAPID_SUBJECT`
6. 添加完成后，点击右上角的 **Redeploy** 触发重新部署

### 方法 2：通过 Vercel CLI

```bash
# 安装 Vercel CLI（如果还没安装）
npm i -g vercel

# 登录
vercel login

# 添加环境变量
vercel env add VAPID_PUBLIC_KEY production
# 粘贴公钥值，按回车

vercel env add VAPID_PRIVATE_KEY production
# 粘贴私钥值，按回车

vercel env add VAPID_SUBJECT production
# 输入: mailto:your-email@example.com

# 重新部署
vercel --prod
```

## ✅ 验证配置

部署完成后，访问你的应用：

1. 点击 **🔔 启用通知** 按钮
2. 允许浏览器通知权限
3. 如果没有出现错误提示，说明配置成功！
4. 可以点击 **🔔 测试通知** 发送测试通知验证

## 🔍 故障排查

### 错误：applicationServerKey must contain a valid P-256 public key

**原因**：Vercel 环境变量中的 VAPID_PUBLIC_KEY 未配置或与客户端不匹配

**解决方法**：
1. 检查 Vercel 环境变量是否正确添加
2. 确保公钥与本文档中的完全一致
3. 重新部署项目

### 错误：订阅失败

**可能原因**：
1. VAPID_PRIVATE_KEY 未配置
2. Redis/KV 数据库未配置
3. 网络问题

**解决方法**：
1. 检查所有环境变量是否已添加
2. 查看 Vercel 部署日志中的错误信息
3. 确保 Vercel KV 已启用并正确关联到项目

## 📚 相关文档

- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [VAPID 规范](https://datatracker.ietf.org/doc/html/rfc8292)
- [Vercel 环境变量文档](https://vercel.com/docs/concepts/projects/environment-variables)
