const path = require('path');

const rootCompiler = compiler => {
  while (compiler.parentCompilation) {
    compiler = compiler.parentCompilation.compiler;
  }
  return compiler;
};

const compilerContext = (exports.compilerContext = function compilerContext(
  compiler,
) {
  return rootCompiler(compiler.compiler ? compiler.compiler : compiler).context;
});

const relateNormalPath = (exports.relateNormalPath = function relateNormalPath(
  compiler,
  key,
) {
  if (typeof key !== 'string') {
    return key;
  }
  if (compilerContext(compiler) === key) {
    return '.';
  }
  if (key === '') {
    return key;
  }
  const rel = path.relative(compilerContext(compiler), key.split('?')[0]);
  return [rel.replace(/\\/g, '/')].concat(key.split('?').slice(1)).join('?');
});

const relateNormalRequest = (exports.relateNormalRequest = function relateNormalRequest(
  compiler,
  key,
) {
  return key
    .split('!')
    .map(subkey => relateNormalPath(compiler, subkey))
    .join('!');
});

const relateNormalModuleId = (exports.relateNormalModuleId = function relateNormalModuleId(
  compiler,
  id,
) {
  return id.substring(0, 24) + relateNormalRequest(compiler, id.substring(24));
});

const relateNormalLoaders = (exports.relateNormalLoaders = function relateNormalLoaders(
  compiler,
  loaders,
) {
  return loaders.map(loader =>
    Object.assign({}, loader, {
      loader: relateNormalPath(compiler, loader.loader),
    }),
  );
});

const relateNormalPathArray = (exports.relateNormalPathArray = function relateNormalPathArray(
  compiler,
  paths,
) {
  return paths.map(subpath => relateNormalPath(compiler, subpath));
});

const relateNormalPathSet = (exports.relateNormalPathSet = function relateNormalPathSet(
  compiler,
  paths,
) {
  return relateNormalPathArray(compiler, Array.from(paths));
});

// Adopted from https://github.com/mzgoddard/hard-source-webpack-plugin/pull/470 to reduce incremental build time
// Cache whether we need to replace path.sep because contextNormalPath is called _very_ frequently
const resolveRelativeCompilerContext =
  '/' === path.sep
    ? function (context, key) {
      return path.resolve(context, key);
    }
    : function (context, key) {
      return path.resolve(context, key).replace(/\//g, path.sep);
    };

const contextNormalPath = (exports.contextNormalPath = function contextNormalPath(
  compiler,
  key,
) {
  if (typeof key !== 'string' || key === '') {
    return key;
  }

  const context = compilerContext(compiler);
  if (key === '.') {
    return context;
  }

  const markIndex = key.indexOf('?');
  if (markIndex === -1) {
    return resolveRelativeCompilerContext(context, key);
  }

  const abs = resolveRelativeCompilerContext(
    context,
    key.substring(0, markIndex),
  );
  return abs + '?' + key.substring(markIndex + 1);
});

const contextNormalRequest = (exports.contextNormalRequest = function contextNormalRequest(
  compiler,
  key,
) {
  // return key
  // .split('!')
  // .map(subkey => contextNormalPath(compiler, subkey))
  // .join('!');

  let i = -1;
  let j = -1;
  let _newkey = '';
  while ((i = key.indexOf('!', i + 1)) !== -1) {
    _newkey += contextNormalPath(compiler, key.substring(j + 1, i));
    _newkey += '!';
    j = i;
  }
  _newkey += contextNormalPath(compiler, key.substring(j + 1));
  return _newkey;
});

const contextNormalModuleId = (exports.contextNormalModuleId = function contextNormalModuleId(
  compiler,
  id,
) {
  return id.substring(0, 24) + contextNormalRequest(compiler, id.substring(24));
});

const contextNormalLoaders = (exports.contextNormalLoaders = function contextNormalLoaders(
  compiler,
  loaders,
) {
  return loaders.map(loader =>
    Object.assign({}, loader, {
      loader: contextNormalPath(compiler, loader.loader),
    }),
  );
});

const contextNormalPathArray = (exports.contextNormalPathArray = function contextNormalPathArray(
  compiler,
  paths,
) {
  return paths.map(subpath => contextNormalPath(compiler, subpath));
});

const contextNormalPathSet = (exports.contextNormalPathSet = function contextNormalPathSet(
  compiler,
  paths,
) {
  return new Set(contextNormalPathArray(compiler, paths));
});

/**
 *
 */

const maybeAbsolutePath = (exports.maybeAbsolutePath = function maybeAbsolutePath(
  path,
) {
  return /^([a-zA-Z]:\\\\|\/)/.test(path);
});

const relateAbsolutePath = (exports.relateAbsolutePath = function relateAbsolutePath(
  context,
  absPath,
) {
  if (maybeAbsolutePath(absPath)) {
    return path.relative(context, absPath);
  }
  return absPath;
});

const relateAbsoluteRequest = (exports.relateAbsoluteRequest = function relateAbsoluteRequest(
  context,
  absReq,
) {
  return absReq
    .split(/!/g)
    .map(path => relateAbsolutePath(context, path))
    .join('!');
});