# Contribution Rules

Please ensure the following before opening a pull request:

1. **Run the full test & lint suite**

   ```bash
   pnpm lint && pnpm type-check && pnpm test
   ```

2. **Benchmark** any parsing-related changes:

   ```bash
   pnpm bench
   ```

   Commit if throughput regressions are within acceptable range; otherwise investigate.

3. Follow Conventional Commits for commit messages.

4. Update documentation if you change public APIs.
