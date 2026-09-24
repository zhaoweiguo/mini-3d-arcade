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
4. 保留旧版本目录和旧入口，保证历史链接、回归验证和回滚能力。

`latest/` 是可变别名，`vN/` 是不可变版本。任何已经发布的 `vN/` 目录不得被后续版本覆盖。

## 兼容入口

历史根路径仍保留跳转页，例如：

```text
/pelican-ride.html
/qq-speed-rush.html
/transport-ship.html
```

这些入口跳转到对应项目的 `latest/`，用于兼容已经分享出去的旧链接。新链接应优先使用 `/games/<project>/latest/` 或具体 `/games/<project>/vN/` 路径。

当前项目：

- `games/pelican-ride/v1/`：鹈鹕骑行俱乐部
- `games/neon-bay-rush/v1/`：Neon Bay Rush
- `games/transport-ship/v1/`：运输船甲板冲突
