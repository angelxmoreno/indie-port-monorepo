1. i removed the extra clean in scripts
2. I renamed tsconfig.tsbuildinfo to *.tsbuildinfo in scripts/clean
3. I removed the "clean" entry from turbo.json
4. why would test depend on build if we are not testing the build output?
5. please add the appropriate test script to each app and package. We will be using Bun Test Runner for our BE and packages.
6. please make your suggested changes to dup:jscpd:staged and dup:jsinspect:staged
7. is adding `bun run dup:jsinspect:staged && dup:jscpd:staged` to lefhook? please review the yaml file.
