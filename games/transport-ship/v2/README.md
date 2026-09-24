# 钢潮运输船 / STEELWAKE

运输船主题的原创单机 3D FPS。`v2/index.html` 及 `v2/assets/` 是 GitHub Pages 发布文件；`source/index.html`、`src/` 与构建配置用于继续开发。这个版本由 GPT-6 Sol + Codex 实现。

## 本地开发

```sh
npm ci
npm run dev
```

开发入口为 Vite 地址下的 `/source/`，会读取 `src/` 源码。运行测试与构建：

```sh
npm test
npm run build
```

构建生成在 `dist/`。发布新版本时，应复制构建结果到新的 `games/transport-ship/vN/` 目录，并按仓库根目录 README 的版本规则更新 `latest/` 与首页链接；已发布的 `v2/` 不再覆盖。
