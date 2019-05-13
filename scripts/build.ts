// learn from MobX, very grateful

/* tslint:disable:no-var-requires */
const rollup = require('rollup')
const fs = require('fs-extra')
const path = require('path')
const ts = require('typescript')
const shell = require('shelljs')
const exec = shell.exec
const babel = require('rollup-plugin-babel')
const replace = require('rollup-plugin-replace')

process.env.NODE_ENV = 'production'

// exit upon first error
shell.set('-e')

const binFolder = path.resolve('node_modules/.bin/')

function getCmd(cmd) {
  if (process.platform === 'win32') {
    return path.join(binFolder, cmd + '.cmd')
  }
  return cmd
}

// make sure we're in the right folder
process.chdir(path.resolve(__dirname, '..'))

fs.removeSync('lib')
fs.removeSync('.build.cjs')
fs.removeSync('.build.es')

function runTypeScriptBuild(outDir, target, declarations) {
  console.log(`Running typescript build (target: ${ts.ScriptTarget[target]}) in ${outDir}/`)

  const tsConfig = path.resolve('tsconfig.json')
  const json = ts.parseConfigFileTextToJson(tsConfig, ts.sys.readFile(tsConfig), true)

  const { options } = ts.parseJsonConfigFileContent(json.config, ts.sys, path.dirname(tsConfig))

  options.target = target
  options.outDir = outDir
  options.declaration = declarations

  options.module = ts.ModuleKind.ES2015
  options.importHelpers = true
  options.noEmitHelpers = true
  if (declarations) options.declarationDir = path.resolve('.', 'lib')

  const rootFile = path.resolve('src', 'index.tsx')
  const host = ts.createCompilerHost(options, true)
  const prog = ts.createProgram([rootFile], options, host)
  const result = prog.emit()
  if (result.emitSkipped) {
    const message = result.diagnostics
      .map(d => `${ts.DiagnosticCategory[d.category]} ${d.code} (${d.file}:${d.start}): ${d.messageText}`)
      .join('\n')

    throw new Error(`Failed to compile typescript:\n\n${message}`)
  }
}

const rollupPlugins = [
  require('rollup-plugin-node-resolve')(),
  require('rollup-plugin-filesize')(),
  babel({
    plugins: ['annotate-pure-calls', 'dev-expression'],
    exclude: 'node_modules/**'
  }),
  replace({
    'process.env.NODE_ENV': JSON.stringify('production')
  })
]

function generateBundledModule(inputFile, outputFile, format) {
  console.log(`Generating ${outputFile} bundle.`)

  return rollup
    .rollup({
      input: inputFile,
      plugins: rollupPlugins,
      external: ['react-router', 'react-router-dom', 'react', 'react-dom'],
      onwarn: warning => {
        // Silence circular dependency warning for moment package
        if (warning.code === 'CIRCULAR_DEPENDENCY') {
          return
        }
        console.warn(`(!) ${warning.message}`)
      }
    })
    .then(bundle =>
      bundle.write({
        file: outputFile,
        format,
        exports: 'named'
      })
    )
}

function generateMinified() {
  const prodEnv = {
    ...process.env,
    NODE_ENV: 'production'
  }

  console.log('Generating index.min.js')
  // envify will environment variables
  exec(`${getCmd(`envify`)} lib/index.js > lib/index.prod.js`, { env: prodEnv })
  exec(`${getCmd('uglifyjs')} --toplevel -m -c warnings=false --source-map -o lib/index.min.js lib/index.prod.js`)
  shell.rm('lib/index.prod.js')
}

function build() {
  runTypeScriptBuild('.build.es5', ts.ScriptTarget.ES5, true)
  runTypeScriptBuild('.build.es6', ts.ScriptTarget.ES2015, false)
  return Promise.all([
    generateBundledModule(path.resolve('.build.es5', 'index.js'), path.resolve('lib', 'index.js'), 'cjs'),
    generateBundledModule(path.resolve('.build.es5', 'index.js'), path.resolve('lib', 'index.module.js'), 'es'),
    generateBundledModule(path.resolve('.build.es6', 'index.js'), path.resolve('lib', 'index.es6.js'), 'es')
  ]).then(generateMinified)
}

build().catch(e => {
  console.error(e)
  if (e.frame) {
    console.error(e.frame)
  }
  process.exit(1)
})
