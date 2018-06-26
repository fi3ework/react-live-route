import pathToRegexp from "path-to-regexp";

// ES6 的 import 会共享，所以可以理解为一个全局缓存
// 缓存的结构是 option 对象下的 pattern
const patternCache = {};
const cacheLimit = 10000;
let cacheCount = 0;

const compilePath = (pattern, options) => {
  const cacheKey = `${options.end}${options.strict}${options.sensitive}`;
  const cache = patternCache[cacheKey] || (patternCache[cacheKey] = {});

  if (cache[pattern]) return cache[pattern];

  const keys = [];
  const re = pathToRegexp(pattern, keys, options);
  const compiledPattern = { re, keys };

  // 这是 path-to-regex 的返回值
  // var keys = []
  // var re = pathToRegexp('/foo/:bar', keys)
  // re = /^\/foo\/([^\/]+?)\/?$/i
  // keys = [{ name: 'bar', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }]

  if (cacheCount < cacheLimit) {
    cache[pattern] = compiledPattern;
    cacheCount++;
  }

  return compiledPattern;
};

/**
 * Public API for matching a URL pathname to a path pattern.
 */
const matchPath = (pathname, options = {}, parent) => {
  if (typeof options === "string") options = { path: options };

  const { path, exact = false, strict = false, sensitive = false } = options;

  if (path == null) return parent;

  // path-to-regex 的 end 相当于就是 router 的 exact，相当于是否使用全局匹配 /g
  const { re, keys } = compilePath(path, { end: exact, strict, sensitive });
  // 使用生成的正则表达式去匹配
  const match = re.exec(pathname);

  // 不匹配直接返回
  if (!match) return null; 

  const [url, ...values] = match;
  const isExact = pathname === url;

  // 如果在要求 exact 匹配时为非 exact 的匹配，则直接返回
  if (exact && !isExact) return null;

  return {
    path, // the path pattern used to match
    url: path === "/" && url === "" ? "/" : url, // the matched portion of the URL
    isExact, // whether or not we matched exactly
    params: keys.reduce((memo, key, index) => {
      memo[key.name] = values[index];
      return memo;
    }, {})
  };
};

export default matchPath;
