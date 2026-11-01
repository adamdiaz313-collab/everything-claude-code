// Loaded only in test subprocesses; never touch the developer's real configuration.
if (process.env.ECC_TEST_HOME) require('node:os').homedir = () => process.env.ECC_TEST_HOME;
