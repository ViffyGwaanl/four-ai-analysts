# 四个 AI 当分析师：16 份交付物开源

同一份任务说明，同一摞原始材料，四个 AI 各做四道金融实务题：读财报、搭 Excel 模型、写研究报告，再经营一家虚构的内存厂。每道题除了表格和报告，还要交一个网页。

这个仓库收的是它们交出来的全部东西：4 个模型 × 4 道题 = 16 份交付物，包括 Excel 模型、Word 备忘录或报告、汇报 PPT、网页源码，以及有的模型自己留下的检查记录。

总成绩、对照和每个网页的在线版本在 **https://analyst.papertok.ai/**。

## 四位选手

| 文件夹 | 模型 | 工作的工具 |
|---|---|---|
| `kimi` | Kimi K3.1 Pro | Kimi Code |
| `astra` | GPT 6 Astra | Codex |
| `deepseek` | DeepSeek V4.1 | DeepSeek Harness |
| `opus` | Claude Opus 5.5 | Claude Code |

四个模型都在自家的智能体工具里工作，思考档位开到较高，拿到同样的任务说明和原始材料。

## 四道题

| 文件夹 | 题目 | 要做什么 |
|---|---|---|
| `c1_musk` | 马斯克的两本账 | 假设 SpaceX 和特斯拉合并：做合并模型，算换股比例，写投委会备忘录，再做一枚能一级一级拆开的 3D 火箭 |
| `c7_berkshire` | 交班后的伯克希尔 | 整理伯克希尔 2021 年到 2026 年上半年的账，写交班后的研究备忘录，再做一个和巴菲特一起做决定的小游戏 |
| `c8_power` | AI 的电从哪里来 | 研究数据中心的用电、核电和聚变：先把托卡马克一层层拆开，再看电从哪些电源流向数据中心 |
| `c3_memfab` | 内存厂的 16 个季度 | 同一个经营模拟器、同一轮行情，每家管一家虚构的内存厂，网页是它们自己做的经营复盘 |

## 16 份交付物

| 题目 | Kimi K3.1 Pro | GPT 6 Astra | DeepSeek V4.1 | Claude Opus 5.5 |
|---|---|---|---|---|
| 马斯克的两本账 | [文件](c1_musk/kimi) · [网页](https://analyst.papertok.ai/c1_musk/kimi/) | [文件](c1_musk/astra) · [网页](https://analyst.papertok.ai/c1_musk/astra/) | [文件](c1_musk/deepseek) · [网页](https://analyst.papertok.ai/c1_musk/deepseek/) | [文件](c1_musk/opus) · [网页](https://analyst.papertok.ai/c1_musk/opus/) |
| 交班后的伯克希尔 | [文件](c7_berkshire/kimi) · [网页](https://analyst.papertok.ai/c7_berkshire/kimi/) | [文件](c7_berkshire/astra) · [网页](https://analyst.papertok.ai/c7_berkshire/astra/) | [文件](c7_berkshire/deepseek) · [网页](https://analyst.papertok.ai/c7_berkshire/deepseek/) | [文件](c7_berkshire/opus) · [网页](https://analyst.papertok.ai/c7_berkshire/opus/) |
| AI 的电从哪里来 | [文件](c8_power/kimi) · [网页](https://analyst.papertok.ai/c8_power/kimi/) | [文件](c8_power/astra) · [网页](https://analyst.papertok.ai/c8_power/astra/) | [文件](c8_power/deepseek) · [网页](https://analyst.papertok.ai/c8_power/deepseek/) | [文件](c8_power/opus) · [网页](https://analyst.papertok.ai/c8_power/opus/) |
| 内存厂的 16 个季度 | [文件](c3_memfab/kimi) · [网页](https://analyst.papertok.ai/c3_memfab/kimi/) | [文件](c3_memfab/astra) · [网页](https://analyst.papertok.ai/c3_memfab/astra/) | [文件](c3_memfab/deepseek) · [网页](https://analyst.papertok.ai/c3_memfab/deepseek/) | [文件](c3_memfab/opus) · [网页](https://analyst.papertok.ai/c3_memfab/opus/) |

每个文件夹里大致是这些：

- Excel：合并模型、账本、数据表或三张财务报表，公式可以联动。
- Word：投委会备忘录、研究备忘录、研究报告或经营复盘；第一题另有投委会汇报 PPT。
- `web/`：网页源码，入口是 `web/index.html`。
- 有的模型还留了自己的检查记录（`校验/`、`检查/`、`验收/`、`验证/` 文件夹），内存厂那题有决策日志。

## 在本地打开网页

大部分网页用了 ES 模块和 three.js，直接双击 `index.html` 可能打不开，在对应的 `web` 文件夹里起一个本地服务器再看：

```bash
cd c1_musk/kimi/web
python3 -m http.server 8000
```

然后在浏览器打开 http://localhost:8000 。3D 页面在电脑浏览器上看更顺。

## 动过什么

除了下面两处，所有文件都是模型交付时的原样，没有改动：

- 去掉了 macOS 自动生成的系统文件（`._*`、`.DS_Store`）。
- Kimi 在伯克希尔那题里下载的两份伯克希尔官方年报 PDF 没有收录（版权属于伯克希尔），`c7_berkshire/kimi/来源/README.md` 里写了官网下载地址。

## 请注意

- 这些都是测试题的答案。里面的合并方案、换股比例、估值和各种估算，只在模型里成立，不构成任何投资建议。
- 第一题的 SpaceX 与特斯拉合并是假设情景。
- 内存厂是经营模拟器里的虚构公司，所有经营数字都只在模型里成立。
- 财务和能源数据来自公司公开披露和公开机构的报告，数据本身的权利属于各自的来源；引用以原始文件为准。

## 许可

模型交付的代码和文档以 [MIT 许可](LICENSE) 开源。网页里打包的 three.js 保留它自己的 MIT 许可（见各 `vendor` 文件夹里的 LICENSE 文件）。

---

**Four AI models as financial analysts — all 16 deliverables, open source.** Kimi K3.1 Pro, GPT 6 Astra, DeepSeek V4.1 and Claude Opus 5.5 each worked the same four finance tasks (merger model, Berkshire research memo, AI power research, a 16-quarter memory-fab simulation), delivering Excel models, Word/PPT reports and a web page per task. Files are as delivered, except macOS metadata files and two Berkshire annual-report PDFs (download them from berkshirehathaway.com). Results and live pages: https://analyst.papertok.ai/ . Not investment advice. MIT licensed.
