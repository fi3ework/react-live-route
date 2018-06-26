const execSync = require("child_process").execSync;

const exec = (command, extraEnv) =>
  execSync(command, {
    stdio: "inherit",
    env: Object.assign({}, process.env, extraEnv)
  });

console.log("Building CommonJS modules ...");

exec("babel modules -d . --ignore react-router,", {
  BABEL_ENV: "cjs"
});

console.log("\nBuilding ES modules ...");

exec("babel modules -d es --ignore react-router", {
  BABEL_ENV: "es"
});
