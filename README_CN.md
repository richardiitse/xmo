# XMO - 扩展记忆优化

面向 Claude Code 和 OpenClaw 的完整记忆管理系统，灵感来自 Kairos 架构模式。

## 功能特性

- **自动提取**：从对话中提取关键决策、发现和经验教训
- **OpenClaw 会话自动提取**：自动从 OpenClaw 会话历史中提取实体
- **梦境整合**：三重门机制的后台记忆整合
- **主动加载**：启动时分阶段记忆恢复
- **语义查询**：基于关键词的 grep 搜索
- **跨平台共享**：Claude Code 和 OpenClaw 之间的记忆共享

## 会话来源

XMO 使用可插拔适配器从会话记录中提取实体：

| 来源 | 位置 | 适配器 |
|------|------|--------|
| Claude Code | `~/.claude/sessions/*/transcript.json` | 内置 |
| OpenClaw | `~/.openclaw/agents/*/sessions/*.jsonl` | 内置 |

两种适配器都实现了 `ToolAdapter` 接口，提供统一的实体提取。

### OpenClaw 会话自动提取

XMO 可自动从 OpenClaw 会话历史中提取实体：

- **全量提取**：按需从所有 OpenClaw 会话中提取实体
- **定时调度**：通过 cron 作业每小时自动提取
- **去重机制**：跟踪上次提取时间，避免重复处理

#### 设置定时任务

```bash
# 添加到 crontab（每小时整点执行）
0 * * * * /usr/local/bin/node /Users/richard/Documents/52VisionWorld/projects/xmo/scripts/xmo-cron-extract.mjs >> ~/.xmo/cron.log 2>&1
```

#### 手动提取

```bash
# 运行全量提取
node scripts/xmo-cron-extract.mjs

# 或通过 MCP 工具：xmo_extract_sessions
```

## 架构

XMO 是一个包含三个包的单体仓库：

- **xmo-core**：共享类型、模式和工具
- **xmo-mcp**：提供记忆操作工具的 MCP 服务器
- **xmo-skill**：用户交互命令的技能包

```
Claude Code                          OpenClaw
    │                                    │
    ▼                                    ▼
/xmo-extract ──────► @xmo/core ◄───── xmo-mcp (通过 MCP stdio)
                           │
                           ▼
                    ~/.xmo/kg/entities.jsonl  ◄── 共享存储
```

## 安装

```bash
cd /Users/richard/Documents/52VisionWorld/projects/xmo
pnpm install
pnpm build
```

## Claude Code 技能

安装后，Claude Code 可使用以下命令：

```bash
/xmo            # 显示状态概览
/xmo-extract    # 从当前会话提取实体
/xmo-query      # 搜索记忆
/xmo-dream      # 触发整合
/xmo-stats      # 查看统计
/xmo-recover    # 加载记忆（默认 20 条）
/xmo 恢复50条   # 加载 50 条记录
/xmo 恢复所有   # 加载所有匹配记录
```

## OpenClaw 配置

启用 OpenClaw 使用 XMO MCP 工具：

```bash
# 添加 XMO MCP 服务器到 OpenClaw
openclaw mcp set xmo '{"command":"node","args":["/path/to/xmo/packages/xmo-mcp/dist/index.js"]}'

# 验证配置
openclaw mcp list
```

### 让 OpenClaw 智能体自动使用 XMO

配置 MCP 服务器后，更新每个智能体的 `MEMORY.md` 以启用自动记忆搜索。

#### OpenClaw 工作空间

需要 MEMORY.md 和 XMO 配置的 OpenClaw 工作空间：

| 工作空间 | 路径 | 状态 |
|---------|------|------|
| main | `~/.openclaw/workspace/MEMORY.md` | 已存在 |


#### MEMORY.md 模板

在每个工作空间的 MEMORY.md 中添加以下内容：

```markdown
## XMO 记忆系统（跨平台共享）

- **位置**：`~/.xmo/kg/entities.jsonl`
- **用途**：Claude Code 和 OpenClaw 之间共享的长期记忆
- **MCP 工具**：xmo_query, xmo_extract, xmo_consolidate, xmo_stats
- **使用时机**：回答有关项目历史、决策或技术细节的问题时，使用 `xmo_query` 搜索相关记忆
```

## MCP 工具

| 工具 | 描述 |
|------|------|
| `xmo_extract` | 提取关键信息到记忆 |
| `xmo_extract_sessions` | 从 OpenClaw 会话历史中提取实体 |
| `xmo_query` | 使用关键词搜索记忆 |
| `xmo_consolidate` | 触发记忆整合 |
| `xmo_load` | 将记忆加载到上下文 |
| `xmo_stats` | 查看记忆统计 |

## 数据存储

- **位置**：`~/.xmo/kg/entities.jsonl`
- **锁**：`~/.xmo/dream.lock`
- **定时日志**：`~/.xmo/cron.log`
- **格式**：JSONL（每行一个实体）

## 项目结构

```
xmo/
├── packages/
│   ├── xmo-core/           # 共享库
│   │   └── src/adapters/   # 会话适配器（ClaudeCode, OpenClaw）
│   ├── xmo-mcp/            # MCP 服务器
│   │   └── src/tools/      # MCP 工具
│   └── xmo-skill/          # 技能包
├── scripts/
│   └── xmo-cron-extract.mjs  # 定时提取脚本
└── README.md
```

## 测试

```bash
pnpm test        # 运行所有测试
pnpm build       # 构建所有包
```

## 设计文档

详细架构请参阅 [docs/superpowers/specs/2026-04-02-xmo-design.md](docs/superpowers/specs/2026-04-02-xmo-design.md)。
