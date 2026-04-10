# 心炙记忆系统整合决策摘要

**日期**: 2026-04-10  
**分析**: 8 个 AI 记忆系统对比  
**决策**: 保持 Memory-Optimization + XMO 双引擎架构

---

## 🏆 最终排名

| 排名 | 项目 | 总分 | 关键优势 | 关键劣势 |
|------|------|------|----------|----------|
| 🥇 1 | MemPalace | 8.6 | LongMemEval 96.6%, 零 API | 无衰减/合并 |
| 🥈 2 | Mem0 | 8.0 | 52K stars, YC S24 | 依赖 LLM, 收费 |
| 🥉 3 | Claude-Mem | 7.7 | 46K stars, npx 安装 | 无 KG |
| 4 | Supermemory | 7.4 | #1 claims, 多模态 | 云依赖 |
| 5 | OpenViking | 7.3 | 文件系统范式 | 需要 Go/Rust |
| 6 | MemOS | 7.1 | 多模态，arXiv 论文 | Neo4j+Qdrant 复杂 |
| 7 | Memory-Opt | 6.9 | 衰减/去重/合并 | 无基准，0 stars |
| 8 | XMO | 6.4 | 跨平台，Dream | JSONL 简单，0 stars |

---

## ✅ 心炙当前架构优势

**Memory-Optimization 独有功能** (其他 7 个项目都没有):
- ✅ 衰减引擎 (358 实体已衰减)
- ✅ 去重引擎 (67 组实体已合并)
- ✅ 合并引擎 (SkillCards)
- ✅ Memory Health Dashboard

**XMO 独有功能**:
- ✅ Claude Code + Codex + OpenClaw 跨平台共享
- ✅ 自动会话提取 (每小时 cron)
- ✅ Dream Consolidation (三 gate 机制)

---

## 🎯 整合决策

### 保留 (核心)
```
Memory-Optimization (核心引擎)
├── decay_engine.py
├── entity_dedup.py
├── consolidation_engine.py
├── memory_dashboard.py
└── working_memory.py
```

### 保留 (跨平台层)
```
XMO (跨平台层)
├── packages/xmo-mcp (6 MCP 工具)
├── packages/xmo-core (session adapters)
└── ~/.xmo/kg/entities.jsonl (共享 KG)
```

### 选择性吸收 (从 MemPalace)
- [ ] 实现 wake-up 协议 (L0/L1, ~170 tokens)
- [ ] 扩展 XMO MCP 工具集 (参考 19 工具)
- [ ] 运行 LongMemEval 自测
- [ ] Palace 架构概念映射 (wings/rooms → tags)

### 不吸收
- ❌ AAAK 压缩 (84.2% vs 96.6%, 有损)
- ❌ ChromaDB (已有 JSONL + KG)
- ❌ Mem0 (LLM 提取，与理念冲突)
- ❌ Supermemory (云依赖)
- ❌ MemOS (Neo4j+Qdrant 复杂)
- ❌ OpenViking (Go/Rust 编译)
- ❌ Claude-Mem (无 KG, 功能重叠)

---

## 📊 关键对比数据

### 基准测试
| 项目 | LongMemEval | LoCoMo |
|------|-------------|--------|
| MemPalace (raw) | 96.6% | 60.3% |
| MemPalace (hybrid) | 100% | 100% |
| Memory-Opt | ❌ 未测试 | ❌ 未测试 |
| XMO | ❌ 未测试 | ❌ 未测试 |

### 记忆治理功能
| 功能 | Memory-Opt | XMO | MemPalace | Mem0 |
|------|------------|-----|-----------|------|
| 衰减 | ✅ | ❌ | ❌ | ❌ |
| 去重 | ✅ | ❌ | ⚠️ | ✅ |
| 合并 | ✅ | ✅ | ❌ | ❌ |
| KG | ✅ | ✅ | ✅ | ✅ |

### 成本对比
| 项目 | 成本 | API 需求 |
|------|------|----------|
| Memory-Opt | $0 | ❌ |
| XMO | $0 | ❌ |
| MemPalace | $0 | ❌ |
| Mem0 | $19-249/mo | ⚠️ 可选 |
| Supermemory | Free+ | ✅ 必需 |

---

## 🔥 核心结论

**心炙的当前记忆系统 (Memory-Optimization + XMO) 在架构上已经是最先进的**

**理由**:
1. Memory-Opt 的衰减/去重/合并是**独特优势**，其他项目都没有
2. XMO 提供**跨平台能力** (Claude Code + Codex + OpenClaw)
3. **零成本，完全本地**，符合隐私优先原则
4. **已经集成**，切换成本高，收益有限

**行动项**:
1. ✅ 继续优化 Memory-Opt 核心引擎
2. ✅ 扩展 XMO MCP 工具集
3. ✅ 实现 wake-up 协议 (参考 MemPalace)
4. ✅ 运行内部基准测试 (参考 LongMemEval)

---

*决策者：心炙 (Xīn Zhì)*  
*存档位置：~/Documents/52VisionWorld/projects/xmo/docs/competitor-analysis/*
