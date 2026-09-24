# Mini 3D Arcade

浏览器 3D 小游戏合集。每个小游戏独立放在 `games/<project>/` 下，并按版本保留历史实现。GitHub Pages 首页是所有项目和版本的统一入口。

## 目录约定

```text
games/<project>/v1/       # 不可变的具体版本
games/<project>/v2/       # 后续版本，新增而不是覆盖
games/<project>/latest/   # 当前推荐版本入口，跳转到最新稳定版本
```

## 首页与版本入口

首页 `index.html` 为每个项目展示：

- `CURRENT / latest`：当前推荐版本，适合大多数用户直接体验。
- 所有已发布版本：例如 `v1`、`v2`，用于对比历史实现、回归验证和体验不同版本。

新增版本后，首页必须增加对应的版本链接，不能只更新目录而不更新首页。

## 发布新版本

发布新版本时：

1. 复制上一版本到新的 `vN/` 目录并实现改动。
2. 验证新版本后，将 `latest/index.html` 的跳转目标更新到新的版本目录。
3. 在根目录 `index.html` 对应项目卡片中增加 `vN` 链接，并保留 `CURRENT / latest` 链接。
4. 保留旧版本目录，保证回归验证和回滚能力。根目录不保留项目 HTML、JS 或兼容跳转文件。

`latest/` 是可变别名，`vN/` 是不可变版本。任何已经发布的 `vN/` 目录不得被后续版本覆盖。

当前项目：

- `games/pelican-ride/v1/`：鹈鹕骑行俱乐部
- `games/neon-bay-rush/v1/`：Neon Bay Rush
- `games/transport-ship/v1/`：运输船甲板冲突（早期原型）
- `games/transport-ship/v2/`：钢潮运输船 STEELWAKE（GPT-6 Sol + Codex 实现的 Three.js/Vite 第一人称 FPS）
